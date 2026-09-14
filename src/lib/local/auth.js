import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode("mentalista-local-secret");

export async function signToken(user) {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export function tokenFromEvent(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return header || null;
}

export async function requireUser(event) {
  const payload = await verifyToken(tokenFromEvent(event));
  if (!payload?.sub) return null;
  return payload;
}