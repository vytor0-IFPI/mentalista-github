import { all, filter, ensureReady } from "../store.js";
import { json } from "../http.js";
import { requireUser } from "../auth.js";

export default async function handler(event) {
  await ensureReady();
  const [courses, lessons, modules] = await Promise.all([all("courses"), all("lessons"), all("modules")]);

  const modByCourse = new Map();
  for (const m of modules) modByCourse.set(m.id, m.courseId);
  const lessonsByCourse = new Map();
  for (const l of lessons) {
    const cid = modByCourse.get(l.moduleId);
    if (!lessonsByCourse.has(cid)) lessonsByCourse.set(cid, []);
    lessonsByCourse.get(cid).push(l);
  }

  const auth = await requireUser(event);
  const completedLessonIds = new Set();
  if (auth) {
    const progress = await filter("progress", (p) => p.userId === auth.sub);
    progress.forEach((p) => completedLessonIds.add(p.lessonId));
  }

  const published = courses
    .filter((c) => c.published)
    .sort((a, b) => (b.featured - a.featured) || (a.order - b.order));

  const list = published.map((course) => {
    const lessonRows = lessonsByCourse.get(course.id) || [];
    const done = lessonRows.filter((l) => completedLessonIds.has(l.id)).length;
    return {
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
      moduleCount: new Set(lessonRows.map((l) => l.moduleId)).size,
      lessonCount: lessonRows.length,
      progressPercent: lessonRows.length ? Math.round((done / lessonRows.length) * 100) : 0,
      done: done >= lessonRows.length && lessonRows.length > 0,
    };
  });

  return json(list);
}