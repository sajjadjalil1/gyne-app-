-- A doctor can switch off a staff account (someone left the clinic)
ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMP(3);
