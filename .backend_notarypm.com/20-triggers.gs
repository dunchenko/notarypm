/*
  Triggers and Scheduled Tasks
  Extracted for daily reporting and automated tasks.
*/

function extractDomainFromUrl_(url) {
  try {
    const match = String(url || '').match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
    return match ? match[1].replace(/:\d+$/, '').replace(/^www\./i, '').toLowerCase() : 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

const VISITOR_REPORT_LAST_VISITORS_LIMIT = 20;

function formatVisitorReportTime_(timestampText) {
  const cleanTimestamp = String(timestampText || '').trim();
  if (!cleanTimestamp) return 'N/A';

  const timeMatch = cleanTimestamp.match(/\b(\d{1,2}:\d{2})(?::\d{2})?\b/);
  if (timeMatch && timeMatch[1]) return `${timeMatch[1]} Toronto`;

  return `${cleanTimestamp} Toronto`;
}

function buildVisitorReportKey_(fingerprint, ip, rowIndex) {
  const safeFingerprint = String(fingerprint || '').trim();
  if (safeFingerprint) return `fp:${safeFingerprint}`;

  const safeIp = String(ip || '').trim();
  if (safeIp) return `ip:${safeIp}`;

  return `row:${rowIndex}`;
}

function buildLastVisitorsReport_(visitorLastSeenByKey) {
  const visitorKeys = Object.keys(visitorLastSeenByKey || {});
  const timestamps = visitorKeys
    .map(key => String(visitorLastSeenByKey[key] || '').trim())
    .filter(Boolean)
    .sort((a, b) => {
      if (a === b) return 0;
      return a < b ? 1 : -1;
    })
    .slice(0, VISITOR_REPORT_LAST_VISITORS_LIMIT);

  return {
    label: visitorKeys.length === 1 ? 'Visitor' : 'Last Visitors',
    value: timestamps.length ? timestamps.map(formatVisitorReportTime_).join(', ') : 'N/A'
  };
}

/*
  Traffic source/referrer attribution is intentionally disabled.

  Known issue: this report counted traffic sources per log row instead of per unique
  visitor/session. A single visitor can generate multiple rows with different
  referrer values, so the bot may show misleading percentages, for example
  50% Google and 50% Other even when only one person actually visited the site.
  Keep this code commented out until source attribution is deduplicated by a
  stable visitor fingerprint or session id.

function getQueryParamValue_(url, paramName) {
  const rawUrl = String(url || '');
  const safeName = String(paramName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!rawUrl || !safeName) return '';
  const match = rawUrl.match(new RegExp('[?&]' + safeName + '=([^&#]*)', 'i'));
  if (!match || !match[1]) return '';
  try {
    return decodeURIComponent(String(match[1]).replace(/\+/g, ' ')).trim().toLowerCase();
  } catch (e) {
    return String(match[1] || '').trim().toLowerCase();
  }
}

function buildReferrerBuckets_() {
  return {
    '🌐 Google': 0,
    '👥 Facebook': 0,
    '💰 ADs': 0,
    '📸 Instagram': 0,
    '👔 LinkedIn': 0,
    '🎵 TikTok': 0,
    '🎬 YouTube': 0,
    '🗨️ Reddit': 0,
    '🛒 Kijiji': 0,
    '🐦 X/Twitter': 0,
    '🟢 WhatsApp': 0,
    '🔎 Bing': 0,
    '📒 YP': 0,
    '🎯 Direct': 0,
    '🔗 Other': 0
  };
}

function findReferrerKeyByLabel_(referrersMap, label) {
  const keys = Object.keys(referrersMap || {});
  const wanted = String(label || '').toLowerCase();
  for (let i = 0; i < keys.length; i++) {
    if (String(keys[i] || '').toLowerCase().indexOf(wanted) !== -1) return keys[i];
  }
  return '';
}

function resolveTrafficReferrerKey_(pageUrl, referrer, referrersMap) {
  const keyGoogle = findReferrerKeyByLabel_(referrersMap, 'Google');
  const keyFacebook = findReferrerKeyByLabel_(referrersMap, 'Facebook');
  const keyAds = findReferrerKeyByLabel_(referrersMap, 'ADs');
  const keyInstagram = findReferrerKeyByLabel_(referrersMap, 'Instagram');
  const keyLinkedIn = findReferrerKeyByLabel_(referrersMap, 'LinkedIn');
  const keyTikTok = findReferrerKeyByLabel_(referrersMap, 'TikTok');
  const keyYouTube = findReferrerKeyByLabel_(referrersMap, 'YouTube');
  const keyReddit = findReferrerKeyByLabel_(referrersMap, 'Reddit');
  const keyKijiji = findReferrerKeyByLabel_(referrersMap, 'Kijiji');
  const keyX = findReferrerKeyByLabel_(referrersMap, 'X/Twitter');
  const keyWhatsApp = findReferrerKeyByLabel_(referrersMap, 'WhatsApp');
  const keyBing = findReferrerKeyByLabel_(referrersMap, 'Bing');
  const keyYP = findReferrerKeyByLabel_(referrersMap, 'YP');
  const keyDirect = findReferrerKeyByLabel_(referrersMap, 'Direct');
  const keyOther = findReferrerKeyByLabel_(referrersMap, 'Other');

  const pageUrlLower = String(pageUrl || '').toLowerCase();
  const referrerLower = String(referrer || '').toLowerCase();
  const combined = `${pageUrlLower} ${referrerLower}`;

  const utmSource = getQueryParamValue_(pageUrl, 'utm_source');
  const utmMedium = getQueryParamValue_(pageUrl, 'utm_medium');
  const utmCampaign = getQueryParamValue_(pageUrl, 'utm_campaign');
  const sourceHint = `${utmSource} ${getQueryParamValue_(pageUrl, 'source')}`.trim();
  const mediumHint = `${utmMedium} ${getQueryParamValue_(pageUrl, 'medium')}`.trim();

  const hasWhatsApp = /\b(whatsapp|wa\.me|api\.whatsapp\.com)\b/i.test(combined)
    || /\b(whatsapp|wa)\b/i.test(sourceHint);
  if (hasWhatsApp) return keyWhatsApp || keyOther || keyDirect;

  const hasFacebook = /\b(facebook|fb\.com|m\.facebook|l\.facebook)\b/i.test(combined)
    || /\b(facebook|fb|meta)\b/i.test(sourceHint);
  if (hasFacebook) return keyFacebook || keyOther || keyDirect;

  const hasInstagram = /\binstagram\b/i.test(combined) || /\b(instagram|ig)\b/i.test(sourceHint);
  if (hasInstagram) return keyInstagram || keyOther || keyDirect;

  const hasLinkedIn = /\blinkedin\b/i.test(combined) || /\blinkedin\b/i.test(sourceHint);
  if (hasLinkedIn) return keyLinkedIn || keyOther || keyDirect;

  const hasTikTok = /\btiktok\b/i.test(combined) || /\btiktok\b/i.test(sourceHint);
  if (hasTikTok) return keyTikTok || keyOther || keyDirect;

  const hasYouTube = /\b(youtube|youtu\.be)\b/i.test(combined) || /\byoutube\b/i.test(sourceHint);
  if (hasYouTube) return keyYouTube || keyOther || keyDirect;

  const hasReddit = /\breddit\b/i.test(combined) || /\breddit\b/i.test(sourceHint);
  if (hasReddit) return keyReddit || keyOther || keyDirect;

  const hasKijiji = /\bkijiji\b/i.test(combined) || /\bkijiji\b/i.test(sourceHint);
  if (hasKijiji) return keyKijiji || keyOther || keyDirect;

  const hasX = /\b(x\.com|twitter|t\.co)\b/i.test(combined) || /\b(x|twitter)\b/i.test(sourceHint);
  if (hasX) return keyX || keyOther || keyDirect;

  const hasGoogle = /\bgoogle\b/i.test(combined) || /\bgoogle\b/i.test(sourceHint);
  if (hasGoogle) return keyGoogle || keyOther || keyDirect;

  const hasBing = /\bbing\b/i.test(combined) || /\bbing\b/i.test(sourceHint);
  if (hasBing) return keyBing || keyOther || keyDirect;

  const hasYP = /\b(yp\.ca|yellowpages)\b/i.test(combined) || /\b(yp|yellowpages)\b/i.test(sourceHint);
  if (hasYP) return keyYP || keyOther || keyDirect;

  const hasAdClickId = /[?&](gclid|msclkid|ttclid|dclid|yclid|wbraid|gbraid)=/i.test(pageUrlLower);
  const hasAdParam = /[?&](adid|ad_id|adset|adset_id|campaign_id|creative_id)=/i.test(pageUrlLower);
  const paidMedium = /\b(cpc|ppc|paid|paidsocial|social[-_ ]?paid|display|banner|retargeting|remarketing|promo|ads?)\b/i.test(mediumHint);
  const paidCampaign = /\b(remarketing|retargeting|campaign|promo|paid)\b/i.test(utmCampaign);
  if (hasAdClickId || hasAdParam || paidMedium || paidCampaign) return keyAds || keyOther || keyDirect;

  if (referrerLower && referrerLower !== 'none') return keyOther || keyDirect;
  return keyDirect || keyOther || 'Direct';
}
*/

function createDomainStatsRecord_() {
  return {
    leads: 0,
    errors: 0,
    warnings: 0,
    fps: new Set(),
    ips: new Set(),
    rows: 0,
    visitorLastSeenByKey: {},
    devices: { mobile: 0, desktop: 0 }
    // Referrer buckets are disabled; see the traffic attribution note above.
  };
}

function sendDailyVisitorReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = Utilities.formatDate(yesterday, TORONTO_TZ, 'yyyy-MM-dd');
  return sendVisitorReportByDateString(yesterdayString);
}

function sendTodayVisitorReport() {
  const now = new Date();
  const todayString = Utilities.formatDate(now, TORONTO_TZ, 'yyyy-MM-dd');
  return sendVisitorReportByDateString(todayString);
}

function sendYesterdayVisitorReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = Utilities.formatDate(yesterday, TORONTO_TZ, 'yyyy-MM-dd');
  return sendVisitorReportByDateString(yesterdayString);
}

