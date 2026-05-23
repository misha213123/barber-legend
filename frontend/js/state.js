let adminMode = "new";
let adminSection = "bookings";

let services = [];
let masters = [];
let workPhotos = [];

let selectedService = null;
let selectedMaster = null;
let selectedDay = { label: "Ср", date: "22 мая, среда" };
let selectedTime = "13:00";
let busyTimes = [];
let masterHours = null;
let adminCache = null;

let rescheduleBookingId = null;
let rescheduleBooking = null;

const times = [
  "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00", "19:00", "20:00"
];