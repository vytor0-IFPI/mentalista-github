import { localReady, localRequest } from "./local/engine.js";

export function getToken() {
  try {
    return localStorage.getItem("mj_token");
  } catch {
    return null;
  }
}

async function request(endpoint, { method = "GET", body, token = true } = {}) {
  await localReady();
  const t = token ? getToken() : null;
  const res = await localRequest(method, endpoint, { body, headers: {}, token: t });

  let data;
  try {
    data = JSON.parse(res.body || "null");
  } catch {
    data = null;
  }

  if (!res.statusCode || res.statusCode >= 400) {
    const err = new Error(data?.error || `Erro ${res.statusCode}`);
    err.status = res.statusCode;
    err.data = data;
    throw err;
  }
  return data?.data ?? data;
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: "POST", body }),
  put: (endpoint, body) => request(endpoint, { method: "PUT", body }),
  del: (endpoint) => request(endpoint, { method: "DELETE" }),
};

export function fmtDuration(min) {
  if (!min) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}