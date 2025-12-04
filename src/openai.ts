// src/openai.ts
// ---------------------------------------------------------
// RESPONSIBILITY:
// Handles OpenAI API interaction and generates task summaries.
// ---------------------------------------------------------

import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set in environment variables.");
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSummary(title: string, description: string) {
  const prompt = `Write a short summary for a task:
Title: ${title}
Description: ${description ?? ""}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 60,
  });

  return (response.choices?.[0]?.message?.content ?? "").trim();
}
