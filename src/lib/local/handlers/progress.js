import { all, count, createMany, ensureReady, findOne, updateMany, upsert } from "../store.js";
import { body, error, json, notFound } from "../http.js";
import { requireUser } from "../auth.js";
import { grantAchievements } from "../achievements.js";

export default async function handler(event) {
  await ensureReady();
  if (event.httpMethod !== "POST") return error("Método não permitido", 405);
  const auth = await requireUser(event);
  if (!auth) return error("Não autenticado.", 401);

  const { lessonId, score } = await body(event);
  const [lessons, modules] = await Promise.all([all("lessons"), all("modules")]);
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) return notFound();

  const courseId = modules.find((m) => m.id === lesson.moduleId)?.courseId;
  if (!courseId) return notFound();

  const existing = await findOne("progress", (p) => p.userId === auth.sub && p.lessonId === lessonId);
  const best = Math.max(existing?.score ?? 0, Number(score) || 0);

  await upsert(
    "progress",
    (p) => p.userId === auth.sub && p.lessonId === lessonId,
    { userId: auth.sub, lessonId, score: best, completedAt: new Date() },
    { score: best, completedAt: new Date() }
  );

  await createMany("enrollments", [{ userId: auth.sub, courseId, createdAt: new Date(), completedAt: null }], ["userId", "courseId"]);

  const granted = await grantAchievements(auth.sub);

  const courseDone = await count("progress", (p) => {
    const l = lessons.find((x) => x.id === p.lessonId);
    const cid = modules.find((m) => m.id === l?.moduleId)?.courseId;
    return p.userId === auth.sub && cid === courseId;
  });
  const total = await count("lessons", (l) => {
    const cid = modules.find((m) => m.id === l.moduleId)?.courseId;
    return cid === courseId;
  });

  if (courseDone >= total) {
    await updateMany(
      "enrollments",
      (e) => e.userId === auth.sub && e.courseId === courseId && e.completedAt == null,
      { completedAt: new Date() }
    );
  }

  return json({
    ok: true,
    done: true,
    score: best,
    courseProgress: total ? Math.round((courseDone / total) * 100) : 0,
    granted,
  });
}