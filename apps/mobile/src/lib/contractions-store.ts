import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Contraction } from "@gyne/core";

/**
 * The timer lives on the phone only (works offline, nothing sent unless she taps "send to the clinic").
 * Stored compactly as [startSeconds, lengthSeconds] pairs, newest 30 only, so it fits the secure store.
 */
const KEY = "gyne.contractions";
const MAX = 30;

export async function loadContractions(): Promise<Contraction[]> {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const pairs = JSON.parse(raw) as [number, number | null][];
    return pairs.map(([s, len]) => ({ start: s * 1000, end: len == null ? null : (s + len) * 1000 }));
  } catch { return []; }
}

export async function saveContractions(list: Contraction[]) {
  const pairs = list.slice(-MAX).map((c) => [Math.round(c.start / 1000), c.end == null ? null : Math.round((c.end - c.start) / 1000)]);
  const raw = JSON.stringify(pairs);
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {}
}