function sendVisitorReportByDateString(targetDateString) {
  const targetDomain = 'hannadunchenko.com';
  const logSpreadsheetId = getLogSpreadsheetId();
  if (!logSpreadsheetId) return { success: false, error: 'Missing log spreadsheet id.' };

  const ss = SpreadsheetApp.openById(logSpreadsheetId);
  const sheet = ss.getSheetByName(LOG_SHEET_NAME) || ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return sendOperationalTelegramAlert(`📅 For Date: ${targetDateString}\n\nNo visitors found for ${targetDateString}.`);
  }

  const numRowsToRead = Math.min(lastRow - 1, 5000);
  const data = sheet.getRange(2, 1, numRowsToRead, LOG_HEADERS.length).getDisplayValues();

  const timestampIndex = LOG_HEADERS.indexOf('Timestamp');
  const fingerprintIndex = LOG_HEADERS.indexOf('Fingerprint');
  const ipIndex = LOG_HEADERS.indexOf('Country / IP');
  const actorIndex = LOG_HEADERS.indexOf('Actor');
  const eventIndex = LOG_HEADERS.indexOf('Event');
  const severityIndex = LOG_HEADERS.indexOf('Severity');
  const pageUrlIndex = LOG_HEADERS.indexOf('Current Page URL');
  // const referrerIndex = LOG_HEADERS.indexOf('Referrer'); // Disabled; see traffic attribution note above.
  const osIndex = LOG_HEADERS.indexOf('OS');

  const domainStats = {};

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const timestampStr = String(row[timestampIndex] || '');

    if (timestampStr.startsWith(targetDateString)) {
      const actor = String(row[actorIndex] || '').trim().toUpperCase();
      if (actor === 'YOU') continue;

      const fp = String(row[fingerprintIndex] || '').trim();
      const ip = String(row[ipIndex] || '').trim();
      const eventName = String(row[eventIndex] || '').toLowerCase();
      const severity = String(row[severityIndex] || '').toLowerCase();
      const pageUrl = String(row[pageUrlIndex] || '').trim();
      // const referrer = String(row[referrerIndex] || '').trim(); // Disabled; see traffic attribution note above.
      const osStr = String(row[osIndex] || '').toLowerCase();

      const domain = extractDomainFromUrl_(pageUrl);
      if (domain !== targetDomain) continue;

      if (!domainStats[domain]) domainStats[domain] = createDomainStatsRecord_();
      const stats = domainStats[domain];

      stats.rows++;
      const visitorKey = buildVisitorReportKey_(fp, ip, i);
      if (timestampStr && (!stats.visitorLastSeenByKey[visitorKey] || timestampStr > stats.visitorLastSeenByKey[visitorKey])) {
        stats.visitorLastSeenByKey[visitorKey] = timestampStr;
      }
      if (fp) stats.fps.add(fp);
      if (ip) stats.ips.add(ip);
      if (eventName.includes('submit') || eventName.includes('lead')) stats.leads++;
      if (severity === 'error') stats.errors++;
      if (severity === 'warning') stats.warnings++;

      if (osStr.includes('windows') || osStr.includes('mac') || osStr.includes('linux') || osStr.includes('cros')) {
        stats.devices.desktop++;
      } else if (osStr.includes('android') || osStr.includes('ios') || osStr.includes('iphone') || osStr.includes('ipad')) {
        stats.devices.mobile++;
      }

      // const refKey = resolveTrafficReferrerKey_(pageUrl, referrer, stats.referrers);
      // stats.referrers[refKey] = (stats.referrers[refKey] || 0) + 1;
    } else if (timestampStr < targetDateString && timestampStr !== '') {
      break;
    }
  }

  const domains = Object.keys(domainStats).sort();
  const messageParts = [
    `🌐 Domain: ${targetDomain}`,
    `📅 For Date: ${targetDateString}`
  ];

  if (domains.length === 0) {
    messageParts.push(`No visitors found for ${targetDateString}.`);
  } else {
    domains.forEach(domain => {
      const stats = domainStats[domain];
      const visitorsCount = stats.fps.size > 0 ? stats.fps.size : stats.ips.size;
      // const totalRefs = Object.values(stats.referrers).reduce((a, b) => a + b, 0);
      // Device reporting is disabled because it is broken and no longer reports the device split correctly.
      // const totalDevices = stats.devices.mobile + stats.devices.desktop;
      // const mobilePct = totalDevices > 0 ? Math.round((stats.devices.mobile / totalDevices) * 100) : 0;
      // const desktopPct = totalDevices > 0 ? Math.round((stats.devices.desktop / totalDevices) * 100) : 0;
      const visitorsLabel = visitorsCount > 0 ? `${visitorsCount}` : '0 👎';

      // const sourcesText = Object.entries(stats.referrers)
      //   .sort((a, b) => b[1] - a[1])
      //   .map(entry => {
      //     const pct = totalRefs > 0 ? Math.round((entry[1] / totalRefs) * 100) : 0;
      //     return `${entry[0]}: ${pct}%`;
      //   })
      //   .join(', ');

      const errorsLabel = stats.errors === 0 ? '0 👍' : `${stats.errors}`;
      const warningsLabel = stats.warnings === 0 ? '0 👍' : `${stats.warnings}`;
      const leadsLabel = stats.leads === 0 ? '0 ' : `${stats.leads}`;
      const visitorsReport = buildLastVisitorsReport_(stats.visitorLastSeenByKey);
      messageParts.push(`👥 Unique Visitors: ${visitorsLabel}`);
      messageParts.push(`✉️ New Leads: ${leadsLabel}`);
      // TODO: Improve visitor timestamp summary in the future before re-enabling.
      // messageParts.push(`🕒 ${visitorsReport.label}: ${visitorsReport.value}`);
      // messageParts.push(`🧭 Sources: ${sourcesText}`); // Disabled; source attribution is misleading per log row.
      // messageParts.push(`📱 Devices: ${mobilePct}% Mobile / ${desktopPct}% Desktop`);
      messageParts.push(`🚨 Errors: ${errorsLabel}`);
      messageParts.push(`⚠️ Warnings: ${warningsLabel}`);
      messageParts.push(`📝 Log Entries: ${stats.rows}`);
    });
  }

  /*
    Booking form status is intentionally disabled in the daily bot report.
    This status block is not needed for now, so keep it commented out until
    the operational notification should include intake availability again.

  try {
    const intakeStatus = getBookingIntakeStatus();
    messageParts.push('');
    if (intakeStatus.enabled) {
      messageParts.push('✅ Booking form is active on the hannadunchenko.com');
    } else {
      messageParts.push('🛑 Intake is now paused. Clients will see a paused notice on the hannadunchenko.com');
    }
  } catch (e) {}
  */

  try {
    const emailQuota = MailApp.getRemainingDailyQuota();
    messageParts.push(`📧 Email Quota Remaining: ${emailQuota}`);
  } catch (e) {}

  return sendOperationalTelegramAlert(messageParts.join('\n'));
}

