import { synthesizeDukaSpeech } from "@services/aiDukaService";

/**
 * Sanitizes raw response text for spoken audio by removing markdown,
 * formatting currency, stripping URLs, and cleaning formatting characters.
 */
export const cleanTextForSpeech = (rawText: string): string => {
  return rawText
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#`~>]/g, "")
    .replace(/\|[-:\s|]+\|/g, "")
    .replace(/\|/g, ", ")
    .replace(/\bKsh\.?\s?/gi, "Kenyan Shillings ")
    .replace(/^[\s\-•*]+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Synthesizes audio blob URL using backend Neural TTS.
 */
export const fetchSpeechAudioUrl = async (
  text: string,
  voice: string = "en-KE-AsiliaNeural"
): Promise<string> => {
  const clean = cleanTextForSpeech(text);
  if (!clean) return "";
  return synthesizeDukaSpeech(clean, voice);
};
