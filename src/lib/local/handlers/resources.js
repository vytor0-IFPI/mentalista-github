import { all, ensureReady } from "../store.js";
import { json } from "../http.js";

export default async function handler(event) {
  await ensureReady();
  const q = event.queryStringParameters || {};
  const [resources, courses, lessons] = await Promise.all([all("resources"), all("courses"), all("lessons")]);

  const courseBySlug = new Map(courses.map((c) => [c.slug, c]));
  const lessonById = new Map(lessons.map((l) => [l.id, l]));

  let rows = resources;
  if (q.course) {
    const course = courseBySlug.get(q.course);
    if (course) rows = rows.filter((r) => r.courseId === course.id);
  }
  rows = rows.sort((a, b) => (a.order || 0) - (b.order || 0));

  return json(
    rows.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      url: r.url,
      content: r.content,
      course: r.courseId ? { title: courses.find((c) => c.id === r.courseId)?.title ?? "", slug: courses.find((c) => c.id === r.courseId)?.slug ?? "" } : null,
      lesson: r.lessonId ? { title: lessonById.get(r.lessonId)?.title ?? "", slug: lessonById.get(r.lessonId)?.slug ?? "" } : null,
    }))
  );
}