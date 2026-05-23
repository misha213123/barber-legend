let calendarOffset = 0;
const CALENDAR_PAGE_DAYS = 5;

function formatDateLabel(date) {
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return days[date.getDay()];
}

function formatDateFull(date) {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long"
  });
}

function formatDateNumber(date) {
  return date.getDate();
}

function formatDateMonth(date) {
  return date.toLocaleDateString("ru-RU", {
    month: "short"
  }).replace(".", "");
}

function generateBookingDays() {
  const days = [];

  for (let i = 0; i < CALENDAR_PAGE_DAYS; i++) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + calendarOffset + i);

    days.push({
      label: formatDateLabel(date),
      number: formatDateNumber(date),
      month: formatDateMonth(date),
      full: formatDateFull(date),
      raw: date.toISOString().split("T")[0],
      isPast: isPastDate(date.toISOString().split("T")[0])
    });
  }

  return days;
}

function nextCalendarPage() {
  calendarOffset += CALENDAR_PAGE_DAYS;
  timeScreen();
}

function prevCalendarPage() {
  calendarOffset = Math.max(0, calendarOffset - CALENDAR_PAGE_DAYS);
  timeScreen();
}

function isPastDate(rawDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(rawDate);
  date.setHours(0, 0, 0, 0);

  return date < today;
}