import crypto from "crypto";

const DEFAULT_ADMIN_PASSWORD = "admin123";
const DEFAULT_ADMIN_TOKEN_SECRET = "change-this-admin-token-secret";
const DEFAULT_ADMIN_TOKEN_TTL_HOURS = 12;

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(`${left || ""}`);
  const rightBuffer = Buffer.from(`${right || ""}`);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getAdminPassword() { return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD; }
function getTokenSecret() { return process.env.ADMIN_TOKEN_SECRET || DEFAULT_ADMIN_TOKEN_SECRET; }
function getTokenTtlHours() {
  const raw = Number(process.env.ADMIN_TOKEN_TTL_HOURS || DEFAULT_ADMIN_TOKEN_TTL_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ADMIN_TOKEN_TTL_HOURS;
}

function signValue(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAdminToken() {
  const expiresAt = Date.now() + getTokenTtlHours() * 60 * 60 * 1000;
  const payload = { role: "admin", exp: expiresAt };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(encodedPayload, getTokenSecret());
  return { token: `${encodedPayload}.${signature}`, expiresAt };
}

export function verifyAdminToken(token) {
  const [encodedPayload, signature] = `${token || ""}`.split(".");
  if (!encodedPayload || !signature) throw new Error("Invalid token");
  const expectedSignature = signValue(encodedPayload, getTokenSecret());
  if (!safeCompare(signature, expectedSignature)) throw new Error("Invalid token signature");
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid token payload");
  }
  if (!payload || payload.role !== "admin") throw new Error("Invalid token role");
  if (!payload.exp || Number(payload.exp) < Date.now()) throw new Error("Token expired");
  return payload;
}

export function isAdminPasswordValid(candidate) {
  return safeCompare(`${candidate || ""}`, getAdminPassword());
}
