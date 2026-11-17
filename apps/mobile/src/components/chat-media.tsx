import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { T } from "./text";
import { Icon } from "./icon";
import { mediaSource } from "@/lib/media";
import { useTheme } from "@/hooks/use-theme";

/** "1:05" */
const clock = (ms: number) => { const x = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`; };

type Src = { uri: string; headers?: Record<string, string> };
function useSource(id: string) {
  const [src, setSrc] = useState<Src | null>(null);
  useEffect(() => { mediaSource(id).then(setSrc); }, [id]);
  return src;
}

/** A photo in the chat; a tap opens it full screen (lab results need zooming in). */
export function ChatImage({ id }: { id: string }) {
  const t = useTheme();
  const src = useSource(id);
  const [open, setOpen] = useState(false);
  if (!src) return <View style={[s.img, { backgroundColor: t.lavSoft }]} />;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton" accessibilityLabel="افتحي الصورة">
        <Image source={src} style={s.img} contentFit="cover" cachePolicy="memory" transition={150} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.full}>
          <Image source={src} style={{ flex: 1, width: "100%" }} contentFit="contain" cachePolicy="memory" />
          <Pressable onPress={() => setOpen(false)} style={[s.close, { backgroundColor: t.glassStrong }]} accessibilityLabel="إغلاق"><Icon name="x" size={22} color={t.fg} /></Pressable>
        </View>
      </Modal>
    </>
  );
}

/** A voice note: one round play button and the length. */
export function VoiceNote({ id, durationSec, light }: { id: string; durationSec: number | null; light?: boolean }) {
  const src = useSource(id);
  return src ? <VoicePlayer src={src} durationSec={durationSec} light={light} /> : <View style={{ height: 40 }} />;
}
function VoicePlayer({ src, durationSec, light }: { src: Src; durationSec: number | null; light?: boolean }) {
  const t = useTheme();
  const player = useAudioPlayer(src);
  const st = useAudioPlayerStatus(player);
  const fg = light ? t.white : t.lavDeep;
  const total = st.duration || durationSec || 0;
  function toggle() {
    if (st.playing) { player.pause(); return; }
    if (st.didJustFinish || (total && st.currentTime >= total - 0.2)) player.seekTo(0);
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player.play();
  }
  return (
    <View style={s.voice}>
      <Pressable onPress={toggle} style={[s.play, { backgroundColor: light ? "rgba(255,255,255,0.25)" : t.lavSoft }]} accessibilityLabel={st.playing ? "وقفي" : "شغّلي الرسالة الصوتية"}>
        <Icon name={st.playing ? "pause" : "play"} size={20} color={fg} stroke={2} />
      </Pressable>
      <View style={[s.bar, { backgroundColor: light ? "rgba(255,255,255,0.35)" : t.lavSoft }]}>
        <View style={{ width: `${total ? Math.min(100, (st.currentTime / total) * 100) : 0}%`, height: "100%", backgroundColor: fg, borderRadius: 3 }} />
      </View>
      <T kind="small" color={fg} style={{ minWidth: 38, textAlign: "center" }}>{clock((st.playing ? st.currentTime : total) * 1000)}</T>
    </View>
  );
}

export const MAX_VOICE_SEC = 180;

/**
 * Hold-free voice recording: tap the mic to start, then «دزي» or «الغي». Stops by itself at 3 minutes.
 * onDone gets the file and its length; nothing is sent until she presses send.
 */
export function Recorder({ onDone, onCancel }: { onDone: (uri: string, sec: number) => void; onCancel: () => void }) {
  const t = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const st = useAudioRecorderState(recorder, 250);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const p = await requestRecordingPermissionsAsync();
      if (!p.granted) { setError("لازم تسمحين للتطبيق يستعمل المايك من الإعدادات."); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    })().catch(() => setError("ما گدرنا نبدي التسجيل."));
    return () => { recorder.stop().catch(() => {}); setAudioModeAsync({ allowsRecording: false }).catch(() => {}); };
  }, [recorder]);
  const sec = (st.durationMillis ?? 0) / 1000;
  async function finish() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    if (recorder.uri && sec >= 1) onDone(recorder.uri, sec); else onCancel();
  }
  useEffect(() => { if (sec >= MAX_VOICE_SEC) finish(); }, [sec]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[s.rec, { backgroundColor: t.glassStrong, borderColor: t.crit }]}>
      {error ? <T kind="small" color={t.crit} style={{ flex: 1 }}>{error}</T> : (
        <>
          <View style={[s.dot, { backgroundColor: t.crit, opacity: Math.floor(sec * 2) % 2 ? 0.4 : 1 }]} />
          <T kind="title" style={{ flex: 1 }}>{clock(sec * 1000)} <T kind="small">/ 3:00</T></T>
        </>
      )}
      <Pressable onPress={async () => { await recorder.stop().catch(() => {}); onCancel(); }} style={[s.recBtn, { backgroundColor: t.glass, borderColor: t.glassLine }]} accessibilityLabel="الغي التسجيل"><T kind="label">الغي</T></Pressable>
      {!error && <Pressable onPress={finish} style={[s.recBtn, { backgroundColor: t.lav }]} accessibilityLabel="دزي الرسالة الصوتية"><Icon name="send" size={18} color={t.white} /><T kind="label" color={t.white}>دزي</T></Pressable>}
    </View>
  );
}

const s = StyleSheet.create({
  img: { width: 220, height: 220, borderRadius: 14 },
  full: { flex: 1, backgroundColor: "rgba(20,16,30,0.95)", justifyContent: "center" },
  close: { position: "absolute", top: 56, left: 20, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  voice: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 200 },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  rec: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 96, padding: 10, borderRadius: 24, borderWidth: 1.5 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  recBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "transparent" },
});
