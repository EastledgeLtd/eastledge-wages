"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { clearSession, createSession } from "@/lib/auth";
import { getDb, type UserRow } from "@/lib/db";

export async function loginAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const pin = String(formData.get("pin") || "").trim();
  if (!name || !pin) {
    redirect("/login?error=" + encodeURIComponent("Enter your name and PIN."));
  }
  const users = getDb().prepare("SELECT * FROM users WHERE active = 1").all() as UserRow[];
  const user = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
  if (!user || !bcrypt.compareSync(pin, user.pin_hash)) {
    redirect("/login?error=" + encodeURIComponent("Name or PIN not recognised."));
  }
  await createSession({ id: user.id, name: user.name, role: user.role });
  redirect(user.role === "admin" ? "/admin" : "/fixer");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
