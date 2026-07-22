/*
  Logging, temp txt, fingerprint, and log sheet helpers.
  Extracted from google-apps-script.js for maintainability.
*/

function formatTime(h, m) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hours = String(h % 12 || 12).padStart(2, '0');
  return `${hours}:${String(m).padStart(2, '0')} ${ampm}`;
}

function ensureLogSheetHeaders(sheet) {
  if (!sheet) return;
  const requiredColumns = LOG_HEADERS.length;
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < requiredColumns) {
    sheet.insertColumnsAfter(maxColumns, requiredColumns - maxColumns);
  }

  const width = Math.max(requiredColumns, sheet.getLastColumn(), 1);
  const headerRange = sheet.getRange(1, 1, 1, requiredColumns);
  const currentHeaders = sheet.getRange(1, 1, 1, width).getValues()[0].map(value => String(value || ''));
  let needsUpdate = false;
  for (let i = 0; i < requiredColumns; i++) {
    if (String(currentHeaders[i] || '') !== LOG_HEADERS[i]) {
      needsUpdate = true;
      break;
    }
  }
  if (needsUpdate) {
    reorderLogSheetColumnsToMatchHeaders_(sheet, currentHeaders, requiredColumns, width);
    headerRange.setValues([LOG_HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f4e9dd');
  }
  if (sheet.getFrozenRows() !== 1) {
    sheet.setFrozenRows(1);
  }
}

function getLogHeaderCandidates_(header) {
  const aliases = LOG_HEADER_ALIASES[header];
  return [header].concat(Array.isArray(aliases) ? aliases : []);
}

function getLogSourceIndexForHeader_(headerIndexByName, targetHeader) {
  const candidates = getLogHeaderCandidates_(targetHeader);
  for (let i = 0; i < candidates.length; i++) {
    const candidate = String(candidates[i] || '');
    if (!candidate) continue;
    if (Object.prototype.hasOwnProperty.call(headerIndexByName, candidate)) {
      return headerIndexByName[candidate];
    }
  }
  return -1;
}

function reorderLogSheetColumnsToMatchHeaders_(sheet, currentHeaders, requiredColumns, width) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return;

  const headerIndexByName = {};
  currentHeaders.forEach((header, index) => {
    const name = String(header || '');
    if (!name || Object.prototype.hasOwnProperty.call(headerIndexByName, name)) return;
    headerIndexByName[name] = index;
  });

  const hasKnownHeaders = LOG_HEADERS.some(header =>
    getLogSourceIndexForHeader_(headerIndexByName, header) !== -1
  );
  if (!hasKnownHeaders) return;

  const values = sheet.getRange(1, 1, lastRow, width).getValues();
  const reorderedValues = values.map((row, rowIndex) => {
    if (rowIndex === 0) return LOG_HEADERS.slice();
    return LOG_HEADERS.map((header) => {
      const sourceIndex = getLogSourceIndexForHeader_(headerIndexByName, header);
      return sourceIndex !== -1 ? row[sourceIndex] : '';
    });
  });

  sheet.getRange(1, 1, lastRow, requiredColumns).setValues(reorderedValues);
}

const CANADIAN_FINGERPRINT_BACKGROUND_SHADES = [
  '#fff1f1',
  '#ffeaea',
  '#ffe3e3',
  '#ffdcdc',
  '#ffd5d5',
  '#f9cece',
  '#f3c7c7',
  '#edc0c0',
  '#e7b9b9'
];

function getStablePaletteIndex(seed, length) {
  const safeLength = Math.max(1, Number(length) || 1);
  const text = String(seed || '');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 31) + text.charCodeAt(i)) >>> 0;
  }
  return hash % safeLength;
}

function applyCanadianFingerprintLogFormatting(sheet, rowNumber, countryCode, fingerprint, ip, pageViewId) {
  if (!sheet || !rowNumber) return;
  const fingerprintColumn = LOG_HEADERS.indexOf('Fingerprint') + 1;
  if (fingerprintColumn <= 0) return;

  const fingerprintCell = sheet.getRange(rowNumber, fingerprintColumn);
  const isCanadian = normalizeCountryCode(countryCode || '') === 'CA';
  if (!isCanadian) {
    fingerprintCell
      .setBackground('#ffffff')
      .setFontColor('#2f241b')
      .setFontWeight('normal');
    return;
  }

  const seed = [
    normalizeSingleLine(fingerprint || ''),
    normalizeSingleLine(ip || ''),
    normalizeSingleLine(pageViewId || ''),
    String(rowNumber || '')
  ].filter(Boolean).join('|') || `CA|${rowNumber}`;
  const shade = CANADIAN_FINGERPRINT_BACKGROUND_SHADES[
    getStablePaletteIndex(seed, CANADIAN_FINGERPRINT_BACKGROUND_SHADES.length)
  ];

  fingerprintCell
    .setBackground(shade)
    .setFontColor('#7a1717')
    .setFontWeight('bold');
}

