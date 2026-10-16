import { requireUser } from "@/lib/auth";
import { getDb, type JobRow } from "@/lib/db";
import { centsToPounds, formatQuantity } from "@/lib/money";
import { formatPeriodLabel } from "@/lib/fortnights";
import { ensureOpenPeriod, getLines, getOrCreateSubmission } from "@/lib/submissions";
import {
  addJobLineAction,
  addVariationAction,
  removeLineAction,
  submitFortnightAction,
} from "@/app/actions/wages";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function FixerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser("fixer");
  const params = await searchParams;
  const period = ensureOpenPeriod();
  const submission = getOrCreateSubmission(user.id, period.id);
  const lines = getLines(submission.id);
  const jobs = getDb().prepare("SELECT * FROM jobs WHERE active = 1 ORDER BY name").all() as JobRow[];
  const draftTotal = lines.reduce((sum, line) => sum + line.amount_cents, 0);
  const locked = submission.status === "submitted";

  return (
    <main>
      <TopBar user={user} links={[{ href: "/fixer", label: "This fortnight" }]} />
      <section className="section-head">
        <h1>This fortnight</h1>
        <p>
          {formatPeriodLabel(period.start_date, period.end_date)}. Add jobs and variations, then
          submit once for review.
        </p>
      </section>
      {params.error ? <div className="error" style={{ marginBottom: "1rem" }}>{params.error}</div> : null}
      <section className="panel">
        <div className="line-top" style={{ marginBottom: "0.75rem" }}>
          <strong>Your submission</strong>
          <span className={`badge ${submission.status}`}>
            {submission.status === "submitted" ? "Submitted" : "Draft"}
          </span>
        </div>
        {lines.length === 0 ? (
          <p className="empty">No lines yet. Add a job below.</p>
        ) : (
          <div className="line-list">
            {lines.map((line) => (
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
                  <div className="amount">{centsToPounds(line.amount_cents)}</div>
                </div>
                {!locked ? (
                  <div className="actions">
                    <form action={removeLineAction}>
                      <input type="hidden" name="line_id" value={line.id} />
                      <button className="btn-danger" type="submit">Remove</button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
        <div className="total-bar">
          <span className="muted">Draft total</span>
          <strong className="amount">{centsToPounds(draftTotal)}</strong>
        </div>
      </section>
      {!locked ? (
        <>
          <section className="panel">
            <div className="section-head">
              <h2>Add a job</h2>
              <p>Rates are set by Eastledge. Enter hours or quantities only.</p>
            </div>
            <form action={addJobLineAction} className="stack">
              <input type="hidden" name="period_id" value={period.id} />
              <div className="field">
                <label>Job</label>
                <div className="stack">
                  {jobs.map((job) => (
                    <label
                      key={job.id}
                      style={{
                        display: "flex",
                        gap: "0.65rem",
                        alignItems: "flex-start",
                        padding: "0.75rem 0.85rem",
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <input type="radio" name="job_id" value={job.id} required style={{ marginTop: "0.2rem" }} />
                      <span>
                        <strong style={{ display: "block" }}>{job.name}</strong>
                        <span className="muted">
                          {centsToPounds(job.rate_cents)} / {job.unit_label}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="quantity">Hours or quantity</label>
                <input id="quantity" name="quantity" type="number" min="0.25" step="0.25" required placeholder="e.g. 8" />
              </div>
              <button className="btn" type="submit">Add job line</button>
            </form>
          </section>
          <section className="panel">
            <div className="section-head">
              <h2>Add a variation</h2>
              <p>Extra work with a short description and amount.</p>
            </div>
            <form action={addVariationAction} className="stack">
              <input type="hidden" name="period_id" value={period.id} />
              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" required placeholder="e.g. Extra packing out" />
              </div>
              <div className="field">
                <label htmlFor="amount">Amount (£)</label>
                <input id="amount" name="amount" type="number" min="0.01" step="0.01" required placeholder="e.g. 40" />
              </div>
              <button className="btn-secondary" type="submit">Add variation</button>
            </form>
          </section>
          <section className="panel">
            <div className="section-head">
              <h2>Submit for review</h2>
              <p>Once submitted, lines wait for approval before they go on the wage sheet.</p>
            </div>
            <form action={submitFortnightAction}>
              <input type="hidden" name="period_id" value={period.id} />
              <button className="btn" type="submit" disabled={lines.length === 0}>
                Submit this fortnight
              </button>
            </form>
          </section>
        </>
      ) : (
        <section className="panel">
          <div className="notice">
            Submitted
            {submission.submitted_at
              ? ` on ${new Date(submission.submitted_at).toLocaleString("en-GB")}`
              : ""}
            . Waiting for review — nothing is paid until approved.
          </div>
        </section>
      )}
    </main>
  );
}
