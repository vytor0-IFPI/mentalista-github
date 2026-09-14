import { all, filter, findOne, ensureReady } from "../store.js";
import { json, notFound } from "../http.js";
import { requireUser } from "../auth.js";

export default async function handler(event) {
  await ensureReady();
  const [, , , courseSlug, lessonSlug] = event.path?.split("/")?.filter(Boolean) || [];
  const [courses, modules, lessons, quizQuestions, cards, resources] = await Promise.all([
    all("courses"),
    all("modules"),
    all("lessons"),
    all("quizQuestions"),
    all("cards"),
    all("resources"),
  ]);

  const course = courses.find((c) => c.slug === courseSlug);
  if (!course) return notFound();

  const courseModules = modules
    .filter((m) => m.courseId === course.id)
    .sort((a, b) => a.order - b.order);
  const lessonRows = courseModules
    .flatMap((m) => lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.order - b.order))
    .map((l) => ({
      ...l,
      cards: cards.filter((c) => c.lessonId === l.id).sort((a, b) => (a.order || 0) - (b.order || 0)),
      questions: quizQuestions
        .filter((q) => q.lessonId === l.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    }));

  const lesson = lessonRows.find((l) => l.slug === lessonSlug);
  if (!lesson) return notFound();

  const auth = await requireUser(event);
  let note = "";
  let done = false;
  let bestScore = null;
  if (auth) {
    const [progress, lessonNote] = await Promise.all([
      findOne("progress", (p) => p.userId === auth.sub && p.lessonId === lesson.id),
      findOne("notes", (n) => n.userId === auth.sub && n.lessonId === lesson.id),
    ]);
    done = Boolean(progress);
    bestScore = progress?.score ?? null;
    note = lessonNote?.content ?? "";
  }

  const lessonResources = resources
    .filter((r) => r.lessonId === lesson.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const idx = lessonRows.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? lessonRows[idx - 1] : null;
  const next = idx < lessonRows.length - 1 ? lessonRows[idx + 1] : null;

  const moduleIdx = courseModules.findIndex((m) => m.id === lesson.moduleId);
  const moduleLessons = lessonRows.filter((l) => l.moduleId === lesson.moduleId);
  const lessonIdx = moduleLessons.findIndex((l) => l.id === lesson.id);
  const quizLessonId = moduleLessons.find((l) => l.kind === "quiz")?.id ?? null;

  return json({
    course: { slug: course.slug, title: course.title },
    module: { title: courseModules[moduleIdx]?.title ?? "", slug: courseModules[moduleIdx]?.slug ?? "" },
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      durationMin: lesson.durationMin,
      kind: lesson.kind,
      blocks: lesson.blocks,
      done,
      bestScore,
      score: bestScore,
      questions: lesson.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      })),
      cards: lesson.kind === "quiz" ? lesson.cards : [],
      resources: lessonResources.map((r) => ({ id: r.id, title: r.title, type: r.type, url: r.url, content: r.content })),
    },
    quizLessonId,
    note,
    prev: prev ? { slug: prev.slug, title: prev.title, kind: prev.kind } : null,
    next: next ? { slug: next.slug, title: next.title, kind: next.kind } : null,
    lessonIdx,
    lessonCount: lessonRows.length,
  });
}