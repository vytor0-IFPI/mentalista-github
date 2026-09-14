export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

export function json(data, status = 200) {
  return {
    statusCode: status,
    headers: CORS,
    body: JSON.stringify(data),
  };
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function ok(data) {
  return json({ data });
}

export async function body(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

export function notFound() {
  return json({ error: "Não encontrado" }, 404);
}