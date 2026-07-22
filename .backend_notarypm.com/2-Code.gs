/* 
  MASTER CONFIGURATION
*/
// Google Drive helpers and folder/file operations live in googleDrive.js / GoogleDrive.gs.
const CALENDAR_ID = 'primary';
const CUSTOMERS_SPREADSHEET_ID = '1lRfz6mQzkTkov6zn-rzxWZeStvHEWOiERzbWnMw0gv4';
const CUSTOMERS_SHEET_NAME = 'CUSTOMERS';
const SPREADSHEET_ID_DEFAULT = CUSTOMERS_SPREADSHEET_ID;
const SPREADSHEET_ID_PROP = 'SPREADSHEET_ID';
const INTAKE_MAX_PER_DAY_PROP = 'INTAKE_MAX_PER_DAY';
const SHEET_GID = '0';

// LOGGING CONFIGURATION
const LOG_SPREADSHEET_ID = '';
const LOG_SHEET_NAME = 'Sheet1';
const LOG_TESTTEXT_SHEET_NAME = 'Sheet2';
const LOG_WARNINGS_SHEET_NAME = 'WARNINGS';  // Tab for severity=warning logs
const LOG_TESTTEXT_HEADERS = [
  'Draft Log',
  'Temp Documents',
  'Timestamp (Toronto)',
  'Event',
  'Session ID',
  'Name',
  'Email',
  'Phone'
];
const LOG_HEADERS = [
  'Actor',
  'Referrer',
  'Fingerprint',
  'Event',
  'Log Type',
  'Page View ID',
  'Form Activity',
  'Severity',
  'Country Code',
  'City',
  'Map URL',
  'Device Model',
  'Timestamp',
  'Details',
  'Country / IP',
  'Language',
  'OS',
  'Browser',
  'User Agent Summary',
  'Screen Resolution',
  'Viewport',
  'Timezone',
  'CPU Cores',
  'Device Memory GB',
  'Network Info',
  'Max Touch Points',
  'Color Depth',
  'Perf Load Percent',
  'Perf Process',
  'Perf Script',
  'Geo Coordinates',
  'Current Page URL'
];
const LOG_HEADER_ALIASES = {
  'Actor': ['YOU/THEY'],
  'Referrer': ['Referer'],
  'Log Type': ['Entry Type'],
  'Form Activity': ['Form Input Log'],
  'Country Code': ['Country'],
  'Map URL': ['Geo Link'],
  'Device Model': ['Phone Model'],
  'Country / IP': ['Country:IP'],
  'Language': ['Lang'],
  'User Agent Summary': ['User Agent'],
  'Screen Resolution': ['Screen'],
  'CPU Cores': ['Cores'],
  'Device Memory GB': ['Memory GB'],
  'Network Info': ['Network'],
  'Max Touch Points': ['Touch Points'],
  'Perf Load Percent': ['Perf Load %'],
  'Geo Coordinates': ['Geo Coords'],
  'Current Page URL': ['Page URL']
};
const OWNER_FINGERPRINTS = [];
const OWNER_IPS = [];

