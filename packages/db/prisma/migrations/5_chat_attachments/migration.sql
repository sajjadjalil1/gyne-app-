-- Photos and voice notes in the patient-clinic chat
CREATE TYPE "AttachmentKind" AS ENUM ('IMAGE', 'AUDIO');
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "storage" TEXT NOT NULL,
    "key" TEXT,
    "data" BYTEA,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Attachment_messageId_key" ON "Attachment"("messageId");
CREATE INDEX "Attachment_patientId_idx" ON "Attachment"("patientId");
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
