import { all, count, filter, ensureReady } from "../store.js";
import { error, json } from "../http.js";
import { requireUser } from "../auth.js";
import { achievementSummary } from "../achievements.js";

export default async function handler(event) {
  await ensureReady();
  const auth = await requireUser(event);
  if (!auth) return error("Não autenticado.", 401);

  const user = await findUser(auth.sub);
  if (!user) return error("Usuário não encontrado.", 404);

  const [enrollments, progress, reviews, notes, achievements] = await Promise.all([
    filter("enrollments", (e) => e.userId === auth.sub),
    filter("progress", (p) => p.userId === auth.sub),
    filter("reviews", (r) => r.userId === auth.sub),
    count("notes", (n) => n.userId === auth.sub),
    achievementSummary(auth.sub),
  ]);

  return json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      avatarImage: user.avatarImage,
      createdAt: user.createdAt,
    },
    stats: {
      enrollments: enrollments.length,
      lessonsDone: progress.length,
      reviews: reviews.length,
      notes,
      achievements: achievements.length,
    },
    achievements,
  });
}

async function findUser(id) {
  const users = await all("users");
  return users.find((u) => u.id === id) || null;
}