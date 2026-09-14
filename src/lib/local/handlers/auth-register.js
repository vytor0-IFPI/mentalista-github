import bcrypt from "bcryptjs";
import { all, create, createMany, ensureReady, findOne } from "../store.js";
import { body, error, json } from "../http.js";
import { signToken } from "../auth.js";
import { grantAchievements } from "../achievements.js";

export default async function handler(event) {
  await ensureReady();
  const { name, email, password } = await body(event);
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!name || name.trim().length < 2) return error("Informe seu nome.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return error("E-mail inválido.");
  if (!password || password.length < 6) return error("A senha precisa ter ao menos 6 caracteres.");

  const exists = await findOne("users", (u) => u.email === cleanEmail);
  if (exists) return error("Este e-mail já está cadastrado.", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await create("users", {
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    provider: "password",
    image: "",
    avatarImage: "",
    role: "student",
    createdAt: new Date(),
    firstLoginAt: new Date(),
    lastLoginAt: new Date(),
    welcomeSentAt: null,
    completedCourseAt: null,
  });

  const freeCourses = (await all("courses")).filter((c) => c.free);
  if (freeCourses.length) {
    await createMany(
      "enrollments",
      freeCourses.map((c) => ({ userId: user.id, courseId: c.id, createdAt: new Date(), completedAt: null })),
      ["userId", "courseId"]
    );
  }

  await grantAchievements(user.id);

  const token = await signToken(user);
  return json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarImage: user.avatarImage } });
}