function normalizeBookingServiceAlias(value) {
  return normalizeSingleLine(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveBookingServiceMeta(rawService, rawServiceValue, rawServiceDisplay) {
  if (rawService && typeof rawService === 'object') {
    const src = rawService;
    const explicitCanonical = sanitizeSoftSingleLine(src.serviceCanonical || src.service_canonical || '', 120);
    const explicitDisplay = sanitizeSoftSingleLine(src.serviceDisplay || src.service_display || '', 120);
    if (explicitCanonical) {
      return {
        canonical: explicitCanonical,
        display: explicitDisplay || explicitCanonical
      };
    }
    rawServiceDisplay = src.serviceDisplay != null
      ? src.serviceDisplay
      : (src.service_display != null ? src.service_display : rawServiceDisplay);
    rawServiceValue = src.serviceValue != null
      ? src.serviceValue
      : (src.service_value != null ? src.service_value : rawServiceValue);
    rawService = src.service;
  }

  const candidates = [rawServiceDisplay, rawService, rawServiceValue];
  for (let i = 0; i < candidates.length; i++) {
    const safeCandidate = sanitizeSoftSingleLine(candidates[i], 120);
    if (!safeCandidate) continue;
    const alias = normalizeBookingServiceAlias(safeCandidate);
    const mapped = BOOKING_SERVICE_ALIAS_META[alias];
    if (mapped) {
      return {
        canonical: mapped.canonical,
        display: mapped.display
      };
    }
  }

  const fallbackDisplay = sanitizeSoftSingleLine(rawServiceDisplay || rawService || '', 120);
  const fallbackCanonical = sanitizeSoftSingleLine(rawService || rawServiceDisplay || '', 120);
  return {
    canonical: fallbackCanonical || fallbackDisplay,
    display: fallbackDisplay || fallbackCanonical
  };
}

function getBookingServiceCanonicalName(rawService, rawServiceValue, rawServiceDisplay) {
  return resolveBookingServiceMeta(rawService, rawServiceValue, rawServiceDisplay).canonical;
}

function getBookingServiceDisplayText(rawService, rawServiceValue, rawServiceDisplay) {
  return resolveBookingServiceMeta(rawService, rawServiceValue, rawServiceDisplay).display;
}

const KEEP_FORMS_BY_SERVICE = {
  'LTB related issue': [
    'T2 - Application About Tenant Rights',
    'N12 - Notice to End your Tenancy (Landlord/Purchaser/Family)',
    'T1 - Tenant Application for a Rebate',
    'T5 - Landlord Gave a Notice of Termination in Bad Faith',
    'T6 - Tenant Application About Maintenance',
    'L1 - Application to Evict a Tenant for Non-payment',
    'L2 - Application to End a Tenancy and Evict a Tenant',
    'N4 - Notice to End Tenancy Early for Non-payment of Rent',
    'N5 - Notice to End Tenancy for Interference/Damage',
    'N7 - Notice to End Tenancy for Serious Problems',
    'N8 - Notice to End Tenancy at End of Term',
    'N11 - Agreement to End the Tenancy',
    'N13 - Notice to End Tenancy for Demolition/Repairs'
  ],
  'WSIB related issue': [
    'WSIB Form 6 - Worker Report of Injury/Disease',
    'WSIB Form 7 - Employer Report of Injury/Disease',
    'WSIB Form 8 - Health Professional Report'
  ],
  'Employment Law': [
    'Employment Standards Claim Form (Ontario)',
    'Employment Information Form (if requested)',
    'ESA Supporting Documents Checklist'
  ],
  'Civil matter': [
    'Small Claims Court Form 7A - Plaintiff\'s Claim',
    'Small Claims Court Form 9A - Defence',
    'Small Claims Court Form 11A - Request to Clerk',
    'Small Claims Court Form 15A - Affidavit of Service'
  ],
  'Traffic Ticket Defense': [
    'POA Ticket: Notice of Intention to Appear',
    'POA Early Resolution / Trial Request',
    'POA Form 4F - Application for Reopening (if needed)'
  ],
  'Road Record Defense': [
    'MTO Driver Record Request',
    'MTO Licence Reinstatement/Review Request',
    'Supporting Documents Checklist for Road Record Matter'
  ],
  'Public Notary Services': [
    'Affidavit / Statutory Declaration Draft',
    'ID Verification Checklist',
    'Commissioning / Notarization Document Checklist'
  ],
  'Other': [
    'Initial Client Intake Checklist',
    'Evidence/Documents Collection Checklist',
    'Case Timeline Checklist'
  ]
};

const CASE_STARTER_LINKS_BY_SERVICE = {
  'LTB related issue': [
    {
      task: 'LTB portal and rules',
      url: 'https://tribunalsontario.ca/ltb/',
      purpose: 'Primary tribunal page, rules, notices, and process updates.',
      searchHint: 'Ontario LTB filing process'
    },
    {
      task: 'LTB filing and fees',
      url: 'https://tribunalsontario.ca/ltb/filing-and-fees/',
      purpose: 'Filing channels, fees, and payment methods.',
      searchHint: 'LTB filing and fees Ontario'
    },
    {
      task: 'LTB forms',
      url: 'https://tribunalsontario.ca/ltb/forms/',
      purpose: 'Official landlord/tenant forms and current versions.',
      searchHint: 'Ontario LTB forms T2 N12'
    }
  ],
  'WSIB related issue': [
    {
      task: 'WSIB claim reporting',
      url: 'https://www.wsib.ca/en/businesses/claims/report-injury-or-illness',
      purpose: 'Official worker/employer injury reporting workflow.',
      searchHint: 'WSIB Form 6 Form 7 Form 8 Ontario'
    },
    {
      task: 'WSIB policy manual',
      url: 'https://www.wsib.ca/en/operational-policy-manual',
      purpose: 'Operational policies used for entitlement and decisions.',
      searchHint: 'WSIB operational policy manual entitlement'
    },
    {
      task: 'WSIB contacts',
      url: 'https://www.wsib.ca/en/contact-us',
      purpose: 'WSIB phone lines and official contact channels.',
      searchHint: 'WSIB contact Ontario paralegal'
    }
  ],
  'Employment Law': [
    {
      task: 'ESA claim filing guide',
      url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/filing-employment-standards-claim',
      purpose: 'Official Ministry guide for Employment Standards claims.',
      searchHint: 'Ontario employment standards claim filing'
    },
    {
      task: 'Employment Standards Act guide',
      url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0',
      purpose: 'Core ESA rights, obligations, and complaint process.',
      searchHint: 'Employment Standards Act Ontario guide'
    },
    {
      task: 'Ministry labour portal',
      url: 'https://www.ontario.ca/page/ministry-labour-immigration-training-skills-development',
      purpose: 'Ministry resources and labour program navigation.',
      searchHint: 'Ontario labour ministry employment complaint'
    }
  ],
  'Civil matter': [
    {
      task: 'Small Claims forms',
      url: 'https://ontariocourtforms.on.ca/en/scc/',
      purpose: 'Official court forms (7A, 9A, 11A, 15A and others).',
      searchHint: 'Ontario small claims forms 7A 9A'
    },
    {
      task: 'File small claims online',
      url: 'https://www.ontario.ca/page/file-small-claims-online',
      purpose: 'Online filing route and account requirements.',
      searchHint: 'Ontario file small claims online process'
    },
    {
      task: 'Small Claims procedure guide',
      url: 'https://www.ontario.ca/document/guide-procedures-small-claims-court',
      purpose: 'Step-by-step court procedure and timelines.',
      searchHint: 'Ontario guide to procedures in small claims court'
    }
  ],
  'Traffic Ticket Defense': [
    {
      task: 'Ontario tickets and fines',
      url: 'https://www.ontario.ca/ticketsandfines',
      purpose: 'Provincial portal for ticket options and payments.',
      searchHint: 'Ontario traffic ticket options trial early resolution'
    },
    {
      task: 'POA court services finder',
      url: 'https://www.ontario.ca/page/courthouse-locations',
      purpose: 'Locate courthouse and POA intake contacts.',
      searchHint: 'Ontario POA court services traffic ticket'
    },
    {
      task: 'MTO demerit point info',
      url: 'https://www.ontario.ca/page/understanding-demerit-points',
      purpose: 'Demerit point thresholds and licence risk context.',
      searchHint: 'Ontario demerit points traffic offence'
    }
  ],
  'Road Record Defense': [
    {
      task: 'Get driving record',
      url: 'https://www.ontario.ca/page/get-driving-record',
      purpose: 'Official driver abstract request channels.',
      searchHint: 'Ontario driver abstract request'
    },
    {
      task: 'Demerit point framework',
      url: 'https://www.ontario.ca/page/understanding-demerit-points',
      purpose: 'Interpret record exposure and suspension risk.',
      searchHint: 'Ontario driving record demerit suspension'
    },
    {
      task: 'ServiceOntario driver services',
      url: 'https://www.ontario.ca/page/driving-and-roads',
      purpose: 'Road and driver service entry point.',
      searchHint: 'Ontario driver services licence reinstatement'
    }
  ],
  'Public Notary Services': [
    {
      task: 'Ontario notary and commissioner info',
      url: 'https://www.ontario.ca/page/notary-public-and-commissioners',
      purpose: 'Official framework for notarization and commissioning.',
      searchHint: 'Ontario notary public commissioner affidavits'
    },
    {
      task: 'Find legal help',
      url: 'https://www.ontario.ca/page/getting-legal-help',
      purpose: 'Ontario legal service access and routing.',
      searchHint: 'Ontario legal help notary commissioner'
    },
    {
      task: 'Ontario government forms',
      url: 'https://www.ontario.ca/page/government-forms',
      purpose: 'Official provincial form repository.',
      searchHint: 'Ontario affidavit statutory declaration form'
    }
  ],
  'Other': [
    {
      task: 'Ontario tribunals portal',
      url: 'https://tribunalsontario.ca/en/',
      purpose: 'Tribunal selection and filing entry point.',
      searchHint: 'Ontario tribunal filing process'
    },
    {
      task: 'Ontario legal help',
      url: 'https://www.ontario.ca/page/getting-legal-help',
      purpose: 'Legal aid and legal support navigation.',
      searchHint: 'Ontario legal help paralegal process'
    },
    {
      task: 'Ontario government forms',
      url: 'https://www.ontario.ca/page/government-forms',
      purpose: 'Official forms index for common procedures.',
      searchHint: 'Ontario government forms legal matter'
    }
  ]
};

const ALLOWED_FILE_MIME = {
  'application/pdf': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/zip': true,
  'application/x-zip-compressed': true,
  'application/vnd.rar': true,
  'application/x-rar-compressed': true,
  'text/plain': true,
  'text/markdown': true,
  'text/rtf': true,
  'application/rtf': true,
  'application/x-rtf': true,
  'application/vnd.oasis.opendocument.text': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'text/csv': true,
  'image/tiff': true,
  'message/rfc822': true,
  'application/vnd.ms-outlook': true,
  'audio/mp4': true,
  'audio/mpeg': true,
  'audio/wav': true,
  'audio/x-wav': true,
  'application/vnd.ms-powerpoint': true,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true
};

const ALLOWED_FILE_EXT = {
  jpg: true, jpeg: true, png: true, gif: true, webp: true, heic: true, tif: true, tiff: true,
  mp4: true, mov: true, webm: true, m4v: true, avi: true, mkv: true, wmv: true,
  mpeg: true, mpg: true, '3gp': true, '3gpp': true, '3g2': true,
  m4a: true, mp3: true, wav: true,
  pdf: true, doc: true, docx: true, zip: true, rar: true,
  // Plain and office text formats; HTML stays blocked because it can execute active content when opened.
  txt: true, text: true, md: true, markdown: true, rtf: true, rtfd: true, odt: true,
  // Legal-practice evidence formats: spreadsheets, email messages, audio, and presentations.
  xls: true, xlsx: true, csv: true, eml: true, msg: true, ppt: true, pptx: true
};

// MAX_FILE_COUNT, MAX_FILE_SIZE_BYTES, MAX_TOTAL_FILE_BYTES — defined in Config.gs


const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  m4v: 'video/x-m4v',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  wmv: 'video/x-ms-wmv',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  '3gp': 'video/3gpp',
  '3gpp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  text: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  rtf: 'application/rtf',
  rtfd: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  eml: 'message/rfc822',
  msg: 'application/vnd.ms-outlook',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  rar: 'application/vnd.rar'
};

const ACTION_TOKEN_SECRET_PROP = 'ACTION_TOKEN_SECRET_V1';
const USED_ACTION_TOKENS_PROP = 'USED_ACTION_TOKENS_V1';
const ADMIN_ACTION_LINK_TTL_DAYS = 7;
const BRING_FORWARD_LINK_TTL_DAYS = 30;
const LEGACY_ADD_TO_SHEET_GET_ENABLED_PROP = 'LEGACY_ADD_TO_SHEET_GET_ENABLED';
const PUBLIC_PREBOOKING_WRITES_ENABLED_PROP = 'PUBLIC_PREBOOKING_WRITES_ENABLED';
const BOOKING_INTAKE_ENABLED_PROP = 'BOOKING_INTAKE_ENABLED';
const BOOKING_INTAKE_DISABLE_REASON_PROP = 'BOOKING_INTAKE_DISABLE_REASON';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_SECRET_PROP = 'TURNSTILE_SECRET_KEY';
const TURNSTILE_ENABLED_PROP = 'TURNSTILE_ENABLED';
const TURNSTILE_SOFT_MODE_PROP = 'TURNSTILE_SOFT_MODE';
const TURNSTILE_EXPECTED_HOSTNAMES_PROP = 'TURNSTILE_EXPECTED_HOSTNAMES';
const TURNSTILE_EXPECTED_ACTION_PROP = 'TURNSTILE_EXPECTED_ACTION';
const TURNSTILE_DEFAULT_ACTION = 'booking_submit';
const PUBLIC_ALLOWED_ORIGINS = [];
const PUBLIC_ALLOWED_ORIGINS_PROP = 'PUBLIC_ALLOWED_ORIGINS';
const PUBLIC_ORIGIN_GUARD_MODE_PROP = 'PUBLIC_ORIGIN_GUARD_MODE';
const PUBLIC_REPLAY_GUARD_MODE_PROP = 'PUBLIC_REPLAY_GUARD_MODE';
const PUBLIC_SECURITY_DEFAULT_MODE = 'monitor';
const PUBLIC_REPLAY_WINDOW_SECONDS = 900;
const BOOKING_SUBMIT_RATE_WINDOW_SECONDS = 600;
const BOOKING_SUBMIT_RATE_LIMIT = 10;
const KEEP_API_BASE_URL = 'https://keep.googleapis.com/v1';
const KEEP_CLIENT_TAG = 'Client';
const DEADLINE_REMINDER_HOURS_BEFORE = 24;
const OFFICE_BRIEF_LEAD_MINUTES = 90;
const OFFICE_BRIEF_DURATION_MINUTES = 20;
const OFFICE_BRIEF_PROP_PREFIX = 'office_brief_event_v1:';
const OFFICE_BRIEF_HASH_PREFIX = 'office_brief_hash_v1:';
const ACTION_ALLOWED_EMAIL = getScriptProperty('ACTION_ALLOWED_EMAIL', 'paralegal@hannadunchenko.com');
const ACTION_ALLOWED_EMAILS_PROP = 'ACTION_ALLOWED_EMAILS';
const MAIL_FROM_ALIAS = getScriptProperty('MAIL_FROM_ALIAS', 'intake@hannadunchenko.com');
const MAIL_FROM_ALIAS_PROP = 'MAIL_FROM_ALIAS';
const INTAKE_NOTIFICATION_RECIPIENTS = getScriptProperty('INTAKE_NOTIFICATION_RECIPIENTS', 'paralegal@hannadunchenko.com,mylastnameisboyko@gmail.com');
const INTAKE_GMAIL_LABEL_NAME_PROP = 'INTAKE_GMAIL_LABEL_NAME';
const INTAKE_PLAIN_TEXT_FALLBACK_ENABLED_PROP = 'INTAKE_PLAIN_TEXT_FALLBACK_ENABLED';
const INTERNAL_EMAIL_WARNING_TEXT = 'УВАГА: це внутрішній лист компанії. Ні за яких обставин про нього не має дізнатися стороння особа. Його не можна випадково пересилати стороннім особам. Після архивації справи його слід видалити із вхідних та з кошика.';
const REVOKED_BOOKING_IDS_PROP = 'revoked_booking_ids_v1';
const QUARANTINED_BOOKING_IDS_PROP = 'quarantined_booking_ids_v1';
const TRUST_LEDGER_SHEET_NAME = 'Trust Ledger';
const MATTER_STAGE_COLUMN_INDEX = 7; // Spreadsheet column G
const CUSTOMER_SHEET_AGE_COLUMN_INDEX = 16;
const CUSTOMER_SHEET_EMAIL_SENT_AT_COLUMN_INDEX = 17;
const CUSTOMER_SHEET_EMAIL_STATUS_COLUMN_INDEX = 18;
const CUSTOMER_SHEET_EMAIL_ERROR_COLUMN_INDEX = 19;
const CUSTOMER_SHEET_MIN_COLUMNS = 19;

// Get the deployed web app URL
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

function getDatabaseSheetUrl() {
  return `https://docs.google.com/spreadsheets/d/${getPrimarySpreadsheetId()}/edit#gid=${SHEET_GID}`;
}

function getScriptProperty(name, fallback) {
  try {
    const value = normalizeSingleLine(PropertiesService.getScriptProperties().getProperty(name));
    return value || String(fallback || '');
  } catch (e) {
    return String(fallback || '');
  }
}

function isTruthyFlag(value) {
  const normalized = normalizeSingleLine(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function isFeatureEnabled(propName, fallbackValue) {
  return isTruthyFlag(getScriptProperty(propName, fallbackValue ? 'true' : 'false'));
}

function jsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getLogSpreadsheetId() {
  return getScriptProperty(LOG_SPREADSHEET_ID_PROP, LOG_SPREADSHEET_ID);
}

function getPrimarySpreadsheetId() {
  const spreadsheetId = normalizeSingleLine(getScriptProperty(SPREADSHEET_ID_PROP, SPREADSHEET_ID_DEFAULT));
  return spreadsheetId || SPREADSHEET_ID_DEFAULT;
}

function getIntakeMaxPerDay() {
  const fallbackLimit = (
    typeof WITHOUT_DATE_DAILY_SUBMISSION_LIMIT !== 'undefined'
    && Number.isInteger(WITHOUT_DATE_DAILY_SUBMISSION_LIMIT)
    && WITHOUT_DATE_DAILY_SUBMISSION_LIMIT > 0
  )
    ? WITHOUT_DATE_DAILY_SUBMISSION_LIMIT
    : 20;
  const configured = Number.parseInt(
    getScriptProperty(INTAKE_MAX_PER_DAY_PROP, String(fallbackLimit)),
    10
  );
  return Number.isInteger(configured) && configured > 0 ? configured : fallbackLimit;
}

function getMailFromAlias() {
  return normalizeSingleLine(getScriptProperty(MAIL_FROM_ALIAS_PROP, MAIL_FROM_ALIAS)).toLowerCase();
}

function buildRecommendedScriptPropertiesConfig() {
  const defaultHosts = ['hannadunchenko.com', 'www.hannadunchenko.com'];
  const configuredOriginHosts = getPublicAllowedOriginHosts();
  const configuredTurnstileHosts = getExpectedTurnstileHosts();
  const configuredTurnstileSecret = normalizeSingleLine(getScriptProperty(TURNSTILE_SECRET_PROP, ''));
  const telegramRecommended = (typeof getTelegramRecommendedScriptPropertiesConfig === 'function')
    ? getTelegramRecommendedScriptPropertiesConfig()
    : {};
  const configuredLogSpreadsheetId = normalizeSingleLine(getLogSpreadsheetId() || '');
  const configuredSpreadsheetId = normalizeSingleLine(getPrimarySpreadsheetId() || '');
  const configuredAllowedEmails = getAllowedActionEmails().join(',');
  const configuredRecipients = normalizeSingleLine(
    getScriptProperty('INTAKE_NOTIFICATION_RECIPIENTS', INTAKE_NOTIFICATION_RECIPIENTS)
  );
  const recommendedTurnstileEnabled = configuredTurnstileSecret
    ? 'true'
    : (isFeatureEnabled(TURNSTILE_ENABLED_PROP, false) ? 'true' : 'false');

  return Object.assign({
    ACTION_ALLOWED_EMAILS: configuredAllowedEmails || 'paralegal@hannadunchenko.com,mylastnameisboyko@gmail.com',
    BOOKING_INTAKE_ENABLED: isFeatureEnabled(BOOKING_INTAKE_ENABLED_PROP, true) ? 'true' : 'false',
    INTAKE_MAX_PER_DAY: String(getIntakeMaxPerDay()),
    INTAKE_NOTIFICATION_RECIPIENTS: configuredRecipients || 'paralegal@hannadunchenko.com,mylastnameisboyko@gmail.com',
    LOG_SPREADSHEET_ID: configuredLogSpreadsheetId,
    MAIL_FROM_ALIAS: getMailFromAlias() || 'intake@hannadunchenko.com',
    PUBLIC_ALLOWED_ORIGINS: (configuredOriginHosts.length ? configuredOriginHosts : defaultHosts).join(','),
    PUBLIC_ORIGIN_GUARD_MODE: getPublicGuardMode(PUBLIC_ORIGIN_GUARD_MODE_PROP, PUBLIC_SECURITY_DEFAULT_MODE),
    PUBLIC_PREBOOKING_WRITES_ENABLED: isFeatureEnabled(PUBLIC_PREBOOKING_WRITES_ENABLED_PROP, false) ? 'true' : 'false',
    PUBLIC_REPLAY_GUARD_MODE: getPublicGuardMode(PUBLIC_REPLAY_GUARD_MODE_PROP, PUBLIC_SECURITY_DEFAULT_MODE),
    SPREADSHEET_ID: configuredSpreadsheetId,
    TURNSTILE_ENABLED: recommendedTurnstileEnabled,
    TURNSTILE_EXPECTED_ACTION: getExpectedTurnstileAction(),
    TURNSTILE_EXPECTED_HOSTNAMES: (configuredTurnstileHosts.length ? configuredTurnstileHosts : defaultHosts).join(','),
    TURNSTILE_SECRET_KEY: configuredTurnstileSecret,
    TURNSTILE_SOFT_MODE: isFeatureEnabled(TURNSTILE_SOFT_MODE_PROP, false) ? 'true' : 'false'
  }, telegramRecommended);
}

function installRecommendedScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperties() || {};
  const recommended = buildRecommendedScriptPropertiesConfig();
  const toSet = {};
  const created = [];
  const preserved = [];
  const skippedEmpty = [];

  Object.keys(recommended).sort().forEach(name => {
    const currentValue = normalizeSingleLine(existing[name] || '');
    const recommendedValue = normalizeSingleLine(recommended[name] || '');
    if (currentValue) {
      preserved.push(name);
      return;
    }
    if (!recommendedValue) {
      skippedEmpty.push(name);
      return;
    }
    toSet[name] = recommendedValue;
    created.push(name);
  });

  if (Object.keys(toSet).length) {
    props.setProperties(toSet, false);
  }

  const audit = auditScriptPropertiesSetup();
  const summary = {
    created: created,
    preserved: preserved,
    skippedEmpty: skippedEmpty,
    missingManualValues: audit.missingManualValues,
    deprecatedKeysPresent: audit.deprecatedKeysPresent,
    autoManagedKeysPresent: audit.autoManagedKeysPresent
  };
  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

function auditScriptPropertiesSetup() {
  const props = PropertiesService.getScriptProperties().getProperties() || {};
  const recommended = buildRecommendedScriptPropertiesConfig();
  const deprecatedKeys = ['RECAPTCHA_SECRET'];
  const telegramAutoManagedPrefixes = (typeof getTelegramAutoManagedPropertyPrefixes === 'function')
    ? getTelegramAutoManagedPropertyPrefixes()
    : [];
  const autoManagedPrefixes = [
    OFFICE_BRIEF_PROP_PREFIX,
    OFFICE_BRIEF_HASH_PREFIX
  ].concat(telegramAutoManagedPrefixes);
  const telegramAutoManagedExactKeys = (typeof getTelegramAutoManagedExactPropertyKeys === 'function')
    ? getTelegramAutoManagedExactPropertyKeys()
    : [];
  const autoManagedExactKeys = [
    ACTION_TOKEN_SECRET_PROP,
    USED_ACTION_TOKENS_PROP
  ].concat(telegramAutoManagedExactKeys);
  const manuallyRequiredKeys = [
    'TURNSTILE_SECRET_KEY'
  ];
  const telegramOptionalManualKeys = (typeof getTelegramOptionalManualPropertyKeys === 'function')
    ? getTelegramOptionalManualPropertyKeys()
    : [];
  const optionallyManualKeys = ['LOG_SPREADSHEET_ID'].concat(telegramOptionalManualKeys);

  const isAutoManagedKey = function (name) {
    if (autoManagedExactKeys.indexOf(name) !== -1) return true;
    return autoManagedPrefixes.some(prefix => name.indexOf(prefix) === 0);
  };

  const configuredKeys = Object.keys(props).sort();
  const deprecatedKeysPresent = configuredKeys.filter(name => deprecatedKeys.indexOf(name) !== -1);
  const autoManagedKeysPresent = configuredKeys.filter(isAutoManagedKey);
  const missingRecommendedKeys = Object.keys(recommended)
    .sort()
    .filter(name => {
      const currentValue = normalizeSingleLine(props[name] || '');
      const recommendedValue = normalizeSingleLine(recommended[name] || '');
      return !currentValue && !!recommendedValue;
    });
  const missingManualValues = manuallyRequiredKeys
    .concat(optionallyManualKeys)
    .filter((name, index, list) => list.indexOf(name) === index)
    .filter(name => !normalizeSingleLine(props[name] || ''));

  const summary = {
    configuredKeys: configuredKeys,
    missingRecommendedKeys: missingRecommendedKeys,
    missingManualValues: missingManualValues,
    deprecatedKeysPresent: deprecatedKeysPresent,
    autoManagedKeysPresent: autoManagedKeysPresent
  };
  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

function getBookingIntakeStatus() {
  const enabled = isFeatureEnabled(BOOKING_INTAKE_ENABLED_PROP, true);
  const reason = truncate(
    normalizeSingleLine(
      getScriptProperty(
        BOOKING_INTAKE_DISABLE_REASON_PROP,
        'Intake is temporarily paused. Please call +1 (437) 239-6833 or email paralegal@hannadunchenko.com.'
      )
    ),
    500
  );
  return {
    enabled: enabled,
    reason: reason || 'Intake is temporarily paused. Please call +1 (437) 239-6833 or email paralegal@hannadunchenko.com.'
  };
}

function setBookingIntakeStatus(enabled, reason, meta) {
  const props = PropertiesService.getScriptProperties();
  const safeEnabled = enabled !== false;
  const fallbackReason = 'Intake is temporarily paused. Please call +1 (437) 239-6833 or email paralegal@hannadunchenko.com.';
  const safeReason = truncate(normalizeSingleLine(reason || fallbackReason), 500) || fallbackReason;
  const bookingId = truncate(normalizeSingleLine(meta && meta.bookingId || ''), 120);
  let actorEmail = '';

  try {
    actorEmail = normalizeSingleLine(Session.getActiveUser().getEmail()).toLowerCase();
  } catch (e) {
    actorEmail = '';
  }

  props.setProperty(BOOKING_INTAKE_ENABLED_PROP, safeEnabled ? 'true' : 'false');
  if (safeEnabled) {
    props.deleteProperty(BOOKING_INTAKE_DISABLE_REASON_PROP);
  } else {
    props.setProperty(BOOKING_INTAKE_DISABLE_REASON_PROP, safeReason);
  }

  try {
    logUsage({
      event: safeEnabled ? 'BOOKING_INTAKE_RESUMED' : 'BOOKING_INTAKE_PAUSED',
      severity: safeEnabled ? 'success' : 'warning',
      details: truncate(
        safeEnabled
          ? `Actor: ${actorEmail || 'unknown'} | Booking ID: ${bookingId || 'N/A'} | Intake resumed.`
          : `Actor: ${actorEmail || 'unknown'} | Booking ID: ${bookingId || 'N/A'} | Reason: ${safeReason}`,
        1000
      ),
      email: truncate(normalizeSingleLine(meta && meta.email || ''), 160),
      phone: truncate(normalizeSingleLine(meta && meta.phone || ''), 60),
      pageUrl: truncate(normalizeSingleLine(meta && meta.pageUrl || ''), 500)
    });
  } catch (logErr) { }

  return getBookingIntakeStatus();
}

function enforceBookingIntakeEnabled(raw) {
  const status = getBookingIntakeStatus();
  if (status.enabled) return { success: true, enabled: true, reason: '' };

  try {
    logUsage({
      event: 'BOOKING_INTAKE_BLOCKED',
      severity: 'warning',
      details: truncate(status.reason, 500),
      userInfo: raw && raw.userInfo || '',
      fingerprint: raw && raw.fingerprint || '',
      email: raw && raw.email || '',
      phone: raw && raw.phone || '',
      pageUrl: raw && raw.pageUrl || '',
      userAgent: raw && raw.userAgent || '',
      ip: raw && raw.ip || ''
    });
  } catch (logErr) { }

  return {
    success: false,
    enabled: false,
    error: status.reason,
    code: 'BOOKING_INTAKE_DISABLED'
  };
}

function sendEmailViaAlias(message) {
  const to = normalizeSingleLine(message && message.to);
  const subject = String((message && message.subject) || '');
  const body = String((message && message.body) || '');
  const htmlBody = ensureUtf8HtmlEmailDocument(message && message.htmlBody);
  if (!to) throw new Error('Missing recipient email.');

  const fallbackOptions = { to: to, subject: subject, body: body };
  if (htmlBody) fallbackOptions.htmlBody = htmlBody;
  if (message.attachments) fallbackOptions.attachments = message.attachments;

  const alias = getMailFromAlias();
  const successfulRecipients = [];

  // Use alias only if it's set and not a placeholder
  if (alias && !alias.includes('example.com')) {
    try {
      const aliases = (GmailApp.getAliases() || [])
        .map(a => normalizeSingleLine(a).toLowerCase())
        .filter(Boolean);

      if (aliases.indexOf(alias) !== -1) {
        const gmailOptions = { from: alias };
        if (htmlBody) gmailOptions.htmlBody = htmlBody;
        if (message.attachments) gmailOptions.attachments = message.attachments;

        const recipients = to.split(/[,;]/).map(e => normalizeSingleLine(e)).filter(Boolean);
        for (const recipient of recipients) {
          try {
            GmailApp.sendEmail(recipient, subject, body, gmailOptions);
            successfulRecipients.push(recipient);
          } catch (aliasErr) {
            Logger.log(`Alias send to ${recipient} failed: ${aliasErr && aliasErr.message ? aliasErr.message : aliasErr}. Will try fallback.`);
          }
        }

        // Only send fallback to recipients who failed via alias
        if (successfulRecipients.length > 0 && successfulRecipients.length < recipients.length) {
          const failedRecipients = recipients.filter(r => !successfulRecipients.includes(r));
          const fallbackTo = failedRecipients.join(', ');
          const fallbackOpts = { to: fallbackTo, subject: subject, body: body };
          if (htmlBody) fallbackOpts.htmlBody = htmlBody;
          if (message.attachments) fallbackOpts.attachments = message.attachments;
          try {
            MailApp.sendEmail(fallbackOpts);
          } catch (fallbackErr) {
            Logger.log(`Fallback send to ${fallbackTo} also failed: ${fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr}`);
          }
        } else if (successfulRecipients.length > 0) {
          return; // All recipients sent successfully via alias
        }
      }
    } catch (err) {
      Logger.log('Alias send failed (' + alias + '): ' + (err && err.message ? err.message : err) + '. Falling back to primary.');
    }
  }

  // Final fallback: Use primary account if no alias was used
  if (successfulRecipients.length === 0) {
    MailApp.sendEmail(fallbackOptions);
  }
}

function isLikelyEmailAddress(value) {
  const email = normalizeSingleLine(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmailRecipientList(rawOrArray) {
  const rawList = Array.isArray(rawOrArray)
    ? rawOrArray
    : String(rawOrArray || '').split(/[,;]/);
  const seen = {};
  return rawList
    .map(entry => normalizeSingleLine(entry).toLowerCase())
    .filter(Boolean)
    .filter(entry => {
      if (seen[entry]) return false;
      seen[entry] = true;
      return true;
    });
}

function getIntakeGmailLabelName() {
  return normalizeSingleLine(getScriptProperty(INTAKE_GMAIL_LABEL_NAME_PROP, 'Intakes')) || 'Intakes';
}

function getOwnedMailboxEmails() {
  const ownedEmails = [];
  const activeUserEmail = normalizeSingleLine(
    typeof Session !== 'undefined' && Session && Session.getActiveUser
      ? Session.getActiveUser().getEmail()
      : ''
  ).toLowerCase();
  const aliasEmail = normalizeSingleLine(getMailFromAlias() || '').toLowerCase();
  if (activeUserEmail) ownedEmails.push(activeUserEmail);
  if (aliasEmail) ownedEmails.push(aliasEmail);
  return normalizeEmailRecipientList(ownedEmails);
}

function getOrCreateUserGmailLabel(labelName) {
  const safeLabelName = normalizeSingleLine(labelName || '');
  if (!safeLabelName) return null;
  let label = null;
  try {
    label = GmailApp.getUserLabelByName(safeLabelName);
  } catch (e) { }
  if (label) return label;
  try {
    return GmailApp.createLabel(safeLabelName);
  } catch (e) {
    return null;
  }
}

function messageTargetsRecipient(message, recipientEmail, sentAfterMs) {
  if (!message || !recipientEmail) return false;
  const recipient = normalizeSingleLine(recipientEmail).toLowerCase();
  if (!recipient) return false;
  const messageTs = message.getDate ? Number(message.getDate().getTime()) : 0;
  if (sentAfterMs && messageTs && messageTs < (sentAfterMs - 120000)) return false;
  const envelope = normalizeEmailRecipientList([
    message.getTo ? message.getTo() : '',
    message.getCc ? message.getCc() : '',
    message.getBcc ? message.getBcc() : ''
  ]);
  return envelope.indexOf(recipient) !== -1;
}

function applyIntakeLabelAndArchiveForRecipient(recipientEmail, subject, sentAfterMs) {
  const recipient = normalizeSingleLine(recipientEmail).toLowerCase();
  const safeSubject = normalizeSingleLine(subject || '');
  if (!recipient || !safeSubject) return;

  const label = getOrCreateUserGmailLabel(getIntakeGmailLabelName());
  const ownedMailboxEmails = getOwnedMailboxEmails();
  const shouldArchiveThread = ownedMailboxEmails.indexOf(recipient) !== -1;
  const searchSubject = safeSubject.replace(/"/g, ' ').trim();
  if (!searchSubject) return;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) Utilities.sleep(250);
    let threads = [];
    try {
      threads = GmailApp.search(`in:anywhere newer_than:2d subject:"${searchSubject}"`, 0, 10) || [];
    } catch (searchErr) {
      Logger.log(`Gmail thread search failed for ${recipient}: ${searchErr && searchErr.message ? searchErr.message : searchErr}`);
      return;
    }

    const matchingThreads = threads.filter(thread => {
      if (!thread || !thread.getMessages) return false;
      try {
        return thread.getMessages().some(message =>
          normalizeSingleLine(message.getSubject ? message.getSubject() : '') === safeSubject
          && messageTargetsRecipient(message, recipient, sentAfterMs)
        );
      } catch (threadErr) {
        return false;
      }
    });

    if (!matchingThreads.length) continue;

    matchingThreads.forEach(thread => {
      try {
        if (label) thread.addLabel(label);
      } catch (labelErr) {
        Logger.log(`Could not label Gmail thread for ${recipient}: ${labelErr && labelErr.message ? labelErr.message : labelErr}`);
      }
      if (shouldArchiveThread) {
        try {
          thread.moveToArchive();
        } catch (archiveErr) {
          Logger.log(`Could not archive Gmail thread for ${recipient}: ${archiveErr && archiveErr.message ? archiveErr.message : archiveErr}`);
        }
      }
    });
    return;
  }
}

function countHtmlAnchorTags(html) {
  const matches = String(html || '').match(/<a\b/gi);
  return matches ? matches.length : 0;
}

function buildEmailDeliveryPreflight(message) {
  const normalizedRecipients = normalizeEmailRecipientList(
    Array.isArray(message && message.recipients) ? message.recipients : (message && message.to)
  );
  const validRecipients = normalizedRecipients.filter(isLikelyEmailAddress);
  const invalidRecipients = normalizedRecipients.filter(entry => !isLikelyEmailAddress(entry));
  const subject = String((message && message.subject) || '');
  const body = String((message && message.body) || '');
  const htmlBody = String((message && message.htmlBody) || '');
  const warnings = [];
  let quotaRemaining = null;
  let quotaError = '';

  try {
    quotaRemaining = Number(MailApp.getRemainingDailyQuota());
    if (!Number.isFinite(quotaRemaining)) quotaRemaining = null;
  } catch (e) {
    quotaError = String(e && e.message ? e.message : e);
    warnings.push(`Could not read daily mail quota: ${truncate(quotaError, 180)}`);
  }

  const htmlLength = htmlBody.length;
  const plainTextLength = body.length;
  const linkCount = countHtmlAnchorTags(htmlBody);

  if (invalidRecipients.length) {
    warnings.push(`Ignored invalid recipients: ${invalidRecipients.join(', ')}`);
  }
  if (htmlLength > 85000) {
    warnings.push(`HTML email is large (${htmlLength} chars) and may clip.`);
  }
  if (linkCount > 40) {
    warnings.push(`HTML email contains many links (${linkCount}).`);
  }

  if (!validRecipients.length) {
    return {
      ok: false,
      error: 'No valid notification recipients are configured.',
      recipients: [],
      invalidRecipients: invalidRecipients,
      quotaRemaining: quotaRemaining,
      quotaRequired: 0,
      htmlLength: htmlLength,
      plainTextLength: plainTextLength,
      linkCount: linkCount,
      warnings: warnings,
      subject: subject,
      quotaError: quotaError
    };
  }

  if (quotaRemaining !== null && quotaRemaining < validRecipients.length) {
    return {
      ok: false,
      error: `Daily mail quota too low (${quotaRemaining}) for ${validRecipients.length} recipient(s).`,
      recipients: validRecipients,
      invalidRecipients: invalidRecipients,
      quotaRemaining: quotaRemaining,
      quotaRequired: validRecipients.length,
      htmlLength: htmlLength,
      plainTextLength: plainTextLength,
      linkCount: linkCount,
      warnings: warnings,
      subject: subject,
      quotaError: quotaError
    };
  }

  return {
    ok: true,
    error: '',
    recipients: validRecipients,
    invalidRecipients: invalidRecipients,
    quotaRemaining: quotaRemaining,
    quotaRequired: validRecipients.length,
    htmlLength: htmlLength,
    plainTextLength: plainTextLength,
    linkCount: linkCount,
    warnings: warnings,
    subject: subject,
    quotaError: quotaError
  };
}

function sendEmailToMultipleRecipients(message) {
  const recipients = normalizeEmailRecipientList(
    Array.isArray(message && message.recipients) ? message.recipients : (message && message.to)
  ).filter(isLikelyEmailAddress);
  const subject = String((message && message.subject) || '');
  const body = String((message && message.body) || '');
  const htmlBody = ensureUtf8HtmlEmailDocument(message && message.htmlBody);
  const attachments = message && message.attachments;

  if (!recipients.length) {
    throw new Error('No valid recipients provided.');
  }

  const alias = getMailFromAlias();
  const results = {
    success: [],
    failed: [],
    total: recipients.length
  };
  let aliasAvailable = false;

  if (alias && !alias.includes('example.com')) {
    try {
      const aliases = (GmailApp.getAliases() || [])
        .map(a => normalizeSingleLine(a).toLowerCase())
        .filter(Boolean);
      aliasAvailable = aliases.indexOf(alias) !== -1;
    } catch (aliasListErr) {
      Logger.log(`Could not load Gmail aliases: ${aliasListErr && aliasListErr.message ? aliasListErr.message : aliasListErr}`);
    }
  }

  recipients.forEach(recipient => {
    let sent = false;
    const sentAfterMs = Date.now();
    try {
      if (alias && aliasAvailable) {
        try {
          const gmailOptions = { from: alias };
          if (htmlBody) gmailOptions.htmlBody = htmlBody;
          if (attachments && attachments.length > 0) gmailOptions.attachments = attachments;
          GmailApp.sendEmail(recipient, subject, body, gmailOptions);
          applyIntakeLabelAndArchiveForRecipient(recipient, subject, sentAfterMs);
          results.success.push(recipient);
          sent = true;
          return;
        } catch (aliasErr) {
          Logger.log(`Alias send to ${recipient} failed: ${aliasErr && aliasErr.message ? aliasErr.message : aliasErr}. Trying fallback.`);
        }
      }

      // Only use fallback if alias send wasn't attempted or failed
      if (!sent) {
        const options = { to: recipient, subject: subject, body: body };
        if (htmlBody) options.htmlBody = htmlBody;
        if (attachments && attachments.length > 0) options.attachments = attachments;
        MailApp.sendEmail(options);
        applyIntakeLabelAndArchiveForRecipient(recipient, subject, sentAfterMs);
        results.success.push(recipient);
      }
    } catch (err) {
      const errMsg = String(err && err.message ? err.message : err);
      Logger.log(`Failed to send email to ${recipient}: ${errMsg}`);
      results.failed.push({ recipient: recipient, error: errMsg });
    }
  });

  return results;
}

function ensureUtf8HtmlEmailDocument(html) {
  const safeHtml = String(html || '');
  if (!safeHtml) return '';
  if (/<meta[^>]+charset=/i.test(safeHtml)) return safeHtml;

  if (/<html\b/i.test(safeHtml)) {
    if (/<head\b/i.test(safeHtml)) {
      return safeHtml.replace(/<head([^>]*)>/i, '<head$1><meta charset="UTF-8">');
    }
    return safeHtml.replace(/<html([^>]*)>/i, '<html$1><head><meta charset="UTF-8"></head>');
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${safeHtml}</body></html>`;
}

function normalizeEmailMojibakeText(text) {
  const safeText = String(text || '');
  const replacements = [
    ['\u00e2\u20ac\u0153', '"'],
    ['\u00e2\u20ac\u009d', '"'],
    ['Video\u00d1\u0081all', 'Videocall'],
    ['\u00f0\u0178\u201d\u017d ', ''],
    ['\u00f0\u0178\u00a7\u00ad ', ''],
    ['\u00f0\u0178\u00a6\u2020 ', ''],
    ['\u00f0\u0178\u201c\u2019 ', ''],
    ['\u00f0\u0178\u008f\u00a2 ', ''],
    ['\u00e2\u00ad\u0090 ', ''],
    ['\u00f0\u0178\u0152\u008d ', ''],
    ['\u00f0\u0178\u0152\u0090 ', ''],
    ['\u00f0\u0178\u201c\u008d ', ''],
    ['\u00f0\u0178\u2019\u00bb ', ''],
    ['\u00f0\u0178\u2013\u00a5\u00ef\u00b8\u008f ', ''],
    ['\u00f0\u0178\u2022\u2019 ', ''],
    ['\u00f0\u0178\u00a7\u00a0 ', ''],
    ['\u00f0\u0178\u201c\u00b6 ', ''],
    ['\u00f0\u0178\u2018\u2020 ', ''],
    ['\u00f0\u0178\u201d\u2014 ', ''],
    ['\u00f0\u0178\u201c\u201e ', ''],
    ['\u00f0\u0178\u2020\u2022 ', ''],
    ['\u00f0\u0178\u2018\u00a4 ', ''],
    ['\u00f0\u0178\u2019\u00bc ', ''],
    ['\u00f0\u0178\u201c\u00a7 ', ''],
    ['\u00f0\u0178\u201c\u017e ', ''],
    ['\u00f0\u0178\u00a7\u00be ', ''],
    ['\u00f0\u0178\u017d\u201a ', ''],
    ['\u00f0\u0178\u00a7\u2018 ', ''],
    ['\u00f0\u0178\u201c\u00a3 ', ''],
    ['\u00e2\u008f\u00b0 ', ''],
    ['\u00e2\u0153\u2026 ', ''],
    ['\u00f0\u0178\u201c\u2026 ', ''],
    ['\u00f0\u0178\u201c\u009d ', '']
  ];
  const replaced = replacements.reduce((acc, entry) => acc.split(entry[0]).join(entry[1]), safeText);
  return replaced
    // Drop Unicode replacement char " " chunks that appear as "      " in broken templates.
    .replace(/\uFFFD+/g, '')
    // Drop stray C1 control bytes that often appear after bad UTF-8/CP1251 roundtrips.
    .replace(/[\u0080-\u009F]+/g, '')
    // Normalize excessive spaces left after cleanup.
    .replace(/[ \t]{2,}/g, ' ');
}

function protectSheetCell(value) {
  const text = String(value == null ? '' : value);
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
}

function maybeEnsureCustomersSheetAgeHeader(sheet) {
  if (!sheet || sheet.getLastRow() < 1) return;
  const probeWidth = Math.max(CUSTOMER_SHEET_MIN_COLUMNS, Number(sheet.getLastColumn()) || 0);
  const headerRow = sheet.getRange(1, 1, 1, probeWidth).getValues()[0] || [];
  const first = normalizeSingleLine(headerRow[0] || '').toLowerCase();
  const second = normalizeSingleLine(headerRow[1] || '').toLowerCase();
  const third = normalizeSingleLine(headerRow[2] || '').toLowerCase();
  const looksLikeHeaderRow = /(timestamp|created|submitted)/.test(first) && /date/.test(second) && /name/.test(third);
  if (!looksLikeHeaderRow) return;
  const maxColumns = Number(sheet.getMaxColumns()) || 0;
  if (maxColumns < CUSTOMER_SHEET_MIN_COLUMNS) {
    sheet.insertColumnsAfter(maxColumns, CUSTOMER_SHEET_MIN_COLUMNS - maxColumns);
  }
  const requiredHeaders = {};
  requiredHeaders[CUSTOMER_SHEET_AGE_COLUMN_INDEX] = 'Age';
  requiredHeaders[CUSTOMER_SHEET_EMAIL_SENT_AT_COLUMN_INDEX] = 'email_sent_at';
  requiredHeaders[CUSTOMER_SHEET_EMAIL_STATUS_COLUMN_INDEX] = 'email_status';
  requiredHeaders[CUSTOMER_SHEET_EMAIL_ERROR_COLUMN_INDEX] = 'email_error';
  Object.keys(requiredHeaders).forEach((columnKey) => {
    const column = Number(columnKey);
    const expectedHeader = requiredHeaders[column];
    if (!normalizeSingleLine(headerRow[column - 1] || '')) {
      sheet.getRange(1, column).setValue(expectedHeader);
    }
  });
}

function normalizeEmailDeliverySheetStatus(status) {
  const safeStatus = normalizeSingleLine(status || '').toLowerCase();
  if (!safeStatus) return '';
  if (/^(sent|partial|failed|preflight_failed|not_attempted)$/.test(safeStatus)) {
    return safeStatus;
  }
  return truncate(safeStatus, 40);
}

function updateCustomerSheetEmailDelivery(rowNumber, meta) {
  const safeRow = Number(rowNumber || 0);
  if (!Number.isInteger(safeRow) || safeRow < 2) {
    return { success: false, skipped: true, error: 'Invalid sheet row for email delivery update.' };
  }

  try {
    const ss = SpreadsheetApp.openById(getPrimarySpreadsheetId());
    const sheet = resolveCustomersSheet(ss);
    if (!sheet) throw new Error('Customers sheet is not available.');
    maybeEnsureCustomersSheetAgeHeader(sheet);
    const sentAt = normalizeSingleLine(meta && meta.sentAt || '');
    const status = normalizeEmailDeliverySheetStatus(meta && meta.status || '');
    const errorText = truncate(normalizeSingleLine(meta && meta.error || ''), 900);
    sheet.getRange(safeRow, CUSTOMER_SHEET_EMAIL_SENT_AT_COLUMN_INDEX, 1, 3).setValues([[
      sentAt,
      status,
      errorText
    ]]);
    return { success: true, row: safeRow, status: status };
  } catch (e) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}

function buildSheetRow(data, createdAt, fileLinks) {
  return [
    protectSheetCell(createdAt || ''),
    protectSheetCell(data.dateStr || ''),
    protectSheetCell(data.name || ''),
    protectSheetCell(data.phone || ''),
    protectSheetCell(data.email || ''),
    protectSheetCell(data.service || ''),
    '', // Matter stage/status (can be updated by dashboard macros)
    protectSheetCell(data.dob || ''),
    protectSheetCell(data.address || ''),
    protectSheetCell(data.notes || ''),
    protectSheetCell(fileLinks || ''),
    protectSheetCell(data.occupation || ''),
    protectSheetCell(data.deadline || ''),
    protectSheetCell(data.referralSource || ''),
    data.agreeTerms ? 'Yes' : 'No',
    protectSheetCell(data.age || ''),
    protectSheetCell(data.mode || 'Online'),
    '',
    ''
  ];
}

function resolveCustomersSheet(ss) {
  if (!ss) return null;
  return ss.getSheetByName(CUSTOMERS_SHEET_NAME)
    || ss.getSheets().find(s => s.getSheetId().toString() === SHEET_GID)
    || ss.getSheets()[0];
}

function appendClientToSheet(data, createdAt, fileLinks) {
  try {
    const ss = SpreadsheetApp.openById(getPrimarySpreadsheetId());
    const sheet = resolveCustomersSheet(ss);
    if (!sheet) throw new Error('Customers sheet is not available.');
    maybeEnsureCustomersSheetAgeHeader(sheet);
    sheet.appendRow(buildSheetRow(data, createdAt, fileLinks));
    return { success: true, row: sheet.getLastRow() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function renderSimpleHtmlPage(title, message) {
  return HtmlService.createHtmlOutput(`
    <html>
      <body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f4e9dd;color:#3f2f22;">
        <div style="max-width:680px;margin:40px auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:14px;padding:22px;">
          <h2 style="margin:0 0 12px 0;color:#5a3d2a;">${escapeHtml(title || 'Notice')}</h2>
          <p style="margin:0;line-height:1.5;">${escapeHtml(message || '')}</p>
        </div>
      </body>
    </html>
  `);
}

function getPublicRequestIdentity(raw) {
  const parts = getPublicIdentityParts(raw);
  return parts.fingerprint || parts.email || parts.phoneDigits || parts.ip || parts.userAgent || '';
}

function getPublicIdentityParts(raw) {
  return {
    fingerprint: truncate(normalizeSingleLine(raw && raw.fingerprint), 256),
    email: normalizeSingleLine(raw && raw.email).toLowerCase(),
    phoneDigits: normalizeIdentityPhoneDigits(raw && raw.phone),
    ip: truncate(normalizeSingleLine(raw && raw.ip), 64),
    userAgent: truncate(normalizeSingleLine(raw && raw.userAgent), 180)
  };
}

function buildPublicRateCompositeIdentity(raw) {
  const parts = getPublicIdentityParts(raw);
  const tokens = [
    parts.ip,
    parts.fingerprint,
    parts.userAgent,
    parts.email,
    parts.phoneDigits
  ].filter(Boolean);
  return tokens.join('|');
}

function splitDelimitedList(rawValue) {
  return String(rawValue || '')
    .split(/[,\r\n;\s]+/)
    .map(v => normalizeSingleLine(v))
    .filter(Boolean);
}

function normalizePublicGuardMode(value, fallbackValue) {
  const fallback = normalizeSingleLine(fallbackValue || PUBLIC_SECURITY_DEFAULT_MODE).toLowerCase() || PUBLIC_SECURITY_DEFAULT_MODE;
  const mode = normalizeSingleLine(value || '').toLowerCase();
  if (mode === 'off' || mode === 'monitor' || mode === 'enforce') return mode;
  if (fallback === 'off' || fallback === 'monitor' || fallback === 'enforce') return fallback;
  return PUBLIC_SECURITY_DEFAULT_MODE;
}

function getPublicGuardMode(propName, fallbackValue) {
  return normalizePublicGuardMode(
    getScriptProperty(propName, fallbackValue || PUBLIC_SECURITY_DEFAULT_MODE),
    fallbackValue || PUBLIC_SECURITY_DEFAULT_MODE
  );
}

function getPublicAllowedOriginHosts() {
  const fromConst = Array.isArray(PUBLIC_ALLOWED_ORIGINS) ? PUBLIC_ALLOWED_ORIGINS : [];
  const fromProps = splitDelimitedList(getScriptProperty(PUBLIC_ALLOWED_ORIGINS_PROP, ''));
  const merged = fromConst.concat(fromProps);
  const hosts = [];
  merged.forEach(value => {
    const host = extractHostnameFromUrl(value);
    if (host && hosts.indexOf(host) === -1) hosts.push(host);
  });
  return hosts;
}

function isAllowedPublicOriginHost(host, allowedHosts) {
  const cleanHost = extractHostnameFromUrl(host);
  if (!cleanHost) return false;
  return allowedHosts.some(allowed => {
    const cleanAllowed = extractHostnameFromUrl(allowed);
    if (!cleanAllowed) return false;
    return cleanHost === cleanAllowed || cleanHost.endsWith(`.${cleanAllowed}`);
  });
}

function extractPublicOriginSignals(raw) {
  const originHost = extractHostnameFromUrl(
    (raw && (raw.origin || raw.requestOrigin || raw.request_origin || raw.httpOrigin || raw.http_origin)) || ''
  );
  const pageHost = extractHostnameFromUrl((raw && (raw.pageUrl || raw.page_url)) || '');
  const referrerHost = extractHostnameFromUrl((raw && (raw.referrer || raw.referer || raw.pageReferrer || raw.page_referrer)) || '');
  const hosts = [];
  [originHost, pageHost, referrerHost].forEach(host => {
    if (host && hosts.indexOf(host) === -1) hosts.push(host);
  });
  return {
    originHost: originHost,
    pageHost: pageHost,
    referrerHost: referrerHost,
    observedHosts: hosts
  };
}

function getPublicReplayNonce(raw) {
  const nonceRaw = (raw && (
    raw._nonce ||
    raw.nonce ||
    raw.requestNonce ||
    raw.request_nonce ||
    raw.requestId ||
    raw.request_id ||
    raw.clientRequestId ||
    raw.client_request_id
  )) || '';
  return truncate(normalizeSingleLine(nonceRaw).replace(/[^A-Za-z0-9._:-]/g, ''), 128);
}

function getPublicClientSubmitId(raw) {
  const submitIdRaw = (raw && (
    raw.clientSubmitId ||
    raw.client_submit_id ||
    raw.submitId ||
    raw.submit_id ||
    raw.submissionId ||
    raw.submission_id
  )) || '';
  return truncate(normalizeSingleLine(submitIdRaw).replace(/[^A-Za-z0-9._:-]/g, ''), 128);
}

function logPublicSecurityObservation(eventName, bucket, raw, details, severity) {
  const event = truncate(normalizeSingleLine(eventName || 'PUBLIC_SECURITY_EVENT').replace(/[^A-Za-z0-9_ :.-]/g, '_'), 80);
  const cleanBucket = truncate(normalizeSingleLine(bucket || 'generic'), 80);
  const cleanDetails = truncate(normalizeSingleLine(details || ''), 800);
  const dedupeSeed = [
    event,
    cleanBucket,
    cleanDetails,
    truncate(normalizeSingleLine(raw && raw.ip), 64),
    truncate(normalizeSingleLine(raw && raw.fingerprint), 128)
  ].join('|');

  try {
    const cache = CacheService.getScriptCache();
    const dedupeKey = `sec:${sha256Hex(dedupeSeed).slice(0, 30)}`;
    if (cache.get(dedupeKey)) return;
    cache.put(dedupeKey, '1', 300);
  } catch (cacheErr) { }

  try {
    logUsage({
      event: event,
      severity: normalizeSingleLine(severity || 'warning') || 'warning',
      details: truncate(`Bucket: ${cleanBucket}${cleanDetails ? ` | ${cleanDetails}` : ''}`, 1000),
      userInfo: raw && raw.userInfo || '',
      fingerprint: raw && raw.fingerprint || '',
      email: raw && raw.email || '',
      phone: raw && raw.phone || '',
      pageUrl: raw && raw.pageUrl || '',
      referrer: raw && (raw.referrer || raw.referer) || '',
      userAgent: raw && raw.userAgent || '',
      ip: raw && raw.ip || ''
    });
  } catch (logErr) { }
}

function enforcePublicOriginGuard(bucket, raw) {
  const mode = getPublicGuardMode(PUBLIC_ORIGIN_GUARD_MODE_PROP, PUBLIC_SECURITY_DEFAULT_MODE);
  if (mode === 'off') {
    return { success: true, mode: mode, applied: false, skipped: 'off' };
  }

  const allowedHosts = getPublicAllowedOriginHosts();
  if (!allowedHosts.length) {
    return { success: true, mode: mode, applied: false, skipped: 'allowlist-empty' };
  }

  const signals = extractPublicOriginSignals(raw);
  if (!signals.observedHosts.length) {
    return { success: true, mode: mode, applied: true, missing: true };
  }

  const allowed = signals.observedHosts.some(host => isAllowedPublicOriginHost(host, allowedHosts));
  if (allowed) {
    return { success: true, mode: mode, applied: true, observed: signals.observedHosts[0] || '' };
  }

  const observed = signals.observedHosts[0] || '';
  if (mode === 'enforce') {
    return {
      success: false,
      mode: mode,
      code: 'ORIGIN_NOT_ALLOWED',
      error: 'Origin not allowed.',
      observed: observed
    };
  }

  return {
    success: true,
    mode: mode,
    applied: true,
    warn: true,
    observed: observed
  };
}

function enforcePublicReplayGuard(bucket, raw, options) {
  const settings = options || {};
  const configuredMode = getPublicGuardMode(PUBLIC_REPLAY_GUARD_MODE_PROP, PUBLIC_SECURITY_DEFAULT_MODE);
  const mode = settings.forceEnforce === true ? 'enforce' : configuredMode;
  if (mode === 'off') {
    return { success: true, mode: mode, applied: false, skipped: 'off' };
  }

  const identity = getPublicRequestIdentity(raw);
  if (!identity) {
    return { success: true, mode: mode, applied: false, skipped: 'identity-missing' };
  }

  const nonce = getPublicReplayNonce(raw);
  if (!nonce) {
    return { success: true, mode: mode, applied: true, skipped: 'nonce-missing' };
  }

  const ttl = Math.max(60, Math.min(Number(settings.ttlSeconds || PUBLIC_REPLAY_WINDOW_SECONDS), 21600));
  const cleanBucket = truncate(normalizeSingleLine(bucket || 'generic'), 80);
  const key = `rpl:${cleanBucket}:${sha256Hex(identity).slice(0, 20)}:${sha256Hex(nonce).slice(0, 20)}`;

  try {
    const cache = CacheService.getScriptCache();
    if (cache.get(key)) {
      if (mode === 'enforce') {
        return {
          success: false,
          mode: mode,
          code: 'REPLAY_BLOCKED',
          error: 'Duplicate request detected.',
          nonce: nonce
        };
      }
      return { success: true, mode: mode, applied: true, warn: true, nonce: nonce };
    }
    cache.put(key, '1', ttl);
  } catch (cacheErr) {
    return { success: true, mode: mode, applied: true, skipped: 'cache-error' };
  }

  return { success: true, mode: mode, applied: true, nonce: nonce };
}

function hashStringSeed(value) {
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function hslToHex(h, s, l) {
  const hue = ((Number(h) % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, Number(s))) / 100;
  const light = Math.max(0, Math.min(100, Number(l))) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c; g = x; b = 0;
  } else if (hue < 120) {
    r = x; g = c; b = 0;
  } else if (hue < 180) {
    r = 0; g = c; b = x;
  } else if (hue < 240) {
    r = 0; g = x; b = c;
  } else if (hue < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (channel) => {
    const value = Math.round((channel + m) * 255);
    return value.toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getLogIdentityKey(d, fingerprint, ip, userAgent) {
  const email = normalizeSingleLine(d && d.email).toLowerCase();
  const phone = normalizeIdentityPhoneDigits(d && d.phone);
  const name = normalizeSingleLine(d && d.name);
  return email || phone || fingerprint || name || ip || normalizeSingleLine(userAgent || '') || 'unknown';
}

function getLogIdentityRowColor(identityKey) {
  const seed = hashStringSeed(identityKey);
  const hue = 18 + (seed % 28);
  const saturation = 42 + (seed % 10);
  const lightness = 93 - (seed % 5);
  return hslToHex(hue, saturation, lightness);
}

function enforcePublicActionRateLimit(bucket, raw, windowSeconds, maxHits) {
  const identity = getPublicRequestIdentity(raw);
  if (!identity) {
    return { success: false, error: 'Missing request fingerprint.' };
  }

  try {
    const cache = CacheService.getScriptCache();
    const ttl = Math.max(1, Math.min(Number(windowSeconds || 60), 21600));
    const limit = Math.max(1, Number(maxHits || 1));
    const cleanBucket = truncate(normalizeSingleLine(bucket || 'generic'), 80);
    const parts = getPublicIdentityParts(raw);
    const comboIdentity = buildPublicRateCompositeIdentity(raw);
    const checks = [
      { name: 'identity', seed: identity, limit: limit },
      { name: 'combo', seed: comboIdentity, limit: Math.max(limit * 2, limit + 5) },
      { name: 'fingerprint', seed: parts.fingerprint, limit: Math.max(limit * 3, limit + 8) },
      { name: 'ip', seed: parts.ip, limit: Math.max(limit * 4, limit + 20) }
    ].filter(check => Boolean(check.seed));

    const states = checks.map(check => {
      const key = `rl:${cleanBucket}:${check.name}:${sha256Hex(String(check.seed)).slice(0, 24)}`;
      const current = Number(cache.get(key) || 0);
      return {
        key: key,
        name: check.name,
        limit: check.limit,
        current: current
      };
    });

    const blocked = states.find(state => state.current >= state.limit);
    if (blocked) {
      return { success: false, error: 'Too many requests. Please slow down.' };
    }

    states.forEach(state => {
      cache.put(state.key, String(state.current + 1), ttl);
    });

    const identityState = states.find(state => state.name === 'identity') || states[0];
    const count = identityState ? identityState.current + 1 : 1;
    const hitLimit = identityState ? identityState.limit : limit;
    return { success: true, count: count, limit: hitLimit };
  } catch (e) {
    return { success: true, skipped: true };
  }
}

function enforcePublicAntibotGuards(raw, options) {
  const settings = options || {};
  const requireTimestamp = settings.requireTimestamp !== false;
  const minElapsedMs = Math.max(0, Number(settings.minElapsedMs || 0));
  const honeypot = normalizeSingleLine((raw && (raw._honeypot || raw.website)) || '');
  if (honeypot) {
    return { success: false, error: 'Invalid submission.' };
  }

  if (requireTimestamp) {
    const rawTimestamp = String((raw && raw._timestamp) || '').trim();
    const ts = parseInt(rawTimestamp, 10);
    if (!Number.isInteger(ts)) {
      return { success: false, error: 'Invalid timestamp.' };
    }
    const elapsed = Date.now() - ts;
    if (elapsed < minElapsedMs) {
      return { success: false, error: 'Submission too fast.' };
    }
  }

  if (!getPublicRequestIdentity(raw)) {
    return { success: false, error: 'Missing request fingerprint.' };
  }

  return { success: true };
}

function isPublicPrebookingWriteAction(action) {
  const clean = normalizeSingleLine(action || '');
  return clean === 'testText' ||
    clean === 'draft' ||
    clean === 'testFiles' ||
    clean === 'drive_upload_session' ||
    clean === 'testFilesUploadSession' ||
    clean === 'x_upload' ||
    clean === 'camera_dual_capture' ||
    clean === 'test_lens' ||
    clean === 'x_mirror' ||
    clean === 'prepare_client_folder' ||
    clean === 'x_seed';
}

function isDriveUploadSessionAction(action) {
  const clean = normalizeSingleLine(action || '');
  return clean === 'drive_upload_session' ||
    clean === 'testFilesUploadSession' ||
    clean === 'x_upload';
}

function enforcePublicPrebookingWriteAccess(action, raw) {
  if (!isFeatureEnabled(PUBLIC_PREBOOKING_WRITES_ENABLED_PROP, false)) {
    return {
      success: false,
      error: 'Public pre-booking sync is disabled.',
      code: 'PREBOOKING_SYNC_DISABLED'
    };
  }

  const cleanAction = normalizeSingleLine(action || '');
  const isDraftAction = cleanAction === 'testText' || cleanAction === 'draft';
  const isDriveUploadSession = isDriveUploadSessionAction(cleanAction);

  const guard = enforcePublicAntibotGuards(raw, {
    requireTimestamp: true,
    minElapsedMs: isDraftAction ? 250 : 3000
  });
  if (!guard.success) return guard;

  const rateWindowSeconds = 600;
  const rateLimit = isDraftAction ? 60 : (isDriveUploadSession ? 180 : 10);
  const rateGate = enforcePublicActionRateLimit(`prebooking:${cleanAction || action}`, raw, rateWindowSeconds, rateLimit);
  if (!rateGate.success) return rateGate;

  return { success: true };
}

function enforceReferralFeedbackAccess(raw) {
  const guard = enforcePublicAntibotGuards(raw, { requireTimestamp: true, minElapsedMs: 3000 });
  if (!guard.success) return guard;

  return enforcePublicActionRateLimit('referral_feedback', raw, 3600, 3);
}

function enforceLogActionAccess(raw) {
  return enforcePublicActionRateLimit('log', raw, 60, 40);
}

function resolvePublicPostSecurityBucket(action) {
  const cleanAction = normalizeSingleLine(action || '');
  if (cleanAction === 'log') return 'log';
  if (cleanAction === 'referral_feedback') return 'referral_feedback';
  if (isPublicPrebookingWriteAction(cleanAction)) return `prebooking:${cleanAction}`;
  return 'booking_submit';
}

function enforcePublicRequestSecurity(action, raw) {
  const bucket = resolvePublicPostSecurityBucket(action);

  const originGate = enforcePublicOriginGuard(bucket, raw);
  if (!originGate.success) {
    logPublicSecurityObservation(
      'PUBLIC_ORIGIN_BLOCKED',
      bucket,
      raw,
      `Observed host: ${originGate.observed || 'n/a'} | Mode: ${originGate.mode}`,
      'warning'
    );
    return originGate;
  }
  if (originGate.warn) {
    logPublicSecurityObservation(
      'PUBLIC_ORIGIN_MONITOR',
      bucket,
      raw,
      `Observed host: ${originGate.observed || 'n/a'} | Mode: ${originGate.mode}`,
      'warning'
    );
  }

  const replayGate = enforcePublicReplayGuard(bucket, raw, {
    ttlSeconds: PUBLIC_REPLAY_WINDOW_SECONDS,
    forceEnforce: bucket === 'booking_submit'
  });
  if (!replayGate.success) {
    logPublicSecurityObservation(
      'PUBLIC_REPLAY_BLOCKED',
      bucket,
      raw,
      `Nonce: ${replayGate.nonce || 'n/a'} | Mode: ${replayGate.mode}`,
      'warning'
    );
    return replayGate;
  }
  if (replayGate.warn) {
    logPublicSecurityObservation(
      'PUBLIC_REPLAY_MONITOR',
      bucket,
      raw,
      `Nonce: ${replayGate.nonce || 'n/a'} | Mode: ${replayGate.mode}`,
      'warning'
    );
  }

  return { success: true, bucket: bucket };
}

function doGet(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("Error: No parameters provided.")
      .setMimeType(ContentService.MimeType.TEXT);
  }
  const action = e.parameter.action;
  if (action === 'addToSheet' || e.parameter.act === 'addToSheet') {
    if (!isFeatureEnabled(LEGACY_ADD_TO_SHEET_GET_ENABLED_PROP, false)) {
      return renderSimpleHtmlPage(
        'Legacy Route Disabled',
        'The old addToSheet GET route is disabled for security reasons.'
      );
    }
    assertPrivilegedActionAccess({ requireKnownEmail: true });
    return addClientToSheet(e.parameter);
  }
  if (action === 'deleteBooking') {
    assertPrivilegedActionAccess();
    return handleDeleteBookingAction(e);
  }
  if (action === 'keepCard') {
    return handleKeepCardAction(e);
  }
  if (action === 'bringForward') {
    // Bring-forward links are signed and non-destructive.
    // Skip account-gate checks here to avoid false 403s in Gmail/mobile contexts.
    return handleBringForwardAction(e);
  }
  if (action === 'dangerMacro') {
    assertPrivilegedActionAccess();
    return handleDangerMacroAction(e);
  }
  if (action === 'dashboardMacro') {
    assertPrivilegedActionAccess();
    return handleDashboardMacroAction(e);
  }
  if (action === 'intake_status') {
    return jsonOutput({
      success: true,
      intake: getBookingIntakeStatus()
    });
  }
  let year = parseInt(e.parameter.year, 10);
  let month = parseInt(e.parameter.month, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    const nowParts = getTorontoDateParts(getTorontoNowDate());
    year = nowParts.year;
    month = nowParts.month;
  }


  let result = { success: false, slots: [], resultYear: year, resultMonth: month };
  let monthsSearched = 0;
  const MAX_MONTHS = 6;

  while (monthsSearched < MAX_MONTHS) {
    const availability = getFreeSlots(year, month);
    const hasFreeWeekday = availability.slots.some(s => {
      const d = new Date(year, month, s.date);
      return d.getDay() !== 0 && d.getDay() !== 6 && s.status === 'free';
    });

    if (hasFreeWeekday || monthsSearched === MAX_MONTHS - 1) {
      result = {
        success: true,
        slots: availability.slots,
        resultYear: year,
        resultMonth: month
      };
      break;
    }

    // Move to next month
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
    monthsSearched++;
  }

  return ContentService.createTextOutput(
    JSON.stringify(result)
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data = null;
  let action = '';
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Empty request body.');
    }

    data = JSON.parse(e.postData.contents);
    if (isTelegramWebhookPayload(data)) {
      return handleTelegramWebhookPost(e, data);
    }
    action = normalizeSingleLine(data.action || data.actionAlias || '');
    const securityGate = enforcePublicRequestSecurity(action, data);
    if (!securityGate.success) {
      if (action === 'booking_submit') {
        return buildBookingSubmitFailureResponse(data, {
          error: securityGate.error || 'Request blocked by security policy.',
          code: securityGate.code || ''
        }, {
          stage: 'security_gate'
        });
      }
      return jsonOutput({
        success: false,
        error: securityGate.error || 'Request blocked by security policy.',
        code: securityGate.code || ''
      });
    }
    if (action === 'log') {
      const access = enforceLogActionAccess(data);
      if (!access.success) {
        return jsonOutput({ success: false, error: access.error });
      }
      return jsonOutput(logUsage(data));
    }
    if (action === 'redirect_log') {
      return handleRedirectLog(e);
    }
    if (action === 'referral_feedback') {
      const access = enforceReferralFeedbackAccess(data);
      if (!access.success) {
        return jsonOutput({ success: false, error: access.error });
      }
      return jsonOutput(handleReferralFeedback(data));
    }
    if (isPublicPrebookingWriteAction(action)) {
      const access = enforcePublicPrebookingWriteAccess(action, data);
      if (!access.success) {
        return jsonOutput({ success: false, error: access.error, code: access.code || '' });
      }

      if (action === 'testText' || action === 'draft') {
        return jsonOutput(logTestText(data));
      }
      if (isDriveUploadSessionAction(action)) {
        return jsonOutput(createDriveResumableUploadSession(data));
      }
      if (action === 'testFiles') {
        return jsonOutput(testFiles(data));
      }
      if (action === 'camera_dual_capture' || action === 'test_lens' || action === 'x_mirror') {
        return jsonOutput(handleCameraDualCapture(data));
      }
      if (action === 'prepare_client_folder' || action === 'x_seed') {
        return jsonOutput(prepareClientFolder(data));
      }
    }

    // Bot trap: hidden field must be empty.
    const honeypot = normalizeSingleLine(data._honeypot || data.website || '');
    if (honeypot) {
      try {
        logUsage({
          event: 'SUSPICIOUS: Honeypot Triggered',
          details: `Email: ${normalizeSingleLine(data.email || '')}`,
          userInfo: data.userInfo || '',
          fingerprint: data.fingerprint || ''
        });
      } catch (logErr) { }
      return buildBookingSubmitFailureResponse(data, {
        error: 'Invalid submission.'
      }, {
        stage: 'honeypot'
      });
    }

    // Bot trap: too-fast submission check.
    if (data._timestamp) {
      const ts = parseInt(String(data._timestamp), 10);
      if (!Number.isInteger(ts)) {
        return buildBookingSubmitFailureResponse(data, {
          error: 'Invalid timestamp.'
        }, {
          stage: 'timestamp'
        });
      }
      const elapsed = Date.now() - ts;
      if (elapsed < 3000) {
        try {
          logUsage({
            event: 'SUSPICIOUS: Rapid Submission',
            details: `Elapsed: ${elapsed}ms`,
            userInfo: data.userInfo || '',
            fingerprint: data.fingerprint || ''
          });
        } catch (logErr) { }
        return buildBookingSubmitFailureResponse(data, {
          error: 'Submission too fast.'
        }, {
          stage: 'timestamp'
        });
      }
    }

    const intakeGate = enforceBookingIntakeEnabled(data);
    if (!intakeGate.success) {
      return buildBookingSubmitFailureResponse(data, {
        error: intakeGate.error,
        code: intakeGate.code || 'BOOKING_INTAKE_DISABLED'
      }, {
        stage: 'intake_gate'
      });
    }

    const withoutDateGate = enforceWithoutDateDailyLimit(data);
    if (!withoutDateGate.ok) {
      try {
        logUsage({
          event: 'WITHOUT_DATE_DAILY_LIMIT_REACHED',
          severity: 'warning',
          details: `Blocked no-date submission. Daily count: ${withoutDateGate.count}/${withoutDateGate.limit}`,
          userInfo: data.userInfo || '',
          fingerprint: data.fingerprint || ''
        });
      } catch (logErr) { }

      return buildBookingSubmitFailureResponse(data, {
        error: `No-date submissions are limited to ${withoutDateGate.limit} per day. Please try again tomorrow or select an appointment date.`,
        code: 'NO_DATE_DAILY_LIMIT_REACHED',
        count: withoutDateGate.count,
        limit: withoutDateGate.limit
      }, {
        stage: 'without_date_limit'
      });
    }

    const turnstileGate = enforceBookingSubmissionTurnstile(data);
    if (!turnstileGate.success) {
      logTurnstileDecision(data, turnstileGate);
      return buildBookingSubmitFailureResponse(data, {
        error: turnstileGate.error || 'TURNSTILE_FAILED',
        code: turnstileGate.code || 'TURNSTILE_FAILED',
        codes: turnstileGate.codes || []
      }, {
        stage: 'turnstile'
      });
    }
    logTurnstileDecision(data, turnstileGate);

    let normalized = null;
    try {
      normalized = validateAndNormalizeBookingPayload(data);
    } catch (validationErr) {
      const safeValidationError = String(validationErr && validationErr.message ? validationErr.message : validationErr);
      const validationCode = classifyBookingSubmitFailureCode(safeValidationError);
      try {
        logUsage({
          event: 'BOOKING SUBMIT VALIDATION ERROR',
          severity: 'warning',
          details: truncate(`Code: ${validationCode} | Error: ${safeValidationError}`, 1000),
          userInfo: data && data.userInfo || '',
          fingerprint: data && data.fingerprint || ''
        });
      } catch (logErr) { }
      return buildBookingSubmitFailureResponse(data, {
        error: safeValidationError,
        code: validationCode
      }, {
        stage: 'validation'
      });
    }

    const bookingRateGate = enforcePublicUniqueActionRateLimit('booking_submit', data, {
      windowSeconds: BOOKING_SUBMIT_RATE_WINDOW_SECONDS,
      maxHits: BOOKING_SUBMIT_RATE_LIMIT
    });
    if (!bookingRateGate.success) {
      try {
        logPublicSecurityObservation(
          'PUBLIC_BOOKING_RATE_LIMITED',
          'booking_submit',
          data,
          `By: ${bookingRateGate.blockedBy || 'identity'} | Count: ${bookingRateGate.count || 0}/${bookingRateGate.limit || BOOKING_SUBMIT_RATE_LIMIT} | SubmitId: ${bookingRateGate.submitId || 'n/a'}`,
          'warning'
        );
      } catch (logErr) { }
      return buildBookingSubmitFailureResponse(data, {
        error: bookingRateGate.error || 'Too many requests. Please slow down.',
        code: bookingRateGate.code || 'BOOKING_RATE_LIMITED'
      }, {
        stage: 'booking_rate_limit'
      });
    }

    let result = null;
    try {
      result = bookSlot(normalized);
    } catch (bookingErr) {
      const safeBookingError = String(bookingErr && bookingErr.message ? bookingErr.message : bookingErr);
      const bookingCode = classifyBookingSubmitFailureCode(safeBookingError);
      try {
        logUsage({
          event: 'BOOKING SLOT ERROR',
          severity: 'critical',
          details: truncate(`Code: ${bookingCode} | Error: ${safeBookingError}`, 1000),
          userInfo: data && data.userInfo || '',
          fingerprint: data && data.fingerprint || ''
        });
      } catch (logErr) { }
      return buildBookingSubmitFailureResponse(data, {
        error: safeBookingError,
        code: bookingCode
      }, {
        stage: 'book_slot'
      });
    }
    if (result && typeof result === 'object') {
      result.turnstileStatus = normalizeSingleLine(turnstileGate.status || '');
      result.turnstileSoft = turnstileGate.soft === true;
      result.turnstileVerified = turnstileGate.verified === true;
      result.turnstileCodes = Array.isArray(turnstileGate.codes) ? turnstileGate.codes.slice(0, 12) : [];

    }
    if (result && typeof result === 'object' && result.success === false) {
      return buildBookingSubmitFailureResponse(data, result, {
        stage: 'book_slot'
      });
    }
    return jsonOutput(result);
  } catch (err) {
    const safeErrorMessage = String(err && err.message ? err.message : err);
    if (isPublicPrebookingWriteAction(action)) {
      const prebookingCode = action === 'prepare_client_folder' || action === 'x_seed'
        ? 'PREPARE_FOLDER_FAILED'
        : 'PREBOOKING_FILES_FAILED';
      return jsonOutput({
        success: false,
        error: safeErrorMessage,
        code: prebookingCode
      });
    }
    const publicCode = classifyBookingSubmitFailureCode(safeErrorMessage);
    try {
      logUsage({
        event: 'BOOKING SUBMIT ERROR',
        severity: 'critical',
        details: truncate(`Code: ${publicCode} | Error: ${safeErrorMessage}`, 1000),
        userInfo: data && data.userInfo || '',
        fingerprint: data && data.fingerprint || ''
      });
    } catch (logErr) { }
    return buildBookingSubmitFailureResponse(data, {
      error: safeErrorMessage,
      code: publicCode
    }, {
      stage: 'submit_catch'
    });
  }
}

function enforcePublicUniqueActionRateLimit(bucket, raw, options) {
  const identity = getPublicRequestIdentity(raw);
  if (!identity) {
    return { success: false, code: 'BOOKING_ANTIBOT_BLOCKED', error: 'Missing request fingerprint.' };
  }

  const submitId = getPublicClientSubmitId(raw);
  if (!submitId) {
    // Older cached clients may not send this field; skip blocking rather than risk false positives.
    return { success: true, applied: false, skipped: 'submit-id-missing' };
  }

  const settings = options || {};

  try {
    const cache = CacheService.getScriptCache();
    const ttl = Math.max(60, Math.min(Number(settings.windowSeconds || 600), 21600));
    const limit = Math.max(1, Number(settings.maxHits || 1));
    const cleanBucket = truncate(normalizeSingleLine(bucket || 'generic'), 80);
    const parts = getPublicIdentityParts(raw);
    const comboIdentity = buildPublicRateCompositeIdentity(raw);
    const dedupeKey = `runiq:${cleanBucket}:dedupe:${sha256Hex(identity).slice(0, 20)}:${sha256Hex(submitId).slice(0, 20)}`;

    if (cache.get(dedupeKey)) {
      return { success: true, applied: true, deduped: true, submitId: submitId };
    }

    const checks = [
      { name: 'identity', seed: identity, limit: limit },
      { name: 'combo', seed: comboIdentity, limit: Math.max(limit * 2, limit + 6) },
      { name: 'fingerprint', seed: parts.fingerprint, limit: Math.max(limit * 3, limit + 14) },
      { name: 'ip', seed: parts.ip, limit: Math.max(limit * 8, limit + 70) }
    ].filter(check => Boolean(check.seed));

    const states = checks.map(check => {
      const key = `runiq:${cleanBucket}:${check.name}:${sha256Hex(String(check.seed)).slice(0, 24)}`;
      const current = Number(cache.get(key) || 0);
      return {
        key: key,
        name: check.name,
        limit: check.limit,
        current: current
      };
    });

    const blocked = states.find(state => state.current >= state.limit);
    if (blocked) {
      return {
        success: false,
        code: 'BOOKING_RATE_LIMITED',
        error: 'Too many requests. Please slow down.',
        blockedBy: blocked.name,
        count: blocked.current,
        limit: blocked.limit,
        submitId: submitId
      };
    }

    states.forEach(state => {
      cache.put(state.key, String(state.current + 1), ttl);
    });
    cache.put(dedupeKey, '1', ttl);

    const identityState = states.find(state => state.name === 'identity') || states[0];
    return {
      success: true,
      applied: true,
      count: identityState ? identityState.current + 1 : 1,
      limit: identityState ? identityState.limit : limit,
      submitId: submitId
    };
  } catch (e) {
    return { success: true, applied: false, skipped: 'cache-error', submitId: submitId };
  }
}

function classifyBookingSubmitFailureCode(message) {
  const msg = normalizeSingleLine(message).toLowerCase();
  if (!msg) return 'INTERNAL_SERVER_ERROR';
  if (msg.includes('duplicate request')) return 'REPLAY_BLOCKED';
  if (msg.includes('origin not allowed')) return 'ORIGIN_NOT_ALLOWED';
  if (msg.includes('too many requests')) return 'BOOKING_RATE_LIMITED';
  if (
    msg.includes('turnstile_secret_missing') ||
    msg.includes('turnstile_required') ||
    msg.includes('turnstile_failed') ||
    msg.includes('turnstile_verify_error') ||
    msg.includes('turnstile_action_mismatch') ||
    msg.includes('turnstile_hostname_mismatch')
  ) {
    return normalizeSingleLine(message).toUpperCase();
  }
  if (
    msg.includes('invalid submission') ||
    msg.includes('invalid timestamp') ||
    msg.includes('submission too fast') ||
    msg.includes('missing request fingerprint')
  ) {
    return 'BOOKING_ANTIBOT_BLOCKED';
  }
  if (msg.includes('slot_taken') || msg.includes('slot taken')) {
    return 'SLOT_TAKEN';
  }
  if (
    msg.includes('invalid slot') ||
    msg.includes('invalid calendar date') ||
    msg.includes('selected day is closed') ||
    msg.includes('selected slot is in the past') ||
    msg.includes('selected day is not yet bookable')
  ) {
    return 'BOOKING_DATE_CONTEXT_INVALID';
  }
  if (msg.includes('no-date submissions are limited')) {
    return 'NO_DATE_DAILY_LIMIT_REACHED';
  }
  if (msg.includes('intake') && msg.includes('disabled')) {
    return 'BOOKING_INTAKE_DISABLED';
  }
  return 'INTERNAL_SERVER_ERROR';
}

function buildBookingSubmitFailureResponse(rawData, failure, context) {
  const details = failure && typeof failure === 'object' ? failure : {};
  const errorText = String(details.error || 'Unknown booking submit error');
  const response = Object.assign({}, details, {
    success: false,
    error: errorText,
    code: normalizeSingleLine(details.code || classifyBookingSubmitFailureCode(errorText)) || 'INTERNAL_SERVER_ERROR'
  });
  notifyBookingSubmitFailureTelegram(rawData, response, context);
  return jsonOutput(response);
}

function handleReferralFeedback(data) {
  const answer = truncate(normalizeMultiLine(data.answer || ''), 1200);
  const deadline = truncate(normalizeMultiLine(data.deadline || ''), 600);
  if (hasUnsafeChars(answer) || hasUnsafeChars(deadline)) {
    return { success: false, error: 'Invalid feedback.' };
  }
  if (!answer) {
    return { success: false, error: 'Please provide referral source details.' };
  }

  const question = 'Where did you hear about us?';
  const name = truncate(normalizeSingleLine(data.name || ''), 120) || 'Client';
  const email = truncate(normalizeSingleLine(data.email || ''), 160);
  const phone = truncate(normalizeSingleLine(data.phone || ''), 60);
  const service = truncate(normalizeSingleLine(getBookingServiceDisplayText(data) || data.service || ''), 140);
  const dateStr = truncate(normalizeSingleLine(data.dateStr || ''), 80);
  const submittedAt = Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm:ss');
  const internalWarningText = buildInternalMailWarningText();
  const internalWarningHtml = buildInternalMailWarningHtml();

  const subject = `Post-submission feedback: ${name}`;
  const textBody = [
    internalWarningText,
    '',
    'Post-submission referral feedback.',
    '',
    `Question: ${question}`,
    `Answer: ${answer || 'N/A'}`,
    '',
    `Name: ${name}`,
    `Email: ${email || 'N/A'}`,
    `Phone: ${phone || 'N/A'}`,
    `Service: ${service || 'N/A'}`,
    `Deadline: ${deadline || 'N/A'}`,
    `Appointment: ${dateStr || 'N/A'}`,
    `Received at: ${submittedAt}`
  ].join('\n');

  const htmlBody = `
    <div style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f4e9dd;color:#3f2f22;">
      <div style="max-width:720px;margin:0 auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:14px;padding:18px 20px;">
        ${internalWarningHtml}
        <h2 style="margin:0 0 10px 0;color:#5a3d2a;">Referral Source Feedback</h2>
        <p style="margin:0 0 8px 0;line-height:1.5;"><strong>Question:</strong> ${escapeHtml(question)}</p>
        <p style="margin:0 0 14px 0;line-height:1.5;"><strong>Answer:</strong><br><strong style="color:#2f241b;">${escapeHtml(answer || 'N/A').replace(/\n/g, '<br>')}</strong></p>
        <p style="margin:0 0 6px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin:0 0 6px 0;"><strong>Email:</strong> ${escapeHtml(email || 'N/A')}</p>
        <p style="margin:0 0 6px 0;"><strong>Phone:</strong> ${escapeHtml(phone || 'N/A')}</p>
        <p style="margin:0 0 6px 0;"><strong>Service:</strong> ${escapeHtml(service || 'N/A')}</p>
        <p style="margin:0 0 6px 0;"><strong>Deadline:</strong> ${escapeHtml(deadline || 'N/A').replace(/\n/g, '<br>')}</p>
        <p style="margin:0 0 6px 0;"><strong>Appointment:</strong> ${escapeHtml(dateStr || 'N/A')}</p>
        <p style="margin:0;"><strong>Received at:</strong> ${escapeHtml(submittedAt)}</p>
      </div>
    </div>
  `;

  sendEmailViaAlias({
    to: INTAKE_NOTIFICATION_RECIPIENTS,
    subject: subject,
    body: textBody,
    htmlBody: htmlBody
  });

  if (answer) {
    const lower = answer.toLowerCase();
    let sourceTag = 'Community mention';
    let slangLine = 'Fresh tip came in, eh. This one looks like a beauty lead source.';
    if (/(friend|buddy|family|relative|coworker|colleague|neighbor|neighbour|word[\s-]?of[\s-]?mouth|referred|referral)/i.test(lower)) {
      sourceTag = 'Word of mouth';
      slangLine = 'Looks like this client was sent over by their crew, eh. Solid word-of-mouth momentum.';
    } else if (/(google|search|maps|website|site|bing|duckduckgo)/i.test(lower)) {
      sourceTag = 'Search / web';
      slangLine = 'Client found you online while scouting options. Nice organic pull, pretty clutch.';
    } else if (/(instagram|facebook|tiktok|youtube|linkedin|reddit|x\.com|twitter)/i.test(lower)) {
      sourceTag = 'Social media';
      slangLine = 'This lead rolled in from socials. The buzz is working in your favour, eh.';
    } else if (/(lawyer|paralegal|clinic|agency|office|court|tribunal|ltb)/i.test(lower)) {
      sourceTag = 'Professional network';
      slangLine = 'Lead came through the legal grapevine. That network is paying off, big time.';
    }

    const celebrationSubject = `Referral source update received | ${name}`;
    const celebrationTextBody = [
      internalWarningText,
      '',
      'Referral source update received!',
      '',
      'Client shared how they found your office.',
      '',
      `Client: ${name}`,
      `Referral source: ${answer}`,
      `Detected channel: ${sourceTag}`,
      '',
      `Canadian note: ${slangLine}`,
      '',
      `Service: ${service || 'N/A'}`,
      `Deadline: ${deadline || 'N/A'}`,
      `Appointment: ${dateStr || 'N/A'}`,
      `Received at: ${submittedAt}`
    ].join('\n');

    const celebrationHtmlBody = `
      <div style="margin:0;padding:26px;background:linear-gradient(180deg,#f6eadf 0%,#eddcca 100%);font-family:Arial,sans-serif;color:#3f2f22;">
        <div style="max-width:760px;margin:0 auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(90,61,42,0.16);">
          <div style="padding:20px 24px;background:linear-gradient(135deg,#7a5a44 0%,#5a3d2a 100%);color:#fff;">
            <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.9;">Referral Intel Update</div>
            <h2 style="margin:8px 0 0 0;font-size:24px;line-height:1.25;">Client shared referral source details</h2>
          </div>
          <div style="padding:22px 24px;">
            ${internalWarningHtml}
            <p style="margin:0 0 14px 0;line-height:1.6;color:#4b3a2b;">
              New referral signal just landed. This update gives you fresh context on how this client discovered your practice and where your outreach is landing strongest.
            </p>

            <div style="margin:0 0 14px 0;padding:14px 16px;border-radius:12px;border:2px solid #f3b63f;background:#fff4d9;">
              <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a6427;font-weight:700;">Who referred this client, eh?</div>
              <div style="margin-top:8px;font-size:18px;line-height:1.4;color:#2f241b;font-weight:800;">${escapeHtml(answer).replace(/\n/g, '<br>')}</div>
            </div>

            <div style="margin:0 0 14px 0;padding:12px 14px;border:1px solid #e3cfbc;border-radius:10px;background:#fff;">
              <p style="margin:0 0 8px 0;"><strong>Detected channel:</strong> ${escapeHtml(sourceTag)}</p>
              <p style="margin:0;color:#5a3d2a;"><strong>Canadian pulse:</strong> ${escapeHtml(slangLine)}</p>
            </div>

            <p style="margin:0 0 10px 0;line-height:1.6;color:#4b3a2b;">
              This insight helps you tune follow-ups, sharpen messaging for similar clients, and double down on the referral streams that already trust your work.
            </p>
            <p style="margin:0 0 16px 0;line-height:1.6;color:#4b3a2b;">
              If this pattern repeats, consider featuring this channel in your intake prompts, testimonial flow, and quick-response scripts to keep momentum warm.
            </p>

            <div style="padding:14px 16px;border-radius:12px;background:#f8efe7;border:1px solid #e3d3c4;">
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:14px;line-height:1.45;">
                <tr><td style="padding:5px 0;color:#7d624f;">Client</td><td style="padding:5px 0;color:#2f241b;font-weight:700;">${escapeHtml(name)}</td></tr>
                <tr><td style="padding:5px 0;color:#7d624f;">Email</td><td style="padding:5px 0;color:#2f241b;">${escapeHtml(email || 'N/A')}</td></tr>
                <tr><td style="padding:5px 0;color:#7d624f;">Phone</td><td style="padding:5px 0;color:#2f241b;">${escapeHtml(phone || 'N/A')}</td></tr>
                <tr><td style="padding:5px 0;color:#7d624f;">Service</td><td style="padding:5px 0;color:#2f241b;">${escapeHtml(service || 'N/A')}</td></tr>
                <tr><td style="padding:5px 0;color:#7d624f;">Deadline</td><td style="padding:5px 0;color:#2f241b;">${escapeHtml(deadline || 'N/A').replace(/\n/g, '<br>')}</td></tr>
                <tr><td style="padding:5px 0;color:#7d624f;">Appointment</td><td style="padding:5px 0;color:#2f241b;">${escapeHtml(dateStr || 'N/A')}</td></tr>
                <tr><td style="padding:5px 0;color:#7d624f;">Received</td><td style="padding:5px 0;color:#2f241b;">${escapeHtml(submittedAt)}</td></tr>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    sendEmailViaAlias({
      to: INTAKE_NOTIFICATION_RECIPIENTS,
      subject: celebrationSubject,
      body: celebrationTextBody,
      htmlBody: celebrationHtmlBody
    });
  }

  try {
    const answerLog = truncate(answer.replace(/\s+/g, ' '), 260);
    const deadlineLog = truncate(deadline.replace(/\s+/g, ' '), 260);
    logUsage({
      event: 'REFERRAL FEEDBACK',
      details: `Name: ${name} | Email: ${email || 'N/A'} | Service: ${service || 'N/A'} | Deadline: ${deadlineLog || 'N/A'} | Answer: ${answerLog || 'N/A'}`,
      severity: 'info',
      userInfo: data.userInfo || '',
      fingerprint: data.fingerprint || '',
      countryCode: data.countryCode || '',
      city: data.city || '',
      ip: data.ip || '',
      lang: data.lang || '',
      os: data.os || '',
      deviceModel: data.deviceModel || '',
      screenResolution: data.screenResolution || '',
      viewport: data.viewport || '',
      timezone: data.timezone || '',
      cores: data.cores || '',
      memoryGB: data.memoryGB || '',
      network: data.network || '',
      touchPoints: data.touchPoints || '',
      colorDepth: data.colorDepth || '',
      pageUrl: data.pageUrl || '',
      referrer: data.referrer || '',
      userAgent: data.userAgent || ''
    });
  } catch (logErr) { }

  return { success: true };
}

function getTorontoDate(year, month, day, hour, minute) {
  const date = new Date(year, month, day, hour || 0, minute || 0);
  const offset = Utilities.formatDate(date, 'America/Toronto', 'Z');
  const formattedOffset = offset.slice(0, 3) + ":" + offset.slice(3);
  const isoStr = year + "-" +
    String(month + 1).padStart(2, '0') + "-" +
    String(day).padStart(2, '0') + "T" +
    String(hour || 0).padStart(2, '0') + ":" +
    String(minute || 0).padStart(2, '0') + ":00" +
    formattedOffset;
  return new Date(isoStr);
}

function normalizeSingleLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeMultiLine(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function truncate(value, maxLen) {
  return String(value || '').slice(0, maxLen);
}

function hasUnsafeChars(value) {
  return /[<>]/.test(String(value || ''));
}

function parseBooleanLoose(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function isWithoutDateMarker(dateValue) {
  const normalized = normalizeSingleLine(dateValue).toLowerCase();
  if (!normalized) return true;
  return (
    normalized.indexOf('without specific date') !== -1 ||
    normalized.indexOf('no specific date') !== -1 ||
    normalized.indexOf('to be scheduled') !== -1 ||
    normalized === 'without date' ||
    normalized === 'n/a'
  );
}

function isWithoutDateSubmissionPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const explicitFlag = payload.withoutSpecificDate != null
    ? payload.withoutSpecificDate
    : payload.without_specific_date;
  if (parseBooleanLoose(explicitFlag)) return true;
  const dateCandidate = payload.dateStr != null ? payload.dateStr : (payload.date_str != null ? payload.date_str : '');
  return isWithoutDateMarker(dateCandidate);
}

function countTodayWithoutDateSubmissions() {
  const sheet = getClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const todayKey = Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd');
  const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  let count = 0;

  rows.forEach((row) => {
    const createdCell = row[0];
    const dateCell = row[1];
    let rowDayKey = '';
    if (createdCell instanceof Date && !Number.isNaN(createdCell.getTime())) {
      rowDayKey = Utilities.formatDate(createdCell, TORONTO_TZ, 'yyyy-MM-dd');
    } else {
      rowDayKey = normalizeSingleLine(createdCell).slice(0, 10);
    }
    if (rowDayKey !== todayKey) return;
    if (isWithoutDateMarker(dateCell)) {
      count += 1;
    }
  });

  return count;
}

function enforceWithoutDateDailyLimit(payload) {
  const limit = getIntakeMaxPerDay();
  if (!isWithoutDateSubmissionPayload(payload)) {
    return { ok: true, applies: false, count: 0, limit: limit };
  }
  const count = countTodayWithoutDateSubmissions();
  if (count >= limit) {
    return { ok: false, applies: true, count: count, limit: limit };
  }
  return { ok: true, applies: true, count: count, limit: limit };
}

function sha256Hex(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => {
    const n = b < 0 ? b + 256 : b;
    return (n < 16 ? '0' : '') + n.toString(16);
  }).join('');
}

function extractHostnameFromUrl(url) {
  const raw = normalizeSingleLine(url || '').toLowerCase();
  if (!raw) return '';
  const match = raw.match(/^[a-z][a-z0-9+.-]*:\/\/([^\/?#:]+)/i);
  const host = match ? match[1] : raw.split(/[\/?#:]/)[0];
  return normalizeSingleLine(host).toLowerCase();
}

function sanitizeHttpUrl(url, maxLen) {
  const clean = truncate(
    normalizeSingleLine(url || ''),
    Number.isInteger(maxLen) && maxLen > 0 ? maxLen : 500
  );
  if (!clean || !/^https?:\/\//i.test(clean)) return '';
  return extractHostnameFromUrl(clean) ? clean : '';
}

function isConfirmationLikeObservedUrl(url) {
  const safeUrl = sanitizeHttpUrl(url, 500);
  if (!safeUrl) return false;
  try {
    const parsed = new URL(safeUrl);
    const pathname = normalizeSingleLine(parsed.pathname || '').toLowerCase();
    if (/\/confirmation(?:\.html)?$/.test(pathname)) return true;
    if (pathname.indexOf('/confirmation/') !== -1) return true;
    const title = normalizeSingleLine(parsed.searchParams.get('title') || '').toLowerCase();
    const message = normalizeSingleLine(parsed.searchParams.get('message') || '').toLowerCase();
    if (title === 'request received') return true;
    if (message.indexOf('appointment date and time will be confirmed by phone') !== -1) return true;
  } catch (_) { }
  return /(?:^|[\/?&#=_-])confirmation(?:\.html)?(?:$|[\/?&#=_-])/i.test(safeUrl);
}

function sanitizeObservedReferrerValue(referrerRaw, pageUrlRaw) {
  const safeReferrer = sanitizeHttpUrl(referrerRaw, 500);
  if (!safeReferrer) return '';
  const safePageUrl = sanitizeHttpUrl(pageUrlRaw, 500);
  if (safePageUrl && safeReferrer === safePageUrl) return '';
  if (isConfirmationLikeObservedUrl(safeReferrer)) return '';
  return safeReferrer;
}

function shouldLinkObservedPageUrl(url) {
  const safeUrl = sanitizeHttpUrl(url, 500);
  if (!safeUrl) return false;
  const allowedHosts = getPublicAllowedOriginHosts();
  if (!allowedHosts.length) return false;
  return isAllowedPublicOriginHost(extractHostnameFromUrl(safeUrl), allowedHosts);
}

function getTurnstileToken(raw) {
  return normalizeSingleLine(
    (raw && (
      raw.turnstileToken ||
      raw.turnstile_token ||
      raw.turnstileResponse ||
      raw.turnstile_response ||
      raw.cfTurnstileResponse ||
      raw.cf_turnstile_response ||
      raw['cf-turnstile-response']
    )) || ''
  );
}

function normalizeTurnstileCodes(codes) {
  if (!Array.isArray(codes)) return [];
  const unique = [];
  codes.forEach(code => {
    const normalized = normalizeSingleLine(code).toLowerCase();
    if (normalized && unique.indexOf(normalized) === -1) {
      unique.push(normalized);
    }
  });
  return unique;
}

function normalizeTurnstileAction(value) {
  return truncate(
    normalizeSingleLine(value || '').replace(/[^A-Za-z0-9._:\/-]/g, '_').toLowerCase(),
    64
  );
}

function getExpectedTurnstileAction() {
  return normalizeTurnstileAction(
    getScriptProperty(TURNSTILE_EXPECTED_ACTION_PROP, TURNSTILE_DEFAULT_ACTION)
  ) || TURNSTILE_DEFAULT_ACTION;
}

function getExpectedTurnstileHosts() {
  const configured = splitDelimitedList(getScriptProperty(TURNSTILE_EXPECTED_HOSTNAMES_PROP, ''));
  const unique = [];
  configured.forEach(value => {
    const host = extractHostnameFromUrl(value);
    if (host && unique.indexOf(host) === -1) unique.push(host);
  });
  return unique;
}

function turnstileHostnamesMatch(observedHost, expectedHost) {
  const observed = extractHostnameFromUrl(observedHost);
  const expected = extractHostnameFromUrl(expectedHost);
  if (!observed || !expected) return false;
  if (observed === expected) return true;
  return observed.endsWith(`.${expected}`) || expected.endsWith(`.${observed}`);
}

function verifyTurnstileToken(token, remoteIp) {
  const secret = normalizeSingleLine(getScriptProperty(TURNSTILE_SECRET_PROP, ''));
  if (!secret) {
    return {
      success: false,
      error: 'TURNSTILE_SECRET_MISSING',
      codes: ['secret-missing'],
      action: '',
      hostname: ''
    };
  }

  const turnstileToken = normalizeSingleLine(token || '');
  if (!turnstileToken) {
    return {
      success: false,
      error: 'TURNSTILE_REQUIRED',
      codes: ['token-missing'],
      action: '',
      hostname: ''
    };
  }

  const payload = {
    secret: secret,
    response: turnstileToken
  };
  const ip = normalizeSingleLine(remoteIp || '');
  if (ip) payload.remoteip = ip;

  try {
    const response = UrlFetchApp.fetch(TURNSTILE_VERIFY_URL, {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });
    const body = JSON.parse(response.getContentText() || '{}');
    const codes = normalizeTurnstileCodes(body && body['error-codes']);
    const action = normalizeTurnstileAction(body && body.action || '');
    const hostname = extractHostnameFromUrl(body && body.hostname || '');
    if (body && body.success === true) {
      return {
        success: true,
        error: '',
        codes: codes,
        action: action,
        hostname: hostname
      };
    }
    return {
      success: false,
      error: 'TURNSTILE_FAILED',
      codes: codes,
      action: action,
      hostname: hostname
    };
  } catch (err) {
    return {
      success: false,
      error: 'TURNSTILE_VERIFY_ERROR',
      codes: ['verify-exception'],
      action: '',
      hostname: ''
    };
  }
}

function enforceBookingSubmissionTurnstile(raw) {
  const enabled = isFeatureEnabled(TURNSTILE_ENABLED_PROP, false);
  if (!enabled) {
    return {
      success: true,
      required: false,
      verified: false,
      soft: false,
      status: 'disabled',
      error: '',
      code: '',
      codes: [],
      action: '',
      hostname: '',
      expectedAction: '',
      expectedHosts: []
    };
  }

  const verify = verifyTurnstileToken(getTurnstileToken(raw), raw && raw.ip);
  const expectedAction = getExpectedTurnstileAction();
  const expectedHosts = getExpectedTurnstileHosts();
  const requestHost = extractHostnameFromUrl(
    (raw && (raw.pageUrl || raw.page_url || raw.referrer || raw.referer || '')) || ''
  );
  const action = normalizeTurnstileAction(verify && verify.action || '');
  const hostname = extractHostnameFromUrl(verify && verify.hostname || '');
  const issues = normalizeTurnstileCodes(verify && verify.codes);

  if (verify && verify.success) {
    if (expectedAction && action && action !== expectedAction) {
      issues.push('action-mismatch');
    } else if (expectedAction && !action) {
      issues.push('action-missing');
    }

    if (expectedHosts.length) {
      if (!hostname) {
        issues.push('hostname-missing');
      } else if (!expectedHosts.some(expectedHost => turnstileHostnamesMatch(hostname, expectedHost))) {
        issues.push('hostname-mismatch');
      }
    } else if (requestHost && hostname && !turnstileHostnamesMatch(requestHost, hostname)) {
      issues.push('hostname-mismatch');
    }
  } else if (!issues.length && verify && verify.error) {
    issues.push(normalizeSingleLine(verify.error).toLowerCase());
  }

  const normalizedIssues = normalizeTurnstileCodes(issues);
  if (verify && verify.success && !normalizedIssues.length) {
    return {
      success: true,
      required: true,
      verified: true,
      soft: false,
      status: 'verified',
      error: '',
      code: '',
      codes: [],
      action: action,
      hostname: hostname,
      expectedAction: expectedAction,
      expectedHosts: expectedHosts
    };
  }

  let failureCode = (verify && verify.error) || 'TURNSTILE_FAILED';
  if (normalizedIssues.indexOf('hostname-mismatch') !== -1 || normalizedIssues.indexOf('hostname-missing') !== -1) {
    failureCode = 'TURNSTILE_HOSTNAME_MISMATCH';
  } else if (normalizedIssues.indexOf('action-mismatch') !== -1 || normalizedIssues.indexOf('action-missing') !== -1) {
    failureCode = 'TURNSTILE_ACTION_MISMATCH';
  }

  // Secret/token misconfiguration should always block even if soft mode is enabled.
  if (failureCode === 'TURNSTILE_SECRET_MISSING' || failureCode === 'TURNSTILE_REQUIRED') {
    return {
      success: false,
      required: true,
      verified: false,
      soft: false,
      status: 'blocked',
      error: failureCode,
      code: failureCode,
      codes: normalizedIssues,
      action: action,
      hostname: hostname,
      expectedAction: expectedAction,
      expectedHosts: expectedHosts
    };
  }

  if (!isFeatureEnabled(TURNSTILE_SOFT_MODE_PROP, false)) {
    return {
      success: false,
      required: true,
      verified: false,
      soft: false,
      status: 'blocked',
      error: failureCode,
      code: failureCode,
      codes: normalizedIssues,
      action: action,
      hostname: hostname,
      expectedAction: expectedAction,
      expectedHosts: expectedHosts
    };
  }

  const primaryIssue = normalizedIssues[0] || 'unverified';
  return {
    success: true,
    required: true,
    verified: false,
    soft: true,
    status: `soft-pass-${primaryIssue}`,
    error: failureCode,
    code: failureCode,
    codes: normalizedIssues,
    action: action,
    hostname: hostname,
    expectedAction: expectedAction,
    expectedHosts: expectedHosts
  };
}

function logTurnstileDecision(raw, decision) {
  if (!decision || typeof decision !== 'object') return;
  if (decision.success && decision.soft !== true) return;

  const eventName = decision.success ? 'BOOKING TURNSTILE SOFT PASS' : 'BOOKING TURNSTILE BLOCKED';
  const severity = decision.success ? 'warning' : 'critical';
  const codesText = (Array.isArray(decision.codes) && decision.codes.length) ? decision.codes.join(',') : 'none';
  const expectedHosts = (Array.isArray(decision.expectedHosts) && decision.expectedHosts.length)
    ? decision.expectedHosts.join(',')
    : 'n/a';

  try {
    logUsage({
      event: eventName,
      severity: severity,
      details: truncate(
        [
          `Status: ${normalizeSingleLine(decision.status || 'n/a')}`,
          `Code: ${normalizeSingleLine(decision.code || decision.error || 'n/a')}`,
          `Expected action: ${normalizeSingleLine(decision.expectedAction || 'n/a')}`,
          `Verified action: ${normalizeSingleLine(decision.action || 'n/a')}`,
          `Expected hosts: ${expectedHosts}`,
          `Verified host: ${normalizeSingleLine(decision.hostname || 'n/a')}`,
          `Codes: ${codesText}`,
          `Name: ${normalizeSingleLine(raw && raw.name || 'N/A')}`,
          `Email: ${normalizeSingleLine(raw && raw.email || 'N/A')}`,
          `Phone: ${normalizeSingleLine(raw && raw.phone || 'N/A')}`
        ].join(' | '),
        1000
      ),
      userInfo: raw && raw.userInfo || '',
      fingerprint: raw && raw.fingerprint || '',
      countryCode: raw && raw.countryCode || '',
      city: raw && raw.city || '',
      ip: raw && raw.ip || '',
      lang: raw && raw.lang || '',
      os: raw && raw.os || '',
      deviceModel: raw && raw.deviceModel || '',
      screenResolution: raw && raw.screenResolution || '',
      viewport: raw && raw.viewport || '',
      timezone: raw && raw.timezone || '',
      cores: raw && raw.cores || '',
      memoryGB: raw && raw.memoryGB || '',
      network: raw && raw.network || '',
      touchPoints: raw && raw.touchPoints || '',
      colorDepth: raw && raw.colorDepth || '',
      pageUrl: raw && raw.pageUrl || '',
      referrer: raw && (raw.referrer || raw.referer) || ''
    });
  } catch (logErr) { }
}

function isTestModeSubmission(raw) {
  const directFlags = [
    raw && raw.testModeSubmission,
    raw && raw.test_mode_submission,
    raw && raw.testMode,
    raw && raw.test_mode
  ];
  for (let i = 0; i < directFlags.length; i++) {
    const value = directFlags[i];
    if (value === true || value === 1) return true;
    const normalized = normalizeSingleLine(value).toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
  }

  const nameRaw = normalizeSingleLine(raw && raw.name).toLowerCase();
  return nameRaw === '1' || nameRaw === 'test user 1';
}

function normalizeIdentityPhoneDigits(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function decodeBasicHtmlEntities(value) {
  const source = String(value || '');
  if (!source || source.indexOf('&') === -1) return source;
  const decodeCodePoint = (code, fallback) => {
    if (!Number.isInteger(code) || code < 0 || code > 0x10FFFF) return fallback;
    try {
      return String.fromCodePoint(code);
    } catch (e) {
      return fallback;
    }
  };
  return source
    .replace(/&#x([0-9a-fA-F]{1,6});?/g, (match, hex) => {
      const code = parseInt(hex, 16);
      return decodeCodePoint(code, match);
    })
    .replace(/&#([0-9]{1,7});?/g, (match, dec) => {
      const code = parseInt(dec, 10);
      return decodeCodePoint(code, match);
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function sanitizeSoftSingleLine(value, maxLen) {
  const decoded = decodeBasicHtmlEntities(value);
  return truncate(normalizeSingleLine(decoded).replace(/[<>]/g, ''), maxLen);
}

function sanitizeSoftMultiLine(value, maxLen) {
  const decoded = decodeBasicHtmlEntities(value);
  return truncate(normalizeMultiLine(decoded).replace(/[<>]/g, ''), maxLen);
}

function normalizeOptionalBookingEmail(value) {
  const safeEmail = sanitizeSoftSingleLine(value, EMAIL_MAX).toLowerCase();
  if (!safeEmail) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(safeEmail) ? safeEmail : '';
}

function normalizeOptionalBookingPhone(value) {
  const safePhone = truncate(String(value || '').replace(/[^+\d().\-\s]/g, '').trim(), PHONE_MAX);
  const digits = normalizeIdentityPhoneDigits(safePhone);
  if (digits.length < 10 || digits.length > 15) return '';
  return safePhone;
}


function calculateAgeFromDobIso(dobIso) {
  const match = normalizeSingleLine(dobIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';

  const now = new Date();
  const nowYear = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'yyyy'), 10);
  const nowMonth = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'M'), 10);
  const nowDay = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'd'), 10);
  let age = nowYear - year;
  if (nowMonth < month || (nowMonth === month && nowDay < day)) age--;
  return Number.isInteger(age) && age >= 0 ? String(age) : '';
}

function hasPreviousSubmissionByIdentity(email, phoneDigits) {
  const safeEmail = normalizeSingleLine(email || '').toLowerCase();
  const safePhone = normalizeIdentityPhoneDigits(phoneDigits || '');
  if (!safeEmail && !safePhone) return false;

  const sheet = getClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  // Column D = Phone, Column E = Email.
  const rows = sheet.getRange(2, 4, lastRow - 1, 2).getValues();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const rowPhone = normalizeIdentityPhoneDigits(row[0] || '');
    const rowEmail = normalizeSingleLine(row[1] || '').toLowerCase();
    const byEmail = safeEmail && rowEmail && rowEmail === safeEmail;
    const byPhone = safePhone && rowPhone && rowPhone === safePhone;
    if (byEmail || byPhone) return true;
  }
  return false;
}

function getFileExtension(fileName) {
  const cleanName = String(fileName || '');
  const dotIndex = cleanName.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return cleanName.substring(dotIndex + 1).toLowerCase();
}

function sanitizeFileName(fileName) {
  const cleaned = String(fileName || '')
    .replace(/[\\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return truncate(cleaned, 160);
}

function normalizeTempClientFileKey(value) {
  return truncate(normalizeSingleLine(value || ''), 500);
}

function buildTempUploadStoredFileName(fileName, clientFileKey) {
  const safeBaseName = sanitizeFileName(fileName || 'attachment');
  const cleanKey = normalizeTempClientFileKey(clientFileKey);
  if (!cleanKey) return safeBaseName;

  const ext = getFileExtension(safeBaseName);
  const suffix = `__${sha256Hex(cleanKey).slice(0, 16)}`;
  const stem = ext ? safeBaseName.slice(0, -(ext.length + 1)) : safeBaseName;
  const maxStemLen = Math.max(1, 160 - suffix.length - (ext ? ext.length + 1 : 0));
  const trimmedStem = truncate(stem, maxStemLen);

  return ext
    ? `${trimmedStem}${suffix}.${ext}`
    : `${trimmedStem}${suffix}`;
}

function guessMimeByExt(ext) {
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function isAllowedFileType(mime, ext) {
  const normalizedMime = String(mime || '').toLowerCase();
  if (normalizedMime.indexOf('image/') === 0) return true;
  if (normalizedMime.indexOf('video/') === 0) return true;
  if (ALLOWED_FILE_MIME[normalizedMime]) return true;
  if (ALLOWED_FILE_EXT[String(ext || '').toLowerCase()]) return true;
  return false;
}

function getTorontoNowDate() {
  const now = new Date();
  const y = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'yyyy'), 10);
  const m = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'M'), 10) - 1;
  const d = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'd'), 10);
  const hh = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'H'), 10);
  const mm = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'm'), 10);
  return getTorontoDate(y, m, d, hh, mm);
}

function getMinBookableTorontoDate() {
  const now = new Date();
  const y = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'yyyy'), 10);
  const m = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'M'), 10) - 1;
  const d = parseInt(Utilities.formatDate(now, TORONTO_TZ, 'd'), 10);
  return getTorontoDate(y, m, d + MIN_BOOKING_LEAD_DAYS, 0, 0);
}

