import bcrypt from "bcryptjs";
import { findOne, update, ensureReady } from "../store.js";
import { body, error, json } from "../http.js";
import { signToken } from "../auth.js";

export default async function handler(event) {
  await ensureReady();
  const { email, password } = await body(event);
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !password) return error("Informe e-mail e senha.");

  const user = await findOne("users", (u) => u.email === cleanEmail);
  if (!user) return error("E-mail ou senha incorretos.", 401);
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return error("E-mail ou senha incorretos.", 401);

  await update("users", user.id, {
    firstLoginAt: user.firstLoginAt ?? new Date(),
    lastLoginAt: new Date(),
  });

  const token = await signToken(user);
  return json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarImage: user.avatarImage } });
}