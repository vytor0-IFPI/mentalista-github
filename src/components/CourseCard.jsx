import { Link } from "react-router-dom";
import { fmtDuration } from "../lib/api";
import { ProgressBar } from "./ProgressBar";

export function CourseCard({ course, showProgress = true }) {
  return (
    <Link
      to={`/curso/${course.slug}`}
      className="panel group relative flex flex-col gap-3 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
      style={{ backgroundImage: course.coverImage ? `url(${course.coverImage})` : undefined }}
    >
      <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-amber-500/10 to-stone-800/20 dark:to-stone-900/30" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="sys-label text-gold">{course.category || "Curso"}</span>
          {course.featured && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">Destaque</span>
          )}
          {course.done && (
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
              Concluído
            </span>
          )}
        </div>
        {!course.free && (
          <span className="rounded-md bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">Premium</span>
        )}
      </div>

      <div>
        <h3 className="text-lg font-serif font-bold leading-snug group-hover:text-gold">{course.title}</h3>
        {course.tagline && <p className="mt-1 line-clamp-2 text-sm text-muted">{course.tagline}</p>}
      </div>

      <div className="mt-auto flex items-center justify-between text-[11px] text-muted">
        <span>{course.moduleCount} módulos · {course.lessonCount} lições</span>
        {course.durationMinutes > 0 && <span>{fmtDuration(course.durationMinutes)}</span>}
      </div>

      {showProgress && course.progressPercent > 0 && (
        <div>
          <ProgressBar percent={course.progressPercent} />
          <p className="mt-1 text-right text-[10px] text-muted">{course.progressPercent}% concluído</p>
        </div>
      )}
    </Link>
  );
}