function normalizeCountryCode(value) {
  const raw = String(value || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  if (!raw) return 'CA';

  const aliases = {
    US: 'USA',
    USA: 'USA',
    UNITEDSTATES: 'USA',
    AMERICA: 'USA',
    CANADA: 'CA',
    CAN: 'CA',
    CA: 'CA',
    UKRAINE: 'UA',
    UKR: 'UA',
    UA: 'UA',
    UNITEDKINGDOM: 'UK',
    GREATBRITAIN: 'UK',
    BRITAIN: 'UK',
    GB: 'UK',
    GBR: 'UK',
    UK: 'UK'
  };

  if (aliases[raw]) return aliases[raw];
  if (raw.length === 2 || raw.length === 3) return raw;
  return raw.slice(0, 3);
}

function extractCityFromTimezone(timezone) {
  const tz = normalizeSingleLine(timezone || '');
  if (!tz) return '';
  const parts = tz.split('/');
  if (parts.length < 2) return '';
  const city = parts[parts.length - 1].replace(/_/g, ' ');
  return truncate(normalizeSingleLine(city), 80);
}

function parseLegacyUserInfo(userInfo) {
  const parsed = {
    ip: '',
    countryCode: '',
    lang: '',
    os: '',
    browser: '',
    city: '',
    deviceModel: '',
    timezone: '',
    screen: '',
    platform: ''
  };

  const text = String(userInfo || '');
  if (!text) return parsed;

  const parts = text.split('|').map(p => normalizeSingleLine(p));
  parts.forEach(part => {
    const idx = part.indexOf(':');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!value) return;
    if (key === 'ip') parsed.ip = value;
    if (key === 'lang') parsed.lang = value;
    if (key === 'os') parsed.os = value;
    if (key === 'browser') parsed.browser = value;
    if (key === 'city') parsed.city = value;
    if (key === 'model' || key === 'device' || key === 'phone') parsed.deviceModel = value;
    if (key === 'tz' || key === 'timezone') parsed.timezone = value;
    if (key === 'platform') parsed.platform = value;
    if (key === 'res' || key === 'resolution') parsed.screen = value;
    if (key === 'ca' || key === 'country') parsed.countryCode = normalizeCountryCode(value);
  });

  // Parse compact formats like "CA:1.2.3.4"
  if (!parsed.ip) {
    const compactIpMatch = text.match(/\b([A-Z]{2,3})\s*:\s*((?:\d{1,3}\.){3}\d{1,3})\b/);
    if (compactIpMatch) {
      parsed.countryCode = normalizeCountryCode(compactIpMatch[1]);
      parsed.ip = compactIpMatch[2];
    } else {
      const ipv4Match = text.match(/\b((?:\d{1,3}\.){3}\d{1,3})\b/);
      if (ipv4Match) parsed.ip = ipv4Match[1];
    }
  }

  if (!parsed.countryCode) {
    const compactCountryMatch = text.match(/\b([A-Z]{2,3})\s*:/);
    if (compactCountryMatch) parsed.countryCode = normalizeCountryCode(compactCountryMatch[1]);
  }

  return parsed;
}

function normalizeDetailLinks(rawLinks) {
  if (!Array.isArray(rawLinks)) return [];
  const links = [];
  rawLinks.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') return;
    const label = truncate(normalizeSingleLine(entry.label || entry.name || `Link ${idx + 1}`), 80);
    const url = truncate(normalizeSingleLine(entry.url || ''), 500);
    if (!url || !/^https?:\/\//i.test(url)) return;
    links.push({
      label: label || `Link ${idx + 1}`,
      url: url
    });
  });
  return links.slice(0, 6);
}

function normalizeListForLookup(values) {
  if (!Array.isArray(values)) return [];
  const out = [];
  values.forEach(v => {
    const clean = normalizeSingleLine(v || '').toLowerCase();
    if (clean) out.push(clean);
  });
  return out;
}

