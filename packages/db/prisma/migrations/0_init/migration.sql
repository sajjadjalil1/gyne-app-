-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('DOCTOR', 'NURSE', 'RECEPTION', 'PATIENT');

-- CreateEnum
CREATE TYPE "public"."ApptType" AS ENUM ('NEW_PATIENT', 'FOLLOW_UP', 'ANTENATAL', 'ULTRASOUND', 'CONTRACEPTION_REVIEW', 'IUD_INSERTION', 'IMPLANT_REMOVAL', 'PAP_SMEAR', 'POSTPARTUM');

-- CreateEnum
CREATE TYPE "public"."ApptStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."Flow" AS ENUM ('SPOTTING', 'LIGHT', 'MEDIUM', 'HEAVY');

-- CreateEnum
CREATE TYPE "public"."ContraMethod" AS ENUM ('COMBINED_PILL', 'PROGESTIN_PILL', 'PATCH', 'RING', 'INJECTION', 'IMPLANT', 'IUD_HORMONAL', 'IUD_COPPER', 'CONDOM', 'FERTILITY_AWARENESS', 'NONE');

-- CreateEnum
CREATE TYPE "public"."PackType" AS ENUM ('P21_7', 'P24_4', 'P28', 'POP');

-- CreateEnum
CREATE TYPE "public"."TimingRule" AS ENUM ('ANY', 'MORNING', 'BEDTIME', 'WITH_FOOD', 'EMPTY_STOMACH', 'AWAY_FROM_IRON');

-- CreateEnum
CREATE TYPE "public"."Criticality" AS ENUM ('HIGH', 'NORMAL');

-- CreateEnum
CREATE TYPE "public"."RxSource" AS ENUM ('PRESCRIBED', 'SELF');

-- CreateEnum
CREATE TYPE "public"."DoseStatus" AS ENUM ('TAKEN', 'LATE', 'SKIPPED', 'MISSED');

-- CreateEnum
CREATE TYPE "public"."ReadingKind" AS ENUM ('BP', 'WEIGHT', 'GLUCOSE', 'KICKS');

-- CreateEnum
CREATE TYPE "public"."Severity" AS ENUM ('CRITICAL', 'WARNING', 'INFO');

-- CreateTable
CREATE TABLE "public"."Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "mapsUrl" TEXT,
    "nurseHours" TEXT,
    "replyHours" INTEGER NOT NULL DEFAULT 2,
    "erHospital" TEXT,
    "erMapsUrl" TEXT,
    "missedPillOne" TEXT,
    "missedPillTwo" TEXT,
    "fastingAdvice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Patient" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "bloodGroup" TEXT,
    "gravida" INTEGER NOT NULL DEFAULT 0,
    "para" INTEGER NOT NULL DEFAULT 0,
    "abortions" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cycleLengthAvg" INTEGER NOT NULL DEFAULT 28,
    "periodLengthAvg" INTEGER NOT NULL DEFAULT 5,
    "wakeTime" TEXT NOT NULL DEFAULT '07:00',
    "sleepTime" TEXT NOT NULL DEFAULT '23:00',
    "ramadanMode" BOOLEAN NOT NULL DEFAULT false,
    "detailedNotifications" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "public"."ApptType" NOT NULL,
    "status" "public"."ApptStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 20,
    "reason" TEXT,
    "notes" TEXT,
    "prep" TEXT,
    "place" TEXT,
    "confirmed" BOOLEAN,
    "fetalHr" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "scanNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CycleLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bleeding" BOOLEAN NOT NULL DEFAULT false,
    "flow" "public"."Flow",
    "pain" INTEGER,
    "mood" TEXT,
    "symptoms" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contraception" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "method" "public"."ContraMethod" NOT NULL,
    "brand" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "note" TEXT,
    "packType" "public"."PackType",
    "packStartedAt" TIMESTAMP(3),
    "pillTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contraception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Prescription" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "drug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "strength" TEXT,
    "dose" TEXT NOT NULL DEFAULT 'حبة وحدة',
    "timesPerDay" INTEGER NOT NULL DEFAULT 1,
    "timing" "public"."TimingRule" NOT NULL DEFAULT 'ANY',
    "times" TEXT,
    "startAt" TIMESTAMP(3),
    "startWeek" INTEGER,
    "stopAt" TIMESTAMP(3),
    "stopWeek" INTEGER,
    "indication" TEXT,
    "criticality" "public"."Criticality" NOT NULL DEFAULT 'NORMAL',
    "supplyCount" INTEGER,
    "supplyAt" TIMESTAMP(3),
    "source" "public"."RxSource" NOT NULL DEFAULT 'PRESCRIBED',
    "reviewedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DoseEvent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "contraceptionId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."DoseStatus" NOT NULL,
    "reason" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DangerReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "signs" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'NONE',
    "source" TEXT NOT NULL DEFAULT 'button',
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DangerReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pregnancy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "lmp" TIMESTAMP(3),
    "usDate" TIMESTAMP(3),
    "usGaDays" INTEGER,
    "eddFinal" TIMESTAMP(3) NOT NULL,
    "datingMethod" TEXT NOT NULL,
    "rhNegative" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "outcome" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pregnancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HomeReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "kind" "public"."ReadingKind" NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "value" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fromPatient" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "authorName" TEXT,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "severity" "public"."Severity" NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "meta" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "public"."Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CycleLog_patientId_date_key" ON "public"."CycleLog"("patientId", "date");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "public"."Prescription"("patientId");

-- CreateIndex
CREATE INDEX "DoseEvent_patientId_dueAt_idx" ON "public"."DoseEvent"("patientId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "DoseEvent_prescriptionId_dueAt_key" ON "public"."DoseEvent"("prescriptionId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "DoseEvent_contraceptionId_dueAt_key" ON "public"."DoseEvent"("contraceptionId", "dueAt");

-- CreateIndex
CREATE INDEX "DangerReport_patientId_createdAt_idx" ON "public"."DangerReport"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "OtpCode_phone_idx" ON "public"."OtpCode"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "public"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "public"."AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_target_idx" ON "public"."AuditLog"("target");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CycleLog" ADD CONSTRAINT "CycleLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contraception" ADD CONSTRAINT "Contraception_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prescription" ADD CONSTRAINT "Prescription_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoseEvent" ADD CONSTRAINT "DoseEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoseEvent" ADD CONSTRAINT "DoseEvent_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "public"."Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoseEvent" ADD CONSTRAINT "DoseEvent_contraceptionId_fkey" FOREIGN KEY ("contraceptionId") REFERENCES "public"."Contraception"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DangerReport" ADD CONSTRAINT "DangerReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pregnancy" ADD CONSTRAINT "Pregnancy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HomeReading" ADD CONSTRAINT "HomeReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

