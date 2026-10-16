import { getDb, ensurePeriod, newId, type LineRow, type SubmissionRow } from "./db";
import { getFortnightForDate, listRecentPeriods } from "./fortnights";

export function getOrCreateSubmission(fixerId: string, periodId: string): SubmissionRow {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM submissions WHERE fixer_id = ? AND period_id = ?")
    .get(fixerId, periodId) as SubmissionRow | undefined;
  if (existing) return existing;
  const row: SubmissionRow = {
    id: newId("sub"),
    period_id: periodId,
    fixer_id: fixerId,
    status: "draft",
    submitted_at: null,
  };
  db.prepare(
    `INSERT INTO submissions (id, period_id, fixer_id, status, submitted_at)
     VALUES (?, ?, ?, ?, NULL)`
  ).run(row.id, row.period_id, row.fixer_id, row.status);
  return row;
}

export function getLines(submissionId: string): LineRow[] {
  return getDb()
    .prepare("SELECT * FROM lines WHERE submission_id = ? ORDER BY sort_order, id")
    .all(submissionId) as LineRow[];
}

export function linePayableCents(line: LineRow): number {
  if (line.status === "rejected") return 0;
  if (line.status === "approved") return line.amount_cents;
  if (line.status === "adjusted") return line.final_amount_cents ?? line.amount_cents;
  return 0;
}

export function ensureOpenPeriod() {
  const { startDate, endDate } = getFortnightForDate();
  return ensurePeriod(startDate, endDate);
}

export function getPeriodBundle(startDate?: string, endDate?: string) {
  const current = getFortnightForDate();
  const start = startDate || current.startDate;
  const end = endDate || current.endDate;
  return {
    period: ensurePeriod(start, end),
    isCurrent: start === current.startDate && end === current.endDate,
  };
}

export function getAdminPeriodReview(periodId: string) {
  return getDb()
    .prepare(
      `SELECT l.*, s.status AS submission_status, s.submitted_at, u.id AS fixer_id, u.name AS fixer_name
       FROM lines l
       JOIN submissions s ON s.id = l.submission_id
       JOIN users u ON u.id = s.fixer_id
       WHERE s.period_id = ? AND s.status = 'submitted'
       ORDER BY u.name, l.sort_order, l.id`
    )
    .all(periodId) as Array<
    LineRow & {
      submission_status: string;
      submitted_at: string | null;
      fixer_id: string;
      fixer_name: string;
    }
  >;
}

export function getWageSheet(periodId: string) {
  const rows = getDb()
    .prepare(
      `SELECT u.id AS fixer_id, u.name AS fixer_name, l.*
       FROM lines l
       JOIN submissions s ON s.id = l.submission_id
       JOIN users u ON u.id = s.fixer_id
       WHERE s.period_id = ? AND s.status = 'submitted' AND l.status IN ('approved', 'adjusted')
       ORDER BY u.name, l.sort_order, l.id`
    )
    .all(periodId) as Array<LineRow & { fixer_id: string; fixer_name: string }>;

  const byFixer = new Map<
    string,
    { fixerId: string; fixerName: string; lines: typeof rows; totalCents: number }
  >();
  for (const row of rows) {
    const bucket = byFixer.get(row.fixer_id) || {
      fixerId: row.fixer_id,
      fixerName: row.fixer_name,
      lines: [],
      totalCents: 0,
    };
    bucket.lines.push(row);
    bucket.totalCents += linePayableCents(row);
    byFixer.set(row.fixer_id, bucket);
  }
  return Array.from(byFixer.values());
}

export function recentPeriodOptions() {
  return listRecentPeriods(10).map((p) => ensurePeriod(p.startDate, p.endDate));
}