function inferBrowserFromUserAgent(userAgent) {
  const ua = String(userAgent || '').replace(/\s+/g, ' ').trim();
  if (!ua) return 'Unknown browser';

  if (/Edg\/([\d.]+)/i.test(ua)) return `Microsoft Edge ${RegExp.$1}`;
  if (/OPR\/([\d.]+)/i.test(ua)) return `Opera ${RegExp.$1}`;
  if (/SamsungBrowser\/([\d.]+)/i.test(ua)) return `Samsung Internet ${RegExp.$1}`;
  if (/Firefox\/([\d.]+)/i.test(ua)) return `Firefox ${RegExp.$1}`;
  if (/CriOS\/([\d.]+)/i.test(ua)) return `Chrome iOS ${RegExp.$1}`;
  if (/Chrome\/([\d.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const version = RegExp.$1;
    return /0\.0\.0$/i.test(version)
      ? `Chrome ${version} (UA reduced)`
      : `Chrome ${version}`;
  }
  if (/Version\/([\d.]+).*Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR/i.test(ua)) {
    return `Safari ${RegExp.$1}`;
  }
  if (/Safari\/([\d.]+)/i.test(ua) && !/Chrome|CriOS|Edg|OPR/i.test(ua)) {
    return `Safari ${RegExp.$1}`;
  }
  if (/MSIE\s([\d.]+)/i.test(ua)) return `Internet Explorer ${RegExp.$1}`;
  if (/Trident\/.*rv:([\d.]+)/i.test(ua)) return `Internet Explorer ${RegExp.$1}`;
  return 'Unknown browser';
}

function normalizeUserAgentForDisplay(userAgent, options) {
  const ua = String(userAgent || '').replace(/\s+/g, ' ').trim();
  const hints = options && typeof options === 'object' ? options : {};
  const browserHint = normalizeSingleLine(hints.browser || '');
  const osHint = normalizeSingleLine(hints.os || '');
  const deviceHint = normalizeSingleLine(hints.device || '');

  const parts = [];
  const pushUnique = (value) => {
    const safeValue = normalizeSingleLine(value || '');
    if (!safeValue) return;
    if (parts.indexOf(safeValue) !== -1) return;
    parts.push(safeValue);
  };

  if (browserHint) pushUnique(browserHint);
  if (osHint) pushUnique(osHint);
  if (deviceHint && !/^unknown/i.test(deviceHint)) pushUnique(deviceHint);

  if (ua) {
    const platformMatch = ua.match(/\(([^)]+)\)/);
    if (platformMatch && platformMatch[1]) {
      const platformLabel = platformMatch[1]
        .split(';')
        .map(part => normalizeSingleLine(part))
        .filter(Boolean)
        .slice(0, 4)
        .join(', ');
      if (platformLabel) pushUnique(platformLabel);
    }

    const webKitMatch = ua.match(/AppleWebKit\/([\d.]+)/i);
    if (webKitMatch && webKitMatch[1]) pushUnique(`WebKit ${webKitMatch[1]}`);
    const chromeMatch = ua.match(/Chrome\/([\d.]+)/i);
    if (chromeMatch && chromeMatch[1] && !browserHint) pushUnique(`Chrome ${chromeMatch[1]}`);
    const edgeMatch = ua.match(/Edg\/([\d.]+)/i);
    if (edgeMatch && edgeMatch[1] && !browserHint) pushUnique(`Edge ${edgeMatch[1]}`);
    const firefoxMatch = ua.match(/Firefox\/([\d.]+)/i);
    if (firefoxMatch && firefoxMatch[1] && !browserHint) pushUnique(`Firefox ${firefoxMatch[1]}`);
    const safariMatch = ua.match(/Safari\/([\d.]+)/i);
    if (safariMatch && safariMatch[1] && !/Chrome|CriOS|Edg|OPR/i.test(ua) && !browserHint) {
      pushUnique(`Safari ${safariMatch[1]}`);
    }
  }

  const compact = parts.join(' | ');
  if (compact) return truncate(compact, 280);
  if (ua) return truncate(ua, 280);
  return 'N/A';
}

function inferDeviceModelFromUserAgent(userAgent, fallbackOs) {
  const ua = String(userAgent || '');
  if (ua) {
    const compactUa = ua.replace(/\s+/g, ' ').trim();

    const androidBuildMatch = compactUa.match(/Android[^;)]*;\s*([^;)]*?)\s+Build\//i);
    if (androidBuildMatch && androidBuildMatch[1]) {
      let model = androidBuildMatch[1].replace(/\bwv\b/ig, '').replace(/\s+/g, ' ').trim();
      model = model.replace(/^[\s,;:\-]+|[\s,;:\-]+$/g, '');
      if (model && !/^(linux|u|android)$/i.test(model)) return model;
    }

    const samsungMatch = compactUa.match(/\b(SM-[A-Z0-9]+)\b/i);
    if (samsungMatch && samsungMatch[1]) return samsungMatch[1].toUpperCase();

    const pixelMatch = compactUa.match(/\b(Pixel(?:\s+[A-Za-z0-9]+){1,3})\b/i);
    if (pixelMatch && pixelMatch[1]) return pixelMatch[1].trim();

    const xiaomiMatch = compactUa.match(/\b((?:MI|Redmi|POCO)\s*[A-Za-z0-9-]+)\b/i);
    if (xiaomiMatch && xiaomiMatch[1]) return xiaomiMatch[1].trim();

    if (/iPhone/i.test(compactUa)) return 'iPhone';
    if (/iPad/i.test(compactUa)) return 'iPad';
    if (/iPod/i.test(compactUa)) return 'iPod';
    if (/Windows NT/i.test(compactUa)) return 'Windows PC';
    if (/Macintosh|Mac OS X/i.test(compactUa)) return 'Mac';
    if (/CrOS/i.test(compactUa)) return 'Chromebook';
    if (/Linux/i.test(compactUa)) return 'Linux PC';
    if (/Android/i.test(compactUa)) return 'Android (model unavailable)';
    if (/Mobile/i.test(compactUa)) return 'Mobile (model unavailable)';
  }

  const osFallback = normalizeSingleLine(fallbackOs || '');
  if (osFallback) return `${osFallback} device`;
  return 'Unknown device';
}

