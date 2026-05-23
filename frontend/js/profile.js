const COUNTRY_CODES = [
  { name: "Польша", code: "+48", flag: "🇵🇱" },
  { name: "Украина", code: "+380", flag: "🇺🇦" },
  { name: "Беларусь", code: "+375", flag: "🇧🇾" },
  { name: "Литва", code: "+370", flag: "🇱🇹" },
  { name: "Германия", code: "+49", flag: "🇩🇪" },
  { name: "Другая", code: "+", flag: "🌍" }
];

let selectedCountryCode = "+48";

async function loadMyProfile() {
  try {
    currentProfile = await api(`/me/profile?telegram_id=${encodeURIComponent(user.id)}`);
    return currentProfile;
  } catch {
    currentProfile = null;
    return null;
  }
}

function isProfileComplete(profile) {
  return Boolean(profile && profile.full_name && profile.phone && profile.email);
}

async function ensureUserProfile() {
  const profile = await loadMyProfile();

  if (!isProfileComplete(profile)) {
    registrationScreen(profile);
    return false;
  }

  return true;
}

function registrationScreen(profile = null) {
  const usernameText = user.username ? `@${user.username}` : "username не указан";

  app.innerHTML = `
    <div class="screen register-screen">
      <div class="register-card">
        <div class="register-logo">LEGEND<span>BARBERSHOP</span></div>
        <h2>Добро пожаловать</h2>
        <p class="muted">Заполни данные один раз, чтобы мы могли подтвердить запись и связаться с тобой.</p>

        <label class="form-label">Имя</label>
        <input class="form-input" id="regName" placeholder="Например, Михаил" value="${profile?.full_name || user.first_name || ""}">

        <label class="form-label">Страна и код</label>
        <div class="country-grid">
          ${COUNTRY_CODES.map(c => `
            <button class="country-btn ${selectedCountryCode === c.code ? "active" : ""}" onclick="selectCountryCode('${c.code}')">
              <b>${c.flag}</b>
              <span>${c.code}</span>
            </button>
          `).join("")}
        </div>

        <label class="form-label">Телефон</label>
        <div class="phone-input-row">
          <div class="phone-code">${selectedCountryCode}</div>
          <input class="form-input phone-number-input" id="regPhone" inputmode="tel" placeholder="500 000 000" value="${profile?.phone_without_code || ""}">
        </div>

        <label class="form-label">Email</label>
        <input class="form-input" id="regEmail" inputmode="email" placeholder="example@mail.com" value="${profile?.email || ""}">

        <div class="telegram-hint">
          Telegram: <span>${usernameText}</span>
        </div>

        <button class="gold-btn" onclick="saveUserProfile()">Сохранить и войти</button>
      </div>
    </div>
  `;
}

function selectCountryCode(code) {
  selectedCountryCode = code;
  registrationScreen(currentProfile);
}

async function saveUserProfile() {
  const fullName = document.getElementById("regName")?.value.trim();
  const phoneWithoutCode = document.getElementById("regPhone")?.value.trim();
  const email = document.getElementById("regEmail")?.value.trim();

  if (!fullName) {
    alert("Укажи имя.");
    return;
  }

  if (!phoneWithoutCode) {
    alert("Укажи номер телефона.");
    return;
  }

  if (!email || !email.includes("@")) {
    alert("Укажи корректный email.");
    return;
  }

  const phone = `${selectedCountryCode}${phoneWithoutCode.replace(/\s+/g, "")}`;

  try {
    await api("/me/profile", {
      method: "POST",
      body: JSON.stringify({
        telegram_id: String(user.id),
        username: user.username || "",
        first_name: user.first_name || "",
        full_name: fullName,
        country_code: selectedCountryCode,
        phone_without_code: phoneWithoutCode,
        phone,
        email
      })
    });

    currentProfile = null;
    await home();
  } catch {
    alert("Не удалось сохранить данные.");
  }
}