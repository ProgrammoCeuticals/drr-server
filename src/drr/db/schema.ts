import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const roleEnum = pgEnum("Role", ["MAIL_ROOM", "SECRETARY", "DD", "DESK_OFFICER", "HOD_HOU", "ADMIN"]);
export const mailStatusEnum = pgEnum("MailStatus", [
  "REGISTERED",
  "DIRECTOR_ROUTED",
  "DISPATCHED_TO_DIVISION",
  "ASSIGNED_TO_DESK_OFFICER",
  "DESK_REVIEW_COMPLETED",
  "HOD_HOU_REVIEWED",
  "CLOSED"
]);

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const timestamps = {
  createdAt: timestamp("createdAt", { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).notNull().defaultNow()
};

export const divisions = pgTable("Division", {
  id: id(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  ...timestamps
}, (table) => ({
  codeIdx: uniqueIndex("Division_code_key").on(table.code)
}));

export const users = pgTable("User", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("passwordHash").notNull(),
  role: roleEnum("role").notNull(),
  divisionId: text("divisionId").references(() => divisions.id, { onDelete: "set null" }),
  ...timestamps
}, (table) => ({
  emailIdx: uniqueIndex("User_email_key").on(table.email)
}));

export const mails = pgTable("Mail", {
  id: id(),
  code: text("code").notNull(),
  companyApplicant: text("companyApplicant").notNull(),
  subject: text("subject").notNull(),
  status: mailStatusEnum("status").notNull().default("REGISTERED"),
  targetDivisionId: text("targetDivisionId").references(() => divisions.id, { onDelete: "set null" }),
  currentHolderId: text("currentHolderId").references(() => users.id, { onDelete: "set null" }),
  createdById: text("createdById").notNull().references(() => users.id),
  ...timestamps
}, (table) => ({
  codeIdx: uniqueIndex("Mail_code_key").on(table.code)
}));

export const directorialRoutings = pgTable("DirectorialRouting", {
  id: id(),
  mailId: text("mailId").notNull().references(() => mails.id, { onDelete: "cascade" }),
  minutedTo: text("minutedTo").notNull(),
  directiveComment: text("directiveComment").notNull(),
  targetDivisionId: text("targetDivisionId").notNull().references(() => divisions.id),
  directiveDate: timestamp("directiveDate").notNull(),
  recordedById: text("recordedById").notNull().references(() => users.id),
  ...timestamps
}, (table) => ({
  mailIdx: uniqueIndex("DirectorialRouting_mailId_key").on(table.mailId)
}));

export const mailDispatches = pgTable("MailDispatch", {
  id: id(),
  mailId: text("mailId").notNull().references(() => mails.id, { onDelete: "cascade" }),
  dispatchedById: text("dispatchedById").notNull().references(() => users.id),
  targetDivisionId: text("targetDivisionId").notNull().references(() => divisions.id),
  dispatchDate: timestamp("dispatchDate").notNull(),
  remark: text("remark"),
  ...timestamps
}, (table) => ({
  mailIdx: uniqueIndex("MailDispatch_mailId_key").on(table.mailId)
}));

export const divisionProcessings = pgTable("DivisionProcessing", {
  id: id(),
  mailId: text("mailId").notNull().references(() => mails.id, { onDelete: "cascade" }),
  divisionId: text("divisionId").notNull().references(() => divisions.id),
  recordedById: text("recordedById").notNull().references(() => users.id),
  ddName: text("ddName"),
  hodHouName: text("hodHouName"),
  deskOfficerName: text("deskOfficerName"),
  dateReceived: timestamp("dateReceived").notNull(),
  dateAssigned: timestamp("dateAssigned"),
  remark: text("remark"),
  ...timestamps
}, (table) => ({
  mailIdx: uniqueIndex("DivisionProcessing_mailId_key").on(table.mailId)
}));

export const deskOfficerActions = pgTable("DeskOfficerAction", {
  id: id(),
  mailId: text("mailId").notNull().references(() => mails.id, { onDelete: "cascade" }),
  recordedById: text("recordedById").notNull().references(() => users.id),
  deskOfficerName: text("deskOfficerName"),
  workNote: text("workNote").notNull(),
  dateCompleted: timestamp("dateCompleted").notNull(),
  ...timestamps
}, (table) => ({
  mailIdx: uniqueIndex("DeskOfficerAction_mailId_key").on(table.mailId)
}));

export const hodHouReviews = pgTable("HodHouReview", {
  id: id(),
  mailId: text("mailId").notNull().references(() => mails.id, { onDelete: "cascade" }),
  recordedById: text("recordedById").notNull().references(() => users.id),
  hodHouName: text("hodHouName"),
  remark: text("remark").notNull(),
  dateReviewed: timestamp("dateReviewed").notNull(),
  ...timestamps
}, (table) => ({
  mailIdx: uniqueIndex("HodHouReview_mailId_key").on(table.mailId)
}));

export const mailClosures = pgTable("MailClosure", {
  id: id(),
  mailId: text("mailId").notNull().references(() => mails.id, { onDelete: "cascade" }),
  closedById: text("closedById").notNull().references(() => users.id),
  closureRemark: text("closureRemark").notNull(),
  dateClosed: timestamp("dateClosed").notNull(),
  ...timestamps
}, (table) => ({
  mailIdx: uniqueIndex("MailClosure_mailId_key").on(table.mailId)
}));

export const mailTimelines = pgTable("MailTimeline", {
  id: id(),
  mailId: text("mailId").notNull().references(() => mails.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  fromStatus: mailStatusEnum("fromStatus"),
  toStatus: mailStatusEnum("toStatus"),
  performedById: text("performedById").notNull().references(() => users.id),
  note: text("note"),
  createdAt: timestamp("createdAt", { withTimezone: false }).notNull().defaultNow()
}, (table) => ({
  mailCreatedIdx: index("MailTimeline_mailId_createdAt_idx").on(table.mailId, table.createdAt)
}));

export const usersRelations = relations(users, ({ one }) => ({
  division: one(divisions, { fields: [users.divisionId], references: [divisions.id] })
}));

export const mailsRelations = relations(mails, ({ one }) => ({
  targetDivision: one(divisions, { fields: [mails.targetDivisionId], references: [divisions.id] }),
  currentHolder: one(users, { fields: [mails.currentHolderId], references: [users.id] }),
  createdBy: one(users, { fields: [mails.createdById], references: [users.id] })
}));

export type Role = typeof roleEnum.enumValues[number];
export type MailStatus = typeof mailStatusEnum.enumValues[number];
export type User = typeof users.$inferSelect;
export type Mail = typeof mails.$inferSelect;
