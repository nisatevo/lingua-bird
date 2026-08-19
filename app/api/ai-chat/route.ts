import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  targetLanguage?: string;
  pronunciation?: {
    transcript?: string;
    score?: number;
    hints?: string[];
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const SYSTEM_PROMPT =
  "You are a friendly language tutor. Keep responses short, smooth, and natural. Use warm conversational language and avoid robotic phrasing. Return plain text only, no markdown, no headings, no bullet symbols, no asterisks, and no section labels like Natural Reply or Corrections.";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isMostlyNonLatin = (text: string) => {
  const letters = text.match(/\p{L}/gu) || [];
  const latinLetters = text.match(/[A-Za-z]/g) || [];

  if (letters.length === 0) return false;

  return latinLetters.length / letters.length < 0.45;
};

const toSentenceCase = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const first = trimmed.charAt(0).toUpperCase();
  const rest = trimmed.slice(1);
  const withPeriod = /[.!?]$/.test(trimmed) ? `${first}${rest}` : `${first}${rest}.`;

  return withPeriod;
};

const getFallbackReply = (lastUserMessage: string, targetLanguage: string) => {
  const cleaned = lastUserMessage.trim() || "Hello";
  const lowered = cleaned.toLowerCase();

  const greetingMap: Record<string, string> = {
    hello: "Hello there!",
    hi: "Hi there!",
    hey: "Hey!",
    "what's up": "Not much, how about you?",
    "whats up": "Not much, how about you?",
    sup: "Hey, how is it going?",
  };

  const greetingKey = Object.keys(greetingMap).find((key) =>
    new RegExp(`^${escapeRegExp(key)}[!?., ]*$`, "i").test(cleaned)
  );

  if (targetLanguage.toLowerCase() === "english" && isMostlyNonLatin(cleaned)) {
    return [
      `Nice attempt. I can see you wrote: ${cleaned}.`,
      "For English speaking practice, try saying the same idea in English words.",
      "Example: if you mean a greeting, you can say Hello, Hi, or How are you?.",
    ].join(" ");
  }

  if (greetingKey) {
    return [
      `${greetingMap[greetingKey]} Your greeting sounds natural in ${targetLanguage}.`,
      "To sound smoother, connect the words and keep your tone relaxed.",
      "Now extend it with one more sentence, like: Hi there, how has your day been?.",
    ].join(" ");
  }

  if (cleaned.split(/\s+/).length <= 2) {
    return [
      `${toSentenceCase(cleaned)} is understandable.`,
      `For better ${targetLanguage} practice, turn it into a full short sentence.`,
      "Try this pattern: I want to + verb + detail. Then say it once slowly and once naturally.",
    ].join(" ");
  }

  if (/[?]$/.test(cleaned)) {
    return [
      `Good question. ${toSentenceCase(cleaned)}`,
      "To sound more natural, lift your intonation slightly on the final key word.",
      "Repeat it with a calm pace and clear stress on content words.",
    ].join(" ");
  }

  return [
    `${toSentenceCase(cleaned)} sounds solid for casual conversation in ${targetLanguage}.`,
    "A smoother version is to reduce long pauses and link short function words together.",
    "Practice it slowly twice, then once at natural speed with clear stress on key words.",
  ].join(" ");
};

const cleanTutorReply = (text: string) => {
  return text
    .replace(/\r/g, "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*(natural\s*reply|corrections?|smooth\s*speaking\s*tip|quick\s*tip)\s*[:\-]\s*/gim, "")
    .replace(/^\s*[-*•]+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const POST = async (req: Request) => {
  const { userId } = await auth();

  if (!userId) return new NextResponse("Unauthorized.", { status: 401 });

  const body = (await req.json()) as ChatRequestBody;
  const messages = (body.messages || [])
    .filter((message) => message?.content?.trim())
    .slice(-10);
  const targetLanguage = body.targetLanguage?.trim() || "English";
  const pronunciation = body.pronunciation;

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "No valid messages provided." },
      { status: 400 }
    );
  }

  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.content ||
    "";

  const pronunciationContext = pronunciation?.transcript
    ? [
        "Learner pronunciation context:",
        `- Transcript: ${pronunciation.transcript}`,
        `- Estimated score: ${pronunciation.score ?? "unknown"}/100`,
        pronunciation.hints?.length
          ? `- Local hints: ${pronunciation.hints.join(" | ")}`
          : "",
        "When relevant, gently refine these hints and keep feedback encouraging.",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!geminiKey) {
    return NextResponse.json({
      reply: getFallbackReply(lastUserMessage, targetLanguage),
      provider: "fallback",
    });
  }

  try {
    const completionResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `${SYSTEM_PROMPT} Target language: ${targetLanguage}. ${pronunciationContext}`,
              },
            ],
          },
          contents: messages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          generationConfig: {
            temperature: 0.7,
          },
        }),
      }
    );

    if (!completionResponse.ok) {
      const fallbackText = getFallbackReply(lastUserMessage, targetLanguage);

      return NextResponse.json({
        reply: fallbackText,
        provider: "fallback",
      });
    }

    const completionData = (await completionResponse.json()) as GeminiResponse;

    const rawReply =
      completionData.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim() ||
      getFallbackReply(lastUserMessage, targetLanguage);

    const reply = cleanTutorReply(rawReply);

    return NextResponse.json({ reply, provider: "gemini" });
  } catch {
    return NextResponse.json({
      reply: getFallbackReply(lastUserMessage, targetLanguage),
      provider: "fallback",
    });
  }
};
