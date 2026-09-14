import { all, filter, findOne, ensureReady } from "../store.js";
import { error, json } from "../http.js";
import { requireUser } from "../auth.js";

const INTERVALS = [0, 1, 3, 7, 15, 30];

export default async function handler(event) {
  await ensureReady();
  const auth = await requireUser(event);
  if (!auth) return error("Não autenticado.", 401);

  const q = event.queryStringParameters || {};
  const courseId = q.courseId || null;

  const enrollments = await filter("enrollments", (e) => e.userId === auth.sub);
  const enrolled = enrollments.map((e) => e.courseId);

  const [courses, modules] = await Promise.all([all("courses"), all("modules")]);
  const { courseSlug } = q;
  const course = courseSlug ? courses.find((c) => c.slug === courseSlug) : null;
  if (courseSlug && !course) return error("Curso não encontrado.", 404);

  const modCourse = new Map(modules.map((m) => [m.id, m.courseId]));
  const lessons = await all("lessons");
  const lessonIds = lessons
    .filter((l) => (course ? modCourse.get(l.moduleId) === course.id : courseId ? modCourse.get(l.moduleId) === courseId : enrolled.includes(modCourse.get(l.moduleId))))
    .map((l) => l.id);

  if (!lessonIds.length) return json(emptyStats());

  const lessonIdSet = new Set(lessonIds);
  const cards = (await all("cards")).filter((c) => lessonIdSet.has(c.lessonId));
  const reviews = await filter("reviews", (r) => r.userId === auth.sub);

  const now = Date.now();
  const reviewMap = new Map(reviews.map((r) => [r.cardId, r]));

  const deck = cards.map((card) => {
    const r = reviewMap.get(card.id);
    const box = r?.box ?? 0;
    const next = r ? r.nextReviewAt.getTime() : null;
    const due = next == null || next <= now;
    let interval = INTERVALS[Math.min(box, INTERVALS.length - 1)];
    if (box === 0 && r) interval = 0;
    return {
      id: card.id,
      front: card.front,
      back: card.back,
      box,
      streak: r?.streak ?? 0,
      intervalDays: interval,
      due,
      nextReviewAt: next ?? now,
      lessonId: card.lessonId,
    };
  });

  const due = deck.filter((d) => d.due);
  const boxes = [0, 1, 2, 3, 4, 5].map((b) => deck.filter((d) => d.box === b).length);

  return json({
    due: due.map(({ due: _d, ...rest }) => rest),
    dueCount: due.length,
    total: deck.length,
    boxes,
    nextReviewAt: due.reduce((m, d) => Math.min(m, d.nextReviewAt), Infinity),
  });
}

function emptyStats() {
  return { due: [], dueCount: 0, total: 0, boxes: [0, 0, 0, 0, 0, 0], nextReviewAt: null };
}