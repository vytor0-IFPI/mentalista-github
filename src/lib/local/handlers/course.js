import { all, filter, findOne, ensureReady } from "../store.js";
import { json, notFound } from "../http.js";
import { requireUser } from "../auth.js";

export default async function handler(event) {
  await ensureReady();
  const slug = (event.path || "/")?.split("/").filter(Boolean).pop();
  const [courses, modules, lessons, resources] = await Promise.all([all("courses"), all("modules"), all("lessons"), all("resources")]);

  const course = courses.find((c) => c.slug === slug);
  if (!course) return notFound();

  const moduleRows = modules
    .filter((m) => m.courseId === course.id)
    .sort((a, b) => a.order - b.order);

  const auth = await requireUser(event);
  const completed = new Set();
  let enrolled = false;
  if (auth) {
    const [progress, enrollment] = await Promise.all([
      filter("progress", (p) => p.userId === auth.sub),
      findOne("enrollments", (e) => e.userId === auth.sub && e.courseId === course.id),
    ]);
    progress.forEach((p) => completed.add(p.lessonId));
    enrolled = Boolean(enrollment);
  }

  const courseResources = resources
    .filter((r) => r.courseId === course.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const lessonRows = moduleRows.flatMap((m) => lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.order - b.order));
  const doneCount = lessonRows.filter((l) => completed.has(l.id)).length;
  const totalLessons = lessonRows.length;

  return json({
    id: course.id,
    slug: course.slug,
    title: course.title,
    tagline: course.tagline,
    description: course.description,
    level: course.level,
    durationMinutes: course.durationMinutes,
    coverGradient: course.coverGradient,
    coverImage: course.coverImage,
    accent: course.accent,
    category: course.category,
    free: course.free,
    featured: course.featured,
    enrolled,
    progressPercent: totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0,
    completedAt: enrolled && totalLessons > 0 && doneCount >= totalLessons,
    modules: moduleRows.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      order: m.order,
      lessons: lessonRows
        .filter((l) => l.moduleId === m.id)
        .map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          summary: l.summary,
          durationMin: l.durationMin,
          kind: l.kind,
          order: l.order,
          done: completed.has(l.id),
        })),
    })),
    resources: courseResources.map((r) => ({ id: r.id, title: r.title, type: r.type, url: r.url, content: r.content })),
  });
}