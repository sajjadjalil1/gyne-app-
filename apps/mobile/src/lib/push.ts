import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./api";
import { DEMO } from "./demo";

/**
 * Push notifications from the clinic (a reply from the nurse, a change to an appointment).
 * They need the app's Expo project id (EAS_PROJECT_ID at build time) and a real phone; in the browser preview,
 * the simulator, or a build without the id, everything here quietly does nothing and the chat still works.
 */
let current: string | null = null;

const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;

export const pushAvailable = () => Platform.OS !== "web" && !DEMO && Device.isDevice && !!projectId();

/** Ask Expo for this phone's address and give it to the server. Safe to call on every app start. */
export async function registerPush(): Promise<boolean> {
  if (!pushAvailable()) return false;
  try {
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("messages", { name: "رسائل العيادة", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250] });
    if (!(await Notifications.getPermissionsAsync()).granted) return false;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId()! });
    await api("/api/push", { method: "POST", json: { token, platform: Platform.OS } });
    current = token;
    return true;
  } catch { return false; }
}

/** On sign-out: this phone stops getting her notifications. */
export async function unregisterPush() {
  if (!current) return;
  const token = current;
  current = null;
  try { await api("/api/push", { method: "DELETE", json: { token } }); } catch {}
}

export type PushData = { kind?: "message" | "appointment"; id?: string };

/** A tap on a clinic notification opens the right tab. */
export function listenForPushTaps(open: (path: "/(tabs)/messages" | "/(tabs)/appointments") => void) {
  if (Platform.OS === "web") return () => {};
  const go = (data: PushData | undefined) => {
    if (data?.kind === "message") open("/(tabs)/messages");
    else if (data?.kind === "appointment") open("/(tabs)/appointments");
  };
  // The app was closed and opened by the tap.
  Notifications.getLastNotificationResponseAsync().then((r) => go(r?.notification.request.content.data as PushData)).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification.request.content.data as PushData));
  return () => sub.remove();
}