const TEMP_CLEANUP_FOLDER_ID = '1H4PLy_Q7OPJHVHlx-1znHq68OQ_gpJtA';

function runTempFolderCleanupAndNotify() {
  const cleanup = cleanupTempFolderById_(TEMP_CLEANUP_FOLDER_ID);
  const cleanedVolume = formatCleanupVolume_(cleanup.totalBytes);
  const cleanedItemsCount = Number(cleanup.filesCount || 0) + Number(cleanup.foldersCount || 0);

  const messageBody = cleanedItemsCount > 0
    ? [
      `I have deleted the temporary files from the Temp directory. The documents were successfully moved to the Trash (${cleanedVolume}).`,
      'Notice: Items in the Trash are retained for 30 days. During this time, you can visit https://drive.google.com/drive/trash to review the contents and confirm they are no longer needed.',
      'This is an administrative notification; no reply is required.'
    ].join(' ')
    : [
      'There were no temporary files to clean up in the Temp directory this week.',
      'Looks like you need to work harder next week, because I was basically sitting idle.'
    ].join(' ');
  const message = `${messageBody}\n\n✨ Cheers,\nHanna's Bot`;

  const notifyResult = sendOperationalTelegramAlert(message);
  return {
    success: true,
    cleanup: cleanup,
    notify: notifyResult
  };
}

