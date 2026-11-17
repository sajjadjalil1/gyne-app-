import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { ApiError, apiBase, getToken } from "./api";
import { DEMO } from "./demo";

export type Attachment = { id: string; kind: "IMAGE" | "AUDIO"; mime: string; size: number; durationSec: number | null };
export const MEDIA_ONLY_BODY = ["📷 صورة", "🎤 رسالة صوتية"];

/** The address of a chat file plus the sign-in header, for the image and audio players. */
export async function mediaSource(id: string) {
  const token = await getToken();
  return { uri: `${apiBase()}/api/media/${id}`, headers: token ? { authorization: `Bearer ${token}` } : undefined };
}

/**
 * Take or pick a photo, then shrink it (longest side 1600 px, JPEG): a lab result stays readable at about 300 KB,
 * and an iPhone HEIC photo becomes a JPEG the server accepts. Returns null if she cancels or refuses permission.
 */
export async function pickPhoto(from: "camera" | "library"): Promise<string | null> {
  const perm = from === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsEditing: false, exif: false };
  const r = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  const resize = (a.width ?? 0) >= (a.height ?? 0) ? { width: Math.min(1600, a.width || 1600) } : { height: Math.min(1600, a.height || 1600) };
  const out = await manipulateAsync(a.uri, [{ resize }], { compress: 0.7, format: SaveFormat.JPEG });
  return out.uri;
}

/** Sends a photo or a voice note as a chat message. Same answer shape as a text message. */
export async function sendMedia<T>(kind: "IMAGE" | "AUDIO", uri: string, opts: { durationSec?: number; caption?: string } = {}): Promise<T> {
  if (DEMO) throw new ApiError(400, "بالمعاينة ما نگدر ندز ملفات. جربيها بالتطبيق.");
  const form = new FormData();
  const name = kind === "IMAGE" ? "photo.jpg" : Platform.OS === "web" ? "voice.webm" : "voice.m4a";
  const type = kind === "IMAGE" ? "image/jpeg" : Platform.OS === "web" ? "audio/webm" : "audio/mp4";
  if (Platform.OS === "web") form.append("file", await (await fetch(uri)).blob(), name);
  else form.append("file", { uri, name, type } as unknown as Blob);
  form.append("kind", kind);
  if (opts.durationSec) form.append("durationSec", String(Math.round(opts.durationSec)));
  if (opts.caption) form.append("caption", opts.caption);
  const token = await getToken();
  const res = await fetch(`${apiBase()}/api/messages/media`, { method: "POST", body: form, headers: { accept: "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "ما وصل الملف");
  return data as T;
}
