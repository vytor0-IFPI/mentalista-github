import { all, createMany, ensureReady } from "../store.js";
import { body, error, json, notFound } from "../http.js";
import { requireUser } from "../auth.js";

export default async function handler(event) {
  await ensureReady();
  if (event.httpMethod !== "POST") return error("Método não permitido", 405);
  const auth = await requireUser(event);
  if (!auth) return error("Não autenticado.", 401);

  const { courseSlug } = await body(event);
  const course = (await all("courses")).find((c) => c.slug === courseSlug);
  if (!course) return notFound();

  await createMany(
    "enrollments",
    [{ userId: auth.sub, courseId: course.id, createdAt: new Date(), completedAt: null }],
    ["userId", "courseId"]
  );

  return json({ ok: true, enrolled: true });
}