function resolveWhoTag(payload, pageUrl, referer, fingerprint, ip) {
  const explicit = normalizeSingleLine(payload.actor || payload.actorTag || payload.who || payload.audience || '').toUpperCase();
  if (explicit === 'YOU' || explicit === 'THEY') return explicit;

  const ownerFingerprintSet = normalizeListForLookup(OWNER_FINGERPRINTS);
  const ownerIpSet = normalizeListForLookup(OWNER_IPS);
  const cleanFingerprint = normalizeSingleLine(fingerprint || '').toLowerCase();
  const cleanIp = normalizeSingleLine(ip || '').toLowerCase();
  if (cleanFingerprint && ownerFingerprintSet.indexOf(cleanFingerprint) !== -1) return 'YOU';
  if (cleanIp && ownerIpSet.indexOf(cleanIp) !== -1) return 'YOU';

  const hasClientSignals = Boolean(pageUrl || referer || cleanFingerprint);
  return hasClientSignals ? 'THEY' : 'YOU';
}

function shouldMirrorLogEntryToSheet2(eventName) {
  const event = normalizeSingleLine(eventName || '').toLowerCase();
  if (!event) return false;
  if (event === 'testtext' || event === 'draft' || event === 'testfiles') return true;
  if (event === 'form:submit' || event === 'form submit log fallback') return true;
  if (event === 'camera evidence duplicate' || event === 'testcam synced') return true;
  if (event.indexOf('testtext:') === 0) return true;
  if (event.indexOf('draft:update:') === 0) return true;
  if (event.indexOf('testfiles ') === 0) return true;
  return false;
}

