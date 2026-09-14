import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { CourseCard } from "../components/CourseCard";

export function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("courses").then(setCourses).catch(() => setCourses([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-serif font-bold">Catálogo de cursos</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        O método completo do curso principal e trilhas rápidas para cada habilidade — todas grátis.
      </p>

      {loading ? (
        <div className="flex justify-center py-16"><div className="pulse-dot" /></div>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted">
            {courses.reduce((n, c) => n + c.lessonCount, 0)} lições no total · {courses.length} cursos
          </p>
        </>
      )}
    </div>
  );
}