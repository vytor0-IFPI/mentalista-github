import { ensureReady, COLLECTIONS } from "./store.js";
import achievements from "./handlers/achievements.js";
import authLogin from "./handlers/auth-login.js";
import authMe from "./handlers/auth-me.js";
import authRegister from "./handlers/auth-register.js";
import cards from "./handlers/cards.js";
import course from "./handlers/course.js";
import courses from "./handlers/courses.js";
import enroll from "./handlers/enroll.js";
import lesson from "./handlers/lesson.js";
import notes from "./handlers/notes.js";
import progress from "./handlers/progress.js";
import resources from "./handlers/resources.js";
import review from "./handlers/review.js";

const HANDLERS = {
  achievements,
  "auth-login": authLogin,
  "auth-me": authMe,
  "auth-register": authRegister,
  cards,
  course,
  courses,
  enroll,
  lesson,
  notes,
  progress,
  progress_reminder: progress,
  resources,
  review,
};

export async function localReady() {
  await ensureReady();
}

export async function localRequest(method, endpoint, { body, headers = {}, token } = {}) {
  await ensureReady();
  const [first, ...restPath] = endpoint.split("/");
  const handler = HANDLERS[first];
  if (!handler) return { statusCode: 404, headers: {}, body: JSON.stringify({ error: "Não encontrado" }) };

  void restPath;
  const [pathPart, queryPart] = endpoint.split("?");
  const query = new URLSearchParams(queryPart || "");
  const event = {
    httpMethod: method,
    method,
    path: `/.netlify/functions/${pathPart}`,
    headers: { ...headers },
    queryStringParameters: Object.fromEntries(query.entries()),
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
  };
  if (token) event.headers.authorization = `Bearer ${token}`;
  return handler(event);
}