function logUsage(d) {
  try {
    d = (d && typeof d === 'object') ? d : {};
    const logSpreadsheetId = getLogSpreadsheetId();
    if (!logSpreadsheetId) return { success: false, error: 'LOG_SPREADSHEET_ID is missing.' };
    const ss = SpreadsheetApp.openById(logSpreadsheetId);
    const sheet = ss.getSheetByName(LOG_SHEET_NAME) || ss.getSheets()[0];
    ensureLogSheetHeaders(sheet);

    const legacy = parseLegacyUserInfo(d.userInfo || '');
    const countryCode = normalizeCountryCode(d.countryCode || legacy.countryCode || 'CA');
    const ip = truncate(normalizeSingleLine(d.ip || legacy.ip || 'Unknown'), 64) || 'Unknown';
    const caIpLabel = `${countryCode}:${ip}`;
    const timezone = truncate(normalizeSingleLine(d.timezone || legacy.timezone || ''), 80);
    const city = truncate(
      normalizeSingleLine(d.city || legacy.city || extractCityFromTimezone(timezone)),
      80
    );
    const userAgent = truncate(normalizeSingleLine(d.userAgent || ''), 600);
    const browserRaw = normalizeSingleLine(d.browser || legacy.browser || '');
    const browser = truncate(browserRaw || inferBrowserFromUserAgent(userAgent), 180);
    const rawPhoneModel = normalizeSingleLine(d.deviceModel || legacy.deviceModel || '');
    const isTooGenericPhoneModel = /^(desktop|android device|android phone|mobile device)$/i.test(rawPhoneModel);
    const phoneModel = truncate(
      (!rawPhoneModel || isTooGenericPhoneModel)
        ? inferDeviceModelFromUserAgent(userAgent, d.os || legacy.os || legacy.platform || '')
        : rawPhoneModel,
      120
    );
    const lang = truncate(normalizeSingleLine(d.lang || legacy.lang || ''), 80);
    const os = truncate(normalizeSingleLine(d.os || legacy.os || legacy.platform || ''), 80);
    const screenResolution = truncate(normalizeSingleLine(d.screenResolution || legacy.screen || ''), 40);
    const viewport = truncate(normalizeSingleLine(d.viewport || ''), 40);
    const cores = truncate(normalizeSingleLine(d.cores || ''), 20);
    const memoryGB = truncate(normalizeSingleLine(d.memoryGB || ''), 20);
    const network = truncate(normalizeSingleLine(d.network || ''), 120);
    const touchPoints = truncate(normalizeSingleLine(d.touchPoints || ''), 20);
    const colorDepth = truncate(normalizeSingleLine(d.colorDepth || ''), 20);
    const userAgentSummary = truncate(
      normalizeUserAgentForDisplay(userAgent, { browser: browser, os: os, device: phoneModel }),
      280
    );
    const perfLoadPercent = truncate(normalizeSingleLine(d.perfLoadPercent || ''), 20);
    const perfProcess = truncate(normalizeSingleLine(d.perfProcess || ''), 160);
    const perfScript = truncate(normalizeSingleLine(d.perfScript || ''), 220);
    const locationCoords = truncate(normalizeSingleLine(d.locationCoords || ''), 80);
    const locationMapUrl = sanitizeHttpUrl(
      normalizeSingleLine(d.locationMapUrl || '') || (locationCoords ? `https://www.google.com/maps?q=${encodeURIComponent(locationCoords)}` : ''),
      500
    );
    const fingerprint = truncate(normalizeSingleLine(d.fingerprint || ''), 256);
    const pageUrl = sanitizeHttpUrl(d.pageUrl || '', 500);
    const referer = sanitizeObservedReferrerValue(d.referer || d.referrer || '', d.pageUrl || '');
    const formInputLog = truncate(normalizeSingleLine(d.formInputLog || d.form_input_log || d.formLog || ''), 1000);
    const entryType = truncate(normalizeSingleLine(d.entryType || d.logType || ''), 64);
    const pageViewId = truncate(normalizeSingleLine(d.pageViewId || d.pageviewId || d.viewId || ''), 160);
    const severity = truncate(normalizeSingleLine(d.severity || ''), 40);
    const rawEventName = normalizeSingleLine(d.event || d.eventName || '');
    const rawDetailsText = normalizeSingleLine(d.details || '');
    if (!rawEventName && !rawDetailsText) {
      return { success: true, skipped: 'EMPTY_LOG_ENTRY' };
    }
    const eventName = truncate(rawEventName || 'UNSPECIFIED_EVENT', 160);
    const detailsText = truncate(rawDetailsText || 'N/A', 1000);
    const whoTag = resolveWhoTag(d, pageUrl, referer, fingerprint, ip);
    const timestamp = Utilities.formatDate(new Date(), 'America/Toronto', 'yyyy-MM-dd HH:mm:ss');

    const rowByHeader = {
      'Actor': whoTag,
      'Referrer': referer || 'None',
      'Event': eventName,
      'Log Type': entryType,
      'Page View ID': pageViewId,
      'Form Activity': formInputLog,
      'Severity': severity,
      'Country Code': countryCode,
      'City': city,
      'Map URL': locationMapUrl,
      'Device Model': phoneModel,
      'Timestamp': timestamp,
      'Details': detailsText,
      'Country / IP': caIpLabel,
      'Language': lang,
      'OS': os,
      'Browser': browser,
      'User Agent Summary': userAgentSummary,
      'Screen Resolution': screenResolution,
      'Viewport': viewport,
      'Timezone': timezone,
      'CPU Cores': cores,
      'Device Memory GB': memoryGB,
      'Network Info': network,
      'Max Touch Points': touchPoints,
      'Color Depth': colorDepth,
      'Perf Load Percent': perfLoadPercent,
      'Perf Process': perfProcess,
      'Perf Script': perfScript,
      'Geo Coordinates': locationCoords,
      'Fingerprint': fingerprint,
      'Current Page URL': pageUrl
    };
    const rowValues = [LOG_HEADERS.map(header =>
      Object.prototype.hasOwnProperty.call(rowByHeader, header) ? rowByHeader[header] : ''
    )];

    // Write newest logs at the top (right under headers), so fresh entries are visible first.
    sheet.insertRowsAfter(1, 1);
    const targetRow = 2;
    sheet.getRange(targetRow, 1, 1, LOG_HEADERS.length).setValues(rowValues);
    applyCanadianFingerprintLogFormatting(sheet, targetRow, countryCode, fingerprint, ip, pageViewId);
    let sheet2Mirror = null;
    if (shouldMirrorLogEntryToSheet2(eventName)) {
      sheet2Mirror = appendDraftMirrorToLogSheet2(d || {}, eventName, detailsText);
    }
    let bookingClientFailureTelegram = null;
    if (isBookingClientFailureAlertEvent(eventName)) {
      bookingClientFailureTelegram = notifyBookingClientFailureTelegramFromLog(d || {}, eventName, detailsText);
    }
    return { success: true, row: targetRow, sheet2: sheet2Mirror, bookingClientFailureTelegram: bookingClientFailureTelegram };
  } catch (e) { return { success: false }; }
}

