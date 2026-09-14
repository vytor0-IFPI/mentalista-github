import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { to: "/", label: "Início", end: true },
  { to: "/cursos", label: "Cursos" },
  { to: "/revisao", label: "Revisão" },
  { to: "/biblioteca", label: "Biblioteca" },
  { to: "/conquistas", label: "Conquistas" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <span className="hidden font-serif text-sm font-bold tracking-wide sm:block">
            O MÉTODO PATRICK JANE
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-gold ${
                  isActive ? "text-gold" : "text-muted"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/painel"
                className="hidden items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 hover:border-gold sm:flex"
              >
                {user.avatarImage ? (
                  <img src={user.avatarImage} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-[10px] font-bold text-ink">
                    {user.name?.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[110px] truncate text-xs font-medium">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="hidden rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:border-gold hover:text-gold md:block"
              >
                Sair
              </button>
              <button
                onClick={() => setOpen(!open)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-line md:hidden"
                aria-label="Menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
            </div>
          ) : (
            <Link to="/entrar" className="btn-primary !px-4 !py-2 text-sm">
              Entrar
            </Link>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-bg px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-soft text-gold" : "text-muted"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-sm text-muted hover:text-gold">
                Sair
              </button>
            ) : (
              <NavLink to="/entrar" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gold">
                Entrar
              </NavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}