import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { DEMO, demoApi } from "./demo";

const TOKEN_KEY = "gyne.token";

/** Base URL: EXPO_PUBLIC_API_URL in production; in dev, the machine running `expo start` on port 3000. */
export function apiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && Platform.OS !== "web") return `http://${host}:3000`;
  return "http://localhost:3000";
}

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { return null; }
}
export async function setToken(token: string | null) {
  try {
    if (Platform.OS === "web") { token ? globalThis.localStorage?.setItem(TOKEN_KEY, token) : globalThis.localStorage?.removeItem(TOKEN_KEY); return; }
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  if (DEMO) {
    try { return (await demoApi(path, init)) as T; } catch (e) { throw new ApiError((e as { status?: number }).status ?? 500, (e as Error).message); }
  }
  const token = await getToken();
  const headers: Record<string, string> = { accept: "application/json", ...(init.headers as Record<string, string> | undefined) };
  if (init.json !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBase()}${path}`, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "حدث خطأ");
  return data as T;
}

/** JSON dates arrive as strings; revive the ones we display. */
export const d = (v: string | Date | null | undefined): Date | null => (v ? new Date(v) : null);
