import { Tabs } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { T } from "@/components/text";
import { Icon, type IconName } from "@/components/icon";
import { useTheme } from "@/hooks/use-theme";

/** الرئيسية · يومي · مواعيدي · رسائل · أنا — real icons, 13px labels. */
const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: "الرئيسية", icon: "home" },
  daily: { label: "يومي", icon: "check" },
  appointments: { label: "مواعيدي", icon: "calendar" },
  messages: { label: "رسائل", icon: "chat" },
  me: { label: "أنا", icon: "user" },
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
          const meta = TABS[route.name] ?? { label: route.name, icon: "home" as IconName };
          return (
            <Pressable key={route.key} onPress={() => navigateToTab(route.key)} style={[s.tab, on && { backgroundColor: t.lav }]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={meta.label}>
              <Icon name={meta.icon} size={22} color={on ? t.white : t.muted} />
              <T kind="label" color={on ? t.white : t.muted} style={{ textAlign: "center", fontSize: 12, lineHeight: 15 }}>{meta.label}</T>
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
      <Tabs.Screen name="daily" />
      <Tabs.Screen name="appointments" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
const s = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  bar: { flexDirection: "row", gap: 2, padding: 6, borderRadius: 999, borderWidth: 1, overflow: "hidden" },
  tab: { width: 62, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", gap: 3 },
});