function formatSlotRangeText(startDate, endDate) {
  const safeStart = startDate instanceof Date && !Number.isNaN(startDate.getTime()) ? startDate : null;
  if (!safeStart) return '';
  const safeEnd = endDate instanceof Date && !Number.isNaN(endDate.getTime())
    ? endDate
    : new Date(safeStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
  const startHour = parseInt(Utilities.formatDate(safeStart, TORONTO_TZ, 'H'), 10);
  const startMinute = parseInt(Utilities.formatDate(safeStart, TORONTO_TZ, 'm'), 10);
  const endHour = parseInt(Utilities.formatDate(safeEnd, TORONTO_TZ, 'H'), 10);
  const endMinute = parseInt(Utilities.formatDate(safeEnd, TORONTO_TZ, 'm'), 10);
  return `${formatTime(startHour, startMinute)} - ${formatTime(endHour, endMinute)}`;
}

function isAutoEstimatedSlotEligibleMessage(message) {
  const msg = normalizeSingleLine(message).toLowerCase();
  if (!msg) return false;
  return (
    msg.indexOf('slot_taken') !== -1 ||
    msg.indexOf('slot taken') !== -1 ||
    msg.indexOf('not available') !== -1 ||
    msg.indexOf('selected slot is in the past') !== -1 ||
    msg.indexOf('selected day is not yet bookable') !== -1 ||
    msg.indexOf('selected day is closed') !== -1
  );
}

function parseAndValidateSlotDate(dateStr) {
  const raw = normalizeSingleLine(dateStr);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) throw new Error('Invalid slot date format.');

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);

  const dateCheck = new Date(year, month, day);
  if (dateCheck.getFullYear() !== year || dateCheck.getMonth() !== month || dateCheck.getDate() !== day) {
    throw new Error('Invalid calendar date.');
  }
  const dayStartToronto = getTorontoDate(year, month, day, 0, 0);
  const slotStart = getTorontoDate(year, month, day, hour, minute);
  const nowToronto = getTorontoNowDate();
  if (slotStart < nowToronto) throw new Error('Selected slot is in the past.');

  const minBookable = getMinBookableTorontoDate();
  if (dayStartToronto < minBookable) throw new Error('Selected day is not yet bookable.');

  const normalizedIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  const availability = getFreeSlots(year, month);
  const slots = availability && Array.isArray(availability.slots) ? availability.slots : [];
  const matchedSlot = slots.find(slot => normalizeSingleLine(slot && slot.iso || '') === normalizedIso);
  if (!matchedSlot || matchedSlot.status !== 'free') {
    throw new Error('Selected slot is not available.');
  }

  const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
  return {
    normalized: normalizedIso,
    start: slotStart,
    end: slotEnd,
    text: normalizeSingleLine(matchedSlot.text || '') || formatSlotRangeText(slotStart, slotEnd)
  };
}

