/*
  Shared backend constants for the GAS project.
  This file is loaded into the global GAS scope alongside all other .gs files.
  Do NOT duplicate any const declared here in other files.

  In the GAS editor this file should be named: Config.gs
*/

// LOCALE & TIMEZONE
const TORONTO_TZ = 'America/Toronto';

// BOOKING SCHEDULE
const BOOKABLE_HOURS = [10, 11, 12, 13, 14, 15, 16];
const SLOT_DURATION_MINUTES = 40;
const SLOT_START_INTERVAL_MINUTES = 60;
const MIN_BOOKING_LEAD_DAYS = 2;
const WITHOUT_DATE_DAILY_SUBMISSION_LIMIT = 20;
const CALENDAR_AVAILABILITY_EVENT_KEYWORDS_PROP = 'CALENDAR_AVAILABILITY_EVENT_KEYWORDS';
const CALENDAR_AVAILABILITY_EVENT_KEYWORDS = [
  'appointment schedule',
  'booking schedule',
  'consultation schedule',
  'availability',
  'available',
  'bookable',
  'open slot',
  'open slots',
  'office hours'
];

// FIELD VALIDATION LIMITS
const NAME_MIN = 2;
const NAME_MAX = 80;
const OCCUPATION_MIN = 2;
const OCCUPATION_MAX = 100;
const EMAIL_MAX = 120;
const PHONE_MAX = 20;
const PHONE_DIGITS_MIN = 10;
const PHONE_DIGITS_MAX = 15;
const ADDRESS_MIN = 6;
const ADDRESS_MAX = 180;
const NOTES_MAX = 3000;
const DOB_MAX = 40;

// FILE UPLOAD LIMITS
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;   // 500 MB per file
const MAX_TOTAL_FILE_BYTES = 2048 * 1024 * 1024;  // 2048 MB total
const MAX_FILE_COUNT = 100;

// ALLOWED SERVICES
const ALLOWED_SERVICES = [
  'Public Notary Services',
  'Employment Law',
  'Civil matter',
  'Traffic Ticket Defense',
  'Road Record Defense',
  'WSIB related issue',
  'LTB related issue',
  'Other'
];

const BOOKING_SERVICE_ALIAS_META = {
  'public notary services': { canonical: 'Public Notary Services', display: 'Notary Public' },
  'public notary service': { canonical: 'Public Notary Services', display: 'Notary Public' },
  'public notary': { canonical: 'Public Notary Services', display: 'Notary Public' },
  'notary public': { canonical: 'Public Notary Services', display: 'Notary Public' },
  'notary public services': { canonical: 'Public Notary Services', display: 'Notary Public' },
  'notary': { canonical: 'Public Notary Services', display: 'Notary Public' },
  'ltb': { canonical: 'LTB related issue', display: 'LTB' },
  'ltb related issue': { canonical: 'LTB related issue', display: 'LTB' },
  'landlord tenant board': { canonical: 'LTB related issue', display: 'LTB' },
  'landlord and tenant board': { canonical: 'LTB related issue', display: 'LTB' },
  'scc': { canonical: 'Civil matter', display: 'SCC' },
  'civil matter': { canonical: 'Civil matter', display: 'SCC' },
  'small claims court': { canonical: 'Civil matter', display: 'SCC' },
  'small claims': { canonical: 'Civil matter', display: 'SCC' },
  'traffic tickets': { canonical: 'Traffic Ticket Defense', display: 'Traffic Tickets' },
  'traffic ticket': { canonical: 'Traffic Ticket Defense', display: 'Traffic Tickets' },
  'traffic ticket defense': { canonical: 'Traffic Ticket Defense', display: 'Traffic Tickets' },
  'road record defense': { canonical: 'Road Record Defense', display: 'Road Record Defense' },
  'employment law': { canonical: 'Employment Law', display: 'Employment Law' },
  'wsib related issue': { canonical: 'WSIB related issue', display: 'WSIB related issue' },
  'other': { canonical: 'Other', display: 'Other' }
};

// LOGGING
const LOG_SPREADSHEET_ID_PROP = 'LOG_SPREADSHEET_ID';
