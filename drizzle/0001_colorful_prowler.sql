CREATE TYPE "public"."MailStatus" AS ENUM('REGISTERED', 'DIRECTOR_ROUTED', 'DISPATCHED_TO_DIVISION', 'ASSIGNED_TO_DESK_OFFICER', 'DESK_REVIEW_COMPLETED', 'HOD_HOU_REVIEWED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('MAIL_ROOM', 'SECRETARY', 'DD', 'DESK_OFFICER', 'HOD_HOU', 'ADMIN');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "DeskOfficerAction" (
	"id" text PRIMARY KEY NOT NULL,
	"mailId" text NOT NULL,
	"recordedById" text NOT NULL,
	"deskOfficerName" text,
	"workNote" text NOT NULL,
	"dateCompleted" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "DirectorialRouting" (
	"id" text PRIMARY KEY NOT NULL,
	"mailId" text NOT NULL,
	"minutedTo" text NOT NULL,
	"directiveComment" text NOT NULL,
	"targetDivisionId" text NOT NULL,
	"directiveDate" timestamp NOT NULL,
	"recordedById" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "DivisionProcessing" (
	"id" text PRIMARY KEY NOT NULL,
	"mailId" text NOT NULL,
	"divisionId" text NOT NULL,
	"recordedById" text NOT NULL,
	"ddName" text,
	"hodHouName" text,
	"deskOfficerName" text,
	"dateReceived" timestamp NOT NULL,
	"dateAssigned" timestamp,
	"remark" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Division" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "HodHouReview" (
	"id" text PRIMARY KEY NOT NULL,
	"mailId" text NOT NULL,
	"recordedById" text NOT NULL,
	"hodHouName" text,
	"remark" text NOT NULL,
	"dateReviewed" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MailClosure" (
	"id" text PRIMARY KEY NOT NULL,
	"mailId" text NOT NULL,
	"closedById" text NOT NULL,
	"closureRemark" text NOT NULL,
	"dateClosed" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MailDispatch" (
	"id" text PRIMARY KEY NOT NULL,
	"mailId" text NOT NULL,
	"dispatchedById" text NOT NULL,
	"targetDivisionId" text NOT NULL,
	"dispatchDate" timestamp NOT NULL,
	"remark" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MailTimeline" (
	"id" text PRIMARY KEY NOT NULL,
	"mailId" text NOT NULL,
	"action" text NOT NULL,
	"fromStatus" "MailStatus",
	"toStatus" "MailStatus",
	"performedById" text NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Mail" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"companyApplicant" text NOT NULL,
	"subject" text NOT NULL,
	"status" "MailStatus" DEFAULT 'REGISTERED' NOT NULL,
	"targetDivisionId" text,
	"currentHolderId" text,
	"createdById" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"role" "Role" NOT NULL,
	"divisionId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DeskOfficerAction" ADD CONSTRAINT "DeskOfficerAction_mailId_Mail_id_fk" FOREIGN KEY ("mailId") REFERENCES "public"."Mail"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DeskOfficerAction" ADD CONSTRAINT "DeskOfficerAction_recordedById_User_id_fk" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DirectorialRouting" ADD CONSTRAINT "DirectorialRouting_mailId_Mail_id_fk" FOREIGN KEY ("mailId") REFERENCES "public"."Mail"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DirectorialRouting" ADD CONSTRAINT "DirectorialRouting_targetDivisionId_Division_id_fk" FOREIGN KEY ("targetDivisionId") REFERENCES "public"."Division"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DirectorialRouting" ADD CONSTRAINT "DirectorialRouting_recordedById_User_id_fk" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DivisionProcessing" ADD CONSTRAINT "DivisionProcessing_mailId_Mail_id_fk" FOREIGN KEY ("mailId") REFERENCES "public"."Mail"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DivisionProcessing" ADD CONSTRAINT "DivisionProcessing_divisionId_Division_id_fk" FOREIGN KEY ("divisionId") REFERENCES "public"."Division"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DivisionProcessing" ADD CONSTRAINT "DivisionProcessing_recordedById_User_id_fk" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "HodHouReview" ADD CONSTRAINT "HodHouReview_mailId_Mail_id_fk" FOREIGN KEY ("mailId") REFERENCES "public"."Mail"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "HodHouReview" ADD CONSTRAINT "HodHouReview_recordedById_User_id_fk" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MailClosure" ADD CONSTRAINT "MailClosure_mailId_Mail_id_fk" FOREIGN KEY ("mailId") REFERENCES "public"."Mail"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MailClosure" ADD CONSTRAINT "MailClosure_closedById_User_id_fk" FOREIGN KEY ("closedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MailDispatch" ADD CONSTRAINT "MailDispatch_mailId_Mail_id_fk" FOREIGN KEY ("mailId") REFERENCES "public"."Mail"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MailDispatch" ADD CONSTRAINT "MailDispatch_dispatchedById_User_id_fk" FOREIGN KEY ("dispatchedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MailDispatch" ADD CONSTRAINT "MailDispatch_targetDivisionId_Division_id_fk" FOREIGN KEY ("targetDivisionId") REFERENCES "public"."Division"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MailTimeline" ADD CONSTRAINT "MailTimeline_mailId_Mail_id_fk" FOREIGN KEY ("mailId") REFERENCES "public"."Mail"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MailTimeline" ADD CONSTRAINT "MailTimeline_performedById_User_id_fk" FOREIGN KEY ("performedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Mail" ADD CONSTRAINT "Mail_targetDivisionId_Division_id_fk" FOREIGN KEY ("targetDivisionId") REFERENCES "public"."Division"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Mail" ADD CONSTRAINT "Mail_currentHolderId_User_id_fk" FOREIGN KEY ("currentHolderId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Mail" ADD CONSTRAINT "Mail_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "User" ADD CONSTRAINT "User_divisionId_Division_id_fk" FOREIGN KEY ("divisionId") REFERENCES "public"."Division"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "DeskOfficerAction_mailId_key" ON "DeskOfficerAction" USING btree ("mailId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "DirectorialRouting_mailId_key" ON "DirectorialRouting" USING btree ("mailId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "DivisionProcessing_mailId_key" ON "DivisionProcessing" USING btree ("mailId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Division_code_key" ON "Division" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "HodHouReview_mailId_key" ON "HodHouReview" USING btree ("mailId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "MailClosure_mailId_key" ON "MailClosure" USING btree ("mailId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "MailDispatch_mailId_key" ON "MailDispatch" USING btree ("mailId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "MailTimeline_mailId_createdAt_idx" ON "MailTimeline" USING btree ("mailId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Mail_code_key" ON "Mail" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" USING btree ("email");