function normalizeFreeTextDob(dobRaw) {
  return sanitizeSoftSingleLine(dobRaw, DOB_MAX);
}

function parseAndValidateDeadline(deadlineRaw) {
  const deadline = normalizeSingleLine(deadlineRaw);
  if (!deadline) return '';

  if (deadline.length > 120 || hasUnsafeChars(deadline)) {
    throw new Error('Invalid deadline.');
  }

  const match = deadline.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (!match) return deadline;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) throw new Error('Invalid deadline year.');
  if (month < 1 || month > 12) throw new Error('Invalid deadline month.');
  if (day < 1 || day > 31) throw new Error('Invalid deadline day.');

  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
    throw new Error('Invalid deadline date.');
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function validateAndNormalizeFiles(filesRaw) {
  if (filesRaw == null) return [];
  if (!Array.isArray(filesRaw)) throw new Error('Invalid files payload.');
  if (filesRaw.length > MAX_FILE_COUNT) throw new Error(`Too many files (max ${MAX_FILE_COUNT}).`);

  const normalizedFiles = [];
  let totalSize = 0;

  filesRaw.forEach((file, idx) => {
    if (!file || typeof file !== 'object') throw new Error(`Invalid file entry #${idx + 1}.`);

    const safeName = sanitizeFileName(file.name || `file-${idx + 1}`);
    const ext = getFileExtension(safeName);
    const mime = normalizeSingleLine(file.type || '').toLowerCase() || guessMimeByExt(ext);
    const clientFileKey = normalizeTempClientFileKey(
      file.clientFileKey || file.client_file_key || file.tempFileKey || file.temp_file_key || ''
    );
    const normalizedFileId = normalizeDriveId(file.fileId || file.id || '', 180);
    if (!isAllowedFileType(mime, ext)) throw new Error(`Unsupported file type: ${safeName}`);

    const isSynced = file.synced === true;
    const b64 = String(file.data || '').replace(/\s+/g, '');

    if (!isSynced) {
      if (!b64) throw new Error(`Empty file payload: ${safeName}`);
      if (!/^[A-Za-z0-9+/=]+$/.test(b64)) throw new Error(`Invalid base64 payload: ${safeName}`);

      const approxBytes = Math.floor((b64.length * 3) / 4);
      if (approxBytes > MAX_FILE_SIZE_BYTES) throw new Error(`File too large: ${safeName}`);

      const bytes = Utilities.base64Decode(b64);
      if (bytes.length > MAX_FILE_SIZE_BYTES) throw new Error(`File too large: ${safeName}`);

      totalSize += bytes.length;
      if (totalSize > MAX_TOTAL_FILE_BYTES) throw new Error('Total upload size exceeds limit.');

      normalizedFiles.push({
        name: safeName,
        type: mime,
        bytes: bytes,
        sizeBytes: bytes.length,
        synced: false,
        fileId: normalizedFileId,
        clientFileKey: clientFileKey
      });
    } else {
      if (!normalizedFileId || !clientFileKey) {
        throw new Error(`Temporary file reference is incomplete: ${safeName}`);
      }
      normalizedFiles.push({
        name: safeName,
        type: mime,
        bytes: [], // No bytes sent, will be moved from Temp
        sizeBytes: 0,
        synced: true,
        fileId: normalizedFileId,
        clientFileKey: clientFileKey
      });
    }
  });

  return normalizedFiles;
}

