import express from "express";
import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, lte, ne, or, SQL } from "drizzle-orm";
import { db } from "./db/index.js";
import {
  deskOfficerActions,
  directorialRoutings,
  divisionProcessings,
  divisions,
  hodHouReviews,
  mailClosures,
  mailDispatches,
  mails,
  mailTimelines,
  type Mail,
  type MailStatus,
  type Role,
  users
} from "./db/schema.js";
import { requireAuth, requireRole, signToken } from "./auth.js";

const router = express.Router();

const publicUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  divisionId: users.divisionId,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt
};

function required(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function dateValue(value: unknown, name: string) {
  const date = new Date(required(value, name));
  if (Number.isNaN(date.getTime())) throw new Error(`${name} must be a valid date`);
  return date;
}

function asyncRoute(handler: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function assertStatus(actual: MailStatus, expected: MailStatus) {
  if (actual !== expected) throw new Error(`Mail must be ${expected} before this action`);
}

function touch() { return new Date(); }

async function one<T>(rows: T[], message = "Record not found") {
  const row = rows[0];
  if (!row) throw new Error(message);
  return row;
}

function mailScope(user: NonNullable<express.Request["user"]>): SQL | undefined {
  if (["ADMIN", "MAIL_ROOM", "SECRETARY"].includes(user.role)) return undefined;
  if (user.role === "DD") return eq(mails.targetDivisionId, user.divisionId || "__none__");
  return undefined;
}

async function listUsers() {
  const rows = await db
    .select({ ...publicUserColumns, division: divisions })
    .from(users)
    .leftJoin(divisions, eq(users.divisionId, divisions.id))
    .orderBy(asc(users.name));
  return rows.map((row) => ({ ...row, division: row.division }));
}

async function fetchMailData(mailIds: string[]) {
  if (!mailIds.length) return { divMap: new Map(), drMap: new Map(), dispMap: new Map(), dpMap: new Map(), deskMap: new Map(), hodMap: new Map(), closureMap: new Map() };
  const [divRows, drRows, dispRows, dpRows, deskRows, hodRows, closureRows] = await Promise.all([
    db.select().from(divisions),
    db.select().from(directorialRoutings).where(inArray(directorialRoutings.mailId, mailIds)),
    db.select().from(mailDispatches).where(inArray(mailDispatches.mailId, mailIds)),
    db.select().from(divisionProcessings).where(inArray(divisionProcessings.mailId, mailIds)),
    db.select().from(deskOfficerActions).where(inArray(deskOfficerActions.mailId, mailIds)),
    db.select().from(hodHouReviews).where(inArray(hodHouReviews.mailId, mailIds)),
    db.select().from(mailClosures).where(inArray(mailClosures.mailId, mailIds))
  ]);
  const divMap = new Map(divRows.map((d) => [d.id, d]));
  return {
    divMap,
    drMap: new Map(drRows.map((r) => [r.mailId, r])),
    dispMap: new Map(dispRows.map((r) => [r.mailId, r])),
    dpMap: new Map(dpRows.map((r) => [r.mailId, r])),
    deskMap: new Map(deskRows.map((r) => [r.mailId, r])),
    hodMap: new Map(hodRows.map((r) => [r.mailId, r])),
    closureMap: new Map(closureRows.map((r) => [r.mailId, r]))
  };
}

async function fetchUserMap(userIds: (string | null)[]) {
  const ids = [...new Set(userIds.filter(Boolean))] as string[];
  if (!ids.length) return new Map<string, any>();
  const rows = await db.select(publicUserColumns).from(users).where(inArray(users.id, ids));
  return new Map(rows.map((u) => [u.id, u]));
}

function shapeMail(mail: Mail, maps: Awaited<ReturnType<typeof fetchMailData>>, userMap: Map<string, any>) {
  const { divMap, drMap, dispMap, dpMap, deskMap, hodMap, closureMap } = maps;
  const dp = dpMap.get(mail.id) ?? null;
  return {
    ...mail,
    targetDivision: divMap.get(mail.targetDivisionId ?? "") ?? null,
    currentHolder: userMap.get(mail.currentHolderId ?? "") ?? null,
    createdBy: userMap.get(mail.createdById) ?? null,
    directorialRouting: drMap.get(mail.id) ?? null,
    dispatch: dispMap.get(mail.id) ?? null,
    divisionProcessing: dp ? { ...dp, division: divMap.get(dp.divisionId) ?? null } : null,
    deskOfficerAction: deskMap.get(mail.id) ?? null,
    hodHouReview: hodMap.get(mail.id) ?? null,
    closure: closureMap.get(mail.id) ?? null
  };
}

async function hydrateMail(mail: Mail) {
  const maps = await fetchMailData([mail.id]);
  const userMap = await fetchUserMap([mail.currentHolderId, mail.createdById]);
  return shapeMail(mail, maps, userMap);
}

async function hydrateMails(items: Mail[]) {
  if (!items.length) return [];
  const ids = items.map((m) => m.id);
  const maps = await fetchMailData(ids);
  const userMap = await fetchUserMap(items.flatMap((m) => [m.currentHolderId, m.createdById]));
  return items.map((mail) => shapeMail(mail, maps, userMap));
}

async function addTimeline(tx: any, mailId: string, action: string, performedById: string, fromStatus?: MailStatus | null, toStatus?: MailStatus | null, note?: string | null) {
  await tx.insert(mailTimelines).values({ mailId, action, performedById, fromStatus, toStatus, note });
}

// Public routes
router.get("/health", (_req, res) => res.json({ ok: true, service: "drr" }));

router.post("/auth/login", asyncRoute(async (req, res) => {
  const email = required(req.body.email, "Email").toLowerCase();
  const password = required(req.body.password, "Password");
  const row = await db.select({ user: users, division: divisions }).from(users).leftJoin(divisions, eq(users.divisionId, divisions.id)).where(eq(users.email, email)).limit(1);
  const found = row[0];
  if (!found || !(await bcrypt.compare(password, found.user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const safeUser = { id: found.user.id, email: found.user.email, name: found.user.name, role: found.user.role, divisionId: found.user.divisionId, division: found.division };
  res.json({ token: signToken(safeUser), user: safeUser });
}));

router.post("/auth/register-admin", asyncRoute(async (req, res) => {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN")).limit(1);
  if (existing.length) return res.status(409).json({ message: "Admin already exists" });
  const passwordHash = await bcrypt.hash(required(req.body.password, "Password"), 10);
  const [user] = await db.insert(users).values({ name: required(req.body.name, "Name"), email: required(req.body.email, "Email").toLowerCase(), passwordHash, role: "ADMIN" }).returning(publicUserColumns);
  res.status(201).json(user);
}));

// All routes below require auth
router.use(requireAuth);

router.get("/users", requireRole("ADMIN", "DD"), asyncRoute(async (_req, res) => res.json(await listUsers())));

router.post("/users", requireRole("ADMIN"), asyncRoute(async (req, res) => {
  const passwordHash = await bcrypt.hash(required(req.body.password, "Password"), 10);
  const [user] = await db.insert(users).values({ name: required(req.body.name, "Name"), email: required(req.body.email, "Email").toLowerCase(), passwordHash, role: required(req.body.role, "Role") as Role, divisionId: req.body.divisionId || null }).returning(publicUserColumns);
  res.status(201).json(user);
}));

router.patch("/users/:id", requireRole("ADMIN"), asyncRoute(async (req, res) => {
  const data: Partial<typeof users.$inferInsert> = { updatedAt: touch() };
  if (req.body.name !== undefined) data.name = required(req.body.name, "Name");
  if (req.body.email !== undefined) data.email = required(req.body.email, "Email").toLowerCase();
  if (req.body.role !== undefined) data.role = required(req.body.role, "Role") as Role;
  if (req.body.divisionId !== undefined) data.divisionId = req.body.divisionId || null;
  if (req.body.password) data.passwordHash = await bcrypt.hash(required(req.body.password, "Password"), 10);
  const [user] = await db.update(users).set(data).where(eq(users.id, req.params.id)).returning(publicUserColumns);
  res.json(user);
}));

router.delete("/users/:id", requireRole("ADMIN"), asyncRoute(async (req, res) => {
  await db.delete(users).where(eq(users.id, req.params.id));
  res.status(204).send();
}));

router.get("/divisions", asyncRoute(async (_req, res) => {
  res.json(await db.select().from(divisions).orderBy(asc(divisions.name)));
}));

router.post("/divisions", requireRole("ADMIN"), asyncRoute(async (req, res) => {
  const [division] = await db.insert(divisions).values({ name: required(req.body.name, "Name"), code: required(req.body.code, "Code").toUpperCase() }).returning();
  res.status(201).json(division);
}));

router.patch("/divisions/:id", requireRole("ADMIN"), asyncRoute(async (req, res) => {
  const [division] = await db.update(divisions).set({ name: required(req.body.name, "Name"), code: required(req.body.code, "Code").toUpperCase(), updatedAt: touch() }).where(eq(divisions.id, req.params.id)).returning();
  res.json(division);
}));

router.delete("/divisions/:id", requireRole("ADMIN"), asyncRoute(async (req, res) => {
  await db.delete(divisions).where(eq(divisions.id, req.params.id));
  res.status(204).send();
}));

function mailFilters(req: express.Request) {
  const filters: (SQL | undefined)[] = [mailScope(req.user!)];
  if (req.query.status) filters.push(eq(mails.status, req.query.status as MailStatus));
  if (req.query.divisionId) filters.push(eq(mails.targetDivisionId, String(req.query.divisionId)));
  if (req.query.search) {
    const q = `%${String(req.query.search)}%`;
    filters.push(or(ilike(mails.code, q), ilike(mails.companyApplicant, q), ilike(mails.subject, q)));
  }
  if (req.query.dateFrom) filters.push(gte(mails.createdAt, new Date(String(req.query.dateFrom))));
  if (req.query.dateTo) filters.push(lte(mails.createdAt, new Date(String(req.query.dateTo))));
  return filters.filter(Boolean) as SQL[];
}

router.get("/mails", asyncRoute(async (req, res) => {
  const filters = mailFilters(req);
  let query = db.selectDistinct({ mail: mails }).from(mails).leftJoin(divisionProcessings, eq(divisionProcessings.mailId, mails.id)).$dynamic();
  if (filters.length) query = query.where(and(...filters));
  const rows = await query.orderBy(desc(mails.updatedAt));
  res.json(await hydrateMails(rows.map((row) => row.mail)));
}));

router.get("/mails/:id", asyncRoute(async (req, res) => {
  const filters = [eq(mails.id, req.params.id), mailScope(req.user!)].filter(Boolean) as SQL[];
  const row = await db.selectDistinct({ mail: mails }).from(mails).leftJoin(divisionProcessings, eq(divisionProcessings.mailId, mails.id)).where(and(...filters)).limit(1);
  if (!row.length) return res.status(404).json({ message: "Mail not found" });
  res.json(await hydrateMail(row[0].mail));
}));

router.patch("/mails/:id", requireRole("ADMIN"), asyncRoute(async (req, res) => {
  const data: Partial<typeof mails.$inferInsert> = { updatedAt: touch() };
  if (req.body.code !== undefined) data.code = required(req.body.code, "Code");
  if (req.body.companyApplicant !== undefined) data.companyApplicant = required(req.body.companyApplicant, "Company/Applicant");
  if (req.body.subject !== undefined) data.subject = required(req.body.subject, "Subject");
  const [mail] = await db.update(mails).set(data).where(eq(mails.id, req.params.id)).returning();
  res.json(await hydrateMail(mail));
}));

router.post("/mails", requireRole("MAIL_ROOM"), asyncRoute(async (req, res) => {
  const created = await db.transaction(async (tx) => {
    const [mail] = await tx.insert(mails).values({ code: required(req.body.code, "Code"), companyApplicant: required(req.body.companyApplicant, "Company/Applicant"), subject: required(req.body.subject, "Subject"), createdById: req.user!.id, currentHolderId: req.user!.id }).returning();
    await addTimeline(tx, mail.id, "Mail registered", req.user!.id, null, "REGISTERED", mail.subject);
    return mail;
  });
  res.status(201).json(await hydrateMail(created));
}));

router.patch("/mails/:id/directorial-routing", requireRole("SECRETARY"), asyncRoute(async (req, res) => {
  const id = await db.transaction(async (tx) => {
    const mail = await one(await tx.select().from(mails).where(eq(mails.id, req.params.id)).limit(1), "Mail not found");
    assertStatus(mail.status, "REGISTERED");
    const targetDivisionId = required(req.body.targetDivisionId, "Target division");
    await tx.insert(directorialRoutings).values({ mailId: mail.id, minutedTo: required(req.body.minutedTo, "Minuted to"), directiveComment: required(req.body.directiveComment, "Directive/comment"), targetDivisionId, directiveDate: dateValue(req.body.directiveDate, "Directive date"), recordedById: req.user!.id });
    await tx.update(mails).set({ status: "DIRECTOR_ROUTED", targetDivisionId, currentHolderId: req.user!.id, updatedAt: touch() }).where(eq(mails.id, mail.id));
    await addTimeline(tx, mail.id, "Director directive recorded — Secretary", req.user!.id, mail.status, "DIRECTOR_ROUTED", req.body.directiveComment);
    return mail.id;
  });
  res.json(await hydrateMail(await one(await db.select().from(mails).where(eq(mails.id, id)).limit(1))));
}));

router.patch("/mails/:id/dispatch", requireRole("MAIL_ROOM"), asyncRoute(async (req, res) => {
  const id = await db.transaction(async (tx) => {
    const mail = await one(await tx.select().from(mails).where(eq(mails.id, req.params.id)).limit(1), "Mail not found");
    assertStatus(mail.status, "DIRECTOR_ROUTED");
    if (!mail.targetDivisionId) throw new Error("Mail has no target division");
    await tx.insert(mailDispatches).values({ mailId: mail.id, dispatchedById: req.body.dispatchedById || req.user!.id, targetDivisionId: mail.targetDivisionId, dispatchDate: dateValue(req.body.dispatchDate, "Dispatch date"), remark: req.body.remark || null });
    await tx.update(mails).set({ status: "DISPATCHED_TO_DIVISION", currentHolderId: null, updatedAt: touch() }).where(eq(mails.id, mail.id));
    await addTimeline(tx, mail.id, "Mail dispatched to division — Mail Room Officer", req.user!.id, mail.status, "DISPATCHED_TO_DIVISION", req.body.remark || null);
    return mail.id;
  });
  res.json(await hydrateMail(await one(await db.select().from(mails).where(eq(mails.id, id)).limit(1))));
}));

router.patch("/mails/:id/division-receipt", requireRole("DD"), asyncRoute(async (req, res) => {
  const id = await db.transaction(async (tx) => {
    const mail = await one(await tx.select().from(mails).where(eq(mails.id, req.params.id)).limit(1), "Mail not found");
    assertStatus(mail.status, "DISPATCHED_TO_DIVISION");
    if (req.user!.role === "DD" && mail.targetDivisionId !== req.user!.divisionId) throw new Error("Mail is not assigned to your division");
    await tx.insert(divisionProcessings).values({ mailId: mail.id, divisionId: mail.targetDivisionId!, recordedById: req.user!.id, ddName: req.body.ddName || null, hodHouName: req.body.hodHouName || null, deskOfficerName: req.body.deskOfficerName || null, dateReceived: dateValue(req.body.dateReceived, "Date received"), dateAssigned: req.body.dateAssigned ? dateValue(req.body.dateAssigned, "Date assigned") : null, remark: req.body.remark || null });
    await tx.update(mails).set({ status: "ASSIGNED_TO_DESK_OFFICER", updatedAt: touch() }).where(eq(mails.id, mail.id));
    const label = req.body.deskOfficerName ? `Mail received by division — assigned to ${req.body.deskOfficerName}` : "Mail received by division — DD";
    await addTimeline(tx, mail.id, label, req.user!.id, mail.status, "ASSIGNED_TO_DESK_OFFICER", req.body.remark || null);
    return mail.id;
  });
  res.json(await hydrateMail(await one(await db.select().from(mails).where(eq(mails.id, id)).limit(1))));
}));

router.patch("/mails/:id/desk-action", requireRole("DD"), asyncRoute(async (req, res) => {
  const id = await db.transaction(async (tx) => {
    const mail = await one(await tx.select().from(mails).where(eq(mails.id, req.params.id)).limit(1), "Mail not found");
    assertStatus(mail.status, "ASSIGNED_TO_DESK_OFFICER");
    if (req.user!.role === "DD" && mail.targetDivisionId !== req.user!.divisionId) throw new Error("Mail is not assigned to your division");
    await tx.insert(deskOfficerActions).values({ mailId: mail.id, recordedById: req.user!.id, deskOfficerName: req.body.deskOfficerName || null, workNote: required(req.body.workNote, "Work note"), dateCompleted: dateValue(req.body.dateCompleted, "Date completed") });
    await tx.update(mails).set({ status: "DESK_REVIEW_COMPLETED", updatedAt: touch() }).where(eq(mails.id, mail.id));
    await addTimeline(tx, mail.id, "Actioned by Desk Officer", req.user!.id, mail.status, "DESK_REVIEW_COMPLETED", req.body.workNote);
    return mail.id;
  });
  res.json(await hydrateMail(await one(await db.select().from(mails).where(eq(mails.id, id)).limit(1))));
}));

router.patch("/mails/:id/hod-hou-review", requireRole("DD"), asyncRoute(async (req, res) => {
  const id = await db.transaction(async (tx) => {
    const mail = await one(await tx.select().from(mails).where(eq(mails.id, req.params.id)).limit(1), "Mail not found");
    assertStatus(mail.status, "DESK_REVIEW_COMPLETED");
    if (req.user!.role === "DD" && mail.targetDivisionId !== req.user!.divisionId) throw new Error("Mail is not assigned to your division");
    await tx.insert(hodHouReviews).values({ mailId: mail.id, recordedById: req.user!.id, hodHouName: req.body.hodHouName || null, remark: required(req.body.remark, "Remark"), dateReviewed: dateValue(req.body.dateReviewed, "Date reviewed") });
    await tx.update(mails).set({ status: "HOD_HOU_REVIEWED", updatedAt: touch() }).where(eq(mails.id, mail.id));
    await addTimeline(tx, mail.id, "Reviewed by HOD/HOU", req.user!.id, mail.status, "HOD_HOU_REVIEWED", req.body.remark);
    return mail.id;
  });
  res.json(await hydrateMail(await one(await db.select().from(mails).where(eq(mails.id, id)).limit(1))));
}));

router.patch("/mails/:id/close", requireRole("DD", "ADMIN"), asyncRoute(async (req, res) => {
  const id = await db.transaction(async (tx) => {
    const mail = await one(await tx.select().from(mails).where(eq(mails.id, req.params.id)).limit(1), "Mail not found");
    assertStatus(mail.status, "HOD_HOU_REVIEWED");
    await tx.insert(mailClosures).values({ mailId: mail.id, closedById: req.user!.id, closureRemark: required(req.body.closureRemark, "Closure remark"), dateClosed: dateValue(req.body.dateClosed, "Date closed") });
    await tx.update(mails).set({ status: "CLOSED", currentHolderId: null, updatedAt: touch() }).where(eq(mails.id, mail.id));
    await addTimeline(tx, mail.id, "Closed by HOD/HOU", req.user!.id, mail.status, "CLOSED", req.body.closureRemark);
    return mail.id;
  });
  res.json(await hydrateMail(await one(await db.select().from(mails).where(eq(mails.id, id)).limit(1))));
}));

router.get("/mails/:id/timeline", asyncRoute(async (req, res) => {
  const rows = await db
    .select({ timeline: mailTimelines, performedBy: { id: users.id, name: users.name, role: users.role } })
    .from(mailTimelines)
    .innerJoin(users, eq(mailTimelines.performedById, users.id))
    .where(eq(mailTimelines.mailId, req.params.id))
    .orderBy(asc(mailTimelines.createdAt));
  res.json(rows.map((row) => ({ ...row.timeline, performedBy: row.performedBy })));
}));

router.get("/dashboard/summary", asyncRoute(async (req, res) => {
  const scope = mailScope(req.user!);
  let scopedQuery = db.selectDistinct({ mail: mails }).from(mails).leftJoin(divisionProcessings, eq(divisionProcessings.mailId, mails.id)).$dynamic();
  if (scope) scopedQuery = scopedQuery.where(scope);
  const scopedMails = (await scopedQuery).map((row) => row.mail);
  const ids = scopedMails.map((mail) => mail.id);
  const grouped = ids.length ? await db.select({ status: mails.status, value: count() }).from(mails).where(inArray(mails.id, ids)).groupBy(mails.status) : [];
  const inactiveSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const overdueInactive = ids.length ? (await db.select({ value: count() }).from(mails).where(and(inArray(mails.id, ids), ne(mails.status, "CLOSED"), lt(mails.updatedAt, inactiveSince))))[0].value : 0;
  const recentMails = scopedMails.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 8);
  res.json({ total: scopedMails.length, counts: Object.fromEntries(grouped.map((item) => [item.status, item.value])), overdueInactive, recentMails: await hydrateMails(recentMails) });
}));

export default router;