function compactTempTxtPayload(raw) {
  const src = (raw && typeof raw === 'object') ? raw : {};
  const out = {};
  const blockedKeys = {
    files: true,
    z0: true,
    file: true,
    fileData: true,
    filesPayload: true,
    payloadFiles: true
  };

  Object.keys(src).forEach(key => {
    if (blockedKeys[key]) return;
    const value = src[key];
    if (Array.isArray(value)) {
      out[key] = `[array:${value.length}]`;
      return;
    }
    if (value && typeof value === 'object') {
      out[key] = '[object]';
      return;
    }
    if (typeof value === 'string') {
      out[key] = truncate(normalizeSingleLine(value), 500);
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value);
    }
  });

  return out;
}

function ensureTestTextLogSheetHeaders(sheet) {
  if (!sheet) return;
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, LOG_TESTTEXT_HEADERS.length).setValues([LOG_TESTTEXT_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, LOG_TESTTEXT_HEADERS.length).getValues()[0];
  let shouldRewrite = false;
  for (let i = 0; i < LOG_TESTTEXT_HEADERS.length; i++) {
    if (String(currentHeaders[i] || '') !== LOG_TESTTEXT_HEADERS[i]) {
      shouldRewrite = true;
      break;
    }
  }
  if (shouldRewrite) {
    sheet.getRange(1, 1, 1, LOG_TESTTEXT_HEADERS.length).setValues([LOG_TESTTEXT_HEADERS]);
  }
  if (sheet.getFrozenRows() < 1) {
    sheet.setFrozenRows(1);
  }
}

function extractTempSessionIdFromTestTextPayload(d) {
  const src = (d && typeof d === 'object') ? d : {};
  const candidates = [
    src.fileSessionId,
    src.testFilesSessionId,
    src.tempSessionId,
    src.pre_files_session_id,
    src.cameraEvidenceSessionId,
    src.sessionId,
    src.sid,
    src.k,
    src.z1
  ];

  for (let i = 0; i < candidates.length; i++) {
    const value = truncate(
      normalizeSingleLine(candidates[i]).replace(/[^A-Za-z0-9_-]/g, ''),
      120
    );
    if (value) return value;
  }

  const detailsText = normalizeSingleLine(src.details || '');
  if (!detailsText) return '';
  const bodyPrefix = 'requestBody=';
  if (detailsText.indexOf(bodyPrefix) !== 0) {
    const sessionMatch = detailsText.match(/\bSession:\s*([A-Za-z0-9_-]{4,120})\b/i);
    return sessionMatch ? truncate(normalizeSingleLine(sessionMatch[1]), 120) : '';
  }

  try {
    const payloadText = detailsText.slice(bodyPrefix.length);
    const payload = JSON.parse(payloadText);
    const sessionFromBody = truncate(
      normalizeSingleLine(
        (payload && (
          payload.fileSessionId ||
          payload.testFilesSessionId ||
          payload.tempSessionId ||
          payload.pre_files_session_id ||
          payload.cameraEvidenceSessionId ||
          payload.sessionId ||
          payload.sid ||
          payload.k ||
          payload.z1
        )) || ''
      ).replace(/[^A-Za-z0-9_-]/g, ''),
      120
    );
    return sessionFromBody || '';
  } catch (e) {
    const sessionMatch = detailsText.match(/\bSession:\s*([A-Za-z0-9_-]{4,120})\b/i);
    return sessionMatch ? truncate(normalizeSingleLine(sessionMatch[1]), 120) : '';
  }
}

