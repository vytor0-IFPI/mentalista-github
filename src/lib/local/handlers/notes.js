import { all, findOne, upsert, ensureReady } from "../store.js";
import { body, error, json, notFound } from "../http.js";
import { requireUser } from "../auth.js";
import { grantAchievements } from "../achievements.js";

export default async function handler(event) {
  await ensureReady();
  const auth = await requireUser(event);
  if (!auth) return error("Não autenticado.", 401);

  if (event.httpMethod === "GET") {
    const { lessonId } = event.queryStringParameters || {};
    if (!lessonId) return error("Informe lessonId.");
    const note = await findOne("notes", (n) => n.userId === auth.sub && n.lessonId === lessonId);
    return json({ content: note?.content ?? "" });
  }

  if (event.httpMethod === "PUT") {
    const { lessonId, content } = await body(event);
    if (!lessonId) return error("Informe lessonId.");
    const lesson = (await all("lessons")).find((l) => l.id === lessonId);
    if (!lesson) return notFound();

    const clean = (content || "").trim();
    await upsert(
      "notes",
      (n) => n.userId === auth.sub && n.lessonId === lessonId,
      { userId: auth.sub, lessonId, content: clean, updatedAt: new Date() },
      { content: clean, updatedAt: new Date() }
    );
    const granted = await grantAchievements(auth.sub);
    return json({ ok: true, content: clean, granted });
  }

  return error("Método não permitido", 405);
}