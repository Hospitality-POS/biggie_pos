import { useState, useRef, useCallback, useEffect } from "react";
import { notification } from "antd";
import { fetchSpeechAudioUrl } from "../services/tts.service";

export interface UseSoundPlayerReturn {
  speakingMessageId: number | null;
  liveSoundEnabled: boolean;
  toggleLiveSound: () => void;
  playNeuralSound: (id: number, text: string) => Promise<void>;
  stopSpeaking: () => void;
  handleSpeakMessage: (id: number, text: string) => void;
}

export const useSoundPlayer = (drawerOpen: boolean): UseSoundPlayerReturn => {
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [liveSoundEnabled, setLiveSoundEnabled] = useState<boolean>(() => {
    const val =
      localStorage.getItem("duka_live_sound") ??
      localStorage.getItem("duka_live_siri_voice");
    return val !== "false";
  });

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      } catch {}
      audioElementRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(activeAudioUrlRef.current);
      } catch {}
      activeAudioUrlRef.current = null;
    }
    setSpeakingMessageId(null);
  }, []);

  const playNeuralSound = useCallback(
    async (id: number, text: string) => {
      try {
        setSpeakingMessageId(id);
        const audioUrl = await fetchSpeechAudioUrl(text);
        if (!audioUrl) {
          setSpeakingMessageId(null);
          return;
        }

        activeAudioUrlRef.current = audioUrl;
        const audio = new Audio(audioUrl);
        audioElementRef.current = audio;

        audio.onended = () => {
          stopSpeaking();
        };
        audio.onerror = (err) => {
          console.warn("[useSoundPlayer] Audio playback error:", err);
          stopSpeaking();
        };

        await audio.play();
      } catch (err) {
        console.error("[useSoundPlayer] Sound playback failed:", err);
        notification.warning({
          message: "Sound Unavailable",
          description: "Unable to play audio response at this moment.",
        });
        stopSpeaking();
      }
    },
    [stopSpeaking]
  );

  const handleSpeakMessage = useCallback(
    (id: number, text: string) => {
      if (speakingMessageId === id) {
        stopSpeaking();
        return;
      }
      stopSpeaking();
      playNeuralSound(id, text);
    },
    [speakingMessageId, stopSpeaking, playNeuralSound]
  );

  const toggleLiveSound = useCallback(() => {
    setLiveSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("duka_live_sound", String(next));
      if (!next) {
        stopSpeaking();
      }
      notification.info({
        message: next ? "Sound: Active" : "Sound: Muted",
        description: next
          ? "Biashara AI will read out responses as they arrive."
          : "AI responses will be silent by default.",
        duration: 2,
      });
      return next;
    });
  }, [stopSpeaking]);

  useEffect(() => {
    if (!drawerOpen) {
      stopSpeaking();
    }
  }, [drawerOpen, stopSpeaking]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    speakingMessageId,
    liveSoundEnabled,
    toggleLiveSound,
    playNeuralSound,
    stopSpeaking,
    handleSpeakMessage,
  };
};
