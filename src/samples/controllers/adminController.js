import { createAdminToken, isAdminPasswordValid } from "../utils/adminAuth.js";

export async function loginAdmin(req, res) {
  const password = `${req.body?.password || ""}`;
  if (!isAdminPasswordValid(password)) {
    res.status(401).json({ error: "Invalid admin password" });
    return;
  }
  const session = createAdminToken();
  res.json({ token: session.token, expiresAt: new Date(session.expiresAt).toISOString() });
}
