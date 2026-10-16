import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { centsToPounds, formatQuantity } from "@/lib/money";
import { formatPeriodLabel } from "@/lib/fortnights";
import {
  getAdminPeriodReview,
  getPeriodBundle,
  getWageSheet,
  recentPeriodOptions,
} from "@/lib/submissions";
import { reviewLineAction } from "@/app/actions/wages";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

const adminLinks = [
  { href: "/admin", label: "Review" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/fixers", label: "Fixers" },
  { href: "/admin/wages", label: "Wage sheet" },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; error?: string }>;
}) {
  const user = await requireUser("admin");
  const params = await searchParams;
  const { period, isCurrent } = getPeriodBundle(params.start, params.end);
  const returnTo = `/admin?start=${period.start_date}&end=${period.end_date}`;
  const lines = getAdminPeriodReview(period.id);
  const wageSheet = getWageSheet(period.id);
  const periods = recentPeriodOptions();
  const grouped = new Map<string, { fixerName: string; submissionId: string; lines: typeof lines }>();
  for (const line of lines) {
    const bucket = grouped.get(line.submission_id) || {
      fixerName: line.fixer_name,
      submissionId: line.submission_id,
      lines: [],
    };
    bucket.lines.push(line);
    grouped.set(line.submission_id, bucket);
  }
  const approvedTotal = wageSheet.reduce((sum, f) => sum + f.totalCents, 0);
  const pendingCount = lines.filter((l) => l.status === "pending").length;

  return (
    <main>
      <TopBar user={user} links={adminLinks} />
      <section className="section-head">
        <h1>{isCurrent ? "This fortnight" : "Fortnight review"}</h1>
        <p>
          {formatPeriodLabel(period.start_date, period.end_date)}. Approve, change, or reject each
          line.
        </p>
      </section>
      <div className="period-switch">
        {periods.map((p) => (
          <Link
            key={p.id}
            className={p.id === period.id ? "active" : undefined}
            href={`/admin?start=${p.start_date}&end=${p.end_date}`}
          >
            {formatPeriodLabel(p.start_date, p.end_date)}
          </Link>
        ))}
      </div>
      {params.error ? <div className="error" style={{ marginBottom: "1rem" }}>{params.error}</div> : null}
      <section className="panel">
        <div className="line-top">
          <div>
            <strong>{pendingCount} pending</strong>
            <div className="muted">Approved wage total so far</div>
          </div>
          <div className="amount">{centsToPounds(approvedTotal)}</div>
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Submitted lines</h2>
          <p>Nothing is paid until you approve it.</p>
        </div>
        {grouped.size === 0 ? (
          <p className="empty">No submissions for this fortnight yet.</p>
        ) : (
          Array.from(grouped.values()).map((group) => (
            <div className="review-block" key={group.submissionId}>
              <div className="line-top" style={{ marginBottom: "0.75rem" }}>
                <strong>{group.fixerName}</strong>
                <span className="badge submitted">Submitted</span>
              </div>
              <div className="line-list">
                {group.lines.map((line) => (
                  <div className="line-item" key={line.id}>
                    <div className="line-top">
                      <div>
                        <strong>{line.kind === "job" ? line.job_name : "Variation"}</strong>
                        <div className="muted">
                          {line.kind === "job"
                            ? `${formatQuantity(line.quantity || 0)} ${line.unit_label} × ${centsToPounds(line.rate_cents || 0)}`
                            : line.description}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="amount">{centsToPounds(line.amount_cents)}</div>
                        <span className={`badge ${line.status}`}>{line.status}</span>
                      </div>
                    </div>
                    <form action={reviewLineAction} className="stack" style={{ marginTop: "0.75rem" }}>
                      <input type="hidden" name="line_id" value={line.id} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <div className="row two">
                        <div className="field">
                          <label htmlFor={`adj-${line.id}`}>Change amount (£)</label>
                          <input id={`adj-${line.id}`} name="adjusted_amount" type="number" min="0" step="0.01" placeholder={(line.amount_cents / 100).toFixed(2)} />
                        </div>
                        <div className="field">
                          <label htmlFor={`note-${line.id}`}>Note</label>
                          <input id={`note-${line.id}`} name="admin_note" defaultValue={line.admin_note || ""} placeholder="Optional" />
                        </div>
                      </div>
                      <div className="actions">
                        <button className="btn" name="decision" value="approved" type="submit">Approve</button>
                        <button className="btn-secondary" name="decision" value="adjusted" type="submit">Save change</button>
                        <button className="btn-danger" name="decision" value="rejected" type="submit">Reject</button>
                      </div>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>Wage sheet preview</h2>
          <p>Approved and changed lines only.</p>
        </div>
        {wageSheet.length === 0 ? (
          <p className="empty">No approved lines yet.</p>
        ) : (
          wageSheet.map((fixer) => (
            <div className="wage-fixer" key={fixer.fixerId}>
              <div className="line-top">
                <strong>{fixer.fixerName}</strong>
                <span className="amount">{centsToPounds(fixer.totalCents)}</span>
              </div>
            </div>
          ))
        )}
        <div className="total-bar">
          <span>Period total</span>
          <strong className="amount">{centsToPounds(approvedTotal)}</strong>
        </div>
      </section>
    </main>
  );
}