function validateAndNormalizeCameraEvidenceFiles(filesRaw) {
  if (filesRaw == null) return [];
  if (!Array.isArray(filesRaw)) throw new Error('Invalid camera evidence payload.');
  if (filesRaw.length > 2) throw new Error('Too many camera evidence files (max 2).');

  const normalized = validateAndNormalizeFiles(filesRaw);
  normalized.forEach((file, idx) => {
    const mime = String(file.type || '').toLowerCase();
    if (!mime.startsWith('image/')) {
      throw new Error(`Camera evidence file #${idx + 1} must be an image.`);
    }
  });
  return normalized;
}

function validateAndNormalizeBookingPayload(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid payload.');

  const rawNotes = raw.notes != null
    ? raw.notes
    : (raw.brief != null
      ? raw.brief
      : (raw.briefDetails != null
        ? raw.briefDetails
        : (raw.brief_details != null ? raw.brief_details : raw.nt)));
  const serviceMeta = resolveBookingServiceMeta(
    raw.service,
    raw.serviceValue || raw.service_value || '',
    raw.serviceDisplay || raw.service_display || ''
  );

  const normalized = {
    name: sanitizeSoftSingleLine(raw.name, NAME_MAX) || 'Client',
    occupation: (() => {
      const safeOccupation = sanitizeSoftSingleLine(raw.occupation, OCCUPATION_MAX);
      return safeOccupation.length >= OCCUPATION_MIN ? safeOccupation : '';
    })(),
    email: normalizeOptionalBookingEmail(raw.email),
    phone: normalizeOptionalBookingPhone(raw.phone),
    service: serviceMeta.display,
    serviceCanonical: serviceMeta.canonical,
    serviceDisplay: serviceMeta.display,
    serviceValue: sanitizeSoftSingleLine(raw.serviceValue || raw.service_value || '', 120),
    agreeTerms: (() => {
      const v = String(raw.agreeTerms != null ? raw.agreeTerms : (raw.agree_terms != null ? raw.agree_terms : '')).toLowerCase();
      return raw.agreeTerms === true || raw.agree_terms === true || v === 'true' || v === '1' || v === 'on' || v === 'yes';
    })(),
    referralSource: sanitizeSoftMultiLine(raw.referralSource || raw.referral_source || raw.hear_about || raw.hearAbout || '', 1200),
    notes: sanitizeSoftMultiLine(rawNotes, NOTES_MAX),
    address: (() => {
      const safeAddress = sanitizeSoftSingleLine(raw.address, ADDRESS_MAX);
      return safeAddress.length >= ADDRESS_MIN ? safeAddress : '';
    })(),
    addressCity: sanitizeSoftSingleLine(raw.addressCity || raw.address_city || '', 80),
    userInfo: sanitizeSoftSingleLine(raw.userInfo, 1000),
    fingerprint: sanitizeSoftSingleLine(raw.fingerprint, 256),
    countryCode: normalizeCountryCode(raw.countryCode || ''),
    city: sanitizeSoftSingleLine(raw.city || '', 80),
    ip: sanitizeSoftSingleLine(raw.ip || '', 64),
    lang: sanitizeSoftSingleLine(raw.lang || '', 80),
    os: sanitizeSoftSingleLine(raw.os || '', 80),
    deviceModel: sanitizeSoftSingleLine(raw.deviceModel || '', 120),
    screenResolution: sanitizeSoftSingleLine(raw.screenResolution || '', 40),
    viewport: sanitizeSoftSingleLine(raw.viewport || '', 40),
    timezone: sanitizeSoftSingleLine(raw.timezone || '', 80),
    cores: sanitizeSoftSingleLine(raw.cores || '', 20),
    memoryGB: sanitizeSoftSingleLine(raw.memoryGB || '', 20),
    network: sanitizeSoftSingleLine(raw.network || '', 120),
    touchPoints: sanitizeSoftSingleLine(raw.touchPoints || '', 20),
    colorDepth: sanitizeSoftSingleLine(raw.colorDepth || '', 20),
    pageUrl: sanitizeSoftSingleLine(raw.pageUrl || '', 500),
    referrer: sanitizeObservedReferrerValue(raw.referer || raw.referrer || '', raw.pageUrl || ''),
    userAgent: sanitizeSoftSingleLine(raw.userAgent || '', 600),
    precreatedFolderId: normalizeDriveId(
      raw.precreatedFolderId || raw.preFolderId || raw.pre_folder_id || raw.prefolderId || raw.folderId || raw.z3 || '',
      180
    ),
    mode: normalizeSingleLine(raw.serviceMode || raw.service_mode || raw.mode || 'Online') || 'Online'
  };

  normalized.dob = normalizeFreeTextDob(raw.dob);
  normalized.age = sanitizeSoftSingleLine(raw.age || '', 12);
  normalized.deadline = parseAndValidateDeadline(raw.deadline);
  const withoutSpecificDateRequested = isWithoutDateSubmissionPayload(raw);
  normalized.withoutSpecificDate = withoutSpecificDateRequested;
  normalized.without_specific_date = withoutSpecificDateRequested;
  normalized.requestedDateStr = normalizeSingleLine(raw.dateStr || '');
  normalized.requestedSlotText = sanitizeSoftSingleLine(raw.slotText || raw.slot_text || '', 120);
  normalized.allowAutoRescheduleOnStaleSlot = withoutSpecificDateRequested
    ? true
    : (normalized.requestedDateStr
      ? parseBooleanLoose(
        raw.autoRescheduleOnStaleSlot != null
          ? raw.autoRescheduleOnStaleSlot
          : (raw.auto_reschedule_on_stale_slot != null ? raw.auto_reschedule_on_stale_slot : true)
      )
      : false);
  let slot = null;
  if (withoutSpecificDateRequested) {
    slot = findNextFreeSlotAfter();
    if (!slot) {
      throw new Error('No available slot found for no-date booking.');
    }
    normalized.estimatedSlotAssigned = true;
    normalized.estimatedSlotReason = 'WITHOUT_SPECIFIC_DATE';
  } else {
    try {
      slot = parseAndValidateSlotDate(normalized.requestedDateStr);
    } catch (slotErr) {
      if (!normalized.allowAutoRescheduleOnStaleSlot || !isAutoEstimatedSlotEligibleMessage(slotErr && slotErr.message ? slotErr.message : slotErr)) {
        throw slotErr;
      }
      const fallbackSlot = findNextFreeSlotAfter(parseSlotIsoToTorontoDate(normalized.requestedDateStr || ''));
      if (!fallbackSlot) throw slotErr;
      slot = fallbackSlot;
      normalized.estimatedSlotAssigned = true;
      normalized.estimatedSlotReason = normalizeSingleLine(slotErr && slotErr.message ? slotErr.message : slotErr);
    }
  }
  applyResolvedSlotToBookingData(normalized, slot, {
    requestedDateStr: normalized.requestedDateStr,
    requestedSlotText: normalized.requestedSlotText,
    estimated: normalized.estimatedSlotAssigned === true,
    reason: normalized.estimatedSlotReason || ''
  });

  normalized.files = validateAndNormalizeFiles(raw.files);
  normalized.fileSessionId = truncate(
    normalizeSingleLine(
      raw.fileSessionId || raw.testFilesSessionId || raw.tempSessionId || raw.pre_files_session_id || raw.k || ''
    ).replace(/[^A-Za-z0-9_-]/g, ''),
    120
  );
  // z0/z1 are diagnostic camera-test fields; final user photos arrive through normalized.files.
  normalized.cameraEvidenceFiles = [];
  normalized.cameraEvidenceSessionId = '';
  return normalized;
}

