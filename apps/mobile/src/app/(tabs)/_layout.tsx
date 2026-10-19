import { Tabs } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { T } from "@/components/text";
import { useTheme } from "@/hooks/use-theme";

const LABELS: Record<string, { label: string; icon: string }> = {
  index: { label: "الرئيسية", icon: "⌂" },
  calendar: { label: "التقويم", icon: "▦" },
  log: { label: "تسجيل", icon: "✚" },
  appointments: { label: "المواعيد", icon: "◷" },
  messages: { label: "الرسائل", icon: "✉" },
};

type TabBarProps = { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (routeKey: string) => void };
function GlassTabBar({ state, navigateToTab }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <BlurView intensity={30} tint="default" style={[s.bar, { backgroundColor: t.glass, borderColor: t.glassLine }]}>
        {state.routes.map((route, i) => {
          const on = state.index === i;
          const meta = LABELS[route.name] ?? { label: route.name, icon: "•" };
          return (
            <Pressable key={route.key} onPress={() => navigateToTab(route.key)} style={[s.tab, on && { backgroundColor: t.lav }]} accessibilityRole="button" accessibilityLabel={meta.label}>
              <T kind="title" color={on ? t.white : t.muted} style={{ textAlign: "center", fontSize: 18, lineHeight: 22 }}>{meta.icon}</T>
              <T kind="label" color={on ? t.white : t.muted} style={{ textAlign: "center", fontSize: 10 }}>{meta.label}</T>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }} tabBar={(p) => <GlassTabBar state={p.state} navigateToTab={p.navigateToTab} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="appointments" />
      <Tabs.Screen name="messages" />
    </Tabs>
  );
}
const s = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  bar: { flexDirection: "row", gap: 4, padding: 6, borderRadius: 999, borderWidth: 1, overflow: "hidden" },
  tab: { width: 58, height: 52, borderRadius: 999, alignItems: "center", justifyContent: "center", gap: 1 },
});
