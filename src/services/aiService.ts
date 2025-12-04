import OpenAI from "openai";

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_KEY) {
  console.warn("[aiService] OPENAI_API_KEY is not set. AI calls will fail until it's provided.");
}

const client = new OpenAI({
  apiKey: OPENAI_KEY
});

/**
 * Generate a short summary for a task title.
 * Uses Chat Completions with a concise prompt.
 */
export async function generateSummary(title: string): Promise<string> {
  // If API key not set, return placeholder
  if (!OPENAI_KEY) return `AI key not set — summary placeholder for "${title}"`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // choose a small, fast model; change if needed
    messages: [
      {
        role: "user",
        content: `Provide a concise (1–2 sentence) professional summary of the following task title, suitable for a task-tracking UI:\n\n"${title}"`
      }
    ],
    max_tokens: 120,
    temperature: 0.2
  });

  const text = response.choices?.[0]?.message?.content ?? "";
  return text.trim();
}
