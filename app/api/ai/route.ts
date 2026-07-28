import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { buildSystemPrompt, buildUserMessage } from "@/lib/ai/prompt";
import { parseAiResponse } from "@/lib/ai/validate";
import type { TimelineData } from "@/lib/types";

const FALLBACK_MODELS = [
  ...(process.env.NEXT_PUBLIC_FALLBACK_MODELS?.split(",") ?? []),
] as const;

const resolveModels = (): string[] => {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const list = preferred
    ? [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)]
    : [...FALLBACK_MODELS];
  return [...new Set(list)];
};

const isQuotaError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("quota") || msg.includes("Quota exceeded");
};

const friendlyError = (err: unknown, triedModels: string[]): string => {
  const raw = err instanceof Error ? err.message : "AI request failed";
  if (isQuotaError(err)) {
    return (
      `API free-tier quota exceeded for ${triedModels.join(", ")}. ` +
      `Wait a minute and retry, or try again later.`
    );
  }
  if (raw.includes("404") || raw.includes("not found")) {
    return `API model not available (tried: ${triedModels.join(", ")}).`;
  }
  if (raw.includes("API key not valid") || raw.includes("API_KEY_INVALID")) {
    return "Invalid Gemini API key. Check GEMINI_API_KEY in .env.local.";
  }
  return raw;
};

export const POST = async (req: Request) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set in the server environment." },
      { status: 503 }
    );
  }

  let body: {
    prompt?: string;
    data?: TimelineData;
    today?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, data, today } = body;
  if (!prompt?.trim() || !data?.projects || !today) {
    return NextResponse.json(
      { error: "prompt, data, and today are required" },
      { status: 400 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemInstruction = buildSystemPrompt();
  const models = resolveModels();
  const tried: string[] = [];
  let lastError: unknown;
  const userMessage = buildUserMessage(prompt.trim(), data, today);

  for (const modelName of models) {
    tried.push(modelName);
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = await model.generateContent(userMessage);
      const text = result.response.text();
      const parsed = parseAiResponse(text, data);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 422 });
      }

      return NextResponse.json({
        summary: parsed.summary,
        data: parsed.data,
        model: modelName,
      });
    } catch (err) {
      lastError = err;
      if (isQuotaError(err)) continue;
      console.error(`AI API error (${modelName}):`, err);
      return NextResponse.json(
        { error: friendlyError(err, tried) },
        { status: 500 }
      );
    }
  }

  console.error("AI Model API quota exhausted:", lastError);
  return NextResponse.json(
    { error: friendlyError(lastError, tried) },
    { status: 429 }
  );
};
