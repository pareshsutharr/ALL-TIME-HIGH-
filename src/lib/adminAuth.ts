import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Deterministic token derived from the configured password + a separate
// signing secret — anyone who knows ADMIN_UPLOAD_PASSWORD still can't forge
// a session cookie without ADMIN_SESSION_SECRET too, and rotating either
// value invalidates all existing sessions.
export function expectedSessionToken(): string {
  const password = process.env.ADMIN_UPLOAD_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret) {
    throw new Error("ADMIN_UPLOAD_PASSWORD / ADMIN_SESSION_SECRET are not configured");
  }
  return createHmac("sha256", secret).update(password).digest("hex");
}

export function verifyPassword(candidate: string): boolean {
  const password = process.env.ADMIN_UPLOAD_PASSWORD;
  if (!password || !candidate) return false;
  return timingSafeStringEqual(candidate, password);
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  try {
    return timingSafeStringEqual(token, expectedSessionToken());
  } catch {
    return false;
  }
}
