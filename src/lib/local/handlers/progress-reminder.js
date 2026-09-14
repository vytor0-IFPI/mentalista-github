// Função agendada (netlify.toml: 0 11 * * *): lembrete diário de progresso.
import { all, count, ensureReady } from "../store.js";
import { error, json } from "../http.js";

export default async function handler(event) {
  await ensureReady();
  try {
    const today = new Date();
    const users = (await all("users")).slice(0, 50);

    const enrollments = await count("enrollments", null);
    const lessonsDone = await count("progress", null);

    const digest = {
      date: today.toISOString().slice(0, 10),
      users: users.length,
      enrollments,
      lessonsDone,
      message: "Lembrete gerado com sucesso.",
    };

    const webhook = process.env.REMINDER_WEBHOOK;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(digest),
      }).catch(() => {});
    }

    return json(digest);
  } catch (e) {
    return error(String(e), 500);
  }
}