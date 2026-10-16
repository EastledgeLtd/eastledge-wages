import { requireUser } from "@/lib/auth";
import { getDb, type UserRow } from "@/lib/db";
import { createFixerAction, resetFixerPinAction, setFixerActiveAction } from "@/app/actions/wages";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function FixersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser("admin");
  const params = await searchParams;
  const fixers = getDb()
    .prepare("SELECT * FROM users WHERE role = 'fixer' ORDER BY active DESC, name")
    .all() as UserRow[];
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
        <h1>Fixers</h1>
        <p>Each fixer signs in on their phone with their name and PIN.</p>
      </section>
      {params.error ? <div className="error" style={{ marginBottom: "1rem" }}>{params.error}</div> : null}
      <section className="panel">
        <form action={createFixerAction} className="stack">
          <div className="row two">
            <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" required /></div>
            <div className="field"><label htmlFor="pin">PIN</label><input id="pin" name="pin" required minLength={4} /></div>
          </div>
          <button className="btn" type="submit">Add fixer</button>
        </form>
      </section>
      <section className="panel">
        <div className="line-list">
          {fixers.map((fixer) => (
            <div className="line-item" key={fixer.id}>
              <div className="line-top">
                <strong>{fixer.name}</strong>
                <span className={`badge ${fixer.active ? "approved" : "rejected"}`}>
                  {fixer.active ? "Active" : "Off"}
                </span>
              </div>
              <div className="actions">
                <form action={setFixerActiveAction}>
                  <input type="hidden" name="user_id" value={fixer.id} />
                  <input type="hidden" name="active" value={fixer.active ? "0" : "1"} />
                  <button className="btn-secondary" type="submit">
                    {fixer.active ? "Switch off" : "Switch on"}
                  </button>
                </form>
              </div>
              <form action={resetFixerPinAction} className="row two" style={{ marginTop: "0.75rem" }}>
                <input type="hidden" name="user_id" value={fixer.id} />
                <div className="field"><label>New PIN</label><input name="pin" minLength={4} required /></div>
                <div className="field" style={{ alignContent: "end" }}>
                  <button className="btn-secondary" type="submit">Reset PIN</button>
                </div>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
