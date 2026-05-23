async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return await res.json();
}

async function isAdminUser() {
  if (adminCache !== null) return adminCache;

  try {
    const params = new URLSearchParams({
      telegram_id: String(user.id),
      username: user.username || "",
      first_name: user.first_name || ""
    });

    const data = await api(`/me/admin?${params.toString()}`);

    adminCache = data.is_admin === true;
    return adminCache;
  } catch (e) {
    console.error("Admin check error:", e);
    adminCache = false;
    return false;
  }
}