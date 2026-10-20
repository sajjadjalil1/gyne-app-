import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./button";

/** The always-visible action above the tab bar, so "save" is never hidden under it. */
export function DoneBar({ title, onPress, busy, disabled, secondary, onSecondary, tabbed = true }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: string; onSecondary?: () => void; tabbed?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.wrap, { bottom: (tabbed ? 84 : 12) + Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={s.inner}>
        {secondary && <View style={{ flex: 1 }}><Button title={secondary} ghost onPress={onSecondary} /></View>}
        <View style={{ flex: secondary ? 2 : 1 }}><Button title={title} onPress={onPress} busy={busy} disabled={disabled} big /></View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({ wrap: { position: "absolute", left: 16, right: 16 }, inner: { flexDirection: "row", gap: 8, maxWidth: 520, width: "100%", alignSelf: "center" } });
