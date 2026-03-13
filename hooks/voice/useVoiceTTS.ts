/**
 * Voice TTS Hook
 *
 * Manages text-to-speech with Google Cloud Neural2 (via Convex action)
 * and fallback to expo-speech device TTS.
 */

import { useCallback, useRef } from "react";
import * as Speech from "expo-speech";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// ── Safe dynamic import of expo-av ─────────────────────────────────────
let AudioModule: Record<string, unknown> | null = null;

try {
  const mod = require("expo-av");
  AudioModule = mod.Audio;
} catch {
  // Native module not available — will fall back to device TTS
}

const AUDIO_AVAILABLE = AudioModule != null;
const MAX_TTS_CHARS = 4500;

export function useVoiceTTS() {
  const textToSpeech = useAction(api.ai.textToSpeech);
  const soundRef = useRef<{stopAsync():Promise<void>;unloadAsync():Promise<void>}|null>(null);
  const isSpeakingRef = useRef(false);

  const speakText = useCallback(
    async (text: string, onDone?: () => void) => {
      // Truncate TTS text to stay within cloud TTS character limits
      const ttsText = text.length > MAX_TTS_CHARS
        ? text.substring(0, MAX_TTS_CHARS) + "... That's the summary."
        : text;

      // Mark speaking state — mic won't auto-resume while speaking
      isSpeakingRef.current = true;

      const wrappedOnDone = () => {
        isSpeakingRef.current = false;
        onDone?.();
      };

      // Only try neural TTS if expo-av is available
      if (AUDIO_AVAILABLE) {
        try {
          const result = await textToSpeech({ text: ttsText, voiceGender: "MALE" });

          if (result.audioBase64) {
            const { sound } = await AudioModule.Sound.createAsync(
              { uri: `data:audio/mp3;base64,${result.audioBase64}` },
              { shouldPlay: true }
            );
            soundRef.current = sound;

            sound.setOnPlaybackStatusUpdate((status:{isLoaded:boolean;didJustFinish?:boolean}) => {
              if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
                soundRef.current = null;
                wrappedOnDone();
              }
            });
            return;
          }
        } catch (error) {
          console.warn("[speakText] Neural TTS failed, using device TTS:", error);
        }
      }

      // Fallback to device TTS (expo-speech)
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const britishVoice = voices.find(
          (v) =>
            v.language?.startsWith("en-GB") &&
            (v.quality === "Enhanced" ||
              v.name?.includes("Enhanced") ||
              v.name?.includes("Premium") ||
              v.identifier?.includes("premium") ||
              v.identifier?.includes("enhanced"))
        ) ||
          voices.find((v) => v.language?.startsWith("en-GB")) ||
          undefined;

        Speech.speak(ttsText, {
          language: "en-GB",
          voice: britishVoice?.identifier,
          rate: 0.92,
          pitch: 1.05,
          onDone: wrappedOnDone,
        });
      } catch {
        Speech.speak(ttsText, {
          language: "en-GB",
          rate: 0.92,
          pitch: 1.05,
          onDone: wrappedOnDone,
        });
      }
    },
    [textToSpeech]
  );

  const stopSpeaking = useCallback(async () => {
    isSpeakingRef.current = false;
    Speech.stop();
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      soundRef.current = null;
    }
  }, []);

  /** Cleanup on unmount — call from effect */
  const cleanupTTS = useCallback(() => {
    Speech.stop();
    if (soundRef.current) {
      soundRef.current.unloadAsync();
    }
  }, []);

  return {
    speakText,
    stopSpeaking,
    cleanupTTS,
    isSpeakingRef,
    soundRef,
  };
}