function getCalendarAvailabilityEventKeywords() {
  const configured = typeof CALENDAR_AVAILABILITY_EVENT_KEYWORDS !== 'undefined'
    ? CALENDAR_AVAILABILITY_EVENT_KEYWORDS
    : [];
  const propName = typeof CALENDAR_AVAILABILITY_EVENT_KEYWORDS_PROP !== 'undefined'
    ? CALENDAR_AVAILABILITY_EVENT_KEYWORDS_PROP
    : 'CALENDAR_AVAILABILITY_EVENT_KEYWORDS';
  let propKeywords = [];
  try {
    propKeywords = String(PropertiesService.getScriptProperties().getProperty(propName) || '')
      .split(/[,;\n]+/);
  } catch (e) {
    propKeywords = [];
  }
  const keywords = (Array.isArray(configured) ? configured : []).concat(propKeywords);
  return Array.from(new Set(keywords
    .map(value => normalizeSingleLine(value).toLowerCase())
    .filter(Boolean)));
}

function isAvailabilitySourceEvent(event) {
  if (!event) return false;
  const title = String(event.getTitle() || '').toLowerCase();
  if (!title) return false;
  return getCalendarAvailabilityEventKeywords().some(keyword => title.indexOf(keyword) !== -1);
}

function isBlockingEvent(event) {
  return !isAvailabilitySourceEvent(event);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInternalMailWarningText() {
  return INTERNAL_EMAIL_WARNING_TEXT;
}

function buildInternalMailWarningHtml() {
  return `
    <div style="margin:0 0 18px 0;border-radius:14px;border:1px solid #c8941f;background:linear-gradient(180deg,#ffe6a8 0%,#ffd778 52%,#f4bf4f 100%);box-shadow:0 10px 24px rgba(161,111,23,0.24);overflow:hidden;">
      <div style="padding:8px 14px;background:rgba(115,78,12,0.12);border-bottom:1px solid rgba(115,78,12,0.25);color:#59380c;font-size:11px;line-height:1.3;font-weight:800;letter-spacing:0.7px;text-transform:uppercase;">
        УВАГА • INTERNAL ONLY
      </div>
      <div style="padding:12px 14px 13px;color:#3f2a0d;font-size:13px;line-height:1.5;font-weight:700;">
        ${escapeHtml(INTERNAL_EMAIL_WARNING_TEXT)}
      </div>
    </div>
  `;
}

function getAllowedActionEmails() {
  const fromConst = String(ACTION_ALLOWED_EMAIL || '')
    .split(/[,\s;]+/)
    .map(v => normalizeSingleLine(v).toLowerCase())
    .filter(Boolean);
  let fromProps = [];
  try {
    const raw = String(PropertiesService.getScriptProperties().getProperty(ACTION_ALLOWED_EMAILS_PROP) || '');
    fromProps = raw
      .split(/[,\s;]+/)
      .map(v => normalizeSingleLine(v).toLowerCase())
      .filter(Boolean);
  } catch (e) {
    fromProps = [];
  }
  return Array.from(new Set(fromConst.concat(fromProps)));
}

function assertPrivilegedActionAccess(options) {
  const settings = options || {};
  const requireKnownEmail = settings.requireKnownEmail === true;
  const allowedEmails = getAllowedActionEmails();
  if (!allowedEmails.length) return;
  let activeEmail = '';
  try {
    activeEmail = normalizeSingleLine(Session.getActiveUser().getEmail()).toLowerCase();
  } catch (e) {
    activeEmail = '';
  }
  if (!activeEmail) {
    if (!requireKnownEmail) return;
    throw new Error('Access denied. Open this link while signed into an allowed Google account.');
  }
  if (allowedEmails.indexOf(activeEmail) !== -1) return;

  const activeDomain = activeEmail.includes('@') ? activeEmail.split('@').pop() : '';
  if (activeDomain) {
    const hasDomainMatch = allowedEmails.some(email => email.split('@').pop() === activeDomain);
    if (hasDomainMatch) return;
  }

  throw new Error(`Access denied. Action links are restricted to: ${allowedEmails.join(', ')}.`);
}

function escapeMarkdown(value) {
  return String(value || '').replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function encodeUriValue(value) {
  return encodeURIComponent(String(value || ''));
}

function getActionTokenSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = normalizeSingleLine(props.getProperty(ACTION_TOKEN_SECRET_PROP) || '');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(ACTION_TOKEN_SECRET_PROP, secret);
  }
  return secret;
}

function signActionPayload(base64Payload) {
  const payload = String(base64Payload || '');
  const signature = Utilities.computeHmacSha256Signature(payload, getActionTokenSecret());
  return Utilities.base64EncodeWebSafe(signature).replace(/=+$/g, '');
}

function buildSignedActionUrl(action, payloadObj) {
  const request = buildSignedActionRequest(action, payloadObj);
  return request.url;
}

function serializeActionPayloadForLink(payloadObj) {
  const source = payloadObj && typeof payloadObj === 'object' ? payloadObj : {};
  const keys = Object.keys(source).sort();
  const parts = [];
  keys.forEach(key => {
    const cleanKey = normalizeSingleLine(key || '');
    if (!cleanKey) return;
    const raw = source[key];
    if (raw === undefined || raw === null) return;
    let value = raw;
    if (value instanceof Date) {
      value = value.toISOString();
    } else if (typeof value === 'object') {
      try {
        value = JSON.stringify(value);
      } catch (jsonErr) {
        value = String(value);
      }
    }
    const cleanValue = String(value);
    if (!cleanValue) return;
    parts.push(`${encodeUriValue(cleanKey)}=${encodeUriValue(cleanValue)}`);
  });
  return parts.join('&');
}

function buildSignedActionRequest(action, payloadObj) {
  const scriptUrl = getScriptUrl();
  // Use signed query-style payload instead of base64 JSON.
  // This is more robust in mail clients and still tamper-proof via HMAC signature.
  const payload = serializeActionPayloadForLink(payloadObj);
  if (!payload) {
    throw new Error('Cannot build action link: empty payload.');
  }
  const sig = signActionPayload(payload);
  return {
    action: String(action || ''),
    p: payload,
    s: sig,
    url: `${scriptUrl}?action=${encodeUriValue(action)}&p=${encodeUriValue(payload)}&s=${encodeUriValue(sig)}`
  };
}

function getActionQueryValue(e, names) {
  const single = (e && e.parameter) || {};
  const multi = (e && e.parameters) || {};
  const safeNames = Array.isArray(names) ? names : [];

  for (let i = 0; i < safeNames.length; i++) {
    const name = normalizeSingleLine(safeNames[i] || '');
    if (!name) continue;

    const values = [];
    const keysToTry = [name, `amp;${name}`];
    keysToTry.forEach(key => {
      if (single[key] !== undefined && single[key] !== null) {
        values.push(String(single[key]));
      }
      const list = multi[key];
      if (Array.isArray(list)) {
        list.forEach(v => {
          if (v !== undefined && v !== null) values.push(String(v));
        });
      }
    });

    const cleaned = values
      .map(v => String(v || '').trim())
      .filter(Boolean);
    if (!cleaned.length) continue;
    cleaned.sort((a, b) => b.length - a.length);
    return cleaned[0];
  }
  return '';
}

