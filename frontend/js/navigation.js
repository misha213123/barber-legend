async function nav(active = "home") {
  const admin = await isAdminUser();

  return `
    <div class="bottom ${admin ? "admin-nav" : "user-nav"}">
      <div class="nav ${active === "home" ? "active" : ""}" onclick="home()"><b>⌂</b>Главная</div>
      <div class="nav ${active === "booking" ? "active" : ""}" onclick="servicesScreen()"><b>▣</b>Запись</div>
      <div class="nav ${active === "my" ? "active" : ""}" onclick="myBookings()"><b>▤</b>Мои записи</div>
      ${admin ? `<div class="nav ${active === "admin" ? "active" : ""}" onclick="admin()"><b>♙</b>Админ</div>` : ""}
    </div>
  `;
}