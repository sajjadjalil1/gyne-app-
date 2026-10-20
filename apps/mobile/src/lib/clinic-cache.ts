import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Home } from "./use-home";

const KEY = "gyne.clinic";
export type ClinicInfo = Home["clinic"] & { mode: Home["mode"] };

/** The red button must work offline: clinic phone and the nearest maternity hospital are kept on the phone. */
export async function saveClinic(h: Home) {
  const v = JSON.stringify({ ...h.clinic, mode: h.mode } satisfies ClinicInfo);
  try { if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, v); else await SecureStore.setItemAsync(KEY, v); } catch {}
}
export async function loadClinic(): Promise<ClinicInfo | null> {
  try { const v = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY); return v ? (JSON.parse(v) as ClinicInfo) : null; } catch { return null; }
}
