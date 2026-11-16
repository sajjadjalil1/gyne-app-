/**
 * Privacy policy. Raise PRIVACY_VERSION when the policy text changes in a way patients must agree to again:
 * the app then shows the consent screen once more.
 */
export const PRIVACY_VERSION = "2026-11-16";
/** Days a deleted file is kept (hidden, no login) before scripts/purge-deleted.ts erases it for good. */
export const DELETE_GRACE_DAYS = 30;

/** The short version shown on the consent screen in the app. The full text is the /privacy page on the server. */
export const PRIVACY_POINTS: { emoji: string; title: string; text: string }[] = [
  { emoji: "🩺", title: "ليش نجمع معلوماتچ", text: "حتى طبيبتچ تتابع حملچ أو دورتچ أو دواچ، وتنبهچ إذا صار شي يحتاج مراجعة. ما نستعملها لأي شي ثاني." },
  { emoji: "👩‍⚕️", title: "منو يشوفها", text: "طبيبتچ والممرضة بعيادتچ بس. الاستقبال يشوف المواعيد بس. ماكو إعلانات، وما نبيع ولا نشارك معلوماتچ ويا أي جهة." },
  { emoji: "🔒", title: "شلون نحميها", text: "مشفّرة وهي بالطريق، ومحفوظة على سيرفر محمي بألمانيا. كل مرة أحد يفتح ملفچ تنسجل باسمه ووقتها." },
  { emoji: "🗑️", title: "حقچ تحذفينها", text: `من «أنا» ← «احذفي حسابي». ينقفل حسابچ فوراً، وتنمسح معلوماتچ نهائياً بعد ${DELETE_GRACE_DAYS} يوم.` },
];
