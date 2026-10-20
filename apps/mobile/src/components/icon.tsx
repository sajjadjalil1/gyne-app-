import Svg, { Path, Circle, Rect } from "react-native-svg";

export type IconName = "home" | "check" | "calendar" | "chat" | "user" | "phone" | "pin" | "bell" | "sound" | "back" | "next" | "lock" | "moon" | "alert" | "mic" | "camera" | "share" | "clock" | "x" | "pill" | "heart";

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
      {name === "pill" && <><Rect x={3} y={9} width={18} height={6} rx={3} transform="rotate(-45 12 12)" {...p} /><Path d="m9 9 6 6" {...p} /></>}
      {name === "heart" && <Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" {...p} />}
    </Svg>
  );
}
