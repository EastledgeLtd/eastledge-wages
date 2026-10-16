import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { getFortnightForDate } from "./fortnights";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "eastledge.db");

declare global {
  // eslint-disable-next-line no-var
  var __eastledgeDb: Database.Database | undefined;
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'fixer')),
      pin_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      unit_label TEXT NOT NULL,
      rate_cents INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS periods (
      id TEXT PRIMARY KEY,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      UNIQUE(start_date, end_date)
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      period_id TEXT NOT NULL REFERENCES periods(id),
      fixer_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted')),
      submitted_at TEXT,
      UNIQUE(period_id, fixer_id)
    );
    CREATE TABLE IF NOT EXISTS lines (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('job', 'variation')),
      job_id TEXT REFERENCES jobs(id),
      job_name TEXT,
      unit_label TEXT,
      rate_cents INTEGER,
      quantity REAL,
      description TEXT,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'approved', 'adjusted', 'rejected')),
      final_amount_cents INTEGER,
      admin_note TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);
}

function seed(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (count.c > 0) return;
  const pin = bcrypt.hashSync("1234", 10);
  const adminPin = bcrypt.hashSync("0000", 10);
  const insertUser = db.prepare(
    "INSERT INTO users (id, name, role, pin_hash, active) VALUES (?, ?, ?, ?, 1)"
  );
  insertUser.run(id("usr"), "Site Owner", "admin", adminPin);
  insertUser.run(id("usr"), "Sam Reid", "fixer", pin);
  insertUser.run(id("usr"), "Jordan Lee", "fixer", pin);
  insertUser.run(id("usr"), "Alex Morgan", "fixer", pin);
  const now = new Date().toISOString();
  const insertJob = db.prepare(
    `INSERT INTO jobs (id, name, description, unit_label, rate_cents, active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`
  );
  insertJob.run(id("job"), "General fixing", "Standard site fixing by the hour", "hour", 2200, now);
  insertJob.run(id("job"), "Wardrobe install", "Fitted wardrobe installation per unit", "wardrobe", 8500, now);
  insertJob.run(id("job"), "Skirting", "Skirting boards by the metre", "metre", 450, now);
  insertJob.run(id("job"), "Door hang", "Hang and adjust an interior door", "door", 6500, now);
  ensureCurrentPeriod(db);
}

function createDb(): Database.Database {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seed(db);
  return db;
}

export function ensurePeriod(
  startDate: string,
  endDate: string,
  db: Database.Database = getDb()
) {
  const existing = db
    .prepare("SELECT * FROM periods WHERE start_date = ? AND end_date = ?")
    .get(startDate, endDate) as PeriodRow | undefined;
  if (existing) return existing;
  const period: PeriodRow = { id: id("prd"), start_date: startDate, end_date: endDate };
  db.prepare("INSERT INTO periods (id, start_date, end_date) VALUES (?, ?, ?)").run(
    period.id,
    period.start_date,
    period.end_date
  );
  return period;
}

export function ensureCurrentPeriod(db: Database.Database = getDb()) {
  const { startDate, endDate } = getFortnightForDate();
  return ensurePeriod(startDate, endDate, db);
}

export function getDb(): Database.Database {
  if (!global.__eastledgeDb) global.__eastledgeDb = createDb();
  return global.__eastledgeDb;
}

export function newId(prefix: string): string {
  return id(prefix);
}

export type Role = "admin" | "fixer";
export type UserRow = {
  id: string;
  name: string;
  role: Role;
  pin_hash: string;
  active: number;
};
export type JobRow = {
  id: string;
  name: string;
  description: string;
  unit_label: string;
  rate_cents: number;
  active: number;
  created_at: string;
};
export type PeriodRow = { id: string; start_date: string; end_date: string };
export type SubmissionRow = {
  id: string;
  period_id: string;
  fixer_id: string;
  status: "draft" | "submitted";
  submitted_at: string | null;
};
export type LineStatus = "pending" | "approved" | "adjusted" | "rejected";
export type LineRow = {
  id: string;
  submission_id: string;
  kind: "job" | "variation";
  job_id: string | null;
  job_name: string | null;
  unit_label: string | null;
  rate_cents: number | null;
  quantity: number | null;
  description: string | null;
  amount_cents: number;
  status: LineStatus;
  final_amount_cents: number | null;
  admin_note: string | null;
  sort_order: number;
};
