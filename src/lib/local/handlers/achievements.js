import { all, filter, ensureReady } from "../store.js";
import { json } from "../http.js";
import { requireUser } from "../auth.js";

export default async function handler(event) {
  await ensureReady();
  const achievements = (await all("achievements")).sort((a, b) => (a.icon < b.icon ? -1 : 1));
  const auth = await requireUser(event);
  let granted = new Map();
  if (auth) {
    const rows = await filter("userAchievements", (a) => a.userId === auth.sub);
    granted = new Map(rows.map((r) => [r.achievementId, r.grantedAt]));
  }

  return json(
    achievements.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      description: a.description,
      icon: a.icon,
      granted: granted.has(a.id),
      grantedAt: granted.get(a.id) ?? null,
    }))
  );
}