function appendDraftMirrorToLogSheet2(d, eventName, detailsText) {
  try {
    const logSpreadsheetId = getLogSpreadsheetId();
    if (!logSpreadsheetId) return { success: false, error: 'LOG_SPREADSHEET_ID is missing.' };
    const ss = SpreadsheetApp.openById(logSpreadsheetId);
    let sheet = ss.getSheetByName(LOG_TESTTEXT_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(LOG_TESTTEXT_SHEET_NAME);
    }
    ensureTestTextLogSheetHeaders(sheet);

    const sessionId = extractTempSessionIdFromTestTextPayload(d);
    const tempLinks = buildSheet2MirrorLinks(d, sessionId);
    const timestamp = Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm:ss');
    const draftLogText = truncate(
      normalizeSingleLine(`${timestamp} | ${normalizeSingleLine(eventName || 'testText')} | ${normalizeSingleLine(detailsText || '')}`),
      5000
    );

    sheet.insertRowsAfter(1, 1);
    const targetRow = 2;
    const rowValues = [[
      draftLogText,
      tempLinks.length ? '' : 'No Temp document links',
      timestamp,
      truncate(normalizeSingleLine(eventName || ''), 160),
      truncate(normalizeSingleLine(sessionId || ''), 120),
      truncate(normalizeSingleLine(d && d.name), 120),
      truncate(normalizeSingleLine(d && d.email), 160),
      truncate(normalizeSingleLine(d && d.phone), 80)
    ]];
    sheet.getRange(targetRow, 1, 1, LOG_TESTTEXT_HEADERS.length).setValues(rowValues);

    const linksRichText = buildTempLinksRichTextValue(tempLinks);
    if (linksRichText) {
      sheet.getRange(targetRow, 2).setRichTextValue(linksRichText);
    }

    return {
      success: true,
      row: targetRow,
      linksCount: tempLinks.length,
      sessionId: sessionId
    };
  } catch (e) {
    return {
      success: false,
      error: String(e && e.message ? e.message : e)
    };
  }
}

function appendTestTextToTempTxtSheet(d) {
  try {
    d = (d && typeof d === 'object') ? d : {};
    const targetSpreadsheetId = '1CRob0Z8PZqk_R6xx_73ZfPI94Lk3n2pR3DTsQF-g5hc';
    const ss = SpreadsheetApp.openById(targetSpreadsheetId);
    let sheet = ss.getSheetByName(TEMP_TESTTEXT_SHEET_TAB_NAME) || ss.getSheets()[0];

    if (sheet.getLastRow() < 1) {
      sheet.getRange(1, 1, 1, 10).setValues([[
        'Timestamp (Toronto)',
        'Name',
        'Email',
        'Phone',
        'Service',
        'City',
        'IP',
        'Hear About',
        'Notes',
        'Payload JSON'
      ]]);
      sheet.setFrozenRows(1);
    }

    const eventName = truncate(normalizeSingleLine(d.event || d.eventName || d.draftEvent || d.draft_event || ''), 160);
    const detailsText = truncate(normalizeSingleLine(d.details || ''), 1000);
    const nameValue = normalizeSingleLine(d.name) || (eventName ? `[${eventName}]` : '');
    const emailValue = normalizeSingleLine(d.email);
    const phoneValue = normalizeSingleLine(d.phone);
    const serviceValue = normalizeSingleLine(d.service || d.serviceValue);
    const cityValue = normalizeSingleLine(d.city || d.address_city || d.addressCity);
    const ipValue = normalizeSingleLine(d.ip);
    const hearAboutValue = normalizeMultiLine(d.hear_about || d.hearAbout);
    const notesValue = normalizeMultiLine(d.notes) || detailsText;

    const hasVisibleData = Boolean(
      nameValue ||
      emailValue ||
      phoneValue ||
      serviceValue ||
      cityValue ||
      ipValue ||
      hearAboutValue ||
      notesValue
    );
    if (!hasVisibleData) {
      return { success: true, skipped: 'EMPTY_TESTTEXT_ROW' };
    }

    const payloadJson = truncate(JSON.stringify(compactTempTxtPayload(d)), 6000);
    const rowValues = [[
      Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm:ss'),
      nameValue,
      emailValue,
      phoneValue,
      serviceValue,
      cityValue,
      ipValue,
      hearAboutValue,
      notesValue,
      payloadJson
    ]];
    sheet.insertRowsAfter(1, 1);
    sheet.getRange(2, 1, 1, 10).setValues(rowValues);

    return {
      success: true,
      sheetId: ss.getId(),
      sheetUrl: ss.getUrl()
    };
  } catch (e) {
    return {
      success: false,
      error: String(e && e.message ? e.message : e)
    };
  }
}

