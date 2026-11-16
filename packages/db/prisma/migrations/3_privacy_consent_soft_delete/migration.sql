-- Privacy consent in the app, and soft delete of a patient file (purged after 30 days)
ALTER TABLE "Patient" ADD COLUMN "consentVersion" TEXT;
ALTER TABLE "Patient" ADD COLUMN "consentedAt" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN "deletedBy" TEXT;
CREATE INDEX "Patient_clinicId_deletedAt_idx" ON "Patient"("clinicId", "deletedAt");
