import { View } from "react-native";
import { Icon, type IconName } from "./icon";

/** Each medicine gets the same drawn pill icon in its own colour, instead of coloured-circle emoji. */
const MEDS: Record<string, { icon: IconName; color: string }> = {
  IRON: { icon: "pill", color: "#8a5a44" },
  CALCIUM: { icon: "pill", color: "#7d8799" },
  FOLIC: { icon: "pill", color: "#c99a1e" },
  VITD: { icon: "pill", color: "#d08a1a" },
  ASPIRIN: { icon: "pill", color: "#d9702b" },
  PROGESTERONE: { icon: "pill", color: "#7b60c7" },
  ENOXAPARIN: { icon: "syringe", color: "#c2475e" },
  LEVOTHYROXINE: { icon: "pill", color: "#3f72c9" },
  METFORMIN: { icon: "pill", color: "#3d9a6c" },
};
const TASKS: Record<string, { icon: IconName; color: string }> = {
  bp: { icon: "stethoscope", color: "#c2475e" },
  kicks: { icon: "baby", color: "#7b60c7" },
};

export function MedIcon({ drug, task, size = 40 }: { drug?: string | null; task?: string; size?: number }) {
  const m = (task && TASKS[task]) || (drug && MEDS[drug]) || { icon: "pill" as IconName, color: "#7b60c7" };
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: m.color + "1f", alignItems: "center", justifyContent: "center" }}>
      <Icon name={m.icon} size={size * 0.55} color={m.color} stroke={2} />
    </View>
  );
}
