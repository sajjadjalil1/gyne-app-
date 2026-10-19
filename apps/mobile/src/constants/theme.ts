import { Platform } from "react-native";

/** Soft glass palette shared with the web dashboard. */
export const Colors: { light: Record<string, string>; dark: Record<string, string> } = {
  light: {
    bg: "#f6eef3", g1: "#fbe4e4", g2: "#e6d4f3", g3: "#c9b3ea", g4: "#f7e1ea",
    glass: "rgba(255,255,255,0.55)", glassStrong: "rgba(255,255,255,0.8)", glassLine: "rgba(255,255,255,0.85)",
    fg: "#2a2440", muted: "#6f6886", faint: "#9a93ad",
    lav: "#9b84d6", lavDeep: "#7e63c4", lavSoft: "#ebe3fa", rose: "#f2a7b8", roseSoft: "#fde6ec",
    crit: "#d8556b", warn: "#d9a441", ok: "#5fb58c", info: "#6e8fd6", white: "#ffffff",
  },
  dark: {
    bg: "#1c1826", g1: "#2d2238", g2: "#2a2140", g3: "#3a2d5c", g4: "#2e2134",
    glass: "rgba(40,32,58,0.55)", glassStrong: "rgba(44,36,64,0.82)", glassLine: "rgba(255,255,255,0.12)",
    fg: "#efeaf7", muted: "#b3a9cc", faint: "#7f7698",
    lav: "#b39ce8", lavDeep: "#9a80dc", lavSoft: "#3a2f57", rose: "#e9a0b3", roseSoft: "#4a2e3a",
    crit: "#f07d90", warn: "#e6b85c", ok: "#79cda3", info: "#8ea9ea", white: "#ffffff",
  },
};
export type Palette = { [K in keyof typeof Colors.light]: string };

export const Fonts = {
  regular: Platform.OS === "web" ? "IBMPlexSansArabic_400Regular, system-ui, sans-serif" : "IBMPlexSansArabic_400Regular",
  medium: Platform.OS === "web" ? "IBMPlexSansArabic_500Medium, system-ui, sans-serif" : "IBMPlexSansArabic_500Medium",
  semibold: Platform.OS === "web" ? "IBMPlexSansArabic_600SemiBold, system-ui, sans-serif" : "IBMPlexSansArabic_600SemiBold",
  bold: Platform.OS === "web" ? "IBMPlexSansArabic_700Bold, system-ui, sans-serif" : "IBMPlexSansArabic_700Bold",
};

export const Radius = { card: 20, phone: 28, pill: 999 };
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
