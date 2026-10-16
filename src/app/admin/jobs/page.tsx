import { requireUser } from "@/lib/auth";
import { getDb, type JobRow } from "@/lib/db";
import { centsToPounds } from "@/lib/money";
import { createJobAction, updateJobAction } from "@/app/actions/wages";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser("admin");
  const params = await searchParams;
  const jobs = getDb().prepare("SELECT * FROM jobs ORDER BY active DESC, name").all() as JobRow[];
  return (
    <main>
      <TopBar
        user={user}
        links={[
          { href: "/admin", label: "Review" },
          { href: "/admin/jobs", label: "Jobs" },
          { href: "/admin/fixers", label: "Fixers" },
          { href: "/admin/wages", label: "Wage sheet" },
        ]}
      />
      <section className="section-head">
        <h1>Job rates</h1>
        <p>Only you set pricing. Fixers pick a job and enter hours or quantities.</p>
      </section>
      {params.error ? <div className="error" style={{ marginBottom: "1rem" }}>{params.error}</div> : null}
      <section className="panel">
        <div className="section-head"><h2>Add a job</h2></div>
        <form action={createJobAction} className="stack">
          <div className="field"><label htmlFor="name">Job name</label><input id="name" name="name" required /></div>
          <div className="field"><label htmlFor="description">Description</label><input id="description" name="description" /></div>
          <div className="row two">
            <div className="field"><label htmlFor="unit_label">Unit</label><input id="unit_label" name="unit_label" required placeholder="hour, metre…" /></div>
            <div className="field"><label htmlFor="rate">Rate (£)</label><input id="rate" name="rate" type="number" min="0" step="0.01" required /></div>
          </div>
          <button className="btn" type="submit">Save job</button>
        </form>
      </section>
      <section className="panel">
        <div className="section-head"><h2>Existing jobs</h2></div>
        <div className="line-list">
          {jobs.map((job) => (
            <form action={updateJobAction} className="line-item stack" key={job.id}>
              <input type="hidden" name="job_id" value={job.id} />
              <div className="line-top">
                <strong>{job.name}</strong>
                <span className={`badge ${job.active ? "approved" : "rejected"}`}>{job.active ? "Active" : "Off"}</span>
              </div>
              <div className="field"><label>Name</label><input name="name" defaultValue={job.name} required /></div>
              <div className="field"><label>Description</label><input name="description" defaultValue={job.description} /></div>
              <div className="row three">
                <div className="field"><label>Unit</label><input name="unit_label" defaultValue={job.unit_label} required /></div>
                <div className="field"><label>Rate (£)</label><input name="rate" type="number" min="0" step="0.01" defaultValue={(job.rate_cents / 100).toFixed(2)} required /></div>
                <div className="field">
                  <label>Status</label>
                  <select name="active" defaultValue={job.active ? "1" : "0"}>
                    <option value="1">Active</option>
                    <option value="0">Off</option>
                  </select>
                </div>
              </div>
              <div className="muted">Currently {centsToPounds(job.rate_cents)} / {job.unit_label}</div>
              <button className="btn-secondary" type="submit">Update job</button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
