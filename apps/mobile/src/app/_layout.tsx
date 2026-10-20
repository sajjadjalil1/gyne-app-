import { useEffect } from "react";
import { I18nManager, Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic";
import { SessionProvider, useSession } from "@/lib/session";
import { listenForActions, setupNotifications } from "@/lib/reminders";

SplashScreen.preventAutoHideAsync();

// The whole app is Arabic. RTL is forced once; a reload applies it on native.
if (Platform.OS !== "web" && !I18nManager.isRTL) { I18nManager.allowRTL(true); I18nManager.forceRTL(true); }

function Gate() {
  const { ready, user } = useSession();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)/welcome");
    if (user && inAuth) router.replace("/(tabs)");
  }, [ready, user, segments, router]);
  useEffect(() => { setupNotifications(); return listenForActions(() => {}); }, []);
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="emergency" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="meds" options={{ presentation: "card", animation: "slide_from_right" }} />
      <Stack.Screen name="pill" options={{ presentation: "card", animation: "slide_from_right" }} />
      <Stack.Screen name="week" options={{ presentation: "card", animation: "slide_from_right" }} />
      <Stack.Screen name="calendar" options={{ presentation: "card", animation: "slide_from_right" }} />
      <Stack.Screen name="settings" options={{ presentation: "card", animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      <Gate />
    </SessionProvider>
  );
}
