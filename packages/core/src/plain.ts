import type { GA } from "./gestation";

/**
 * Plain-language layer for the patient app. Tone: simple Arabic with a light
 * Iraqi touch in headings and buttons; instructions stay readable aloud.
 * Clinical thresholds live in the engines; this file only words them.
 */

/** Pregnancy month as Iraqi women count it (month 1 = weeks 1–4 … month 9 = weeks 36–40). */
export function pregnancyMonth(ga: GA): number {
  const w = ga.weeks;
  if (w < 5) return 1;
  if (w < 9) return 2;
  if (w < 14) return 3;
  if (w < 18) return 4;
  if (w < 23) return 5;
  if (w < 28) return 6;
  if (w < 32) return 7;
  if (w < 36) return 8;
  return 9;
}

const ORDINALS = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع"];
export const monthLabel = (m: number) => `الشهر ${ORDINALS[Math.min(9, Math.max(1, m))]}`;

/** Baby size of the week with fruit familiar in Iraq. Reviewed wording, not medical advice. */
const SIZES: [number, string, string][] = [
  [8, "🫘", "حبة لوبيا"], [10, "🍓", "حبة توت"], [12, "🍋", "ليمونة"], [14, "🍑", "خوخة"], [16, "🥑", "أفوكادو"],
  [18, "🫑", "فلفلة"], [20, "🍌", "موزة"], [22, "🥭", "مانگا"], [24, "🌽", "عرنوص ذرة"], [26, "🥒", "خيارة كبيرة"],
  [28, "🥦", "قرنابيطة"], [30, "🥬", "خسّة"], [32, "🥥", "جوزة هند"], [34, "🍈", "بطيخة صغيرة"], [36, "🍍", "أناناسة"],
  [38, "🎃", "قرعة"], [40, "🍉", "بطيخة"],
];
export function babySize(weeks: number): { emoji: string; label: string } {
  let hit = SIZES[0];
  for (const s of SIZES) if (weeks >= s[0]) hit = s;
  return { emoji: hit[1], label: hit[2] };
}

/** Plain wording for each antenatal schedule item, by key. */
export const ANC_PLAIN: Record<string, { title: string; what: string; prep?: string }> = {
  booking: { title: "أول زيارة وتحاليل الحمل", what: "تحليل دم وبول وفصيلة الدم، ونسجّل حملچ بالعيادة." },
  dating: { title: "سونار يحدد موعد الولادة", what: "سونار بسيط يحسب عمر الحمل بدقة." },
  nt: { title: "سونار الشهر الثالث", what: "سونار يشوف الطفل ويطمّنچ عليه." },
  visit16: { title: "مراجعة الشهر الرابع", what: "نقيس الضغط والوزن ونسمع نبض الطفل." },
  anomaly: { title: "سونار مفصّل للطفل", what: "سونار طويل شوية يشوف أعضاء الطفل وحدة وحدة.", prep: "اشربي ماي قبل الموعد، لا تدخلين الحمام." },
  ogtt: { title: "تحليل السكر (تشربين ماي حلو)", what: "تشربين شراب سكر ونسحب دم مرتين. ياخذ ساعتين.", prep: "تعالي صايمة من الساعة 10 بالليل." },
  antid: { title: "إبرة فصيلة الدم السالبة (تحمي الطفل)", what: "إبرة Anti-D لأن فصيلة دمچ سالبة، تحمي الطفل.", prep: "جيبي هوية فصيلة الدم." },
  visit28: { title: "مراجعة الشهر السابع + تحليل دم (فقر الدم)", what: "مراجعة عادية وتحليل دم نشوف بيه فقر الدم." },
  visit32: { title: "مراجعة الشهر الثامن", what: "نقيس الضغط والوزن ونسمع نبض الطفل." },
  growth: { title: "سونار نمو الطفل", what: "نشوف وزن الطفل وكمية الماي حوله." },
  gbs: { title: "مسحة بسيطة قبل الولادة", what: "مسحة قطن من المهبل، ما تعوّر، نعرف بيها إذا تحتاجين مضاد حيوي وقت الولادة." },
  visit36: { title: "مراجعة الشهر التاسع (وضعية الطفل)", what: "نشوف راس الطفل جوّه لو لا ونحچي عن الولادة." },
  visit38: { title: "مراجعة قبل الولادة", what: "متابعة قريبة من الموعد." },
  visit40: { title: "مراجعة موعد الولادة", what: "إذا ما ولدتي، نخطط شنسوي بعد الموعد." },
};
export const ancPlain = (key: string, fallback: string) => ANC_PLAIN[key] ?? { title: fallback, what: "" };