function logTestText(d) {
  const eventName = truncate(
    normalizeSingleLine(
      (d && (d.event || d.eventName || d.draftEvent || d.draft_event)) || 'testText'
    ),
    160
  ) || 'testText';

  const explicitDetails = normalizeSingleLine(d && d.details);
  const draftField = truncate(normalizeSingleLine(d && (d.draftField || d.field || d.fieldName)), 120);
  const draftValueRaw = normalizeSingleLine(d && (d.draftValue || d.value || d.fieldValue));
  const draftValue = truncate(draftValueRaw || '[empty]', 280);

  const detailsParts = [];
  if (explicitDetails) detailsParts.push(explicitDetails);
  if (draftField) detailsParts.push(`Field: ${draftField}`);
  if (draftValue) detailsParts.push(`Value: ${draftValue}`);
  const fallbackName = normalizeSingleLine(d && d.name);
  if (fallbackName) detailsParts.push(`Name: ${fallbackName}`);
  const fallbackNote = truncate(normalizeSingleLine(d && d.notes), 250);
  if (fallbackNote) detailsParts.push(`Note: ${fallbackNote}`);
  const draftDetailsText = truncate(detailsParts.join(' | ') || 'Draft field update', 1000);

  const usageResult = logUsage({
    event: eventName,
    details: draftDetailsText,
    name: d.name,
    occupation: d.occupation,
    email: d.email,
    phone: d.phone,
    service: d.service,
    serviceValue: d.serviceValue,
    address: d.address,
    address_city: d.address_city || d.addressCity,
    address_province: d.address_province || d.addressProvince,
    address_zip: d.address_zip || d.addressZip,
    dob: d.dob,
    age: d.age,
    deadline: d.deadline,
    notes: d.notes,
    agreeTerms: d.agreeTerms,
    fileSessionId: d.fileSessionId,
    testFilesSessionId: d.testFilesSessionId,
    tempSessionId: d.tempSessionId,
    pre_files_session_id: d.pre_files_session_id,
    cameraEvidenceSessionId: d.cameraEvidenceSessionId,
    sessionId: d.sessionId,
    sid: d.sid,
    k: d.k,
    userInfo: d.userInfo,
    fingerprint: d.fingerprint,
    countryCode: d.countryCode,
    city: d.city || d.address_city || d.addressCity,
    ip: d.ip,
    lang: d.lang,
    os: d.os,
    browser: d.browser,
    deviceModel: d.deviceModel,
    screenResolution: d.screenResolution,
    viewport: d.viewport,
    timezone: d.timezone,
    cores: d.cores,
    memoryGB: d.memoryGB,
    network: d.network,
    touchPoints: d.touchPoints,
    colorDepth: d.colorDepth,
    pageUrl: d.pageUrl,
    referer: d.referer || d.referrer,
    referrer: d.referrer,
    userAgent: d.userAgent
  });

  const tempTxtResult = appendTestTextToTempTxtSheet(d || {});
  return {
    success: !!(usageResult && usageResult.success),
    usageLog: usageResult,
    tempTxt: tempTxtResult,
    sheet2: usageResult && usageResult.sheet2 ? usageResult.sheet2 : null
  };
}


function buildViberLink(phone) {
  const intl = normalizePhoneInternational(phone);
  // Using a web-friendly viber.me link which is more likely to be allowed by email clients than viber:// protocol
  return intl ? `https://viber.me/${encodeUriValue(intl.replace('+', ''))}` : '';
}

