function loyaltyProgressPercent(visits, nextLevel) {
  if (!nextLevel || visits >= nextLevel) return 100;
  return Math.min(100, Math.round((visits / nextLevel) * 100));
}

async function loyaltyScreen() {
  haptic();
  await loadClientSummary();

  const visits = clientSummary?.total_visits || 0;
  const next = clientSummary?.next_level_visits || 5;
  const level = clientSummary?.level || "Bronze";
  const discount = clientSummary?.discount || 0;
  const progress = loyaltyProgressPercent(visits, next);

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="openClientMenu()">←</div>
        <h2>Бонусы</h2>
      </div>

      <div class="loyalty-card">
        <div class="loyalty-level">${level === "Legend" ? "💎" : level === "Gold" ? "🥇" : level === "Silver" ? "🥈" : "🥉"}</div>
        <h2>${level}</h2>
        <p>Твоя текущая скидка: <span class="price">${discount}%</span></p>

        <div class="progress-wrap">
          <div class="progress-line">
            <div style="width:${progress}%"></div>
          </div>
          <p class="muted">${visits} / ${next} визитов до следующего уровня</p>
        </div>
      </div>

      <div class="details">
        <h3>Уровни</h3>
        <div class="bonus-row"><span>🥉 Bronze</span><b>0%</b></div>
        <div class="bonus-row"><span>🥈 Silver · 5 визитов</span><b>10%</b></div>
        <div class="bonus-row"><span>🥇 Gold · 10 визитов</span><b>15%</b></div>
        <div class="bonus-row"><span>💎 Legend · 15 визитов</span><b>20%</b></div>
      </div>

      ${await nav("home")}
    </div>
  `;
}