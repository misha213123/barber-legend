async function favoriteMasterScreen() {
  haptic();
  await loadClientSummary();
  await loadCatalog(false);

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="openClientMenu()">←</div>
        <h2>Любимый мастер</h2>
      </div>

      ${favoriteMaster ? `
        <div class="details">
          <h3>Твой любимый мастер</h3>
          <div class="card lift-card">
            <div class="master-avatar" style="background-image:url('${favoriteMaster.img || favoriteMaster.image || ""}')"></div>
            <div>
              <h3>${favoriteMaster.name}</h3>
              <p>${favoriteMaster.role}</p>
              <p><span class="price">★ ${favoriteMaster.rating}</span> (${favoriteMaster.reviews})</p>
            </div>
          </div>

          <button class="gold-btn" onclick="bookFavoriteMaster()">Записаться к любимому мастеру</button>
          <button class="dark-btn" onclick="deleteFavoriteMaster()">Убрать из любимых</button>
        </div>
      ` : `
        <p class="muted">Выбери мастера, к которому хочешь записываться быстрее.</p>
      `}

      <div class="row-title">
        <h2>Все мастера</h2>
      </div>

      ${masters.filter(m => Number(m.is_active) === 1).map(m => `
        <div class="card lift-card">
          <div class="master-avatar" style="background-image:url('${m.img || m.image || ""}')"></div>
          <div>
            <h3>${m.name}</h3>
            <p>${m.role}</p>
            <p><span class="price">★ ${m.rating}</span> (${m.reviews})</p>
            <button class="small-btn" onclick="saveFavoriteMaster(${m.id})">Сделать любимым</button>
          </div>
        </div>
      `).join("")}

      ${await nav("home")}
    </div>
  `;
}

async function saveFavoriteMaster(masterId) {
  try {
    await api("/client/favorite-master", {
      method: "POST",
      body: JSON.stringify({
        telegram_id: String(user.id),
        master_id: masterId
      })
    });

    alert("Любимый мастер сохранён.");
    await favoriteMasterScreen();
  } catch {
    alert("Не удалось сохранить любимого мастера.");
  }
}

async function deleteFavoriteMaster() {
  try {
    await api(`/client/favorite-master?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "DELETE"
    });

    favoriteMaster = null;
    alert("Любимый мастер удалён.");
    await favoriteMasterScreen();
  } catch {
    alert("Не удалось удалить любимого мастера.");
  }
}

async function bookFavoriteMaster() {
  await loadCatalog(false);

  if (!favoriteMaster) {
    alert("Сначала выбери любимого мастера.");
    return;
  }

  selectedMaster = masters.find(m => Number(m.id) === Number(favoriteMaster.id)) || favoriteMaster;
  selectedService = selectedService || services.find(s => Number(s.is_active) === 1) || services[0];
  selectedTime = "";
  masterHours = null;

  await servicesScreen();
}