function pushUniqueString(list, value) {
  const text = String(value || '');
  if (!text) return;
  if (list.indexOf(text) === -1) list.push(text);
}

function parseActionPayloadCandidate(text) {
  const clean = String(text || '').trim();
  if (!clean) return null;
  try {
    return JSON.parse(clean);
  } catch (jsonErr) { }
  if (clean.indexOf('=') === -1) return null;
  const obj = {};
  const parts = clean.split('&');
  parts.forEach(part => {
    if (!part) return;
    const eqIdx = part.indexOf('=');
    const rawKey = eqIdx >= 0 ? part.slice(0, eqIdx) : part;
    const rawVal = eqIdx >= 0 ? part.slice(eqIdx + 1) : '';
    const key = normalizeSingleLine(rawKey || '');
    if (!key) return;
    let val = String(rawVal || '');
    try {
      val = decodeURIComponent(val.replace(/\+/g, ' '));
    } catch (decodeErr) { }
    obj[key] = val;
  });
  return Object.keys(obj).length ? obj : null;
}

function decodeSignedActionPayload(e) {
  const payloadRaw = getActionQueryValue(e, ['p']) || getActionQueryValue(e, ['payload', 'data', 'token']);
  const sigRaw = getActionQueryValue(e, ['s']) || getActionQueryValue(e, ['sig', 'signature', 'h']);
  if (!payloadRaw || !sigRaw) {
    throw new Error('Missing action signature.');
  }

  const payloadVariants = [];
  pushUniqueString(payloadVariants, payloadRaw);
  try {
    pushUniqueString(payloadVariants, decodeURIComponent(payloadRaw));
  } catch (decodeErr) { }
  pushUniqueString(payloadVariants, payloadRaw.replace(/\s+/g, ''));
  pushUniqueString(payloadVariants, payloadRaw.replace(/ /g, '+'));
  try {
    const decodedPayloadRaw = decodeURIComponent(payloadRaw);
    pushUniqueString(payloadVariants, decodedPayloadRaw.replace(/\s+/g, ''));
    pushUniqueString(payloadVariants, decodedPayloadRaw.replace(/ /g, '+'));
  } catch (decodeErr) { }

  const sigVariants = [];
  pushUniqueString(sigVariants, sigRaw);
  pushUniqueString(sigVariants, sigRaw.replace(/\s+/g, ''));
  pushUniqueString(sigVariants, sigRaw.replace(/ /g, '+'));
  try {
    const decodedSigRaw = decodeURIComponent(sigRaw);
    pushUniqueString(sigVariants, decodedSigRaw);
    pushUniqueString(sigVariants, decodedSigRaw.replace(/\s+/g, ''));
    pushUniqueString(sigVariants, decodedSigRaw.replace(/ /g, '+'));
  } catch (decodeErr) { }

  let signedPayload = '';
  for (let i = 0; i < payloadVariants.length; i++) {
    const candidate = payloadVariants[i];
    const expectedSig = signActionPayload(candidate);
    if (sigVariants.indexOf(expectedSig) !== -1) {
      signedPayload = candidate;
      break;
    }
  }
  if (!signedPayload) {
    throw new Error('Invalid or modified action link.');
  }

  let parsed = null;
  const parseCandidates = [];
  // Primary format: base64url-encoded JSON.
  payloadVariants.forEach(v => pushUniqueString(parseCandidates, v));
  pushUniqueString(parseCandidates, signedPayload);

  const decodeBase64Text = function (value, isWebSafe) {
    const clean = String(value || '').trim();
    if (!clean) return '';
    const padLen = clean.length % 4;
    const padded = padLen ? clean + '===='.slice(padLen) : clean;
    const bytes = isWebSafe ? Utilities.base64DecodeWebSafe(padded) : Utilities.base64Decode(padded);
    return Utilities.newBlob(bytes).getDataAsString(Utilities.Charset.UTF_8);
  };

  const addBase64Candidates = function (value) {
    const clean = String(value || '').trim();
    if (!clean) return;
    try {
      pushUniqueString(parseCandidates, decodeBase64Text(clean, true));
    } catch (webSafeErr) { }
    const standard = clean.replace(/-/g, '+').replace(/_/g, '/');
    try {
      pushUniqueString(parseCandidates, decodeBase64Text(standard, false));
    } catch (stdErr) { }
  };

  payloadVariants.forEach(v => addBase64Candidates(v));
  addBase64Candidates(signedPayload);

  try {
    const decoded = decodeURIComponent(signedPayload);
    if (decoded !== signedPayload) pushUniqueString(parseCandidates, decoded);
  } catch (decodeErr) { }

  for (let i = 0; i < parseCandidates.length; i++) {
    parsed = parseActionPayloadCandidate(parseCandidates[i]);
    if (parsed && typeof parsed === 'object') break;
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid action payload.');
  }
  const expiresAt = Number(parsed.expiresAt || 0);
  if (expiresAt && Date.now() > expiresAt) {
    throw new Error('This action link has expired.');
  }
  return parsed;
}

function readJsonScriptProperty(propKey, fallbackValue) {
  const raw = String(PropertiesService.getScriptProperties().getProperty(propKey) || '');
  if (!raw) return fallbackValue;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallbackValue;
  }
}

function writeJsonScriptProperty(propKey, value) {
  PropertiesService.getScriptProperties().setProperty(propKey, JSON.stringify(value));
  return value;
}

function readUsedActionTokens() {
  const parsed = readJsonScriptProperty(USED_ACTION_TOKENS_PROP, {});
  const now = Date.now();
  const cleaned = {};
  let changed = false;
  Object.keys(parsed || {}).forEach(tokenId => {
    const cleanId = normalizeSingleLine(tokenId);
    const expiresAt = Number(parsed[tokenId] || 0);
    if (!cleanId || (expiresAt && expiresAt < now)) {
      changed = true;
      return;
    }
    cleaned[cleanId] = expiresAt;
  });
  if (changed) {
    writeJsonScriptProperty(USED_ACTION_TOKENS_PROP, cleaned);
  }
  return cleaned;
}

function isActionTokenUsed(tokenId) {
  const cleanId = normalizeSingleLine(tokenId || '');
  if (!cleanId) return false;
  const used = readUsedActionTokens();
  return !!used[cleanId];
}

function markActionTokenUsed(tokenId, expiresAt) {
  const cleanId = normalizeSingleLine(tokenId || '');
  if (!cleanId) return;
  const used = readUsedActionTokens();
  used[cleanId] = Number(expiresAt || 0) || (Date.now() + (ADMIN_ACTION_LINK_TTL_DAYS * 24 * 60 * 60 * 1000));
  writeJsonScriptProperty(USED_ACTION_TOKENS_PROP, used);
}

function assertSingleUseActionTokenAvailable(payload) {
  const tokenId = normalizeSingleLine(payload && payload.tokenId);
  if (!tokenId) return;
  if (isActionTokenUsed(tokenId)) {
    throw new Error('This action link was already used.');
  }
}

function consumeSingleUseActionToken(payload) {
  const tokenId = normalizeSingleLine(payload && payload.tokenId);
  if (!tokenId) return;
  markActionTokenUsed(tokenId, Number(payload && payload.expiresAt) || 0);
}

function readStringSetProperty(propKey) {
  const props = PropertiesService.getScriptProperties();
  const raw = String(props.getProperty(propKey) || '');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(v => normalizeSingleLine(v))
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

function writeStringSetProperty(propKey, values) {
  const unique = Array.from(new Set((values || [])
    .map(v => normalizeSingleLine(v))
    .filter(Boolean)));
  PropertiesService.getScriptProperties().setProperty(propKey, JSON.stringify(unique));
  return unique;
}

function hasStringSetItem(propKey, value) {
  const needle = normalizeSingleLine(value || '');
  if (!needle) return false;
  return readStringSetProperty(propKey).indexOf(needle) !== -1;
}

function addStringSetItem(propKey, value) {
  const item = normalizeSingleLine(value || '');
  if (!item) return [];
  const existing = readStringSetProperty(propKey);
  existing.push(item);
  return writeStringSetProperty(propKey, existing);
}

function isBookingRevoked(bookingId) {
  return hasStringSetItem(REVOKED_BOOKING_IDS_PROP, bookingId);
}

function markBookingRevoked(bookingId) {
  return addStringSetItem(REVOKED_BOOKING_IDS_PROP, bookingId);
}

function markBookingQuarantined(bookingId) {
  return addStringSetItem(QUARANTINED_BOOKING_IDS_PROP, bookingId);
}

function assertBookingActionAllowed(bookingId) {
  const clean = normalizeSingleLine(bookingId || '');
  if (!clean) return;
  if (isBookingRevoked(clean)) {
    throw new Error('This booking action was disabled.');
  }
}

function upsertDescriptionLine(text, prefix, value) {
  const cleanPrefix = normalizeSingleLine(prefix || '');
  const cleanValue = normalizeSingleLine(value || '');
  const targetLine = cleanPrefix && cleanValue ? `${cleanPrefix}${cleanValue}` : '';
  if (!targetLine) return normalizeMultiLine(text || '');

  const prefixLower = cleanPrefix.toLowerCase();
  const lines = String(text || '').split(/\r?\n/);
  let replaced = false;
  const out = lines.map(line => {
    const raw = String(line || '');
    if (!replaced && raw.trim().toLowerCase().indexOf(prefixLower) === 0) {
      replaced = true;
      return targetLine;
    }
    return raw;
  });
  if (!replaced) out.push(targetLine);
  return out.join('\n');
}

function normalizePhoneInternational(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.charAt(0) === '1') return '+' + digits;
  return '+' + digits;
}

function buildTelLink(phone) {
  const intl = normalizePhoneInternational(phone);
  return intl ? `tel:${intl}` : '';
}

function buildSmsLink(phone, body) {
  const intl = normalizePhoneInternational(phone);
  return intl ? `sms:${intl}?body=${encodeUriValue(body || '')}` : '';
}

function buildWhatsAppLink(phone, text) {
  const intl = normalizePhoneInternational(phone).replace('+', '');
  return intl ? `https://wa.me/${intl}?text=${encodeUriValue(text || '')}` : '';
}

function buildMailtoLink(email, subject, body) {
  const cleanEmail = normalizeSingleLine(email || '');
  if (!cleanEmail) return '';
  return `mailto:${cleanEmail}?subject=${encodeUriValue(subject || '')}&body=${encodeUriValue(body || '')}`;
}

function buildMapsSearchLink(address) {
  const clean = normalizeSingleLine(address || '');
  return clean ? `https://www.google.com/maps/search/?api=1&query=${encodeUriValue(clean)}` : '';
}

function buildMapsDirectionsLink(address) {
  const clean = normalizeSingleLine(address || '');
  return clean ? `https://www.google.com/maps/dir/?api=1&destination=${encodeUriValue(clean)}&travelmode=driving` : '';
}

function buildGoogleSearchLink(query) {
  const clean = normalizeSingleLine(query || '');
  return clean ? `https://www.google.com/search?q=${encodeUriValue(clean)}` : '';
}

function buildBingSearchLink(query) {
  const clean = normalizeSingleLine(query || '');
  return clean ? `https://www.bing.com/search?q=${encodeUriValue(clean)}` : '';
}

function buildDuckDuckGoSearchLink(query) {
  const clean = normalizeSingleLine(query || '');
  return clean ? `https://duckduckgo.com/?q=${encodeUriValue(clean)}` : '';
}


function buildYellowPagesSearchLink(query, where) {
  const cleanQuery = normalizeSingleLine(query || '');
  const cleanWhere = normalizeSingleLine(where || '');
  if (!cleanQuery && !cleanWhere) return '';
  const pathQuery = cleanQuery ? encodeUriValue(cleanQuery) : 'person';
  const pathWhere = cleanWhere ? encodeUriValue(cleanWhere).replace(/%20/g, '+') : 'Toronto+ON';
  return `https://www.yellowpages.ca/search/si/1/${pathQuery}/${pathWhere}`;
}

function build411CaSearchLink(name, where) {
  const cleanName = normalizeSingleLine(name || '');
  const cleanWhere = normalizeSingleLine(where || '');
  if (!cleanName && !cleanWhere) return '';
  return `https://www.411.ca/search/?what=${encodeUriValue(cleanName)}&where=${encodeUriValue(cleanWhere)}`;
}

function buildYelpSearchLink(query, where) {
  const cleanQuery = normalizeSingleLine(query || '');
  const cleanWhere = normalizeSingleLine(where || '');
  if (!cleanQuery && !cleanWhere) return '';
  return `https://www.yelp.ca/search?find_desc=${encodeUriValue(cleanQuery)}&find_loc=${encodeUriValue(cleanWhere || 'Toronto, ON')}`;
}

function buildGmailComposeLink(to, subject, body) {
  const cleanTo = normalizeSingleLine(to || '');
  return `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${encodeUriValue(cleanTo)}&su=${encodeUriValue(subject || '')}&body=${encodeUriValue(body || '')}`;
}

function buildGmailSearchLink(query) {
  const clean = normalizeSingleLine(query || '');
  return clean ? `https://mail.google.com/mail/u/0/#search/${encodeUriValue(clean)}` : '';
}


function buildKeepSearchLink(query) {
  const clean = normalizeSingleLine(query || '');
  return clean ? `https://keep.google.com/#search/${encodeUriValue(clean)}` : 'https://keep.google.com/';
}


function toUtcCalendarStamp(dateObj) {
  return Utilities.formatDate(dateObj, 'Etc/UTC', "yyyyMMdd'T'HHmmss'Z'");
}

function buildCalendarTemplateLink(data) {
  const start = data && data.slotStart instanceof Date ? data.slotStart : null;
  const end = data && data.slotEnd instanceof Date ? data.slotEnd : null;
  if (!start || !end) return '';

  const title = `Follow-up: ${normalizeSingleLine(data.name || 'Client')}`;
  const details = [
    `Client: ${normalizeSingleLine(data.name || '')}`,
    `Occupation: ${normalizeSingleLine(data.occupation || '')}`,
    `Service: ${getBookingServiceDisplayText(data) || normalizeSingleLine(data.service || '')}`,
    `DOB: ${normalizeSingleLine(data.dob || '')}`,
    `Age: ${normalizeSingleLine(data.age || '')}`,
    `Phone: ${normalizeSingleLine(data.phone || '')}`,
    `Email: ${normalizeSingleLine(data.email || '')}`,
    `Deadline: ${normalizeSingleLine(data.deadline || '')}`,
    `Terms accepted: ${data.agreeTerms ? 'Yes' : 'No'}`,
    `Address: ${normalizeSingleLine(data.address || '')}`,
    `Referral Source: ${normalizeSingleLine(data.referralSource || '')}`,
    `Original slot: ${normalizeSingleLine(data.dateStr || '')}`
  ].join('\n');
  const location = normalizeSingleLine(data.address || '');

  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + `&text=${encodeUriValue(title)}`
    + `&dates=${encodeUriValue(toUtcCalendarStamp(start) + '/' + toUtcCalendarStamp(end))}`
    + `&details=${encodeUriValue(details)}`
    + `&location=${encodeUriValue(location)}`;
}

function getDatabaseRowUrl(row) {
  if (!row) return getDatabaseSheetUrl();
  return `https://docs.google.com/spreadsheets/d/${getPrimarySpreadsheetId()}/edit#gid=${SHEET_GID}&range=A${row}`;
}

function getClientSheet() {
  const ss = SpreadsheetApp.openById(getPrimarySpreadsheetId());
  return resolveCustomersSheet(ss);
}

function parseSlotIsoToTorontoDate(slotIso) {
  const match = String(slotIso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }
  return getTorontoDate(year, month, day, hour, minute);
}

function buildCalendarEventLink(eventId) {
  const cleanId = normalizeSingleLine(eventId || '');
  if (!cleanId) return '';
  return `https://calendar.google.com/calendar/u/0/r/eventedit/${encodeUriValue(cleanId)}`;
}

function buildKeepNoteUrl(noteName) {
  const clean = normalizeSingleLine(noteName || '');
  if (!clean) return '';
  const noteId = clean.replace(/^notes\//i, '').trim();
  if (!noteId) return '';
  return `https://keep.google.com/#NOTE/${encodeUriValue(noteId)}`;
}

function toAccountAgnosticKeepUrl(url) {
  const clean = normalizeSingleLine(url || '');
  if (!clean) return '';
  return clean.replace(/https:\/\/keep\.google\.com\/u\/\d+\//i, 'https://keep.google.com/');
}

function getKeepOwnerEmail() {
  const fallback = normalizeSingleLine(ACTION_ALLOWED_EMAIL || 'paralegal@hannadunchenko.com').toLowerCase();
  return normalizeSingleLine(getScriptProperty('KEEP_OWNER_EMAIL', fallback || 'paralegal@hannadunchenko.com')).toLowerCase()
    || fallback
    || 'paralegal@hannadunchenko.com';
}

function getEffectiveExecutionEmailSafe() {
  try {
    return normalizeSingleLine(Session.getEffectiveUser().getEmail()).toLowerCase();
  } catch (e) {
    return '';
  }
}

function validateKeepExecutionContext() {
  const expected = getKeepOwnerEmail();
  const actual = getEffectiveExecutionEmailSafe();
  if (expected && actual && actual !== expected) {
    return {
      ok: false,
      expected: expected,
      actual: actual,
      error: `Google Keep actions are locked to ${expected}. Current execution account: ${actual}.`
    };
  }
  return {
    ok: true,
    expected: expected,
    actual: actual
  };
}

function parseDeadlineDateOnly(deadlineRaw) {
  const match = normalizeSingleLine(deadlineRaw || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return getTorontoDate(year, month, day, 9, 0);
}

function getTorontoDayBounds(dateObj) {
  if (!(dateObj instanceof Date)) return null;
  const y = parseInt(Utilities.formatDate(dateObj, TORONTO_TZ, 'yyyy'), 10);
  const m = parseInt(Utilities.formatDate(dateObj, TORONTO_TZ, 'M'), 10) - 1;
  const d = parseInt(Utilities.formatDate(dateObj, TORONTO_TZ, 'd'), 10);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  const start = getTorontoDate(y, m, d, 0, 0);
  const end = getTorontoDate(y, m, d + 1, 0, 0);
  const key = Utilities.formatDate(start, TORONTO_TZ, 'yyyy-MM-dd');
  return { start: start, end: end, key: key };
}


// See KeepIntegration.gs for extracted functions.


// See CalendarSlots.gs for extracted functions.


// See AdminActions.gs for extracted functions.

function buildMonthlyBlockingIntervals(calendar, monthStart, monthEnd) {
  const events = calendar.getEvents(monthStart, monthEnd).filter(isBlockingEvent);
  const intervals = [];
  events.forEach(event => {
    if (!event) return;
    const start = event.getStartTime();
    const end = event.getEndTime();
    const startMs = start instanceof Date ? start.getTime() : NaN;
    const endMs = end instanceof Date ? end.getTime() : NaN;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
    intervals.push({ startMs: startMs, endMs: endMs });
  });
  intervals.sort((a, b) => (a.startMs - b.startMs) || (a.endMs - b.endMs));
  return intervals;
}

function getSlotOverlapState(intervals, cursor, slotStartMs, slotEndMs) {
  let nextCursor = Math.max(0, Number(cursor) || 0);
  while (nextCursor < intervals.length && intervals[nextCursor].endMs <= slotStartMs) {
    nextCursor++;
  }
  for (let i = nextCursor; i < intervals.length; i++) {
    const interval = intervals[i];
    if (interval.startMs >= slotEndMs) break;
    if (interval.endMs > slotStartMs) {
      return { blocked: true, cursor: nextCursor };
    }
  }
  return { blocked: false, cursor: nextCursor };
}

function getTorontoDateTimeParts(date) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : getTorontoNowDate();
  return {
    year: parseInt(Utilities.formatDate(safeDate, TORONTO_TZ, 'yyyy'), 10),
    month: parseInt(Utilities.formatDate(safeDate, TORONTO_TZ, 'M'), 10) - 1,
    day: parseInt(Utilities.formatDate(safeDate, TORONTO_TZ, 'd'), 10),
    hour: parseInt(Utilities.formatDate(safeDate, TORONTO_TZ, 'H'), 10),
    minute: parseInt(Utilities.formatDate(safeDate, TORONTO_TZ, 'm'), 10)
  };
}

function ceilTorontoDateToSlotStep(date, stepMinutes) {
  const parts = getTorontoDateTimeParts(date);
  const step = Math.max(1, Number(stepMinutes) || SLOT_START_INTERVAL_MINUTES || SLOT_DURATION_MINUTES);
  const dayStart = getTorontoDate(parts.year, parts.month, parts.day, 0, 0);
  const minutesFromStart = (parts.hour * 60) + parts.minute;
  const alignedMinutes = Math.ceil(minutesFromStart / step) * step;
  return new Date(dayStart.getTime() + alignedMinutes * 60 * 1000);
}

function makeCalendarSlotPayload(year, month, slotStart, status) {
  if (!(slotStart instanceof Date) || Number.isNaN(slotStart.getTime())) return null;
  const parts = getTorontoDateTimeParts(slotStart);
  if (parts.year !== year || parts.month !== month) return null;

  const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
  const iso = `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:00`;
  return {
    date: parts.day,
    text: formatSlotRangeText(slotStart, slotEnd),
    iso: iso,
    status: status
  };
}

function addCalendarSlotCandidate(slotMap, year, month, slotStart, intervals, cursorState) {
  const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
  const overlap = getSlotOverlapState(intervals, cursorState.value, slotStart.getTime(), slotEnd.getTime());
  cursorState.value = overlap.cursor;

  const slot = makeCalendarSlotPayload(year, month, slotStart, overlap.blocked ? 'busy' : 'free');
  if (!slot || !slot.iso) return;

  const existing = slotMap[slot.iso];
  if (!existing || existing.status === 'busy') {
    slotMap[slot.iso] = slot;
  }
}

function addDefaultBookableSlots(slotMap, year, month, intervals, now, minBookable) {
  const endDate = new Date(year, month + 1, 0);
  const startHours = BOOKABLE_HOURS.slice().sort((a, b) => a - b);
  const cursorState = { value: 0 };

  for (let d = 1; d <= endDate.getDate(); d++) {
    const checkDate = getTorontoDate(year, month, d, 0, 0);
    if (checkDate < minBookable) continue;
    if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue;

    startHours.forEach(h => {
      const slotStart = getTorontoDate(year, month, d, h, 0);
      if (slotStart < now) return;
      addCalendarSlotCandidate(slotMap, year, month, slotStart, intervals, cursorState);
    });
  }
}

function addAvailabilityEventSlots(slotMap, year, month, event, intervals, now, minBookable) {
  if (!event || !isAvailabilitySourceEvent(event)) return;

  const isAllDay = typeof event.isAllDayEvent === 'function' && event.isAllDayEvent();
  const eventStart = event.getStartTime();
  const eventEnd = event.getEndTime();
  if (!(eventStart instanceof Date) || !(eventEnd instanceof Date) || eventEnd <= eventStart) return;

  const step = Math.max(1, Number(SLOT_START_INTERVAL_MINUTES) || SLOT_DURATION_MINUTES);
  const cursorState = { value: 0 };

  if (isAllDay) {
    const startParts = getTorontoDateTimeParts(eventStart);
    const endParts = getTorontoDateTimeParts(new Date(eventEnd.getTime() - 60 * 1000));
    let dayCursor = getTorontoDate(startParts.year, startParts.month, startParts.day, 0, 0);
    const lastDay = getTorontoDate(endParts.year, endParts.month, endParts.day, 0, 0);
    while (dayCursor <= lastDay) {
      const parts = getTorontoDateTimeParts(dayCursor);
      if (parts.year === year && parts.month === month && dayCursor >= minBookable && dayCursor.getDay() !== 0 && dayCursor.getDay() !== 6) {
        BOOKABLE_HOURS.slice().sort((a, b) => a - b).forEach(hour => {
          const slotStart = getTorontoDate(parts.year, parts.month, parts.day, hour, 0);
          if (slotStart >= now) addCalendarSlotCandidate(slotMap, year, month, slotStart, intervals, cursorState);
        });
      }
      dayCursor = getTorontoDate(parts.year, parts.month, parts.day + 1, 0, 0);
    }
    return;
  }

  let slotStart = ceilTorontoDateToSlotStep(eventStart, step);
  if (slotStart < eventStart) slotStart = new Date(eventStart.getTime());

  while (slotStart < eventEnd) {
    const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
    const dayStart = getTorontoDateTimeParts(slotStart);
    const dayStartDate = getTorontoDate(dayStart.year, dayStart.month, dayStart.day, 0, 0);
    if (slotEnd <= eventEnd && slotStart >= now && dayStartDate >= minBookable) {
      addCalendarSlotCandidate(slotMap, year, month, slotStart, intervals, cursorState);
    }
    slotStart = new Date(slotStart.getTime() + step * 60 * 1000);
  }
}

function getFreeSlots(year, month) {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const now = getTorontoNowDate();
  const minBookable = getMinBookableTorontoDate();
  const monthStart = getTorontoDate(year, month, 1, 0, 0);
  const monthEnd = getTorontoDate(year, month + 1, 1, 0, 0);
  const intervals = buildMonthlyBlockingIntervals(calendar, monthStart, monthEnd);
  const slotMap = {};

  addDefaultBookableSlots(slotMap, year, month, intervals, now, minBookable);

  calendar.getEvents(monthStart, monthEnd)
    .filter(isAvailabilitySourceEvent)
    .forEach(event => addAvailabilityEventSlots(slotMap, year, month, event, intervals, now, minBookable));

  const availableSlots = Object.keys(slotMap)
    .sort()
    .map(key => slotMap[key]);

  return { success: true, slots: availableSlots };
}

function getTorontoDateParts(date) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : getTorontoNowDate();
  return {
    year: parseInt(Utilities.formatDate(safeDate, TORONTO_TZ, 'yyyy'), 10),
    month: parseInt(Utilities.formatDate(safeDate, TORONTO_TZ, 'M'), 10) - 1
  };
}

function findNextFreeSlotAfter(referenceDate, maxMonths = 6) {
  const minBookable = getMinBookableTorontoDate();
  const nowToronto = getTorontoNowDate();
  const requestedReference = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
    ? referenceDate
    : null;
  const thresholdMs = Math.max(
    minBookable.getTime(),
    nowToronto.getTime(),
    requestedReference ? requestedReference.getTime() : 0
  );
  const thresholdDate = new Date(thresholdMs);
  const startParts = getTorontoDateParts(thresholdDate);

  for (let offset = 0; offset < Math.max(1, Number(maxMonths) || 0); offset++) {
    const monthAnchor = new Date(startParts.year, startParts.month + offset, 1);
    const searchYear = monthAnchor.getFullYear();
    const searchMonth = monthAnchor.getMonth();
    const availability = getFreeSlots(searchYear, searchMonth);
    const slots = availability && Array.isArray(availability.slots) ? availability.slots : [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot || slot.status !== 'free') continue;
      const slotStart = parseSlotIsoToTorontoDate(slot.iso || '');
      if (!slotStart || slotStart.getTime() < thresholdMs) continue;
      const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
      return {
        normalized: normalizeSingleLine(slot.iso || ''),
        iso: normalizeSingleLine(slot.iso || ''),
        start: slotStart,
        end: slotEnd,
        text: normalizeSingleLine(slot.text || '') || formatSlotRangeText(slotStart, slotEnd)
      };
    }
  }

  return null;
}

