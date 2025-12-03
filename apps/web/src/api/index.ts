import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const getToken = () => localStorage.getItem("gcleaner_token");

// --- Auth ---
export async function getAuthUrl() {
  const res = await axios.get(`${API_BASE}/gmail/auth-url`);
  return res.data.url;
}

export async function authenticateWithCode(code: string) {
  const res = await axios.get(`${API_BASE}/gmail/callback`, {
    params: { code },
  });
  if (res.data.access_token) {
    localStorage.setItem("gcleaner_token", res.data.access_token);
  }
  return res.data;
}

export async function syncEmails(nextToken?: string) {
  const token = getToken();
  const res = await axios.get(`${API_BASE}/gmail/sync`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { nextToken },
  });
  return res.data;
}

export async function getCategories() {
  const token = getToken();
  const res = await axios.get(`${API_BASE}/gmail/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function analyzeEmails() {
  const token = getToken();
  const res = await axios.get(`${API_BASE}/gmail/analyze`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getLocalEmails(page = 1, category = "All") {
  const token = getToken();
  const res = await axios.get(`${API_BASE}/gmail/list`, {
    params: { page, category },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