/** Blood pressure wording. Thresholds mirror the dashboard rule (≥140/90 high, ≥160/110 severe). */
export type BpLevel = "ok" | "high" | "severe";
export function bpLevel(sys: number, dia: number): BpLevel {
  if (sys >= 160 || dia >= 110) return "severe";
  if (sys >= 140 || dia >= 90) return "high";
  return "ok";
}
export const BP_TEXT: Record<BpLevel, { word: string; short: string; advice: string }> = {
  ok: { word: "زين", short: "أقل من 140/90", advice: "ضغطچ زين. استمري بالقياس كل يوم." },
  high: { word: "عالي", short: "140/90 أو أكثر", advice: "ضغطچ عالي. العيادة راح تتصل بيچ اليوم. إذا عندچ صداع قوي أو زغللة بالعين روحي للطوارئ." },
  severe: { word: "عالي كلش", short: "160/110 أو أكثر", advice: "ضغطچ عالي كلش. روحي للمستشفى هسه، لا تنتظرين." },
};

/** Danger signs: the red-button list and the "danger first" symptoms of the check-in. */
export type DangerSign = { key: string; emoji: string; label: string; action: "ER" | "CALL" };
export const DANGER_PREGNANCY: DangerSign[] = [
  { key: "bleeding", emoji: "🩸", label: "نزيف", action: "ER" },
  { key: "waters", emoji: "💧", label: "ماي نزل", action: "ER" },
  { key: "headache", emoji: "🤕", label: "صداع قوي أو زغللة", action: "CALL" },
  { key: "abdopain", emoji: "😖", label: "وجع قوي بالبطن", action: "ER" },
  { key: "nomove", emoji: "👶", label: "الطفل ما يتحرك", action: "ER" },
  { key: "fever", emoji: "🌡️", label: "حرارة أو رجفة", action: "CALL" },
  { key: "swelling", emoji: "🖐️", label: "ورم مفاجئ بالوجه أو الإيدين", action: "CALL" },
];
export const DANGER_CYCLE: DangerSign[] = [
  { key: "heavybleed", emoji: "🩸", label: "نزيف غزير (فوطة كل ساعة)", action: "ER" },
  { key: "sidepain", emoji: "😖", label: "وجع قوي بجهة وحدة", action: "ER" },
  { key: "fever", emoji: "🌡️", label: "حرارة بعد لولب أو عملية", action: "CALL" },
  { key: "pregonmethod", emoji: "🤰", label: "حمل وأنا على مانع", action: "CALL" },
];
export const DANGER_LABEL: Record<string, string> = { ...Object.fromEntries([...DANGER_PREGNANCY, ...DANGER_CYCLE].map((s) => [s.key, s.label])), vision: "زغللة بالعين", message: "كلمة خطر في رسالة", bp_severe: "ضغط 160/110 أو أكثر" };

