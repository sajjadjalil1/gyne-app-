import { Platform } from "react-native";
import * as Speech from "expo-speech";

/** Read-aloud for every instruction: the device's Arabic voice, no network. */
export function speak(text: string) {
  try {
    if (Platform.OS === "web" && !("speechSynthesis" in globalThis)) return;
    Speech.stop();
    Speech.speak(text, { language: "ar", rate: 0.95 });
  } catch {}
}
export function stopSpeaking() { try { Speech.stop(); } catch {} }
