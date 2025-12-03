import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function getAuthUrl(): Promise<string> {
  const res = await axios.get(`${API_BASE}/gmail/auth-url`);
  return res.data.url;
}

const getToken = () => localStorage.getItem("gcleaner_token");

export async function getEmails() {
  const token = getToken();
  const res = await axios.get(`${API_BASE}/gmail/list`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function clusterEmails() {
  const token = getToken();
  const res = await axios.get(`${API_BASE}/gmail/classify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
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
