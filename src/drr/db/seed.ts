import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { pool, db } from "./index.js";
import { divisions, type Role, users } from "./schema.js";

const passwordHash = await bcrypt.hash("Password123!", 10);

const seedDivisions = [
  { name: "Clinical Trials Division", code: "CTD" },
  { name: "Imported Drugs Division", code: "IDD" },
  { name: "Nigerian Drugs Division", code: "NDD" },
  { name: "Regulatory Affairs Division", code: "RAD" }
];

async function main() {
  for (const division of seedDivisions) {
    await db
      .insert(divisions)
      .values(division)
      .onConflictDoUpdate({
        target: divisions.code,
        set: { name: division.name, code: division.code, updatedAt: new Date() }
      });
  }

  const [clinical] = await db.select().from(divisions).where(eq(divisions.code, "CTD")).limit(1);

  const seedUsers: Array<{ name: string; email: string; role: Role; divisionId?: string }> = [
    { name: "Admin User", email: "admin@example.com", role: "ADMIN" },
    { name: "Mail Room Officer", email: "mailroom@example.com", role: "MAIL_ROOM" },
    { name: "Director Secretary", email: "secretary@example.com", role: "SECRETARY" },
    { name: "DD Clinical Trials", email: "dd.clinical@example.com", role: "DD", divisionId: clinical.id },
    { name: "Desk Officer Clinical Trials", email: "desk.clinical@example.com", role: "DESK_OFFICER", divisionId: clinical.id },
    { name: "HOD/HOU Clinical Trials", email: "hod.clinical@example.com", role: "HOD_HOU", divisionId: clinical.id }
  ];

  for (const user of seedUsers) {
    await db
      .insert(users)
      .values({ ...user, passwordHash })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: user.name, role: user.role, divisionId: user.divisionId ?? null, updatedAt: new Date() }
      });
  }
}

main()
  .then(async () => {
    await pool.end();
    console.log("Seed data created. Test password: Password123!");
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
