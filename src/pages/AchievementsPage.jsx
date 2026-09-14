import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

export function AchievementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("achievements")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const granted = items.filter((a) => a.granted);
  const locked = items.filter((a) => !a.granted);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="sys-label text-gold">Gamificação</p>
      <h1 className="mt-1 font-serif text-3xl font-bold">Conquistas</h1>
      <p className="mt-2 text-sm text-muted">
        {user ? `Você desbloqueou ${granted.length} de ${items.length} conquistas.` : "Faça login para acompanhar seu progresso."}
      </p>

      {loading ? (
        <div className="flex justify-center py-16"><div className="pulse-dot" /></div>
      ) : (
        <>
          {granted.length > 0 && (
            <section className="mt-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {granted.map((a) => (
                  <article key={a.id} className="panel rounded-2xl border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-3xl">{a.icon}</span>
                      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                        {timeAgo(a.grantedAt)}
                      </span>
                    </div>
                    <h3 className="mt-3 font-serif font-bold">{a.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{a.description}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="mb-3 font-serif text-lg font-bold">Ainda bloqueadas</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locked.map((a) => (
                <article key={a.id} className="panel rounded-2xl p-5 opacity-60 grayscale">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl">{a.icon}</span>
                    <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold text-muted">Bloqueada</span>
                  </div>
                  <h3 className="mt-3 font-serif font-bold">{a.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{a.description}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-12 text-center">
            <Link to="/cursos" className="btn-primary">Continuar desbloqueando</Link>
          </div>
        </>
      )}
    </div>
  );
}