/** Check-in symptom sets. Danger signs come first in pregnancy. */
export type SymptomItem = { key: string; emoji: string; label: string; danger?: boolean };
export const SYMPTOMS_PREGNANCY: SymptomItem[] = [
  { key: "bleeding", emoji: "🩸", label: "نزيف", danger: true },
  { key: "waters", emoji: "💧", label: "ماي نزل", danger: true },
  { key: "headache", emoji: "🤕", label: "صداع قوي", danger: true },
  { key: "vision", emoji: "👁️", label: "زغللة بالعين", danger: true },
  { key: "swelling", emoji: "🖐️", label: "ورم بالوجه أو الإيدين", danger: true },
  { key: "abdopain", emoji: "😖", label: "وجع قوي بالبطن", danger: true },
  { key: "nomove", emoji: "👶", label: "الطفل ما يتحرك زين", danger: true },
  { key: "fever", emoji: "🌡️", label: "حرارة", danger: true },
  { key: "heartburn", emoji: "🔥", label: "حرقة معدة" },
  { key: "nausea", emoji: "🤢", label: "غثيان" },
  { key: "tired", emoji: "😮‍💨", label: "تعب" },
  { key: "backpain", emoji: "🧍‍♀️", label: "وجع ظهر" },
  { key: "constipation", emoji: "🚽", label: "إمساك" },
];
export const SYMPTOMS_CYCLE: SymptomItem[] = [
  { key: "cramps", emoji: "😣", label: "مغص" },
  { key: "headache", emoji: "🤕", label: "صداع" },
  { key: "bloating", emoji: "🎈", label: "انتفاخ" },
  { key: "breast", emoji: "💗", label: "وجع صدر" },
  { key: "nausea", emoji: "🤢", label: "غثيان" },
  { key: "acne", emoji: "🫧", label: "حبوب" },
  { key: "discharge", emoji: "💧", label: "إفرازات" },
  { key: "tired", emoji: "😮‍💨", label: "تعب" },
];
export const SYMPTOM_LABEL: Record<string, string> = Object.fromEntries([...SYMPTOMS_PREGNANCY, ...SYMPTOMS_CYCLE].map((s) => [s.key, s.label]));

/** Three faces for "how are you", four for pain, five moods. One set everywhere. */
export const FEELINGS = [
  { key: "good", emoji: "😊", label: "زينة" },
  { key: "soso", emoji: "😐", label: "مو زينة" },
  { key: "bad", emoji: "😣", label: "تعبانة" },
] as const;
export const PAIN_LEVELS = [
  { key: 0, emoji: "🙂", label: "ماكو وجع" },
  { key: 3, emoji: "😕", label: "شوية" },
  { key: 6, emoji: "😣", label: "متوسط" },
  { key: 9, emoji: "😖", label: "قوي" },
] as const;
export const MOODS_SIMPLE = [
  { key: "calm", emoji: "😌", label: "مرتاحة" },
  { key: "happy", emoji: "🙂", label: "فرحانة" },
  { key: "anxious", emoji: "😟", label: "قلقانة" },
  { key: "sad", emoji: "😢", label: "حزينة" },
  { key: "angry", emoji: "😠", label: "عصبية" },
] as const;
export const FLOW_PLAIN: Record<string, { emoji: string; label: string }> = {
  SPOTTING: { emoji: "💧", label: "نقط بسيطة" },
  LIGHT: { emoji: "💧💧", label: "قليل" },
  MEDIUM: { emoji: "💧💧💧", label: "متوسط" },
  HEAVY: { emoji: "💧💧💧💧", label: "هواية" },
};

/** Words in a patient message that must not wait for a nurse. */
export const URGENT_WORDS = /نزيف|نزف|دم|ماي|ماء|صداع|زغللة|ما يتحرك|ماكو حركة|حركة قليلة|تقلص|طلق|وجع قوي|ألم شديد|حرارة|اغماء|إغماء/;
export const isUrgentText = (s: string) => URGENT_WORDS.test(s);

/** Auto-reply shown under every patient message. */
export const autoReply = (replyHours: number) =>
  `وصلت رسالتچ ✓. الممرضة ترد عادةً خلال ${replyHours === 1 ? "ساعة" : replyHours === 2 ? "ساعتين" : `${replyHours} ساعات`} بأوقات الدوام. إذا الأمر مستعجل اضغطي الزر الأحمر.`;

export const APPT_PLAIN: Record<string, string> = {
  NEW_PATIENT: "أول زيارة",
  FOLLOW_UP: "مراجعة",
  ANTENATAL: "مراجعة حمل",
  ULTRASOUND: "سونار",
  CONTRACEPTION_REVIEW: "مراجعة مانع الحمل",
  IUD_INSERTION: "تركيب لولب",
  IMPLANT_REMOVAL: "شيل الغرسة",
  PAP_SMEAR: "مسحة عنق الرحم",
  POSTPARTUM: "مراجعة بعد الولادة",
};
