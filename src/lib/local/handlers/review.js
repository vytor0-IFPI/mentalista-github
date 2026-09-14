import { all, findOne, upsert, ensureReady } from "../store.js";
import { body, error, json } from "../http.js";
import { requireUser } from "../auth.js";
import { grantAchievements } from "../achievements.js";

const INTERVALS = [0, 1, 3, 7, 15, 30];

export default async function handler(event) {
  await ensureReady();
  if (event.httpMethod !== "POST") return error("Método não permitido", 405);
  const auth = await requireUser(event);
  if (!auth) return error("Não autenticado.", 401);

  const { cardId, quality } = await body(event);
  const card = (await all("cards")).find((c) => c.id === cardId);
  if (!card) return error("Card não encontrado.", 404);

  const existing = await findOne("reviews", (r) => r.userId === auth.sub && r.cardId === cardId);

  const good = quality === "good";
  let box = existing?.box ?? 0;
  let streak = existing?.streak ?? 0;
  if (good) {
    box = Math.min(box + 1, 5);
    streak += 1;
  } else {
    box = Math.max(0, box - 1);
    streak = 0;
  }
  const intervalDays = INTERVALS[Math.min(box, INTERVALS.length - 1)];
  const next = Date.now() + intervalDays * 86400000;

  await upsert(
    "reviews",
    (r) => r.userId === auth.sub && r.cardId === cardId,
    { userId: auth.sub, cardId, box, streak, nextReviewAt: new Date(next), lastReviewedAt: new Date() },
    { box, streak, nextReviewAt: new Date(next), lastReviewedAt: new Date() }
  );

  const granted = await grantAchievements(auth.sub);
  return json({ ok: true, box, streak, intervalDays, nextReviewAt: next, granted });
}