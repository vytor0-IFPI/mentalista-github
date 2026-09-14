import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { CourseCard } from "../components/CourseCard";

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.get("auth-me"), api.get("courses")])
      .then(([me, cs]) => {
        if (!active) return;
        setStats(me);
        setCourses(cs);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!courses.length) return;
    const active =
      courses.filter((c) => c.progressPercent > 0 && !c.done).sort((a, b) => b.progressPercent - a.progressPercent)[0] ||
      courses.find((c) => !c.done);
    if (!active) {
      setNext(null);
      return;
    }
    api
      .get(`course/${active.slug}`)
      .then((c) => {
        const flat = c.modules.flatMap((m) => m.lessons);
        const n = flat.find((l) => !l.done);
        setNext(
          n
            ? { slug: c.slug, lessonSlug: n.slug, lessonTitle: n.title, courseTitle: c.title }
            : null
        );
      })
      .catch(() => {});
  }, [courses]);

  if (loading) return <div className="flex justify-center py-24"><div className="pulse-dot" /></div>;

  const statCards = [
    { label: "Lições feitas", value: stats?.stats?.lessonsDone ?? 0, icon: "📚" },
    { label: "Cursos", value: stats?.stats?.enrollments ?? 0, icon: "🎓" },
    { label: "Flashcards", value: stats?.stats?.reviews ?? 0, icon: "🃏" },
    { label: "Conquistas", value: stats?.stats?.achievements ?? 0, icon: "🏅" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="sys-label text-gold">Painel</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Olá, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-muted">Seu progresso no método, de um só lugar.</p>
        </div>
        <Link to="/cursos" className="btn-primary">Explorar cursos</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="panel flex items-center gap-4 rounded-2xl p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-goldsoft text-xl">{s.icon}</span>
            <div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {next && (
        <div className="panel mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-gold/10 to-transparent p-6">
          <div>
            <p className="sys-label mb-1 text-gold">Continue de onde parou</p>
            <p className="font-serif font-bold">{next.courseTitle}</p>
            <p className="text-sm text-muted">{next.lessonTitle}</p>
          </div>
          <Link to={`/curso/${next.slug}/${next.lessonSlug}`} className="btn-primary">Continuar lição</Link>
        </div>
      )}

      <h2 className="mb-4 mt-12 font-serif text-xl font-bold">Seus cursos</h2>
      {courses.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nenhum curso ainda. <Link className="text-gold" to="/cursos">Ver catálogo →</Link></p>
      )}

      {stats?.achievements?.length > 0 && (
        <>
          <h2 className="mb-4 mt-12 font-serif text-xl font-bold">Conquistas recentes</h2>
          <div className="flex flex-wrap gap-3">
            {stats.achievements.slice(0, 8).map((a) => (
              <Link key={a.id} to="/conquistas" className="panel flex items-center gap-3 rounded-2xl px-4 py-3 text-sm">
                <span className="text-lg">{a.icon}</span>
                <span>{a.title}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="panel mt-12 rounded-2xl p-6 text-center">
        <h3 className="font-serif text-lg font-bold">Rotina de revisão</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Flashcards com repetição espaçada consolidam cada lição na memória de longo prazo.
        </p>
        <Link to="/revisao" className="btn-ghost mt-4 inline-flex">Ir para revisão</Link>
      </div>
    </div>
  );
}