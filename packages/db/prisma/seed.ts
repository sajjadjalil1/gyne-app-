import { PrismaClient } from "@prisma/client";
import { addDays, subDays, setHours, setMinutes, startOfDay, subYears } from "date-fns";
import { resolveDating } from "@gyne/core";
import { computeExpiry } from "@gyne/core";

const prisma = new PrismaClient();
const today = startOfDay(new Date());
const at = (d: Date, h: number, m = 0) => setMinutes(setHours(d, h), m);

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.doseEvent.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.dangerReport.deleteMany();
  await prisma.session.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.message.deleteMany();
  await prisma.homeReading.deleteMany();
  await prisma.pregnancy.deleteMany();
  await prisma.contraception.deleteMany();
  await prisma.cycleLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  const clinic = await prisma.clinic.create({
    data: {
      name: "عيادة د. سجاد للنسائية والتوليد", phone: "07800000000", address: "المنصور، شارع 14 رمضان، بغداد", mapsUrl: "https://maps.google.com/?q=33.3152,44.3661",
      nurseHours: "9 الصبح لـ 5 العصر", replyHours: 2, erHospital: "مستشفى العلوية للولادة", erMapsUrl: "https://maps.google.com/?q=33.3128,44.4068",
      missedPillOne: "خذي الحبة اللي نسيتيها هسه حتى لو صارت حبتين بنفس اليوم، وكمّلي الباكيت عادي. ما تحتاجين وقاية إضافية.",
      missedPillTwo: "خذي آخر حبة نسيتيها هسه وكمّلي الباكيت. استعملي واقي 7 أيام. إذا النسيان كان بآخر أسبوع من الباكيت ابدئي الباكيت الجاي بدون استراحة. وإذا صارت علاقة بالأيام اللي فاتت راسلينا اليوم.",
      fastingAdvice: "الصيام بالحمل يحتاج موافقة الدكتورة. إذا صمتي وحسيتي بدوخة قوية، أو قلّت حركة الطفل، أو ما گدرتي تشربين ماي بعد الفطور، افطري واتصلي بينا.",
    },
  });
  const doctor = await prisma.user.create({ data: { clinicId: clinic.id, role: "DOCTOR", name: "د. سجاد جليل", phone: "07800000001" } });
  await prisma.user.create({ data: { clinicId: clinic.id, role: "NURSE", name: "الممرضة هبة", phone: "07800000002" } });
  const rx = (patientId: string, drug: string, label: string, extra: Record<string, unknown> = {}) =>
    prisma.prescription.create({ data: { clinicId: clinic.id, patientId, drug, label, createdById: doctor.id, ...(extra as object) } });
  const dose = (patientId: string, prescriptionId: string, dueAt: Date, status: "TAKEN" | "LATE" | "SKIPPED" | "MISSED", reason?: string) =>
    prisma.doseEvent.create({ data: { patientId, prescriptionId, dueAt, status, reason, loggedAt: dueAt } });

  const mk = async (name: string, phone: string, age: number, extra: Partial<Parameters<typeof prisma.patient.create>[0]["data"]> = {}) => {
    const user = await prisma.user.create({ data: { clinicId: clinic.id, role: "PATIENT", name, phone } });
    return prisma.patient.create({ data: { clinicId: clinic.id, userId: user.id, name, phone, birthDate: subYears(today, age), ...extra } });
  };

  // 1. Nour: pregnant 28+2, Rh negative, rising BP
  const nour = await mk("نور حسين الموسوي", "07801234567", 31, { bloodGroup: "O−", gravida: 3, para: 1, abortions: 1 });
  const nourLmp = subDays(today, 28 * 7 + 2 + 9); // LMP would give 29+4; ultrasound re-dates to 28+2
  const nourDating = resolveDating({ lmp: nourLmp, usDate: subDays(today, (28 - 12) * 7 + 2 - 3), usGaDays: 12 * 7 + 3 });
  await prisma.pregnancy.create({ data: { patientId: nour.id, lmp: nourLmp, usDate: subDays(today, (28 - 12) * 7 + 2 - 3), usGaDays: 12 * 7 + 3, eddFinal: nourDating.eddFinal, datingMethod: nourDating.method, rhNegative: true } });
  const bp = [
    [subDays(today, 6), 128, 82], [subDays(today, 5), 130, 84], [subDays(today, 4), 132, 85], [subDays(today, 3), 134, 86],
    [subDays(today, 2), 136, 88], [subDays(today, 1), 141, 92], [today, 148, 96],
  ] as const;
  for (const [d, s, di] of bp) await prisma.homeReading.create({ data: { patientId: nour.id, kind: "BP", takenAt: at(d, 7, 12), systolic: s, diastolic: di } });
  await prisma.homeReading.create({ data: { patientId: nour.id, kind: "WEIGHT", takenAt: at(subDays(today, 8), 9), value: 74.2 } });
  await prisma.homeReading.create({ data: { patientId: nour.id, kind: "KICKS", takenAt: at(subDays(today, 1), 20), value: 12 } });
  await prisma.appointment.create({ data: { patientId: nour.id, type: "ANTENATAL", startsAt: at(addDays(today, 4), 10, 30), reason: "مراجعة الشهر السابع · تحليل السكر · إبرة فصيلة الدم السالبة", prep: "تعالي صايمة من الساعة 10 بالليل. جيبي هوية فصيلة الدم.", place: "عيادة د. سجاد، المنصور" } });
  await prisma.appointment.create({ data: { patientId: nour.id, type: "ANTENATAL", status: "COMPLETED", startsAt: at(subDays(today, 8), 11), notes: "وزن 74.2 كغ، ارتفاع الرحم مناسب، نبض الجنين 142. وُصف الحديد.", fetalHr: 142, weightKg: 74.2, scanNote: "الطفل زين" } });
  await prisma.appointment.create({ data: { patientId: nour.id, type: "ULTRASOUND", status: "COMPLETED", startsAt: at(subDays(today, 58), 12), notes: "سونار التشوهات 20+1: لا تشوهات ظاهرة، المشيمة أمامية عالية، السائل طبيعي.", scanNote: "ما شفنا أي مشكلة بالطفل" } });
  // Nour's medicines: iron taken most days, calcium twice daily, aspirin at bedtime (high criticality) missed 3 nights
  const nIron = await rx(nour.id, "IRON", "حبة الحديد", { timing: "EMPTY_STOMACH", times: "10:30", supplyCount: 30, supplyAt: subDays(today, 20) });
  const nCal = await rx(nour.id, "CALCIUM", "الكالسيوم", { timing: "AWAY_FROM_IRON", timesPerDay: 2, times: "14:00,20:00", startWeek: 20 });
  const nAsp = await rx(nour.id, "ASPIRIN", "أسبرين صغير", { timing: "BEDTIME", times: "21:00", startWeek: 12, stopWeek: 36, criticality: "HIGH", indication: "preeclampsia risk" });
  await rx(nour.id, "FOLIC", "حمض الفوليك", { stopWeek: 12, active: false });
  for (let i = 7; i >= 1; i--) {
    const day = subDays(today, i);
    if (i !== 3) await dose(nour.id, nIron.id, at(day, 10, 30), i === 5 ? "LATE" : "TAKEN");
    await dose(nour.id, nCal.id, at(day, 14), "TAKEN");
    if (i !== 2) await dose(nour.id, nCal.id, at(day, 20), "TAKEN");
    if (i > 3) await dose(nour.id, nAsp.id, at(day, 21), "TAKEN"); else if (i === 3) await dose(nour.id, nAsp.id, at(day, 21), "SKIPPED", "نسيت");
  }
  await dose(nour.id, nIron.id, at(today, 10, 30), "TAKEN");
  await rx(nour.id, "OTHER", "أعشاب للغثيان (من الصيدلية)", { source: "SELF", timing: "ANY" });
  await prisma.message.create({ data: { patientId: nour.id, fromPatient: true, body: "عندي حرقة بالمعدة كل ليلة، شنو أسوي؟", createdAt: at(subDays(today, 35), 21), readAt: at(subDays(today, 35), 21, 40) } });
  await prisma.message.create({ data: { patientId: nour.id, fromPatient: false, authorName: "الممرضة هبة", body: "طبيعية في هذه المرحلة. وجبات صغيرة، لا تنامي مباشرة بعد الأكل، ويمكنك أخذ مضاد حموضة بسيط. إذا صارت شديدة نراجع الدواء في الزيارة.", createdAt: at(subDays(today, 35), 21, 40) } });

  // 2. Zahraa: 35+6, reduced movements message
  const zahraa = await mk("زهراء كريم", "07802222222", 24, { bloodGroup: "A+", gravida: 1 });
  const zLmp = subDays(today, 35 * 7 + 6);
  const zDating = resolveDating({ lmp: zLmp, usDate: subDays(today, 35 * 7 + 6 - 63), usGaDays: 63 });
  await prisma.pregnancy.create({ data: { patientId: zahraa.id, lmp: zLmp, usDate: subDays(today, 35 * 7 + 6 - 63), usGaDays: 63, eddFinal: zDating.eddFinal, datingMethod: zDating.method } });
  await prisma.message.create({ data: { patientId: zahraa.id, fromPatient: true, body: "حركة الجنين قليلة من أمس", createdAt: subDays(new Date(), 0) } });
  await prisma.homeReading.create({ data: { patientId: zahraa.id, kind: "KICKS", takenAt: at(subDays(today, 1), 21), value: 6 } });
  await prisma.appointment.create({ data: { patientId: zahraa.id, type: "ANTENATAL", startsAt: at(addDays(today, 2), 9, 30), reason: "مراجعة الشهر التاسع · مسحة بسيطة قبل الولادة", place: "عيادة د. سجاد، المنصور", confirmed: true } });
  await prisma.dangerReport.create({ data: { patientId: zahraa.id, signs: "nomove", action: "CALL", source: "button", createdAt: at(today, 8, 5) } });

  // 3. Mariam: 25+1, OGTT not booked
  const mariam = await mk("مريم جاسم", "07803333333", 36, { bloodGroup: "B+", gravida: 2, para: 1 });
  const mLmp = subDays(today, 25 * 7 + 1);
  await prisma.pregnancy.create({ data: { patientId: mariam.id, lmp: mLmp, eddFinal: resolveDating({ lmp: mLmp }).eddFinal, datingMethod: "LMP" } });

  // 4. Huda: 44, intermenstrual bleeding, long cycles
  const huda = await mk("هدى عبد الأمير", "07804444444", 44, { cycleLengthAvg: 30 });
  const hudaPeriods = [subDays(today, 140), subDays(today, 100), subDays(today, 53), subDays(today, 6)];
  for (const s of hudaPeriods) for (let i = 0; i < 6; i++) await prisma.cycleLog.create({ data: { patientId: huda.id, date: addDays(s, i), bleeding: true, flow: i < 3 ? "HEAVY" : "MEDIUM", pain: i < 2 ? 6 : 3 } });
  await prisma.cycleLog.create({ data: { patientId: huda.id, date: subDays(today, 34), bleeding: true, flow: "SPOTTING" } });
  await prisma.cycleLog.create({ data: { patientId: huda.id, date: subDays(today, 33), bleeding: true, flow: "SPOTTING" } });
  await prisma.contraception.create({ data: { patientId: huda.id, method: "NONE", startedAt: subDays(today, 400) } });

  // 5. Ruqaya: implant expiring in 18 days
  const ruqaya = await mk("رقية سعد", "07805555555", 29);
  const implantStart = subDays(addDays(today, 18), 3 * 365);
  await prisma.contraception.create({ data: { patientId: ruqaya.id, method: "IMPLANT", brand: "Implanon NXT", startedAt: implantStart, expiresAt: computeExpiry("IMPLANT", implantStart) } });
  for (const s of [subDays(today, 95), subDays(today, 66), subDays(today, 38), subDays(today, 10)]) for (let i = 0; i < 4; i++) await prisma.cycleLog.create({ data: { patientId: ruqaya.id, date: addDays(s, i), bleeding: true, flow: i === 0 ? "MEDIUM" : "LIGHT" } });

  // 6. Aya: new lab result pending (represented as info message from lab)
  const aya = await mk("آية محمد", "07806666666", 27);
  const ayaPill = await prisma.contraception.create({ data: { patientId: aya.id, method: "COMBINED_PILL", brand: "Yasmin", startedAt: subDays(today, 200), packType: "P21_7", packStartedAt: subDays(today, 11), pillTime: "21:00" } });
  for (let i = 11; i >= 1; i--) if (i !== 2) await prisma.doseEvent.create({ data: { patientId: aya.id, contraceptionId: ayaPill.id, dueAt: at(subDays(today, i), 21), status: "TAKEN", loggedAt: at(subDays(today, i), 21, 5) } });
  await prisma.message.create({ data: { patientId: aya.id, fromPatient: true, body: "وصلتني نتيجة التحليل من المختبر، هل كلها طبيعية؟", createdAt: subDays(new Date(), 0) } });
  for (const s of [subDays(today, 84), subDays(today, 56), subDays(today, 28), today]) for (let i = 0; i < 5; i++) await prisma.cycleLog.create({ data: { patientId: aya.id, date: addDays(s, i), bleeding: true, flow: i < 2 ? "MEDIUM" : "LIGHT", mood: i === 0 ? "pain" : "calm" } });

  // 7. Saja: regular, contraception review today
  const saja = await mk("سجى علي", "07807777777", 22);
  await prisma.contraception.create({ data: { patientId: saja.id, method: "COMBINED_PILL", brand: "Microgynon", startedAt: subDays(today, 120), packType: "P21_7", packStartedAt: subDays(today, 4), pillTime: "22:00" } });
  await prisma.appointment.create({ data: { patientId: saja.id, type: "CONTRACEPTION_REVIEW", startsAt: at(today, 16, 30), reason: "صداع متكرر على الحبوب المركّبة" } });
  for (const s of [subDays(today, 70), subDays(today, 42), subDays(today, 14)]) for (let i = 0; i < 5; i++) await prisma.cycleLog.create({ data: { patientId: saja.id, date: addDays(s, i), bleeding: true, flow: "MEDIUM" } });

  // Today's other appointments
  const others = [
    ["فاطمة ناصر", "07808888881", 33, "FOLLOW_UP", 9, 0], ["رغد عامر", "07808888882", 26, "NEW_PATIENT", 9, 30], ["بتول حيدر", "07808888883", 38, "PAP_SMEAR", 10, 0],
    ["دعاء علاء", "07808888884", 30, "IUD_INSERTION", 11, 0], ["شهد وليد", "07808888885", 25, "ANTENATAL", 11, 30], ["إسراء ماجد", "07808888886", 41, "FOLLOW_UP", 12, 0],
    ["نبأ صالح", "07808888887", 28, "ULTRASOUND", 15, 0], ["زينب فاضل", "07808888888", 34, "POSTPARTUM", 15, 30], ["غفران رعد", "07808888889", 23, "FOLLOW_UP", 17, 0],
  ] as const;
  for (const [n, ph, age, type, h, m] of others) {
    const p = await mk(n, ph, age);
    await prisma.appointment.create({ data: { patientId: p.id, type, startsAt: at(today, h, m), status: h < 12 && n.startsWith("ر") ? "NO_SHOW" : "SCHEDULED" } });
  }
  console.log("seeded");
}

main().finally(() => prisma.$disconnect());
