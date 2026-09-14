import { all, count, filter, findOne, createMany, update } from "./store.js";
import { ensureReady } from "./store.js";

const INTERVALS = { 0: 0, 1: 1, 2: 3, 3: 7, 4: 15, 5: 30 };

async function userStats(userId) {
  await ensureReady();
  const [progress, enrollments, reviews, modules, lessons, courses] = await Promise.all([
    filter("progress", (p) => p.userId === userId),
    filter("enrollments", (e) => e.userId === userId),
    filter("reviews", (r) => r.userId === userId),
    all("modules"),
    all("lessons"),
    all("courses"),
  ]);
  const moduleByCourse = new Map();
  for (const m of modules) moduleByCourse.set(m.id, m.courseId);
  const lessonCourse = new Map();
  for (const l of lessons) lessonCourse.set(l.id, moduleByCourse.get(l.moduleId));

  const byCourse = new Map();
  const completedLessonIds = new Set();
  const quizDone = [];
  for (const p of progress) {
    const cid = lessonCourse.get(p.lessonId);
    if (!cid) continue;
    completedLessonIds.add(p.lessonId);
    byCourse.set(cid, (byCourse.get(cid) || 0) + 1);
    const lesson = lessons.find((l) => l.id === p.lessonId);
    if (lesson?.kind === "quiz") quizDone.push(p);
  }

  const totalByCourse = new Map();
  for (const l of lessons) {
    const cid = lessonCourse.get(l.id);
    totalByCourse.set(cid, (totalByCourse.get(cid) || 0) + 1);
  }

  const noteCount = await count("notes", (n) => n.userId === userId);

  const days = [...new Set(progress.map((p) => p.completedAt.toISOString().slice(0, 10)))];
  days.sort();
  let streak = 0;
  if (days.length) {
    const last = new Date(days[days.length - 1] + "T12:00:00Z");
    const now = new Date();
    const diffDays = Math.floor((now - last) / 86400000);
    if (diffDays <= 1) {
      streak = 1;
      let cursor = new Date(last.getTime() - 86400000);
      while (days.includes(cursor.toISOString().slice(0, 10))) {
        streak += 1;
        cursor = new Date(cursor.getTime() - 86400000);
      }
    }
  }

  return {
    completedCount: completedLessonIds.size,
    perfectQuizzes: quizDone.filter((p) => p.score === 100).length,
    byCourse,
    totalByCourse,
    enrolledCourseIds: new Set(enrollments.map((e) => e.courseId)),
    reviewCount: reviews.length,
    noteCount,
    streak,
    courses,
  };
}

export async function grantAchievements(userId) {
  const stats = await userStats(userId);
  const candidates = [];
  const enrolled = stats.enrolledCourseIds;

  if (stats.completedCount >= 1) candidates.push("first-lesson");
  if (stats.completedCount >= 5) candidates.push("five-lessons");
  if (stats.completedCount >= 10) candidates.push("ten-lessons");
  if (stats.completedCount >= 25) candidates.push("twenty-five-lessons");
  if (stats.perfectQuizzes >= 1) candidates.push("quiz-perfect");
  if (stats.noteCount >= 1) candidates.push("notes-1");
  if (stats.reviewCount >= 10) candidates.push("flashcards-10");
  if (stats.reviewCount >= 50) candidates.push("flashcards-50");
  if (stats.streak >= 3) candidates.push("streak-3");
  if (stats.streak >= 7) candidates.push("streak-7");

  const mainCourse = stats.courses.find((c) => c.slug === "o-metodo-patrick-jane");
  if (mainCourse) {
    const done = stats.byCourse.get(mainCourse.id) || 0;
    const total = stats.totalByCourse.get(mainCourse.id) || 0;
    if (total > 0 && done >= Math.ceil(total / 2)) candidates.push("half-course");
    if (total > 0 && done >= total) candidates.push("course-complete");
  }

  for (const c of stats.courses) {
    if (c.slug === "o-metodo-patrick-jane") continue;
    const done = stats.byCourse.get(c.id) || 0;
    const total = stats.totalByCourse.get(c.id) || 0;
    if (total > 0 && done >= total) candidates.push("mini-complete");
  }

  const allComplete = stats.courses.every((c) => (stats.byCourse.get(c.id) || 0) >= (stats.totalByCourse.get(c.id) || 0));
  if (stats.courses.length > 0 && allComplete) candidates.push("all-courses");

  const existing = await filter("userAchievements", (a) => a.userId === userId);
  const owned = new Set(existing.map((e) => e.achievementId));

  const achievements = await all("achievements");
  const slugToId = new Map(achievements.map((a) => [a.slug, a.id]));

  const toGrant = [...new Set(candidates)].filter(
    (slug) => slugToId.has(slug) && !owned.has(slugToId.get(slug))
  );
  if (!toGrant.length) return [];

  await createMany(
    "userAchievements",
    toGrant.map((slug) => ({ userId, achievementId: slugToId.get(slug), grantedAt: new Date() })),
    ["userId", "achievementId"]
  );

  const completionAchievements = ["course-complete", "all-courses"];
  if (toGrant.some((s) => completionAchievements.includes(s))) {
    await update("users", userId, { completedCourseAt: new Date() });
  }

  return toGrant;
}

export async function achievementSummary(userId) {
  await ensureReady();
  const [granted, allAchievements] = await Promise.all([
    filter("userAchievements", (a) => a.userId === userId),
    all("achievements"),
  ]);
  return granted
    .map((g) => {
      const a = allAchievements.find((x) => x.id === g.achievementId);
      return a ? { ...a, grantedAt: g.grantedAt } : null;
    })
    .filter(Boolean);
}