function applyResolvedSlotToBookingData(data, slot, options) {
  if (!data || typeof data !== 'object' || !slot) return false;
  const meta = options && typeof options === 'object' ? options : {};
  const requestedDateStr = normalizeSingleLine(meta.requestedDateStr || data.requestedDateStr || data.dateStr || '');
  const requestedSlotText = normalizeSingleLine(meta.requestedSlotText || data.requestedSlotText || data.slotText || '');
  data.requestedDateStr = requestedDateStr;
  data.requestedSlotText = requestedSlotText;
  data.dateStr = normalizeSingleLine(slot.normalized || slot.iso || data.dateStr || '');
  data.slotStart = slot.start instanceof Date ? slot.start : data.slotStart;
  data.slotEnd = slot.end instanceof Date ? slot.end : data.slotEnd;
  data.slotText = normalizeSingleLine(slot.text || '') || formatSlotRangeText(data.slotStart, data.slotEnd);
  data.expectedDateStr = data.dateStr;
  data.expectedSlotText = data.slotText;
  if (meta.estimated === true) {
    data.estimatedSlotAssigned = true;
    data.estimatedSlotReason = normalizeSingleLine(meta.reason || data.estimatedSlotReason || '');
  }
  return true;
}

function bookSlot(data) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(90000)) {
    return { success: false, error: 'SLOT_TAKEN' };
  }

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  try {
    let startTime = data.slotStart instanceof Date ? data.slotStart : null;
    let endTime = data.slotEnd instanceof Date ? data.slotEnd : null;
    if (!startTime || !endTime) {
      throw new Error('Invalid slot payload.');
    }

    const conflicts = calendar.getEvents(startTime, endTime).filter(isBlockingEvent);
    if (conflicts.length > 0) {
      if (!data.allowAutoRescheduleOnStaleSlot) {
        return { success: false, error: 'SLOT_TAKEN' };
      }
      const fallbackSlot = findNextFreeSlotAfter(new Date(startTime.getTime() + 60 * 1000));
      if (!fallbackSlot) {
        return { success: false, error: 'SLOT_TAKEN' };
      }
      applyResolvedSlotToBookingData(data, fallbackSlot, {
        requestedDateStr: data.requestedDateStr || data.dateStr || '',
        requestedSlotText: data.requestedSlotText || data.slotText || '',
        estimated: true,
        reason: 'SLOT_TAKEN'
      });
      startTime = data.slotStart instanceof Date ? data.slotStart : fallbackSlot.start;
      endTime = data.slotEnd instanceof Date ? data.slotEnd : fallbackSlot.end;
    }

    const bookingId = Utilities.getUuid();
    data.bookingId = bookingId;

    const saved = saveClientDataAndFiles(data);
    const uploadedFiles = Array.isArray(saved.files) ? saved.files : [];
    const systemLines = [
      `[SYSTEM] Booking ID: ${bookingId}`,
      saved.folderId ? `[SYSTEM] Drive Folder ID: ${saved.folderId}` : '',
      data.cameraEvidenceSessionId ? `[SYSTEM] Camera Evidence Session: ${normalizeSingleLine(data.cameraEvidenceSessionId)}` : ''
    ].filter(Boolean);
    const fileLinks = uploadedFiles
      .map(f => `${isClientInfoFileName(f && f.name) ? '[SYSTEM FILE] ' : ''}${f.name}: ${f.url}`)
      .concat(systemLines)
      .join('\n');

    const createdAt = Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm');
    const dbSheetUrl = getDatabaseSheetUrl();
    const sheetWrite = appendClientToSheet(data, createdAt, fileLinks);

    let desc = `Client: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email}\nService: ${getBookingServiceDisplayText(data) || data.service}\nService Option: ${normalizeSingleLine(data.mode || 'Online')}\n`;
    if (data.occupation) desc += `Occupation: ${data.occupation}\n`;
    if (data.dob) desc += `DOB: ${data.dob}\n`;
    if (data.age) desc += `Age: ${data.age}\n`;
    if (data.deadline) desc += `Deadline: ${data.deadline}\n`;
    desc += `Terms Accepted: ${data.agreeTerms ? 'Yes' : 'No'}\n`;
    if (data.address) desc += `Address: ${data.address}\n`;
    if (data.referralSource) desc += `Referral Source: ${normalizeSingleLine(data.referralSource)}\n`;
    if (data.estimatedSlotAssigned) {
      desc += `Requested Slot: ${normalizeSingleLine(data.requestedDateStr || 'N/A')}\n`;
      if (data.requestedSlotText) desc += `Requested Slot Window: ${normalizeSingleLine(data.requestedSlotText)}\n`;
      desc += `Expected Date (Pending Confirmation): ${normalizeSingleLine(data.expectedDateStr || data.dateStr || 'N/A')}\n`;
      if (data.expectedSlotText || data.slotText) desc += `Expected Slot Window (Pending Confirmation): ${normalizeSingleLine(data.expectedSlotText || data.slotText)}\n`;
      if (data.estimatedSlotReason) desc += `Auto-Reassigned Reason: ${normalizeSingleLine(data.estimatedSlotReason)}\n`;
    }
    if (data.notes) desc += `Notes: ${data.notes}\n`;
    if (uploadedFiles.length > 0) desc += `\nFiles:\n${fileLinks}\n`;
    desc += `\nDatabase status: ${sheetWrite.success ? `Added (row ${sheetWrite.row})` : `FAILED (${sheetWrite.error || 'unknown'})`}`;
    desc += `\nDatabase sheet:\n${dbSheetUrl}`;
    desc += `\nBooking ID: ${bookingId}`;
    if (saved.folderId) desc += `\nDrive Folder ID: ${saved.folderId}`;
    if (data.cameraEvidenceSessionId) desc += `\nCamera Evidence Session: ${normalizeSingleLine(data.cameraEvidenceSessionId)}`;

    const createdEvent = calendar.createEvent(`Consultation: ${data.name}`, startTime, endTime, { description: desc });
    const eventId = createdEvent ? normalizeSingleLine(createdEvent.getId()) : '';
    const eventUrl = buildCalendarEventLink(eventId);

    let keepCard = {
      success: false,
      noteName: '',
      noteUrl: '',
      error: ''
    };
    try {
      keepCard = upsertKeepClientCard(data, {
        bookingId: bookingId,
        folderUrl: saved.folderUrl || '',
        calendarEventUrl: eventUrl
      });
    } catch (keepErr) {
      keepCard = {
        success: false,
        noteName: '',
        noteUrl: '',
        error: String(keepErr && keepErr.message ? keepErr.message : keepErr)
      };
    }
    if (keepCard && keepCard.success && keepCard.noteUrl) {
      desc += `\nKeep Card: ${keepCard.noteUrl}`;
      try {
        createdEvent.setDescription(desc);
      } catch (e) { }
    } else if (keepCard && keepCard.error) {
      desc += `\nKeep Card Error: ${truncate(normalizeSingleLine(keepCard.error), 500)}`;
      try {
        createdEvent.setDescription(desc);
      } catch (e) { }
      try {
        logUsage({
          event: 'KEEP CARD ERROR',
          severity: 'warning',
          details: `Booking ID: ${bookingId} | Name: ${normalizeSingleLine(data.name)} | Error: ${truncate(String(keepCard.error || ''), 1000)}`,
          userInfo: data.userInfo || '',
          fingerprint: data.fingerprint || ''
        });
      } catch (logErr) { }
    }

    let deadlineReminder = { success: false, eventId: '', eventUrl: '' };
    try {
      deadlineReminder = createDeadlineReminderEvent(calendar, data, {
        keepNoteUrl: keepCard && keepCard.success ? normalizeSingleLine(keepCard.noteUrl || '') : '',
        bookingId: bookingId
      });
    } catch (deadlineErr) {
      deadlineReminder = {
        success: false,
        eventId: '',
        eventUrl: '',
        error: String(deadlineErr && deadlineErr.message ? deadlineErr.message : deadlineErr)
      };
    }
    if (deadlineReminder && deadlineReminder.success && deadlineReminder.eventUrl) {
      desc += `\nDeadline Reminder: ${deadlineReminder.eventUrl}`;
      try {
        createdEvent.setDescription(desc);
      } catch (e) { }
    }

    let officeBriefReminder = { success: false, eventId: '', eventUrl: '' };
    try {
      const slotDate = parseSlotIsoToTorontoDate(data.dateStr);
      if (slotDate) {
        officeBriefReminder = upsertOfficeBriefReminder(calendar, slotDate, {
          lastSourceName: normalizeSingleLine(data.name || '')
        });
      }
    } catch (officeBriefErr) {
      officeBriefReminder = {
        success: false,
        eventId: '',
        eventUrl: '',
        error: String(officeBriefErr && officeBriefErr.message ? officeBriefErr.message : officeBriefErr)
      };
    }
    if (officeBriefReminder && officeBriefReminder.success && officeBriefReminder.eventUrl) {
      desc += `\nOffice Brief Reminder: ${officeBriefReminder.eventUrl}`;
      try {
        createdEvent.setDescription(desc);
      } catch (e) { }
    }
    const deletePayload = {
      version: 1,
      tokenId: Utilities.getUuid(),
      bookingId: bookingId,
      eventId: eventId,
      sheetRow: sheetWrite && sheetWrite.success ? Number(sheetWrite.row || 0) : 0,
      folderId: saved.folderId || '',
      cameraEvidenceSessionId: normalizeSingleLine(data.cameraEvidenceSessionId || ''),
      email: normalizeSingleLine(data.email || ''),
      phone: normalizeSingleLine(data.phone || ''),
      slotIso: normalizeSingleLine(data.dateStr || ''),
      expiresAt: Date.now() + (ADMIN_ACTION_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
    };
    const deleteUrl = buildSignedActionUrl('deleteBooking', deletePayload);
    const emailControl = {
      deleteUrl: deleteUrl,
      bookingId: bookingId,
      eventId: eventId,
      folderId: saved.folderId || '',
      folderUrl: saved.folderUrl || '',
      cameraEvidenceSessionId: normalizeSingleLine(data.cameraEvidenceSessionId || ''),
      slotIso: normalizeSingleLine(data.dateStr || ''),
      keepNoteName: keepCard && keepCard.success ? normalizeSingleLine(keepCard.noteName || '') : '',
      keepNoteUrl: keepCard && keepCard.success ? normalizeSingleLine(keepCard.noteUrl || '') : ''
    };
    let emailResult = {
      ok: false,
      status: 'not_attempted',
      error: '',
      warning: '',
      sentAt: '',
      successRecipients: [],
      failedRecipients: [],
      invalidRecipients: [],
      quotaRemaining: null,
      quotaRequired: 0,
      htmlLength: 0,
      linkCount: 0,
      fallbackUsed: false
    };
    try {
      emailResult = sendIntakeEmail(data, dbSheetUrl, uploadedFiles, sheetWrite, emailControl);
    } catch (e) {
      emailResult = {
        ok: false,
        status: 'failed',
        error: truncate(String(e && e.message ? e.message : e), 900),
        warning: '',
        sentAt: '',
        successRecipients: [],
        failedRecipients: [],
        invalidRecipients: [],
        quotaRemaining: null,
        quotaRequired: 0,
        htmlLength: 0,
        linkCount: 0,
        fallbackUsed: false
      };
    }
    if (sheetWrite && sheetWrite.success && sheetWrite.row) {
      const emailSheetUpdate = updateCustomerSheetEmailDelivery(sheetWrite.row, emailResult);
      if (!emailSheetUpdate.success && !emailSheetUpdate.skipped) {
        emailResult.warning = truncate(
          [emailResult.warning, `Sheet email status update failed: ${emailSheetUpdate.error}`]
            .filter(Boolean)
            .join(' | '),
          900
        );
      }
    }
    try {
      sendTelegram(data, uploadedFiles, dbSheetUrl, sheetWrite, {
        folderId: saved.folderId || '',
        folderUrl: saved.folderUrl || ''
      });
    } catch (e) {
      try {
        logUsage({
          event: 'TELEGRAM ERROR',
          details: truncate(String(e && e.message ? e.message : e), 1000),
          userInfo: data.userInfo || '',
          fingerprint: data.fingerprint || ''
        });
      } catch (logErr) { }
    }
    if (!emailResult.ok || emailResult.status === 'partial') {
      try {
        sendOperationalTelegramAlert(buildEmailFailureTelegramAlert(data, emailResult, {
          bookingId: bookingId,
          sheetRow: sheetWrite && sheetWrite.success ? Number(sheetWrite.row || 0) : 0
        }));
      } catch (alertErr) {
        try {
          logUsage({
            event: 'EMAIL ALERT TELEGRAM ERROR',
            severity: 'warning',
            details: truncate(String(alertErr && alertErr.message ? alertErr.message : alertErr), 1000),
            userInfo: data.userInfo || '',
            fingerprint: data.fingerprint || ''
          });
        } catch (logErr) { }
      }
    }

    try {
      logUsage({
        event: 'BOOKING CREATED',
        severity: 'info',
        details: `Booking ID: ${bookingId} | Name: ${normalizeSingleLine(data.name)} | Service: ${normalizeSingleLine(getBookingServiceDisplayText(data) || data.service)} | Email: ${normalizeSingleLine(data.email)} | Phone: ${normalizeSingleLine(data.phone)} | DOB: ${normalizeSingleLine(data.dob || 'N/A')} | Age: ${normalizeSingleLine(data.age || 'N/A')} | Deadline: ${normalizeSingleLine(data.deadline || 'N/A')} | Terms: ${data.agreeTerms ? 'Yes' : 'No'} | Address: ${normalizeSingleLine(data.address || 'N/A')} | Referral: ${normalizeSingleLine(data.referralSource || 'N/A')} | Slot: ${normalizeSingleLine(data.dateStr)} | Session: ${normalizeSingleLine(data.cameraEvidenceSessionId || 'N/A')} | Email status: ${normalizeSingleLine(emailResult.status || 'unknown')} | Email sent: ${emailResult.ok ? 'Yes' : 'No'}`,
        userInfo: data.userInfo || '',
        fingerprint: data.fingerprint || '',
        countryCode: data.countryCode || '',
        city: data.city || '',
        ip: data.ip || '',
        lang: data.lang || '',
        os: data.os || '',
        deviceModel: data.deviceModel || '',
        screenResolution: data.screenResolution || '',
        viewport: data.viewport || '',
        timezone: data.timezone || '',
        cores: data.cores || '',
        memoryGB: data.memoryGB || '',
        network: data.network || '',
        touchPoints: data.touchPoints || '',
        colorDepth: data.colorDepth || '',
        pageUrl: data.pageUrl || '',
        referrer: data.referrer || '',
        userAgent: data.userAgent || ''
      });
    } catch (logErr) { }

    const bookingWarningCode = !emailResult.ok
      ? 'BOOKING_CREATED_EMAIL_FAILED'
      : (emailResult.status === 'partial' ? 'BOOKING_CREATED_EMAIL_PARTIAL' : '');
    const bookingWarning = !emailResult.ok
      ? 'Your request was saved, but the internal notification email failed. Please call the office during business hours to confirm receipt.'
      : truncate(normalizeSingleLine(emailResult.warning || ''), 500);
    return {
      success: true,
      bookingCreated: true,
      bookingId: bookingId,
      emailSent: emailResult.ok,
      emailStatus: normalizeSingleLine(emailResult.status || ''),
      warningCode: bookingWarningCode,
      warning: bookingWarning,
      estimatedSlotAssigned: data.estimatedSlotAssigned === true,
      expectedDateStr: normalizeSingleLine(data.expectedDateStr || data.dateStr || ''),
      expectedSlotText: normalizeSingleLine(data.expectedSlotText || data.slotText || ''),
      requestedDateStr: normalizeSingleLine(data.requestedDateStr || ''),
      requestedSlotText: normalizeSingleLine(data.requestedSlotText || ''),
      estimatedSlotReason: normalizeSingleLine(data.estimatedSlotReason || '')
    };
  } finally {
    lock.releaseLock();
  }
}


// Email notification functions moved to email.gs


function addClientToSheet(p) {
  try {
    const serviceMeta = resolveBookingServiceMeta(
      p.srv || p.service || '',
      p.serviceValue || p.service_value || '',
      p.serviceDisplay || p.service_display || ''
    );
    const payload = {
      name: normalizeSingleLine(p.n || ''),
      occupation: normalizeSingleLine(p.occ || p.occupation || ''),
      phone: normalizeSingleLine(p.ph || ''),
      email: normalizeSingleLine(p.e || ''),
      service: serviceMeta.display,
      serviceCanonical: serviceMeta.canonical,
      dob: normalizeSingleLine(p.d || ''),
      age: normalizeSingleLine(p.age || ''),
      deadline: normalizeSingleLine(p.ddl || p.deadline || ''),
      referralSource: normalizeMultiLine(p.ref || p.referralSource || p.hear_about || p.hearAbout || ''),
      agreeTerms: String(p.terms || p.agreeTerms || p.agree_terms || '').toLowerCase() === 'true' || String(p.terms || p.agreeTerms || p.agree_terms || '').toLowerCase() === 'on' || String(p.terms || p.agreeTerms || p.agree_terms || '') === '1',
      address: normalizeSingleLine(p.adr || ''),
      notes: normalizeMultiLine(p.nt || p.notes || p.brief || p.brief_details || ''),
      mode: normalizeSingleLine(p.mode || p.service_mode || 'Online'),
      dateStr: normalizeSingleLine(p.dt || '')
    };
    const createdAt = normalizeSingleLine(p.c || Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm'));
    const fileLinks = String(p.f || '');

    const write = appendClientToSheet(payload, createdAt, fileLinks);
    const dbUrl = getDatabaseSheetUrl();
    if (!write.success) {
      return HtmlService.createHtmlOutput(`
        <html><body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f4e9dd;color:#3f2f22;">
          <div style="max-width:680px;margin:40px auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:14px;padding:22px;">
            <h2 style="margin:0 0 12px 0;color:#5a3d2a;">Database Error</h2>
            <p style="margin:0 0 16px 0;">${escapeHtml(write.error || 'Unknown error')}</p>
            <a href="${escapeHtml(dbUrl)}" style="display:inline-block;padding:10px 16px;background:#5a3d2a;color:#fff;text-decoration:none;border-radius:8px;">Open Spreadsheet</a>
          </div>
        </body></html>
      `);
    }

    return HtmlService.createHtmlOutput(`
      <html><body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f4e9dd;color:#3f2f22;">
        <div style="max-width:680px;margin:40px auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:14px;padding:22px;">
          <h2 style="margin:0 0 12px 0;color:#5a3d2a;">Client Added</h2>
          <p style="margin:0 0 8px 0;">Row: <strong>${write.row}</strong></p>
          <p style="margin:0 0 16px 0;">The client was added to the spreadsheet.</p>
          <a href="${escapeHtml(dbUrl)}" style="display:inline-block;padding:10px 16px;background:#5a3d2a;color:#fff;text-decoration:none;border-radius:8px;">Open Spreadsheet</a>
        </div>
      </body></html>
    `);
  } catch (e) {
    return HtmlService.createHtmlOutput('Error: ' + escapeHtml(e.message));
  }
}


// See Logging.gs for extracted functions.


