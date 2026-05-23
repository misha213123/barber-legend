const fallbackServices = [
  { id: 1, name: "Стрижка", desc: "Классическая мужская стрижка с укладкой", duration: 45, price: 120, icon: "✂️", img: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600&auto=format&fit=crop", is_active: 1 },
  { id: 2, name: "Стрижка + борода", desc: "Стрижка и оформление бороды", duration: 60, price: 160, icon: "🧔", img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&auto=format&fit=crop", is_active: 1 },
  { id: 3, name: "Королевское бритьё", desc: "Бритьё опасной бритвой + уход", duration: 40, price: 110, icon: "🪒", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&auto=format&fit=crop", is_active: 1 },
  { id: 4, name: "Детская стрижка", desc: "Стрижка для детей до 12 лет", duration: 30, price: 90, icon: "👦", img: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=600&auto=format&fit=crop", is_active: 1 }
];

const fallbackMasters = [
  { id: 1, name: "Алексей", role: "Топ-барбер", rating: "4.9", reviews: 243, img: "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=300&auto=format&fit=crop", is_active: 1 },
  { id: 2, name: "Дмитрий", role: "Барбер", rating: "4.8", reviews: 165, img: "https://images.unsplash.com/photo-1622286346003-c2e63b378f17?q=80&w=300&auto=format&fit=crop", is_active: 1 },
  { id: 3, name: "Максим", role: "Барбер", rating: "4.9", reviews: 112, img: "https://images.unsplash.com/photo-1590086783191-a0694c7d1e6e?q=80&w=300&auto=format&fit=crop", is_active: 1 },
  { id: 4, name: "Игорь", role: "Барбер", rating: "4.7", reviews: 98, img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop", is_active: 1 }
];

async function loadCatalog(includeInactive = false) {
  try {
    const servicesData = await api(`/services${includeInactive ? "?include_inactive=1" : ""}`);
    const mastersData = await api(`/masters${includeInactive ? "?include_inactive=1" : ""}`);

    services = servicesData.length ? servicesData : fallbackServices;
    masters = mastersData.length ? mastersData : fallbackMasters;
  } catch (e) {
    services = fallbackServices;
    masters = fallbackMasters;
  }

  if (!selectedService || !services.find(s => s.id === selectedService.id)) {
    selectedService = services.find(s => Number(s.is_active) === 1) || services[0];
  }

  if (!selectedMaster || !masters.find(m => m.id === selectedMaster.id)) {
    selectedMaster = masters.find(m => Number(m.is_active) === 1) || masters[0];
  }
}