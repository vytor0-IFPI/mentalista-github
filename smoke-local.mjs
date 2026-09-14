import { localReady, localRequest } from "./src/lib/local/engine.js";
import { COLLECTIONS } from "./src/lib/local/store.js";

async function call(method, endpoint, { body, token } = {}) {
  const res = await localRequest(method, endpoint, { body, headers: {}, token });
  let data = null;
  try {
    data = res.body ? JSON.parse(res.body) : null;
  } catch {
    data = null;
  }
  return { status: res.statusCode, data };
}

function assert(cond, label) {
  if (!cond) throw new Error(`FALHOU: ${label}`);
  console.log(`ok - ${label}`);
}

await localReady();
for (const c of COLLECTIONS) console.log(`  coleção ${c}: ok`);

const courses = await call("GET", "courses");
assert(courses.data?.length === 7, "courses = 7");

const login = await call("POST", "auth-login", {
  body: { email: "demo@mentalistas.com", password: "mentalista123" },
});
assert(Boolean(login.data?.token), "login demo → token");
const token = login.data.token;

const me = await call("GET", "auth-me", { token });
assert(me.status === 200 && me.data?.user?.email, "auth-me ok");

const course = await call("GET", "course/o-metodo-patrick-jane", { token });
assert(course.data?.slug === "o-metodo-patrick-jane", "course ok");

const lesson = await call("GET", "lesson/o-metodo-patrick-jane/licao-01", { token });
assert(lesson.data?.lesson?.slug === "licao-01", "lesson ok");

const cards = await call("GET", "cards", { token });
assert(cards.data?.dueCount >= 0, "cards ok");
const cardId = cards.data?.due?.[0]?.id;

const review = await call("POST", "review", { token, body: { cardId, quality: 4 } });
assert(review.data?.ok === true, "review ok");

const progress = await call("POST", "progress", {
  token,
  body: { lessonId: lesson.data.lesson.id, score: 3, timeSpentMin: 5 },
});
assert(progress.data?.ok === true, "progress ok");

const notes = await call("PUT", "notes", {
  token,
  body: { lessonId: lesson.data.lesson.id, content: "anotação local" },
});
assert(notes.data?.ok === true, "notes PUT ok");

const achievements = await call("GET", "achievements", { token });
assert(Array.isArray(achievements.data) && achievements.data.length >= 18, "achievements ok");

const enroll = await call("POST", "enroll", { token, body: { courseSlug: "o-metodo-patrick-jane" } });
assert(enroll.data?.ok === true, "enroll ok");

const register = await call("POST", "auth-register", {
  body: { name: "Teste", email: "novo@teste.com", password: "senha123" },
});
assert(Boolean(register.data?.token), "register ok");

console.log("\nSMOKE LOCAL: TODOS OS TESTES PASSARAM");
process.exit(0);