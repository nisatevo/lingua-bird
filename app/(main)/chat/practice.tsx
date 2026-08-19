"use client";

import { useMemo, useRef, useState } from "react";

import { Mic, Send, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type PronunciationFeedback = {
  transcript: string;
  score: number;
  hints: string[];
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const LANGUAGE_OPTIONS = [
  { label: "English", locale: "en-US" },
  { label: "Spanish", locale: "es-ES" },
  { label: "French", locale: "fr-FR" },
  { label: "German", locale: "de-DE" },
  { label: "Italian", locale: "it-IT" },
  { label: "Japanese", locale: "ja-JP" },
] as const;

const NATURAL_VOICE_HINTS = [
  "neural",
  "natural",
  "premium",
  "enhanced",
  "wavenet",
  "studio",
  "siri",
  "google",
  "microsoft",
  "apple",
];

const getVoiceSettings = (locale: string) => {
  if (locale.startsWith("ja")) {
    return { rate: 0.9, pitch: 1.03 };
  }

  if (locale.startsWith("fr") || locale.startsWith("de") || locale.startsWith("it")) {
    return { rate: 0.93, pitch: 1.02 };
  }

  return { rate: 0.95, pitch: 1.01 };
};

const pickMostNaturalVoice = (voices: SpeechSynthesisVoice[], locale: string) => {
  if (voices.length === 0) return null;

  const localeLower = locale.toLowerCase();
  const baseLang = localeLower.split("-")[0];

  const scored = voices
    .map((voice) => {
      const voiceName = voice.name.toLowerCase();
      const voiceLang = voice.lang.toLowerCase();

      let score = 0;

      if (voiceLang === localeLower) score += 120;
      if (voiceLang.startsWith(baseLang)) score += 70;
      if (voice.default) score += 12;

      if (NATURAL_VOICE_HINTS.some((hint) => voiceName.includes(hint))) {
        score += 45;
      }

      return { voice, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.voice || null;
};

const getInitialMessage = (language: string): ChatMessage => ({
  role: "assistant",
  content: `Hi! I am your ${language} speaking coach. Say or type a sentence and I will help you improve it.`,
});

const FILLER_WORDS = new Set(["um", "uh", "like", "hmm"]);

const analyzePronunciationTranscript = (
  transcript: string
): PronunciationFeedback => {
  const cleanedTranscript = transcript.trim();
  const words = cleanedTranscript
    .toLowerCase()
    .replace(/[^a-zA-Z\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const fillerCount = words.filter((word) => FILLER_WORDS.has(word)).length;

  let repeatedCount = 0;
  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) repeatedCount += 1;
  }

  let score = 92;

  if (words.length < 4) score -= 18;
  if (words.length >= 4 && words.length < 7) score -= 8;
  score -= Math.min(16, fillerCount * 4);
  score -= Math.min(12, repeatedCount * 3);
  score = Math.max(35, Math.min(98, score));

  const hints: string[] = [];

  if (words.length < 4) {
    hints.push("Try speaking in complete short sentences (4-8 words) for clearer rhythm.");
  }

  if (fillerCount > 0) {
    hints.push("Reduce filler sounds like um/uh. Pause silently instead to sound smoother.");
  }

  if (repeatedCount > 0) {
    hints.push("Avoid repeating the same word back-to-back. Slow down before the next word.");
  }

  if (hints.length === 0) {
    hints.push("Nice flow. Now stress key words slightly more to sound more natural.");
  }

  return {
    transcript: cleanedTranscript,
    score,
    hints: hints.slice(0, 3),
  };
};

export const ChatPractice = () => {
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [messages, setMessages] = useState<ChatMessage[]>([
    getInitialMessage("English"),
  ]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [pronunciationFeedback, setPronunciationFeedback] =
    useState<PronunciationFeedback | null>(null);
  const [inputSource, setInputSource] = useState<"text" | "voice">("text");
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const locale = useMemo(
    () =>
      LANGUAGE_OPTIONS.find((option) => option.label === targetLanguage)
        ?.locale || "en-US",
    [targetLanguage]
  );

  const sendMessage = async (value: string) => {
    const content = value.trim();
    if (!content || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];

    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLanguage,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          pronunciation:
            inputSource === "voice" && pronunciationFeedback
              ? {
                  transcript: pronunciationFeedback.transcript,
                  score: pronunciationFeedback.score,
                  hints: pronunciationFeedback.hints,
                }
              : undefined,
        }),
      });

      if (!response.ok) {
        setError("Could not get coach response. Please try again.");
        return;
      }

      const data = (await response.json()) as { reply?: string };
      const aiReply = data.reply?.trim() || "Let us try that again together.";

      setMessages((prev) => [...prev, { role: "assistant", content: aiReply }]);
      if (speechEnabled) {
        speak(aiReply);
      }
    } catch {
      setError("Network issue while contacting the coach.");
    } finally {
      setIsSending(false);
    }
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    const { rate, pitch } = getVoiceSettings(locale);
    utterance.rate = rate;
    utterance.pitch = pitch;

    const matchedVoice = pickMostNaturalVoice(
      window.speechSynthesis.getVoices(),
      locale
    );

    if (matchedVoice) utterance.voice = matchedVoice;

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
  };

  const toggleListening = () => {
    if (typeof window === "undefined") return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let transcript = "";
      let finalTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const piece = event.results[index][0].transcript || "";
        transcript += `${piece} `;

        if (event.results[index].isFinal) {
          finalTranscript += `${piece} `;
        }
      }

      setDraft(transcript.trim());
      setInputSource("voice");

      const finalized = finalTranscript.trim();
      if (finalized) {
        const feedback = analyzePronunciationTranscript(finalized);

        setPronunciationFeedback(feedback);
        setScoreHistory((prev) => [...prev.slice(-4), feedback.score]);
      }
    };

    recognition.onerror = () => {
      setError("Could not capture your voice. Please try again.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setError(null);
    setListening(true);
    recognition.start();
  };

  const resetConversation = (language: string) => {
    setMessages([getInitialMessage(language)]);
    setDraft("");
    setError(null);
    setListening(false);
    setPronunciationFeedback(null);
    setInputSource("text");
    recognitionRef.current?.stop();
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-8 pt-2 sm:px-6">
      <div className="rounded-2xl border-2 border-sky-100 bg-gradient-to-r from-cyan-50 to-sky-50 p-5">
        <h1 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">
          AI Speaking Practice
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Practice with text or voice. Your coach replies, gives corrections, and reads answers aloud.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3">
        <label htmlFor="targetLanguage" className="text-sm font-bold text-slate-700">
          Language
        </label>
        <select
          id="targetLanguage"
          className="rounded-lg border px-3 py-2 text-sm"
          value={targetLanguage}
          onChange={(event) => {
            setTargetLanguage(event.target.value);
            resetConversation(event.target.value);
          }}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="h-[420px] overflow-y-auto rounded-2xl border-2 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:text-base ${
                message.role === "user"
                  ? "ml-auto bg-sky-500 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {message.content}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 bg-white p-4">
        <textarea
          className="min-h-28 w-full resize-none rounded-xl border p-3 text-sm outline-none ring-sky-300 focus:ring-2"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setInputSource("text");
          }}
          placeholder={`Say or type your ${targetLanguage} sentence...`}
        />

        {pronunciationFeedback ? (
          <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-cyan-900">Pronunciation hints</p>
              <p className="text-sm font-extrabold text-cyan-700">
                Score: {pronunciationFeedback.score}/100
              </p>
            </div>
            <p className="mt-1 text-xs text-cyan-800">
              From voice transcript: "{pronunciationFeedback.transcript}"
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cyan-900">
              {pronunciationFeedback.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>

            {scoreHistory.length > 0 ? (
              <div className="mt-3 rounded-lg border border-cyan-300 bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                  Last 5 scores trend
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {scoreHistory.map((score, index) => {
                    const isLatest = index === scoreHistory.length - 1;

                    return (
                      <div
                        key={`${score}-${index}`}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isLatest
                            ? "bg-cyan-600 text-white"
                            : "bg-cyan-100 text-cyan-800"
                        }`}
                      >
                        {score}
                      </div>
                    );
                  })}
                </div>

                {scoreHistory.length >= 2 ? (
                  <p className="mt-2 text-xs text-cyan-800">
                    {scoreHistory[scoreHistory.length - 1] >= scoreHistory[0]
                      ? "Nice progress. Your latest score is improving compared to earlier attempts."
                      : "Keep practicing. Focus on speaking slower and reducing filler words for a smoother score."}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-2 text-sm font-medium text-rose-600">{error}</p> : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => sendMessage(draft)}
            disabled={isSending || !draft.trim()}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? "Thinking..." : "Send"}
          </Button>

          <Button
            variant={listening ? "danger" : "secondary"}
            onClick={toggleListening}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            {listening ? "Stop Listening" : "Speak"}
          </Button>

          <Button
            variant="super"
            onClick={() => {
              const lastReply = [...messages]
                .reverse()
                .find((message) => message.role === "assistant");
              if (lastReply && speechEnabled) speak(lastReply.content);
            }}
            className="gap-2"
            disabled={!speechEnabled}
          >
            <Volume2 className="h-4 w-4" />
            Hear Last Reply
          </Button>

          <Button
            variant={speechEnabled ? "secondary" : "ghost"}
            onClick={() => {
              const nextEnabled = !speechEnabled;
              setSpeechEnabled(nextEnabled);

              if (!nextEnabled) {
                stopSpeaking();
              }
            }}
            className="gap-2"
          >
            <VolumeX className="h-4 w-4" />
            {speechEnabled ? "Disable Speech" : "Enable Speech"}
          </Button>

          <Button variant="dangerOutline" onClick={stopSpeaking} className="gap-2">
            <VolumeX className="h-4 w-4" />
            Stop Voice
          </Button>
        </div>
      </div>
    </div>
  );
};
