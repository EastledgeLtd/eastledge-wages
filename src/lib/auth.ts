import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, type Role, type UserRow } from "./db";

const COOKIE = "eastledge_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "eastledge-dev-secret-change-me"
);

export type SessionUser = { id: string; name: string; role: Role };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ id: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const id = String(payload.id || "");
    const name = String(payload.name || "");
    const role = payload.role as Role;
    if (!id || !name || (role !== "admin" && role !== "fixer")) return null;
    const user = getDb()
      .prepare("SELECT id, name, role, active FROM users WHERE id = ?")
      .get(id) as Pick<UserRow, "id" | "name" | "role" | "active"> | undefined;
    if (!user || !user.active) return null;
    return { id: user.id, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(user.role === "admin" ? "/admin" : "/fixer");
  return user;
}
