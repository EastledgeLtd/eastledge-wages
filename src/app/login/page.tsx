import { loginAction } from "@/app/actions/auth";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (user) redirect(user.role === "admin" ? "/admin" : "/fixer");
  const params = await searchParams;
  return (
    <main className="hero-login">
      <div>
        <p className="brand-mark" style={{ marginBottom: "1.25rem" }}>
          Eastledge Interiors
          <span>Fortnight wages</span>
        </p>
        <h1>Book the fortnight.</h1>
        <p className="lede">
          Fixers submit jobs once every two weeks. Nothing is paid until it has been reviewed.
        </p>
      </div>
      <form action={loginAction} className="panel stack">
        {params.error ? <div className="error">{params.error}</div> : null}
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" autoComplete="username" required placeholder="Sam Reid" />
        </div>
        <div className="field">
          <label htmlFor="pin">PIN</label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="••••"
          />
        </div>
        <button className="btn" type="submit">Sign in</button>
      </form>
    </main>
  );
}
