import { logoutAction } from "@/app/actions/auth";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

export function TopBar({
  user,
  links,
}: {
  user: SessionUser;
  links: { href: string; label: string }[];
}) {
  return (
    <header className="topbar">
      <div className="brand-mark">
        Eastledge Interiors
        <span>{user.name}</span>
      </div>
      <nav className="nav-links">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <form action={logoutAction}>
          <button className="ghost-btn" type="submit">
            Sign out
          </button>
        </form>
      </nav>
    </header>
  );
}
