// src/gemini.ts
// ---------------------------------------------------------
// RESPONSIBILITY:
// Handles Google Gemini (Text-Bison) API calls to generate
// short summaries for tasks. Designed as a drop-in replacement
// for OpenAI integration.
// ---------------------------------------------------------

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = process.env.GOOGLE_REGION || "us-central1";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!PROJECT_ID || !GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY or GOOGLE_PROJECT_ID not set in environment variables."
  );
}

// gemini.ts - Works with Google AI Studio API Key
// Uses: models/gemini-2.5-flash

export async function generateSummary(title: string, description: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = "models/gemini-2.5-flash";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Generate a detailed, multi-paragraph (minimum 3 paragraphs) explanation based on the following topic.

Title: ${title}
Description: ${description}

Requirements:
- Write at least 3 paragraphs.
- Each paragraph should be 3–4 sentences.
- Maintain a clear educational tone.
- Avoid bullet points.
                  `
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      throw new Error("Gemini API returned an error.");
    }

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Summary unavailable"
    );

  } catch (err) {
    console.error("Gemini request failed:", err);
    return "Summary unavailable";
  }
}


