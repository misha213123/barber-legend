let adminMode = "new";
let adminSection = "bookings";
let editingMasterHoursId = null;
let editingMasterHoursName = "";
let masterHoursDraft = [];
let scheduleMasterId = null;

let services = [];
let masters = [];
let workPhotos = [];
let shopClosedDays = [];
let masterDayOffs = [];

let selectedService = null;
let selectedMaster = null;
let selectedDay = null;
let selectedTime = "13:00";
let busyTimes = [];
let masterHours = null;
let adminCache = null;
let salonClosedDays = [];

let rescheduleBookingId = null;
let rescheduleBooking = null;
let currentProfile = null;
let profileRequired = true;
let selectedCountryCode = "+48";
let myReviews = [];

const times = [
  "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00", "19:00", "20:00"
];


let clientSummary = null;
let favoriteMaster = null;
let menuOpened = false;