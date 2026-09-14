import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmtDuration } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ProgressBar } from "../components/ProgressBar";

const KIND_LABEL = { lesson: "Lição", quiz: "Quiz" };

export function CoursePage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  function load() {
    setLoading(true);
    api.get(`course/${slug}`).then(setCourse).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }

  useEffect(load, [slug, user?.id]);

  if (loading) return <div className="flex justify-center py-24"><div className="pulse-dot" /></div>;
  if (error || !course) return <div className="py-24 text-center text-muted">Curso não encontrado.</div>;

  async function enroll() {
    setEnrolling(true);
    try {
      await api.post("enroll", { courseSlug: course.slug });
      load();
    } finally {
      setEnrolling(false);
    }
  }

  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const completedCount = course.modules.reduce(
    (n, m) => n + m.lessons.filter((l) => l.done).length,
    0
  );
  const quizSlug = (m) => m.lessons.find((l) => l.kind === "quiz")?.slug;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav className="mb-6 text-xs text-muted">
        <Link to="/cursos" className="hover:text-gold">Cursos</Link>
        <span className="mx-2">/</span>
        <span>{course.title}</span>
      </nav>

      <div className="panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="sys-label text-gold">{course.category}</span>
              <span className="rounded-full bg-soft px-2 py-1 text-muted">{course.level}</span>
              {course.done && (
                <span className="rounded-full bg-green-500/15 px-2 py-1 font-semibold text-green-600 dark:text-green-400">Concluído ✓</span>
              )}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-bold">{course.title}</h1>
            {course.tagline && <p className="mt-2 text-muted">{course.tagline}</p>}
            <p className="mt-4 text-sm leading-relaxed text-muted">{course.description}</p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <div className="text-xs text-muted">
              {course.moduleCount} módulos · {lessonCount} lições · {fmtDuration(course.durationMinutes)}
            </div>
            {user && !course.enrolled ? (
              <button onClick={enroll} disabled={enrolling} className="btn-primary">
                {enrolling ? "Matriculando…" : "Matricular-se grátis"}
              </button>
            ) : (
              <div className="w-48">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>Progresso</span>
                  <span>{completedCount}/{lessonCount}</span>
                </div>
                <ProgressBar percent={course.progressPercent} />
              </div>
            )}
          </div>
        </div>
      </div>

      {course.enrolled && course.progressPercent > 0 && (
        <div className="mt-4 w-full sm:w-64">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Progresso do curso</span>
            <span>{course.progressPercent}%</span>
          </div>
          <ProgressBar percent={course.progressPercent} />
        </div>
      )}

      <div className="mt-8 space-y-4">
        {course.modules.map((m, mi) => (
          <div key={m.id} className="panel overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <div className="sys-label text-gold">Capítulo {String(mi + 1).padStart(2, "0")}</div>
                <h2 className="mt-1 font-serif text-lg font-bold">{m.title}</h2>
              </div>
              <div className="text-right text-[11px] text-muted">
                <div>{m.lessons.filter((l) => l.done).length}/{m.lessons.length}</div>
                <ProgressBar className="mt-1 !w-24" percent={(m.lessons.filter((l) => l.done).length / m.lessons.length) * 100} />
              </div>
            </div>
            <ul className="divide-y divide-line">
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/curso/${course.slug}/${l.slug}`}
                    className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-soft"
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                        l.done ? "border-gold bg-gold text-ink" : "border-line text-muted"
                      }`}
                    >
                      {l.done ? "✓" : l.kind === "quiz" ? "?" : mi + 1}
                    </span>
                    <span className={l.done ? "text-muted line-through" : ""}>{l.title}</span>
                    <span className="ml-auto flex items-center gap-2 text-[11px] text-muted">
                      {l.kind === "quiz" && <span className="rounded bg-goldsoft px-1.5 py-0.5 text-gold">Quiz</span>}
                      {l.kind === "lesson" && `${l.durationMin} min`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {course.resources?.length > 0 && (
        <div className="panel mt-8 rounded-2xl p-5">
          <h3 className="font-serif font-bold">Recursos deste curso</h3>
          <ul className="mt-3 divide-y divide-line">
            {course.resources.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="text-gold">{resourceIcon(r.type)}</span>
                <a className="hover:text-gold" target="_blank" rel="noreferrer" href={r.url || "#"}>
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function resourceIcon(type) {
  const map = { pdf: "📄", audio: "🎧", video: "🎬", cheatsheet: "📋", link: "🔗" };
  return map[type] || "🔗";
}