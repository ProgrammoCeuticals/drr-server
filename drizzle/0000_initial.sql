-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MAIL_ROOM', 'SECRETARY', 'DD', 'DESK_OFFICER', 'HOD_HOU', 'ADMIN');
CREATE TYPE "MailStatus" AS ENUM ('REGISTERED', 'DIRECTOR_ROUTED', 'DISPATCHED_TO_DIVISION', 'ASSIGNED_TO_DESK_OFFICER', 'DESK_REVIEW_COMPLETED', 'HOD_HOU_REVIEWED', 'CLOSED');

-- CreateTable
CREATE TABLE "Division" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "divisionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Mail" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "companyApplicant" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "MailStatus" NOT NULL DEFAULT 'REGISTERED',
  "targetDivisionId" TEXT,
  "currentHolderId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Mail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectorialRouting" (
  "id" TEXT NOT NULL,
  "mailId" TEXT NOT NULL,
  "minutedTo" TEXT NOT NULL,
  "directiveComment" TEXT NOT NULL,
  "targetDivisionId" TEXT NOT NULL,
  "directiveDate" TIMESTAMP(3) NOT NULL,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectorialRouting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MailDispatch" (
  "id" TEXT NOT NULL,
  "mailId" TEXT NOT NULL,
  "dispatchedById" TEXT NOT NULL,
  "targetDivisionId" TEXT NOT NULL,
  "dispatchDate" TIMESTAMP(3) NOT NULL,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MailDispatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DivisionProcessing" (
  "id" TEXT NOT NULL,
  "mailId" TEXT NOT NULL,
  "divisionId" TEXT NOT NULL,
  "ddId" TEXT NOT NULL,
  "hodHouId" TEXT,
  "deskOfficerId" TEXT,
  "dateReceived" TIMESTAMP(3) NOT NULL,
  "dateAssigned" TIMESTAMP(3),
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DivisionProcessing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeskOfficerAction" (
  "id" TEXT NOT NULL,
  "mailId" TEXT NOT NULL,
  "deskOfficerId" TEXT NOT NULL,
  "workNote" TEXT NOT NULL,
  "dateCompleted" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeskOfficerAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HodHouReview" (
  "id" TEXT NOT NULL,
  "mailId" TEXT NOT NULL,
  "hodHouId" TEXT NOT NULL,
  "remark" TEXT NOT NULL,
  "dateReviewed" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HodHouReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MailClosure" (
  "id" TEXT NOT NULL,
  "mailId" TEXT NOT NULL,
  "closedById" TEXT NOT NULL,
  "closureRemark" TEXT NOT NULL,
  "dateClosed" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MailClosure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MailTimeline" (
  "id" TEXT NOT NULL,
  "mailId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" "MailStatus",
  "toStatus" "MailStatus",
  "performedById" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MailTimeline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Division_code_key" ON "Division"("code");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Mail_code_key" ON "Mail"("code");
CREATE UNIQUE INDEX "DirectorialRouting_mailId_key" ON "DirectorialRouting"("mailId");
CREATE UNIQUE INDEX "MailDispatch_mailId_key" ON "MailDispatch"("mailId");
CREATE UNIQUE INDEX "DivisionProcessing_mailId_key" ON "DivisionProcessing"("mailId");
CREATE UNIQUE INDEX "DeskOfficerAction_mailId_key" ON "DeskOfficerAction"("mailId");
CREATE UNIQUE INDEX "HodHouReview_mailId_key" ON "HodHouReview"("mailId");
CREATE UNIQUE INDEX "MailClosure_mailId_key" ON "MailClosure"("mailId");
CREATE INDEX "MailTimeline_mailId_createdAt_idx" ON "MailTimeline"("mailId", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Mail" ADD CONSTRAINT "Mail_targetDivisionId_fkey" FOREIGN KEY ("targetDivisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Mail" ADD CONSTRAINT "Mail_currentHolderId_fkey" FOREIGN KEY ("currentHolderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Mail" ADD CONSTRAINT "Mail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectorialRouting" ADD CONSTRAINT "DirectorialRouting_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectorialRouting" ADD CONSTRAINT "DirectorialRouting_targetDivisionId_fkey" FOREIGN KEY ("targetDivisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectorialRouting" ADD CONSTRAINT "DirectorialRouting_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MailDispatch" ADD CONSTRAINT "MailDispatch_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailDispatch" ADD CONSTRAINT "MailDispatch_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MailDispatch" ADD CONSTRAINT "MailDispatch_targetDivisionId_fkey" FOREIGN KEY ("targetDivisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DivisionProcessing" ADD CONSTRAINT "DivisionProcessing_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DivisionProcessing" ADD CONSTRAINT "DivisionProcessing_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DivisionProcessing" ADD CONSTRAINT "DivisionProcessing_ddId_fkey" FOREIGN KEY ("ddId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DivisionProcessing" ADD CONSTRAINT "DivisionProcessing_hodHouId_fkey" FOREIGN KEY ("hodHouId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DivisionProcessing" ADD CONSTRAINT "DivisionProcessing_deskOfficerId_fkey" FOREIGN KEY ("deskOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeskOfficerAction" ADD CONSTRAINT "DeskOfficerAction_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeskOfficerAction" ADD CONSTRAINT "DeskOfficerAction_deskOfficerId_fkey" FOREIGN KEY ("deskOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HodHouReview" ADD CONSTRAINT "HodHouReview_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HodHouReview" ADD CONSTRAINT "HodHouReview_hodHouId_fkey" FOREIGN KEY ("hodHouId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MailClosure" ADD CONSTRAINT "MailClosure_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailClosure" ADD CONSTRAINT "MailClosure_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MailTimeline" ADD CONSTRAINT "MailTimeline_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailTimeline" ADD CONSTRAINT "MailTimeline_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