/**
 * Formats cleanup size without hiding small successful cleanups as 0.00 GB.
 *
 * @param {number} bytes Total cleaned bytes.
 * @return {string} Human-readable cleanup volume.
 */
function formatCleanupVolume_(bytes) {
  const safeBytes = Math.max(0, Number(bytes) || 0);
  if (safeBytes === 0) return '0 MB';

  const megabytes = safeBytes / (1024 * 1024);
  const gigabytes = megabytes / 1024;

  if (gigabytes >= 0.01) return `${gigabytes.toFixed(2)} GB`;
  if (megabytes >= 0.01) return `${megabytes.toFixed(2)} MB`;

  return '< 0.01 MB';
}

function cleanupTempFolderById_(folderId) {
  const root = DriveApp.getFolderById(folderId);

  let totalBytes = 0;
  let filesCount = 0;
  let foldersCount = 0;

  const scanStack = [root];
  while (scanStack.length) {
    const current = scanStack.pop();

    const files = current.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      totalBytes += Number(file.getSize() || 0);
      filesCount += 1;
    }

    const folders = current.getFolders();
    while (folders.hasNext()) {
      const folder = folders.next();
      scanStack.push(folder);
    }
  }

  const rootFiles = root.getFiles();
  while (rootFiles.hasNext()) {
    const file = rootFiles.next();
    file.setTrashed(true);
  }

  const rootFolders = root.getFolders();
  while (rootFolders.hasNext()) {
    const folder = rootFolders.next();
    folder.setTrashed(true);
    foldersCount += 1;
  }

  return {
    folderId: folderId,
    totalBytes: totalBytes,
    filesCount: filesCount,
    foldersCount: foldersCount
  };
}
