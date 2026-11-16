import Svg, { Path, Circle, Rect } from "react-native-svg";

export type IconName = "home" | "check" | "calendar" | "chat" | "user" | "phone" | "pin" | "bell" | "sound" | "back" | "next" | "lock" | "moon" | "alert" | "mic" | "camera" | "share" | "clock" | "x" | "pill" | "heart" | "send" | "stethoscope" | "note" | "hospital" | "baby" | "drop" | "sprout" | "info" | "tick" | "syringe";

/** Real stroke icons (24-unit grid) so the tab bar and buttons don't rely on glyph fonts. */
export function Icon({ name, size = 22, color = "#2a2440", stroke = 1.8 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { stroke: color, strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" && <><Path d="M3 11.5 12 4l9 7.5" {...p} /><Path d="M5 10v10h14V10" {...p} /><Path d="M10 20v-6h4v6" {...p} /></>}
      {name === "check" && <><Circle cx={12} cy={12} r={9} {...p} /><Path d="m8 12.5 2.5 2.5L16 9.5" {...p} /></>}
      {name === "calendar" && <><Rect x={3.5} y={5} width={17} height={15} rx={3} {...p} /><Path d="M3.5 10h17M8 3v4M16 3v4" {...p} /></>}
      {name === "chat" && <Path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4H6.5A2.5 2.5 0 0 1 4 14.5z" {...p} />}
      {name === "user" && <><Circle cx={12} cy={8.5} r={4} {...p} /><Path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" {...p} /></>}
      {name === "phone" && <Path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" {...p} />}
      {name === "pin" && <><Path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" {...p} /><Circle cx={12} cy={10} r={2.3} {...p} /></>}
      {name === "bell" && <><Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" {...p} /><Path d="M10 20a2 2 0 0 0 4 0" {...p} /></>}
      {name === "sound" && <><Path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" {...p} /><Path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" {...p} /></>}
      {name === "back" && <Path d="m9 6 6 6-6 6" {...p} />}
      {name === "next" && <Path d="m15 6-6 6 6 6" {...p} />}
      {name === "lock" && <><Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...p} /><Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...p} /></>}
      {name === "moon" && <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" {...p} />}
      {name === "alert" && <><Path d="M12 4 2.5 20h19z" {...p} /><Path d="M12 10v4M12 17v.5" {...p} /></>}
      {name === "mic" && <><Rect x={9} y={3.5} width={6} height={11} rx={3} {...p} /><Path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3M9 20.5h6" {...p} /></>}
      {name === "camera" && <><Path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4z" {...p} /><Circle cx={12} cy={13} r={3} {...p} /></>}
      {name === "share" && <><Path d="M12 3.5v11M8 7.5l4-4 4 4" {...p} /><Path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" {...p} /></>}
      {name === "clock" && <><Circle cx={12} cy={12} r={9} {...p} /><Path d="M12 7v5l3 2" {...p} /></>}
      {name === "x" && <Path d="m6 6 12 12M18 6 6 18" {...p} />}
      {name === "pill" && <><Path d="M10.6 4.6a4.95 4.95 0 0 1 7 7l-6.2 6.2a4.95 4.95 0 0 1-7-7z" {...p} /><Path d="m7.5 7.7 6.8 6.8" {...p} /></>}
      {name === "send" && <><Path d="M20.5 3.5 3.5 10.5l7 3 3 7z" {...p} /><Path d="m10.5 13.5 4-4" {...p} /></>}
      {name === "stethoscope" && <><Path d="M6 3.5v5a4 4 0 0 0 8 0v-5" {...p} /><Path d="M10 12.5v2a5 5 0 0 0 10 0v-2" {...p} /><Circle cx={20} cy={10.5} r={2} {...p} /></>}
      {name === "note" && <><Rect x={5} y={3.5} width={14} height={17} rx={2.5} {...p} /><Path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" {...p} /></>}
      {name === "hospital" && <><Rect x={4} y={4} width={16} height={16} rx={3} {...p} /><Path d="M12 8v8M8 12h8" {...p} /></>}
      {name === "baby" && <><Circle cx={12} cy={9} r={5} {...p} /><Path d="M10.2 9.2h.01M13.8 9.2h.01M10.5 11a2 2 0 0 0 3 0" {...p} /><Path d="M6.5 20.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" {...p} /></>}
      {name === "drop" && <Path d="M12 3.5s-6 6.5-6 10.5a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5z" {...p} />}
      {name === "sprout" && <><Path d="M12 20.5v-8" {...p} /><Path d="M12 12.5C12 8 9 6 4.5 6c0 4.5 3 6.5 7.5 6.5zM12 14.5c0-4 2.5-6.5 7.5-6.5 0 4-2.5 6.5-7.5 6.5z" {...p} /></>}
      {name === "syringe" && <><Path d="m14 4 6 6M17 7l-9.5 9.5-3 .5.5-3L14.5 4.5" {...p} /><Path d="m9 12 3 3M4.5 19.5 7 17" {...p} /></>}
      {name === "tick" && <Path d="m5 12.5 4.5 4.5L19 7.5" {...p} />}
      {name === "info" && <><Circle cx={12} cy={12} r={9} {...p} /><Path d="M12 11v5.5M12 7.5v.5" {...p} /></>}
      {name === "heart" && <Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" {...p} />}
    </Svg>
  );
}
