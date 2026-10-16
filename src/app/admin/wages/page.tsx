import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { centsToPounds, formatQuantity } from "@/lib/money";
import { formatPeriodLabel } from "@/lib/fortnights";
import { getPeriodBundle, getWageSheet, linePayableCents, recentPeriodOptions } from "@/lib/submissions";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function WageSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const user = await requireUser("admin");
  const params = await searchParams;
  const { period } = getPeriodBundle(params.start, params.end);
  const wageSheet = getWageSheet(period.id);
  const periods = recentPeriodOptions();
  const total = wageSheet.reduce((sum, f) => sum + f.totalCents, 0);
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
        <h1>Wage sheet</h1>
        <p>{formatPeriodLabel(period.start_date, period.end_date)}. Approved lines only — ready to pay.</p>
      </section>
      <div className="period-switch">
        {periods.map((p) => (
          <Link
            key={p.id}
            className={p.id === period.id ? "active" : undefined}
            href={`/admin/wages?start=${p.start_date}&end=${p.end_date}`}
          >
            {formatPeriodLabel(p.start_date, p.end_date)}
          </Link>
        ))}
      </div>
      <section className="panel">
        {wageSheet.length === 0 ? (
          <p className="empty">No approved lines for this fortnight.</p>
        ) : (
          wageSheet.map((fixer) => (
            <div className="wage-fixer" key={fixer.fixerId}>
              <div className="line-top">
                <strong>{fixer.fixerName}</strong>
                <span className="amount">{centsToPounds(fixer.totalCents)}</span>
              </div>
              <div className="line-list" style={{ marginTop: "0.75rem" }}>
                {fixer.lines.map((line) => (
                  <div className="line-item" key={line.id}>
                    <div className="line-top">
                      <div>
                        <strong>{line.kind === "job" ? line.job_name : "Variation"}</strong>
                        <div className="muted">
                          {line.kind === "job"
                            ? `${formatQuantity(line.quantity || 0)} ${line.unit_label}`
                            : line.description}
                        </div>
                      </div>
                      <div className="amount">{centsToPounds(linePayableCents(line))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div className="total-bar">
          <span>Payable total</span>
          <strong className="amount">{centsToPounds(total)}</strong>
        </div>
      </section>
    </main>
  );
}
