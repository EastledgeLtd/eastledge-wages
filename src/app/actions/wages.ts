"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb, newId, type LineRow } from "@/lib/db";
import { poundsInputToCents } from "@/lib/money";
import { getOrCreateSubmission, getLines } from "@/lib/submissions";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createJobAction(formData: FormData) {
  await requireUser("admin");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const unitLabel = String(formData.get("unit_label") || "").trim();
  const rateCents = poundsInputToCents(String(formData.get("rate") || ""));
  if (!name || !unitLabel || rateCents === null) fail("/admin/jobs", "Name, unit, and rate are required.");
  getDb()
    .prepare(
      `INSERT INTO jobs (id, name, description, unit_label, rate_cents, active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    )
    .run(newId("job"), name, description, unitLabel, rateCents, new Date().toISOString());
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}

export async function updateJobAction(formData: FormData) {
  await requireUser("admin");
  const jobId = String(formData.get("job_id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const unitLabel = String(formData.get("unit_label") || "").trim();
  const rateCents = poundsInputToCents(String(formData.get("rate") || ""));
  const active = formData.get("active") === "1" ? 1 : 0;
  if (!jobId || !name || !unitLabel || rateCents === null) fail("/admin/jobs", "Missing job fields.");
  getDb()
    .prepare(
      `UPDATE jobs SET name = ?, description = ?, unit_label = ?, rate_cents = ?, active = ? WHERE id = ?`
    )
    .run(name, description, unitLabel, rateCents, active, jobId);
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}

export async function createFixerAction(formData: FormData) {
  await requireUser("admin");
  const name = String(formData.get("name") || "").trim();
  const pin = String(formData.get("pin") || "").trim();
  if (!name || pin.length < 4) fail("/admin/fixers", "Name and a PIN of at least 4 characters are required.");
  getDb()
    .prepare("INSERT INTO users (id, name, role, pin_hash, active) VALUES (?, ?, 'fixer', ?, 1)")
    .run(newId("usr"), name, bcrypt.hashSync(pin, 10));
  revalidatePath("/admin/fixers");
  redirect("/admin/fixers");
}

export async function setFixerActiveAction(formData: FormData) {
  await requireUser("admin");
  const userId = String(formData.get("user_id") || "");
  const active = formData.get("active") === "1" ? 1 : 0;
  getDb().prepare("UPDATE users SET active = ? WHERE id = ? AND role = 'fixer'").run(active, userId);
  revalidatePath("/admin/fixers");
  redirect("/admin/fixers");
}

export async function resetFixerPinAction(formData: FormData) {
  await requireUser("admin");
  const userId = String(formData.get("user_id") || "");
  const pin = String(formData.get("pin") || "").trim();
  if (pin.length < 4) fail("/admin/fixers", "PIN must be at least 4 characters.");
  getDb()
    .prepare("UPDATE users SET pin_hash = ? WHERE id = ? AND role = 'fixer'")
    .run(bcrypt.hashSync(pin, 10), userId);
  revalidatePath("/admin/fixers");
  redirect("/admin/fixers");
}

export async function reviewLineAction(formData: FormData) {
  await requireUser("admin");
  const lineId = String(formData.get("line_id") || "");
  const decision = String(formData.get("decision") || "") as "approved" | "rejected" | "adjusted";
  const note = String(formData.get("admin_note") || "").trim();
  const adjustedRaw = String(formData.get("adjusted_amount") || "").trim();
  const adjusted = adjustedRaw ? poundsInputToCents(adjustedRaw) : null;
  const returnTo = String(formData.get("return_to") || "/admin");
  const db = getDb();
  const line = db.prepare("SELECT * FROM lines WHERE id = ?").get(lineId) as LineRow | undefined;
  if (!line) fail(returnTo, "Line not found.");
  if (decision === "adjusted") {
    if (adjusted === null) fail(returnTo, "Enter an adjusted amount.");
    db.prepare(
      `UPDATE lines SET status = 'adjusted', final_amount_cents = ?, admin_note = ? WHERE id = ?`
    ).run(adjusted, note || null, lineId);
  } else if (decision === "approved") {
    db.prepare(
      `UPDATE lines SET status = 'approved', final_amount_cents = ?, admin_note = ? WHERE id = ?`
    ).run(line.amount_cents, note || null, lineId);
  } else if (decision === "rejected") {
    db.prepare(
      `UPDATE lines SET status = 'rejected', final_amount_cents = 0, admin_note = ? WHERE id = ?`
    ).run(note || null, lineId);
  } else fail(returnTo, "Unknown decision.");
  revalidatePath("/admin");
  revalidatePath("/admin/wages");
  redirect(returnTo);
}

export async function addJobLineAction(formData: FormData) {
  const user = await requireUser("fixer");
  const periodId = String(formData.get("period_id") || "");
  const jobId = String(formData.get("job_id") || "");
  const quantity = Number(String(formData.get("quantity") || "").trim());
  if (!periodId || !jobId || !Number.isFinite(quantity) || quantity <= 0) {
    fail("/fixer", "Pick a job and enter a quantity greater than zero.");
  }
  const db = getDb();
  const submission = getOrCreateSubmission(user.id, periodId);
  if (submission.status === "submitted") fail("/fixer", "This fortnight is already submitted.");
  const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND active = 1").get(jobId) as
    | { id: string; name: string; unit_label: string; rate_cents: number }
    | undefined;
  if (!job) fail("/fixer", "Job not found.");
  const amount = Math.round(quantity * job.rate_cents);
  db.prepare(
    `INSERT INTO lines (
      id, submission_id, kind, job_id, job_name, unit_label, rate_cents,
      quantity, description, amount_cents, status, final_amount_cents, admin_note, sort_order
    ) VALUES (?, ?, 'job', ?, ?, ?, ?, ?, NULL, ?, 'pending', NULL, NULL, ?)`
  ).run(
    newId("ln"),
    submission.id,
    job.id,
    job.name,
    job.unit_label,
    job.rate_cents,
    quantity,
    amount,
    getLines(submission.id).length
  );
  revalidatePath("/fixer");
  redirect("/fixer");
}

export async function addVariationAction(formData: FormData) {
  const user = await requireUser("fixer");
  const periodId = String(formData.get("period_id") || "");
  const description = String(formData.get("description") || "").trim();
  const amountCents = poundsInputToCents(String(formData.get("amount") || ""));
  if (!periodId || !description || amountCents === null || amountCents <= 0) {
    fail("/fixer", "Variation needs a description and amount.");
  }
  const db = getDb();
  const submission = getOrCreateSubmission(user.id, periodId);
  if (submission.status === "submitted") fail("/fixer", "This fortnight is already submitted.");
  db.prepare(
    `INSERT INTO lines (
      id, submission_id, kind, job_id, job_name, unit_label, rate_cents,
      quantity, description, amount_cents, status, final_amount_cents, admin_note, sort_order
    ) VALUES (?, ?, 'variation', NULL, NULL, NULL, NULL, NULL, ?, ?, 'pending', NULL, NULL, ?)`
  ).run(newId("ln"), submission.id, description, amountCents, getLines(submission.id).length);
  revalidatePath("/fixer");
  redirect("/fixer");
}

export async function removeLineAction(formData: FormData) {
  const user = await requireUser("fixer");
  const lineId = String(formData.get("line_id") || "");
  const db = getDb();
  const row = db
    .prepare(
      `SELECT l.id, s.status, s.fixer_id FROM lines l
       JOIN submissions s ON s.id = l.submission_id WHERE l.id = ?`
    )
    .get(lineId) as { id: string; status: string; fixer_id: string } | undefined;
  if (!row || row.fixer_id !== user.id) fail("/fixer", "Line not found.");
  if (row.status === "submitted") fail("/fixer", "Already submitted.");
  db.prepare("DELETE FROM lines WHERE id = ?").run(lineId);
  revalidatePath("/fixer");
  redirect("/fixer");
}

export async function submitFortnightAction(formData: FormData) {
  const user = await requireUser("fixer");
  const periodId = String(formData.get("period_id") || "");
  const db = getDb();
  const submission = getOrCreateSubmission(user.id, periodId);
  if (submission.status === "submitted") fail("/fixer", "Already submitted.");
  if (getLines(submission.id).length === 0) {
    fail("/fixer", "Add at least one job or variation before submitting.");
  }
  db.prepare(`UPDATE submissions SET status = 'submitted', submitted_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    submission.id
  );
  revalidatePath("/fixer");
  revalidatePath("/admin");
  redirect("/fixer");
}
