const API_URL = "https://barber-legend-1.onrender.com";

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const user = tg?.initDataUnsafe?.user || {
  id: "demo_user",
  first_name: "Demo",
  username: "demo_user"
};

const app = document.getElementById("app");

function haptic() {
  tg?.HapticFeedback?.impactOccurred("light");
}