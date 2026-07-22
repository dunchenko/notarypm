/*
  Email notification builder and sending helpers.
  Extracted from google-apps-script.js for maintainability.
*/

function buildIntakeEmailSubject(data) {
  const SUBJECT_MAX_LEN = 220;
  const name = truncate(normalizeSingleLine(data && data.name || 'Client'), 80) || 'Client';
  const phone = truncate(normalizeSingleLine(data && data.phone || ''), 40) || 'No phone';
  const slotDate = parseSlotIsoToTorontoDate(data && data.dateStr || '');
  const dateLabel = slotDate
    ? Utilities.formatDate(slotDate, TORONTO_TZ, 'yyyy-MM-dd HH:mm')
    : Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd');
  const modeLabel = normalizeSingleLine(data && data.mode || 'Online') || 'Online';
  const prefix = `Service Option: ${modeLabel} | ${name} | ${dateLabel} | ${phone}`;
  const notes = normalizeSingleLine(data && data.notes || '');
  if (!notes) return truncate(prefix, SUBJECT_MAX_LEN);

  const notesPrefix = ' | Brief: ';
  const available = SUBJECT_MAX_LEN - prefix.length - notesPrefix.length;
  if (available <= 0) return truncate(prefix, SUBJECT_MAX_LEN);

  let excerpt = notes;
  if (excerpt.length > available) {
    const hardLimit = Math.max(0, available - 3);
    excerpt = truncate(excerpt, hardLimit).replace(/\s+[^\s]*$/g, '').trim();
    if (!excerpt) excerpt = truncate(notes, hardLimit).trim();
    excerpt = excerpt ? `${excerpt}...` : '';
  }

  return truncate(`${prefix}${notesPrefix}${excerpt}`, SUBJECT_MAX_LEN);
}

function summarizeFailedEmailRecipients(entries) {
  if (!Array.isArray(entries) || !entries.length) return '';
  return entries
    .map(entry => {
      if (!entry) return '';
      const recipient = normalizeSingleLine(entry.recipient || entry.email || '');
      const error = truncate(normalizeSingleLine(entry.error || ''), 160);
      return [recipient, error].filter(Boolean).join(' -> ');
    })
    .filter(Boolean)
    .join(' | ');
}

function buildCompactIntakeFallbackBody(data, databaseSheetUrl, uploadedFiles, sheetWrite, control, diagnostics) {
  const bookingId = normalizeSingleLine((control && control.bookingId) || data.bookingId || '');
  const dbRowNumber = sheetWrite && sheetWrite.success ? Number(sheetWrite.row || 0) : 0;
  const dbRowUrl = dbRowNumber ? getDatabaseRowUrl(dbRowNumber) : '';
  const slotLabel = normalizeSingleLine(data.dateStr || '') || 'No specific date selected';
  const userUploadedFiles = getUserUploadedFiles(uploadedFiles);
  const fileCount = userUploadedFiles.length;
  const folderOpenUrl = buildDriveFolderOpenUrl(
    control && control.folderId ? control.folderId : '',
    control && control.folderUrl ? control.folderUrl : ''
  );
  const fileSectionLines = [];
  if (folderOpenUrl) fileSectionLines.push(`Client folder: ${folderOpenUrl}`);
  if (userUploadedFiles.length) {
    fileSectionLines.push('Files:');
    userUploadedFiles.forEach((file, idx) => {
      const fileName = normalizeSingleLine((file && file.name) || `File ${idx + 1}`);
      const fileUrl = buildDriveFileOpenUrl(file && file.id, (file && file.url) || '') || folderOpenUrl || '';
      fileSectionLines.push(fileUrl ? `${idx + 1}. ${fileName}: ${fileUrl}` : `${idx + 1}. ${fileName}`);
    });
  } else {
    fileSectionLines.push('Files: None');
  }
  const warningText = diagnostics && diagnostics.warning ? diagnostics.warning : '';

  return [
    'Fallback intake notice: the rich HTML notification could not be delivered, so this plain-text copy was sent instead.',
    '',
    `Booking ID: ${bookingId || 'N/A'}`,
    `Client: ${normalizeSingleLine(data.name || '') || 'N/A'}`,
    `Service: ${normalizeSingleLine(getBookingServiceDisplayText(data) || data.service || 'N/A')}`,
    `Phone: ${normalizeSingleLine(data.phone || 'N/A')}`,
    `Email: ${normalizeSingleLine(data.email || 'N/A')}`,
    `DOB: ${normalizeSingleLine(data.dob || 'N/A')}`,
    `Age: ${normalizeSingleLine(data.age || 'N/A')}`,
    `Appointment: ${slotLabel}`,
    `Deadline: ${normalizeSingleLine(data.deadline || 'N/A')}`,
    `Files: ${fileCount}`,
    `Sheet status: ${sheetWrite && sheetWrite.success ? `row ${dbRowNumber}` : `FAILED (${normalizeSingleLine(sheetWrite && sheetWrite.error || 'Unknown error')})`}`,
    dbRowUrl ? `Sheet row: ${dbRowUrl}` : '',
    databaseSheetUrl ? `Sheet: ${databaseSheetUrl}` : '',
    fileSectionLines.join('\n'),
    warningText ? `Preflight: ${warningText}` : ''
  ].filter(Boolean).join('\n');
}

function sendIntakeEmail(data, databaseSheetUrl, uploadedFiles, sheetWrite, control) {
  const recipient = INTAKE_NOTIFICATION_RECIPIENTS;
  const subject = buildIntakeEmailSubject(data);
  const bookingId = normalizeSingleLine((control && control.bookingId) || data.bookingId || '');
  const logSpreadsheetId = getLogSpreadsheetId();
  const nowTorontoRef = getTorontoNowDate();
  const assembledAtLabel = Utilities.formatDate(nowTorontoRef, TORONTO_TZ, 'yyyy-MM-dd HH:mm:ss');

  // Initialize all template variables with defaults to prevent "not defined" errors in catch block
  let targetSlotLabel = normalizeSingleLine(data.dateStr || 'N/A');
  let contactGroupHtml = '';
  let externalIntelSectionHtml = '';
  let missingDocsSectionHtml = '';
  let conflictSectionHtml = '';
  let readyDraftSectionHtml = '';
  let declineDraftSectionHtml = '';
  let forwardConversationSectionHtml = '';
  let timingBannerHtml = '';
  let killZoneSectionHtml = '';
  let technicalDataSectionHtml = '';
  let clientSnapshotSectionHtml = '';
  let topColumnsSectionHtml = '';
  let missingDocsSectionFullHtml = '';
  let databaseStatusFooterHtml = '';
  let killMacroRows = [];
  let dangerMacroRows = [];
  let dashboardMacroRows = [];
  let currentIntakeStatus = { enabled: true };
  let renderErrorMsg = '';
  let errorAlarmHtml = '';

  const sectionWrapStyle = 'margin-top:18px;padding:15px 17px;border-radius:14px;background:radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fffdfa 0%,#f8eee3 54%,#f2e1cf 100%);border:1px solid #e3ccb5;box-shadow:0 10px 22px rgba(90,61,42,0.08);';
  const groupTitleStyle = 'display:block;margin-bottom:10px;color:#5a3d2a;font-size:15px;';

  function renderEmailButtonTable(items, renderCellHtml) {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!safeItems.length) return '';
    const rows = [];
    for (let i = 0; i < safeItems.length; i += 2) {
      const leftItem = safeItems[i];
      const rightItem = safeItems[i + 1];
      rows.push(`
        <tr>
          ${renderCellHtml(leftItem, true)}
          ${rightItem ? renderCellHtml(rightItem, false) : '<td class="email-btn-cell" style="width:50%;padding:0 0 10px 8px;vertical-align:top;"></td>'}
        </tr>
      `);
    }
    return `
      <table class="email-btn-table" role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;">
        <tbody>${rows.join('')}</tbody>
      </table>
    `;
  }

  function renderButtons(items) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return '';
    return renderEmailButtonTable(safeItems, (a, isLeftColumn) => {
      const tone = normalizeSingleLine(a && a.tone || 'secondary').toLowerCase();
      const isDanger = tone === 'danger';
      const isWarning = tone === 'warning';
      const isPrimary = tone === 'primary';
      const isKeep = tone === 'keep';
      const isWhatsApp = tone === 'whatsapp';
      const boxBackground = isDanger
        ? '#fff1f1'
        : (isWarning ? '#fff6de' : (isPrimary ? '#f7ebdd' : (isKeep ? '#fff2bf' : (isWhatsApp ? '#f4f9ee' : '#fffaf4'))));
      const borderColor = isDanger
        ? '#e4b8b8'
        : (isWarning ? '#e8c46a' : (isKeep ? '#ddb648' : (isWhatsApp ? '#d8e7c4' : '#e3ccb5')));
      const linkColor = isDanger
        ? '#8f1c1c'
        : (isWarning ? '#8a5a00' : (isKeep ? '#6c4f00' : (isWhatsApp ? '#587a2e' : '#5a3d2a')));
      const cellPadding = isLeftColumn ? '0 8px 10px 0' : '0 0 10px 8px';
      return `<td class="email-btn-cell" style="width:50%;padding:${cellPadding};vertical-align:top;"><a class="email-btn" href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;background:${boxBackground};border:1px solid ${borderColor};line-height:1.4;color:${linkColor};font-weight:800;text-decoration:none;text-align:center;">${escapeHtml(a.label)}</a></td>`;
    });
  }

  const renderGroup = (title, items, options) => {
    if (!items || !items.length) return '';
    const settings = options && typeof options === 'object' ? options : {};
    const hideTitle = settings.hideTitle === true;
    return `
      <div style="${sectionWrapStyle}">
        ${hideTitle ? '' : `<strong style="${groupTitleStyle}">${escapeHtml(title)} (${items.length})</strong>`}
        <div style="line-height:1.4;">${renderButtons(items)}</div>
      </div>
    `;
  };

  function renderMacroButtons(rows, labelColor, descColor, boxBackground, borderColor) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return '';
    return renderEmailButtonTable(safeRows, (item, isLeftColumn) => {
      const cellPadding = isLeftColumn ? '0 8px 10px 0' : '0 0 10px 8px';
      return `<td class="email-btn-cell" style="width:50%;padding:${cellPadding};vertical-align:top;"><a class="email-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;background:${boxBackground};border:1px solid ${borderColor};line-height:1.4;color:${labelColor};font-weight:800;text-decoration:none;text-align:left;"><span style="display:block;color:${labelColor};font-weight:800;">${escapeHtml(item.label)}</span><span class="email-btn-desc" style="display:block;margin-top:4px;color:${descColor};font-size:12px;line-height:1.35;font-weight:700;">${escapeHtml(item.desc)}</span></a></td>`;
    });
  }

  const slotIso = control && control.slotIso ? normalizeSingleLine(control.slotIso) : normalizeSingleLine(data.dateStr || '');
  const targetSlotStart = data && data.slotStart instanceof Date ? data.slotStart : parseSlotIsoToTorontoDate(slotIso);
  targetSlotLabel = targetSlotStart
    ? Utilities.formatDate(targetSlotStart, TORONTO_TZ, 'yyyy-MM-dd HH:mm')
    : normalizeSingleLine(data.dateStr || 'N/A');

  const safeName = escapeHtml(data.name);
  const safeOccupation = escapeHtml(data.occupation || 'N/A');
  const safeEmail = escapeHtml(data.email);
  const safePhone = escapeHtml(data.phone);
  const clientPhoneTelLink = normalizeSingleLine(buildTelLink(data.phone) || '');
  const safePhoneCellHtml = clientPhoneTelLink
    ? `<a href="${escapeHtml(clientPhoneTelLink)}" style="color:#2f241b;text-decoration:underline;font-weight:700;">${safePhone}</a>`
    : safePhone;
  const safeService = escapeHtml(getBookingServiceDisplayText(data) || data.service || 'N/A');
  const safeDob = escapeHtml(data.dob || 'N/A');
  const safeAge = escapeHtml(data.age || 'N/A');
  const safeReferralSource = escapeHtml(data.referralSource || '');
  const safeDeadline = escapeHtml(data.deadline || 'N/A');
  const safeTerms = data.agreeTerms ? 'Yes' : 'No';
  const safeAddress = escapeHtml(data.address || 'N/A');
  const safeNotes = escapeHtml(data.notes || 'None');
  const modeRaw = normalizeEmailMojibakeText(normalizeSingleLine(data.mode || 'Online')) || 'Online';
  const modeKey = modeRaw.toLowerCase().replace(/[^a-z]/g, '');
  const modeLabel = modeKey === 'online'
    ? 'Online'
    : (modeKey === 'inperson' ? 'In-Person' : modeRaw);
  // Use HTML entities for emoji to avoid mojibake in email clients that mangle UTF-8 emoji bytes.
  const modePrefixHtml = modeKey === 'online'
    ? '<span style="font-size:1em;line-height:1;">&#x1F7E2;</span>&nbsp;'
    : (modeKey === 'inperson'
      ? '<span style="font-size:1em;line-height:1;">&#x1F91D;</span>&nbsp;'
      : '');
  const safeMode = `${modePrefixHtml}${escapeHtml(modeLabel)}`;
  const dbUrl = databaseSheetUrl || getDatabaseSheetUrl();


  const dbStatusText = sheetWrite && sheetWrite.success
    ? `Added automatically to database (row ${sheetWrite.row}).`
    : `Auto-add failed: ${(sheetWrite && sheetWrite.error) ? sheetWrite.error : 'Unknown error'}`;
  const safeDbStatus = escapeHtml(dbStatusText);
  const dbRowNumber = sheetWrite && sheetWrite.success ? Number(sheetWrite.row || 0) : 0;
  const dbRowUrl = dbRowNumber ? getDatabaseRowUrl(dbRowNumber) : '';
  const dbRowAnchor = dbRowUrl
    ? `<a href="${escapeHtml(dbRowUrl)}" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">Row ${dbRowNumber}</a>`
    : 'Row link unavailable';
  const dbSheetAnchor = dbUrl
    ? `<a href="${escapeHtml(dbUrl)}" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">DB Sheet</a>`
    : 'Sheet unavailable';
  const safeBookingId = escapeHtml(bookingId || 'N/A');
  const internalWarningText = buildInternalMailWarningText();
  const internalWarningHtml = buildInternalMailWarningHtml();
  const emailBlockGap = '18px';
  const deleteUrl = control && control.deleteUrl ? normalizeSingleLine(control.deleteUrl) : '';
  const keepNoteName = control && control.keepNoteName ? normalizeSingleLine(control.keepNoteName) : '';
  const keepNoteUrl = control && control.keepNoteUrl ? normalizeSingleLine(control.keepNoteUrl) : '';
  const folderUrl = control && control.folderUrl ? normalizeSingleLine(control.folderUrl) : '';
  const eventId = control && control.eventId ? normalizeSingleLine(control.eventId) : '';
  const folderId = control && control.folderId ? normalizeSingleLine(control.folderId) : '';
  const cameraEvidenceSessionId = control && control.cameraEvidenceSessionId ? normalizeSingleLine(control.cameraEvidenceSessionId) : '';

  const keepDirectUrl = keepNoteUrl || buildKeepNoteUrl(keepNoteName);
  const calendarEventUrl = eventId ? buildCalendarEventLink(eventId) : '';
  const keepSearchUrl = buildKeepSearchLink(buildKeepClientSearchQuery(data, { bookingId: bookingId }));
  const bringForwardPayload = {
    version: 1,
    bookingId: bookingId,
    keepNoteName: truncate(keepNoteName, 180),
    keepNoteUrl: truncate(keepDirectUrl, 500),
    name: truncate(normalizeSingleLine(data.name || ''), NAME_MAX),
    occupation: truncate(normalizeSingleLine(data.occupation || ''), OCCUPATION_MAX),
    email: truncate(normalizeSingleLine(data.email || ''), EMAIL_MAX),
    phone: truncate(normalizeSingleLine(data.phone || ''), PHONE_MAX),
    service: truncate(normalizeSingleLine(data.service || ''), 140),
    dob: truncate(normalizeSingleLine(data.dob || ''), 16),
    age: truncate(normalizeSingleLine(data.age || ''), 12),
    dateStr: truncate(normalizeSingleLine(data.dateStr || ''), 80),
    deadline: truncate(normalizeSingleLine(data.deadline || ''), 80),
    address: truncate(normalizeSingleLine(data.address || ''), ADDRESS_MAX),
    notes: truncate(normalizeMultiLine(data.notes || ''), 240),
    expiresAt: Date.now() + (BRING_FORWARD_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
  };
  const broughtForwardActionUrl = buildSignedActionUrl('bringForward', bringForwardPayload);
  const broughtForwardUrl = keepDirectUrl || keepSearchUrl || broughtForwardActionUrl;
  const keepCardActionUrl = buildSignedActionUrl('keepCard', {
    version: 1,
    tokenId: Utilities.getUuid(),
    bookingId: bookingId,
    keepNoteName: truncate(keepNoteName, 180),
    keepNoteUrl: truncate(keepDirectUrl, 500),
    folderUrl: truncate(folderUrl, 500),
    calendarEventUrl: truncate(calendarEventUrl, 500),
    name: truncate(normalizeSingleLine(data.name || ''), NAME_MAX),
    occupation: truncate(normalizeSingleLine(data.occupation || ''), OCCUPATION_MAX),
    email: truncate(normalizeSingleLine(data.email || ''), EMAIL_MAX),
    phone: truncate(normalizeSingleLine(data.phone || ''), PHONE_MAX),
    service: truncate(normalizeSingleLine(getBookingServiceDisplayText(data) || data.service || ''), 140),
    dob: truncate(normalizeSingleLine(data.dob || ''), 16),
    age: truncate(normalizeSingleLine(data.age || ''), 12),
    referralSource: truncate(normalizeSingleLine(data.referralSource || ''), 160),
    dateStr: truncate(normalizeSingleLine(data.dateStr || ''), 80),
    slotIso: truncate(slotIso, 120),
    deadline: truncate(normalizeSingleLine(data.deadline || ''), 80),
    address: truncate(normalizeSingleLine(data.address || ''), ADDRESS_MAX),
    notes: truncate(normalizeMultiLine(data.notes || ''), 560),
    expiresAt: Date.now() + (ADMIN_ACTION_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
  });

  function makeDangerMacroUrl(mode) {
    return buildSignedActionUrl('dangerMacro', {
      version: 1,
      tokenId: Utilities.getUuid(),
      mode: normalizeSingleLine(mode || ''),
      bookingId: bookingId,
      eventId: eventId,
      folderId: folderId,
      cameraEvidenceSessionId: cameraEvidenceSessionId,
      keepNoteName: keepNoteName,
      expiresAt: Date.now() + (ADMIN_ACTION_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
    });
  }
  function makeDashboardMacroUrl(mode) {
    return buildSignedActionUrl('dashboardMacro', {
      version: 1,
      tokenId: Utilities.getUuid(),
      mode: normalizeSingleLine(mode || ''),
      bookingId: bookingId,
      eventId: eventId,
      folderId: folderId,
      folderUrl: folderUrl,
      keepNoteName: keepNoteName,
      keepNoteUrl: keepDirectUrl,
      cameraEvidenceSessionId: cameraEvidenceSessionId,
      expiresAt: Date.now() + (ADMIN_ACTION_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
    });
  }
  function makeKillMacroUrl(mode) {
    return buildSignedActionUrl('dangerMacro', {
      version: 1,
      tokenId: Utilities.getUuid(),
      mode: normalizeSingleLine(mode || ''),
      bookingId: bookingId,
      eventId: eventId,
      folderId: folderId,
      cameraEvidenceSessionId: cameraEvidenceSessionId,
      keepNoteName: keepNoteName,
      intakeReason: 'Intake is temporarily paused. Please call +1 (437) 239-6833 or email paralegal@hannadunchenko.com.',
      expiresAt: Date.now() + (ADMIN_ACTION_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
    });
  }
  dangerMacroRows = [
    { label: 'Purge Client Everywhere', desc: 'delete all client data across calendar, sheets, drive, keep, logs', url: makeDangerMacroUrl('purge_all') },
    { label: 'Purge Files Only', desc: 'delete only drive files and camera evidence folders', url: makeDangerMacroUrl('purge_files_only') },
    { label: 'Anonymize Client', desc: 'replace personal data with anonymized values in client sheet', url: makeDangerMacroUrl('anonymize_client') },
    { label: 'Export Then Purge', desc: 'export internal txt snapshot then purge all data', url: makeDangerMacroUrl('export_then_purge') },
    { label: 'Undo Last Purge (24h)', desc: 'attempt rollback (informational only)', url: makeDangerMacroUrl('undo_purge_24h') }
  ];
  dashboardMacroRows = [];
  killMacroRows = [
    { label: 'Stop Intake', desc: 'switch website intake off and show the paused notice to clients', url: makeKillMacroUrl('pause_intake') },
    { label: 'Resume Intake', desc: 'switch website intake back on and re-enable the booking form', url: makeKillMacroUrl('resume_intake') }
  ];

  currentIntakeStatus = getBookingIntakeStatus();


  const rawCountryCode = normalizeCountryCode(data.countryCode || 'CA');
  const rawCityFromForm = truncate(normalizeSingleLine(data.addressCity || data.address_city || ''), 80);
  const rawCity = rawCityFromForm || truncate(normalizeSingleLine(data.city || ''), 80);
  const rawIp = truncate(normalizeSingleLine(data.ip || 'Unknown'), 64) || 'Unknown';
  const rawLang = truncate(normalizeSingleLine(data.lang || ''), 80);
  const rawOs = truncate(normalizeSingleLine(data.os || ''), 80);
  const rawBrowserInput = truncate(normalizeSingleLine(data.browser || ''), 180);
  const rawPhoneModel = truncate(normalizeSingleLine(data.deviceModel || ''), 120);
  const rawScreen = truncate(normalizeSingleLine(data.screenResolution || ''), 40);
  const rawViewport = truncate(normalizeSingleLine(data.viewport || ''), 40);
  const rawTimezone = truncate(normalizeSingleLine(data.timezone || ''), 80);
  const rawCores = truncate(normalizeSingleLine(data.cores || ''), 20);
  const rawMemory = truncate(normalizeSingleLine(data.memoryGB || ''), 20);
  const rawNetwork = truncate(normalizeSingleLine(data.network || ''), 120);
  const rawTouchPoints = truncate(normalizeSingleLine(data.touchPoints || ''), 20);
  const rawColorDepth = truncate(normalizeSingleLine(data.colorDepth || ''), 20);
  const rawUserAgent = truncate(normalizeSingleLine(data.userAgent || ''), 600);
  const rawBrowser = truncate(rawBrowserInput || inferBrowserFromUserAgent(rawUserAgent), 180);
  const rawUserAgentSummary = truncate(
    normalizeUserAgentForDisplay(rawUserAgent, { browser: rawBrowser, os: rawOs, device: rawPhoneModel }),
    280
  );
  const rawReferrer = sanitizeObservedReferrerValue(data.referrer || data.referer || '', data.pageUrl || '');
  const rawPageUrl = truncate(normalizeSingleLine(data.pageUrl || ''), 500);
  const safePageUrlValue = sanitizeHttpUrl(rawPageUrl, 500);
  const rawLocationCoords = truncate(normalizeSingleLine(data.locationCoords || ''), 80);
  const rawLocationMapUrl = truncate(normalizeSingleLine(data.locationMapUrl || ''), 500);
  const safeLocationMapUrl = sanitizeHttpUrl(rawLocationMapUrl, 500);
  const fallbackMapQuery = normalizeSingleLine(
    [rawCity, rawCountryCode].filter(Boolean).join(' ') || data.address || ''
  );
  const locationMapUrl = safeLocationMapUrl
    || (rawLocationCoords ? `https://www.google.com/maps?q=${encodeUriValue(rawLocationCoords)}` : '')
    || buildMapsSearchLink(fallbackMapQuery);
  const ipWhoisUrl = rawIp && rawIp !== 'Unknown' ? buildGoogleSearchLink(`whois ${rawIp}`) : '';
  const ipWhoisUrlBing = rawIp && rawIp !== 'Unknown' ? buildBingSearchLink(`whois ${rawIp}`) : '';
  const ipGeoUrl = rawIp && rawIp !== 'Unknown' ? buildGoogleSearchLink(`ip location ${rawIp}`) : '';
  const ipGeoUrlBing = rawIp && rawIp !== 'Unknown' ? buildBingSearchLink(`ip location ${rawIp}`) : '';
  const deviceLookupQuery = rawPhoneModel ? `Ontario ${rawPhoneModel} ${rawOs} specs` : '';
  const deviceLookupUrl = deviceLookupQuery ? buildGoogleSearchLink(deviceLookupQuery) : '';
  const deviceLookupUrlBing = deviceLookupQuery ? buildBingSearchLink(deviceLookupQuery) : '';
  const userAgentLookupQuery = rawUserAgent ? `Ontario user agent ${truncate(rawUserAgent, 140)}` : '';
  const userAgentLookupUrl = userAgentLookupQuery ? buildGoogleSearchLink(userAgentLookupQuery) : '';
  const userAgentLookupUrlBing = userAgentLookupQuery ? buildBingSearchLink(userAgentLookupQuery) : '';
  const caseStarter = buildCaseStarterToolkit(data, rawCity || rawCountryCode);
  const OFFICIAL_FORMS_PORTAL_BY_SERVICE = {
    'LTB related issue': 'https://tribunalsontario.ca/ltb/forms/',
    'WSIB related issue': 'https://www.wsib.ca/en/forms',
    'Employment Law': 'https://www.ontario.ca/document/your-guide-employment-standards-act-0/filing-employment-standards-claim',
    'Civil matter': 'https://ontariocourtforms.on.ca/en/scc/',
    'Traffic Ticket Defense': 'https://www.ontario.ca/ticketsandfines',
    'Road Record Defense': 'https://www.ontario.ca/page/get-driving-record',
    'Public Notary Services': 'https://www.ontario.ca/page/notary-public-and-commissioners',
    'Other': 'https://www.ontario.ca/page/government-forms'
  };
  const serviceFormsPortalUrl =
    OFFICIAL_FORMS_PORTAL_BY_SERVICE[getBookingServiceCanonicalName(data)]
    || OFFICIAL_FORMS_PORTAL_BY_SERVICE.Other;
  const serviceFormsPortalAnchor = serviceFormsPortalUrl
    ? `<a href="${escapeHtml(serviceFormsPortalUrl)}" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">Forms</a>`
    : 'N/A';
  const caseStarterScopeAnchor = caseStarter.scopeUrl
    ? `<a href="${escapeHtml(caseStarter.scopeUrl)}" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">Search</a>`
    : 'N/A';
  const caseStarterFormLinkAnchor = serviceFormsPortalUrl
    ? `<a href="${escapeHtml(serviceFormsPortalUrl)}" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">Form</a>`
    : 'N/A';
  const caseStarterFormsHtml = caseStarter.forms && caseStarter.forms.length
    ? caseStarter.forms
      .map(form => `<li style="margin:0 0 6px 0;color:#2f241b;">${escapeHtml(form)} <span style="font-size:12px;color:#5a3d2a;"> - ${caseStarterFormLinkAnchor}</span></li>`)
      .join('')
    : '<li style="margin:0;color:#2f241b;">No mapped forms for this service yet.</li>';
  const caseStarterRowsHtml = caseStarter.rows && caseStarter.rows.length
    ? caseStarter.rows.map(row => {
      const officialAnchor = `<a href="${escapeHtml(row.officialUrl)}" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">Source</a>`;
      return `<tr>
          <td style="padding:8px 10px;border-top:1px solid #ead9cb;color:#2f241b;font-weight:700;vertical-align:top;">${escapeHtml(row.task)}</td>
          <td style="padding:8px 10px;border-top:1px solid #ead9cb;color:#2f241b;vertical-align:top;">${officialAnchor}</td>
          <td style="padding:8px 10px;border-top:1px solid #ead9cb;color:#4a3829;vertical-align:top;">${escapeHtml(row.purpose || 'Official procedural source')}</td>
        </tr>`;
    }).join('')
    : `<tr>
      <td style="padding:8px 10px;border-top:1px solid #ead9cb;color:#2f241b;font-weight:700;vertical-align:top;">General legal resources</td>
      <td style="padding:8px 10px;border-top:1px solid #ead9cb;color:#2f241b;vertical-align:top;"><a href="https://www.ontario.ca/page/getting-legal-help" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">Source</a></td>
      <td style="padding:8px 10px;border-top:1px solid #ead9cb;color:#4a3829;vertical-align:top;">Fallback entry point for legal process and routing.</td>
    </tr>`;
  const caseStarterSectionHtml = `
    <div style="margin-top:${emailBlockGap};padding:14px 16px;border-radius:12px;background:#fff;border:1px solid #e8d9ca;">
      <strong style="display:block;margin-bottom:8px;color:#5a3d2a;">Case Starter (Official) - ${escapeHtml(caseStarter.service)}</strong>
      <div style="margin:0 0 12px 0;padding:10px 12px;border-radius:10px;background:#f8efe7;border:1px solid #e6d3c1;">
        <div style="font-size:13px;color:#5a3d2a;font-weight:700;margin-bottom:6px;">Ontario forms checklist for this matter (${caseStarter.forms.length})</div>
        <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.35;">${caseStarterFormsHtml}</ul>
      </div>
      <div style="margin:0 0 10px 0;font-size:13px;color:#5a3d2a;">
        <strong>Official forms portal:</strong> ${serviceFormsPortalAnchor}
      </div>
      <div style="margin:0 0 10px 0;font-size:13px;color:#5a3d2a;">
        <strong>Matter Scope Search (Ontario):</strong> ${caseStarterScopeAnchor}
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.4;border:1px solid #ead9cb;border-radius:10px;overflow:hidden;">
        <tr style="background:#f4ece4;">
          <th style="text-align:left;padding:8px 10px;color:#5a3d2a;font-size:12px;">Task</th>
          <th style="text-align:left;padding:8px 10px;color:#5a3d2a;font-size:12px;">Link</th>
          <th style="text-align:left;padding:8px 10px;color:#5a3d2a;font-size:12px;">Purpose</th>
        </tr>
        ${caseStarterRowsHtml}
      </table>
    </div>
  `;

  const safeCountryCode = escapeHtml(rawCountryCode || 'Canada (Ontario)');
  const safeCity = escapeHtml(rawCity || 'Toronto');
  const safeIp = escapeHtml(rawIp || 'N/A');
  const safeLang = escapeHtml(rawLang || 'N/A');
  const safeOs = escapeHtml(rawOs || 'N/A');
  const safeBrowser = escapeHtml(rawBrowser || 'N/A');
  const safePhoneModel = escapeHtml(rawPhoneModel || 'N/A');
  const safeScreen = escapeHtml(rawScreen || 'N/A');
  const safeViewport = escapeHtml(rawViewport || 'N/A');
  const safeTimezone = escapeHtml(rawTimezone || 'N/A');
  const safeCores = escapeHtml(rawCores || 'N/A');
  const safeMemory = escapeHtml(rawMemory || 'N/A');
  const safeNetwork = escapeHtml(rawNetwork || 'N/A');
  const safeTouchPoints = escapeHtml(rawTouchPoints || 'N/A');
  const safeColorDepth = escapeHtml(rawColorDepth || 'N/A');
  const safeUserAgentSummary = escapeHtml(rawUserAgentSummary || 'N/A');
  const safeReferrerText = escapeHtml(rawReferrer || 'None');
  const safePageUrlText = escapeHtml(rawPageUrl || 'N/A');
  const safeCoords = escapeHtml(rawLocationCoords || 'N/A');
  const mapAnchor = locationMapUrl
    ? `<a href="${escapeHtml(locationMapUrl)}" target="_blank" rel="noopener noreferrer" style="color:#1768d1;text-decoration:none;font-weight:700;">Map</a>`
    : 'N/A';
  const whoisAnchor = ipWhoisUrl
    ? `<a href="${escapeHtml(ipWhoisUrl)}" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">Whois</a>`
    : 'N/A';
  const ipGeoAnchor = ipGeoUrl
    ? `<a href="${escapeHtml(ipGeoUrl)}" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">Geo</a>`
    : 'N/A';
  const pageUrlAnchor = (safePageUrlValue && shouldLinkObservedPageUrl(safePageUrlValue))
    ? `<a href="${escapeHtml(safePageUrlValue)}" target="_blank" rel="noopener noreferrer" style="color:#1768d1;text-decoration:none;font-weight:700;">URL</a>`
    : safePageUrlText;
  const referrerAnchor = safeReferrerText;

  const userUploadedFiles = getUserUploadedFiles(uploadedFiles);
  const clientFolderOpenUrl = buildDriveFolderOpenUrl(folderId, folderUrl);
  const folderFallbackUrl = clientFolderOpenUrl || 'https://drive.google.com/drive/my-drive';
  const folderListItemHtml = clientFolderOpenUrl
    ? `<li style="margin:0 0 8px 0;"><a href="${escapeHtml(clientFolderOpenUrl)}" target="_blank" rel="noopener noreferrer" style="color:#1768d1;text-decoration:underline;word-break:break-all;font-weight:700;">Open client folder</a></li>`
    : '';
  const fileItemsHtml = userUploadedFiles.length
    ? userUploadedFiles
      .map((f, idx) => {
        const fileName = normalizeSingleLine((f && f.name) || `File ${idx + 1}`);
        const safeName = escapeHtml(fileName);
        const safeUrl = buildDriveFileOpenUrl(f && f.id, (f && f.url) || '');
        const effectiveUrl = safeUrl || folderFallbackUrl;
        return `<li style="margin:0 0 8px 0;"><a href="${escapeHtml(effectiveUrl)}" target="_blank" rel="noopener noreferrer" style="color:#1768d1;text-decoration:underline;word-break:break-all;font-weight:700;">${safeName}</a></li>`;
      })
      .join('')
    : '<li style="margin:0;">No attachments</li>';
  const fileHtml = `${folderListItemHtml}${fileItemsHtml}`;
  const plainTextFileLines = [];
  if (clientFolderOpenUrl) plainTextFileLines.push(`Client folder: ${clientFolderOpenUrl}`);
  if (userUploadedFiles.length) {
    userUploadedFiles.forEach((file, idx) => {
      const fileName = normalizeSingleLine((file && file.name) || `File ${idx + 1}`);
      const fileUrl = buildDriveFileOpenUrl(file && file.id, (file && file.url) || '') || folderFallbackUrl;
      plainTextFileLines.push(`${idx + 1}. ${fileName}: ${fileUrl}`);
    });
  } else {
    plainTextFileLines.push('Files: None');
  }
  const followupSubject = `Re: Intake request - ${normalizeSingleLine(data.name)}`;
  const followupBody = [
    `Hello ${normalizeSingleLine(data.name)},`,
    '',
    'Thank you for your intake request.',
    'We reviewed your details and will follow up shortly.',
    '',
    'Kind regards,',
    'Hanna Dunchenko'
  ].join('\n');


  const deadlineRef = parseDeadlineDateOnly(data.deadline || '');
  const deadlineHours = deadlineRef
    ? Math.round((deadlineRef.getTime() - nowTorontoRef.getTime()) / (60 * 60 * 1000))
    : null;
  const deadlineDays = deadlineHours == null ? null : Math.ceil(deadlineHours / 24);
  let deadlineBadgeBg = '#f4ece4';
  let deadlineBadgeBorder = '#dfccba';
  let deadlineBadgeColor = '#5a3d2a';
  let deadlineBadgeHint = '';
  if (deadlineHours != null) {
    if (deadlineHours <= 72) {
      deadlineBadgeBg = '#ffdce2';
      deadlineBadgeBorder = '#c83f55';
      deadlineBadgeColor = '#7f1d2d';
      deadlineBadgeHint = deadlineHours < 0
        ? `Overdue by ${Math.abs(deadlineDays || 0)} day(s)`
        : `${Math.max(0, deadlineDays || 0)} day(s) left`;
    } else if (deadlineHours <= 14 * 24) {
      deadlineBadgeBg = '#ffe5f2';
      deadlineBadgeBorder = '#c86a96';
      deadlineBadgeColor = '#80385b';
      deadlineBadgeHint = `${Math.max(0, deadlineDays || 0)} day(s) left`;
    } else {
      deadlineBadgeHint = `${Math.max(0, deadlineDays || 0)} day(s) left`;
    }
  }
  const deadlineDisplayValue = deadlineRef
    ? Utilities.formatDate(deadlineRef, TORONTO_TZ, 'yyyy-MM-dd')
    : normalizeSingleLine(data.deadline || 'N/A');
  const deadlineCellHtml = deadlineHours != null
    ? `<span style="display:inline-block;padding:4px 8px;border-radius:999px;border:1px solid ${deadlineBadgeBorder};background:${deadlineBadgeBg};color:${deadlineBadgeColor};font-weight:800;">${escapeHtml(deadlineDisplayValue)}</span>${deadlineBadgeHint ? `<span style="margin-left:8px;color:${deadlineBadgeColor};font-size:12px;font-weight:700;">${escapeHtml(deadlineBadgeHint)}</span>` : ''}`
    : safeDeadline;
  const missingKeyData = [];
  if (!normalizeSingleLine(data.name || '')) missingKeyData.push('Name');
  if (!normalizeSingleLine(data.email || '')) missingKeyData.push('Email');
  if (!normalizeSingleLine(data.phone || '')) missingKeyData.push('Phone');
  if (!normalizeSingleLine(data.service || '')) missingKeyData.push('Service');
  if (!normalizeSingleLine(data.address || '')) missingKeyData.push('Address');
  const uploadedFilesCount = userUploadedFiles.length;
  if (!uploadedFilesCount) missingKeyData.push('Supporting files');

  const checklistForms = getKeepFormsChecklist(data.service);
  const uploadedNameNorm = userUploadedFiles
    .map(f => normalizeSingleLine(f && f.name || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
  const normalizeDocCode = value => normalizeSingleLine(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isChecklistFormReceived = formName => {
    const form = normalizeSingleLine(formName || '');
    if (!form) return false;
    const codeMatch = form.match(/\b([A-Z]{1,3}\s?\d+[A-Z]?)\b/i);
    if (codeMatch && codeMatch[1]) {
      const codeToken = normalizeDocCode(codeMatch[1]);
      if (codeToken && uploadedNameNorm.some(name => name.indexOf(codeToken) !== -1)) {
        return true;
      }
    }
    const words = form
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(w => w && w.length >= 6);
    if (!words.length) return false;
    return words.some(word => uploadedNameNorm.some(name => name.indexOf(word) !== -1));
  };
  const checklistRows = checklistForms.map(form => ({
    name: form,
    received: isChecklistFormReceived(form)
  }));
  const receivedDocsCount = checklistRows.filter(row => row.received).length;
  const missingDocsRows = checklistRows.filter(row => !row.received);
  const missingDocsCount = missingDocsRows.length;
  const checklistRowsHtml = checklistRows.length
    ? checklistRows.map(row => {
      const mark = row.received ? '&#x2611;' : '&#x2610;';
      const color = row.received ? '#2f6f3a' : '#6a4f3c';
      const officialLink = serviceFormsPortalUrl
        ? ` <span style="font-size:12px;color:#7b5b47;"> - <a href="${escapeHtml(serviceFormsPortalUrl)}" target="_blank" style="color:#1768d1;text-decoration:none;font-weight:700;">Official form</a></span>`
        : '';
      return `<li style="margin:0 0 6px 0;color:${color};">${mark} ${escapeHtml(row.name)}${officialLink}</li>`;
    }).join('')
    : '<li style="margin:0;color:#4b3a2b;">No checklist mapped for this service.</li>';
  const missingDocsSummary = missingDocsCount
    ? `${missingDocsCount} pending`
    : 'No pending items detected from filenames';

  const conflictMacroUrl = makeDashboardMacroUrl('conflict_check');
  let conflictStatus = 'Check failed (open macro).';
  let conflictRows = [];
  try {
    const conflict = runMatterConflictCheck({
      name: normalizeSingleLine(data.name || ''),
      email: normalizeSingleLine(data.email || ''),
      phone: normalizeSingleLine(data.phone || '')
    });
    const ownRow = sheetWrite && sheetWrite.success ? Number(sheetWrite.row || 0) : 0;
    const rawRows = Array.isArray(conflict && conflict.rows) ? conflict.rows : [];
    conflictRows = ownRow
      ? rawRows.filter(row => Number(row && row.rowNumber || 0) !== ownRow)
      : rawRows;
    const adjustedCount = Math.max(0, Number(conflict && conflict.count || 0) - (ownRow ? 1 : 0));
    conflictStatus = adjustedCount
      ? `Review required (${adjustedCount} potential matches).`
      : 'Clear (no prior matches found).';
  } catch (conflictErr) {
    conflictStatus = 'Check failed (open macro).';
    conflictRows = [];
  }
  const conflictRowsHtml = conflictRows.length
    ? conflictRows.slice(0, 4).map(row => `<li style="margin:0 0 6px 0;color:#4b3a2b;">Row ${Number(row.rowNumber || 0)}: ${escapeHtml(row.name || 'N/A')} | ${escapeHtml(row.service || 'N/A')} | ${escapeHtml(row.dateStr || 'N/A')}</li>`).join('')
    : '<li style="margin:0;color:#4b3a2b;">No matching rows to review.</li>';

  const paymentSignalSource = `${normalizeSingleLine(data.notes || '')} ${normalizeSingleLine(data.referralSource || '')}`;
  let paymentStatus = 'Not requested';
  if (/(paid|payment received|retainer paid|deposit paid|etransfer received|e-transfer received)/i.test(paymentSignalSource)) {
    paymentStatus = 'Paid';
  } else if (/(invoice|retainer|deposit|payment|etransfer|e-transfer|wire|card|transfer)/i.test(paymentSignalSource)) {
    paymentStatus = 'Requested';
  }
  const paymentAmountMatch = paymentSignalSource.match(/(?:\$|cad\s*)(\d{2,6}(?:[.,]\d{2})?)/i);
  const paymentAmount = paymentAmountMatch ? `${String(paymentAmountMatch[1]).replace(',', '.')} CAD` : 'N/A';
  const trustLedgerUrl = makeDashboardMacroUrl('trust_ledger');

  const readyDraftSubject = `Next steps for your intake - ${normalizeSingleLine(data.name)}`;
  const appointmentDateLabel = targetSlotStart
    ? Utilities.formatDate(targetSlotStart, TORONTO_TZ, 'MMMM dd, yyyy')
    : 'MMMM DD, YYYY';
  const appointmentTimeLabel = targetSlotStart
    ? Utilities.formatDate(targetSlotStart, TORONTO_TZ, 'h:mm a')
    : 'HH:MM AM/PM';
  const readyDraftLines = modeKey === 'inperson'
    ? [
      `Dear ${normalizeSingleLine(data.name || '%USERNAME%')},`,
      '',
      'We have received your inquiry and confirm your appointment!',
      '',
      'Appointment details:',
      `${appointmentDateLabel} at ${appointmentTimeLabel}`,
      '146 Thirtieth Street, Suite 100, Toronto, ON',
      '',
      'Identification Requirement',
      'At the time of your appointment, you must present a valid government-issued ID and provide the following information: full name, date of birth, home address and telephone number, and occupation.',
      '',
      'Additional Documents to Collect (if available):',
      '',
      '...',
      '',
      'Text messages and call logs (including correspondence, letters, phone calls, messenger communications, screenshots of call attempts and declined calls)',
      '',
      'Expense Records (all relevant expenses)',
      '',
      'Supporting Documentation (all relevant materials)',
      '',
      '',
      'Duration and Pricing',
      '',
      'Please note that your booked consultation is limited to 40 minutes. If you have specific matters to discuss, kindly prepare your questions and submit them at least one day prior to the consultation.',
      '',
      'The fee for the scheduled session is $75 CAD + HST, payable after the consultation has been completed. Any time exceeding the reserved 40 minutes will be billed accordingly.',
      '',
      '',
      'Best regards,',
      'Hanna Dunchenko',
      'Licensed Paralegal',
      '+1 (437) 239-6833',
      'www.hannadunchenko.com'
    ]
    : [
      `Dear ${normalizeSingleLine(data.name || '%USERNAME%')},`,
      '',
      'We have received your inquiry and confirm your appointment!',
      '',
      'Appointment details:',
      `${appointmentDateLabel} at ${appointmentTimeLabel}`,
      'On-line via ZOOM',
      '',
      'Identity verification requirement',
      'Because this consultation will be conducted online, you must complete virtual identity verification (VIV) before the meeting. An email from Treefort with VIV instructions and a verification link will be sent to you shortly. Once your VIV verification is complete, we will provide the Zoom link for the consultation.',
      '',
      'Additional documents to collect (if available):',
      '',
      'Text messages and call logs (including correspondence, letters, phone calls, messenger communications, screenshots of call attempts and declined calls)',
      '',
      '... (if available)',
      '',
      'Expense Records (all relevant expenses)',
      '',
      'Supporting Documentation (all relevant materials)',
      '',
      '',
      'Duration and Pricing',
      '',
      'Please note that your booked consultation is limited to 40 minutes. If you have specific matters to discuss, kindly prepare your questions and submit them at least one day prior to the consultation.',
      '',
      'The fee for the scheduled session is 75 CAD + HST and 25 CAD for VIV, payable after the consultation has been completed. Any time exceeding the reserved 40 minutes will be billed accordingly.',
      '',
      '',
      'Best regards,',
      'Hanna Dunchenko',
      'Licensed Paralegal',
      '+1 (437) 239-6833',
      'www.hannadunchenko.com'
    ];
  const readyDraftBody = readyDraftLines.join('\n');
  const readyDraftMailto = data.email
    ? buildMailtoLink(data.email, readyDraftSubject, readyDraftBody)
    : '';
  const readyDraftGmailCompose = buildGmailComposeLink(data.email || '', readyDraftSubject, readyDraftBody);
  const readyDraftPreviewHtml = escapeHtml(readyDraftBody).replace(/\n/g, '<br>');
  const declineDraftName = normalizeSingleLine(data.name || 'Client');
  const declineDraftSubject = `Update on your intake request - ${declineDraftName}`;
  const declineDraftBody = [
    `Hello ${declineDraftName},`,
    '',
    'Thank you for your intake request.',
    'We have reviewed your intake and, unfortunately, we must decline to proceed due to operational reasons at this time.',
    'This message is not legal advice and does not assess the merits of your matter.',
    'If your matter is urgent, please contact another licensed Ontario paralegal or lawyer immediately.',
    '',
    'Kind regards,',
    'Hanna Dunchenko'
  ].join('\n');
  const declineDraftMailto = data.email
    ? buildMailtoLink(data.email, declineDraftSubject, declineDraftBody)
    : '';
  const declineDraftGmailCompose = buildGmailComposeLink(data.email || '', declineDraftSubject, declineDraftBody);
  const declineDraftPreviewHtml = escapeHtml(declineDraftBody).replace(/\n/g, '<br>');
  const delegateConversationSubject = `Referral / delegation opportunity - ${normalizeSingleLine(data.name || 'Client')} - ${normalizeSingleLine(getBookingServiceDisplayText(data) || data.service || 'Matter')}`;
  const delegateConversationNotes = truncate(normalizeMultiLine(data.notes || ''), 900);
  const isDelegateInternalFile = (file) => {
    const fileName = normalizeSingleLine(file && file.name || '').toLowerCase();
    return !!fileName && (
      fileName.indexOf('client_info.txt') !== -1
      || fileName.indexOf('client info.txt') !== -1
      || fileName.indexOf('clientinfo.txt') !== -1
    );
  };
  const getDelegateFileTypeLabel = (file) => {
    const ext = getFileExtension(file && file.name || '');
    if (/^(jpg|jpeg|png|gif|webp|heic)$/i.test(ext)) return 'IMAGE';
    if (/^(mov|mp4|avi|m4v|wmv)$/i.test(ext)) return 'VIDEO';
    if (ext === 'pdf') return 'PDF';
    if (ext === 'doc' || ext === 'docx' || ext === 'txt' || ext === 'rtf') return 'DOC';
    if (ext === 'zip' || ext === 'rar') return 'ARCHIVE';
    return ext ? String(ext).toUpperCase() : 'FILE';
  };
  const delegateConversationFileLines = [];
  const delegateConversationFiles = Array.isArray(uploadedFiles)
    ? uploadedFiles.filter((file) => file && file.url && !isDelegateInternalFile(file))
    : [];
  if (delegateConversationFiles.length) {
    delegateConversationFiles.forEach((file, idx) => {
      const fileName = normalizeSingleLine(file.name || `File ${idx + 1}`);
      const fileUrl = sanitizeHttpUrl(file.url || '', 1000);
      const fileTypeLabel = getDelegateFileTypeLabel(file);
      delegateConversationFileLines.push(`${fileTypeLabel}: ${fileName}`);
      delegateConversationFileLines.push(fileUrl || 'Link unavailable');
      if (idx < delegateConversationFiles.length - 1) {
        delegateConversationFileLines.push('');
      }
    });
  } else {
    delegateConversationFileLines.push('No client file links are available yet.');
  }
  const delegateConversationFilePreviewHtml = delegateConversationFiles.length
    ? `<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">${delegateConversationFiles.map((file, idx) => {
      const fileName = normalizeSingleLine(file.name || `File ${idx + 1}`);
      const safeUrl = sanitizeHttpUrl(file.url || '', 1000);
      const fileTypeLabel = getDelegateFileTypeLabel(file);
      if (!safeUrl) {
        return `<div style="padding:10px 12px;border-radius:10px;background:rgba(255,245,247,0.14);border:1px solid rgba(255,225,231,0.28);color:#fff7f8;font-size:12px;font-weight:800;">${escapeHtml(fileTypeLabel)}: ${escapeHtml(fileName)}</div>`;
      }
      return `<div style="padding:10px 12px;border-radius:10px;background:rgba(255,245,247,0.14);border:1px solid rgba(255,225,231,0.28);color:#fff7f8;font-size:12px;font-weight:800;">${escapeHtml(fileTypeLabel)}: ${escapeHtml(fileName)}<br><a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" style="color:#ffb6c1;text-decoration:underline;word-break:break-all;font-weight:400;margin-top:4px;display:inline-block;">${escapeHtml(safeUrl)}</a></div>`;
    }).join('')}</div>`
    : '';
  const delegateConversationBody = [
    "Hello, I'm Hanna Dunchenko.",
    '',
    'I have a client inquiry that may be a strong fit for your practice, and I would like to refer this matter to you if you are open to taking ownership of the conversation through a referral arrangement.',
    '',
    'The client approached me directly for assistance. Based on the subject matter and the documents already provided, I believe you may be well placed to review the file and decide whether you would like to take it on.',
    '',
    'Client details:',
    `- Name: ${normalizeSingleLine(data.name || 'N/A')}`,
    `- Email: ${normalizeSingleLine(data.email || 'N/A')}`,
    `- Phone: ${normalizeSingleLine(data.phone || 'N/A')}`,
    `- Service requested: ${normalizeSingleLine(getBookingServiceDisplayText(data) || data.service || 'N/A')}`,
    `- Deadline: ${normalizeSingleLine(data.deadline || 'N/A')}`,
    `- Appointment slot: ${normalizeSingleLine(targetSlotLabel || 'N/A')}`,
    `- Notes: ${delegateConversationNotes || 'N/A'}`,
    '',
    'Client materials:',
    ...delegateConversationFileLines,
    '',
    'If this looks like a fit, please let me know and I will coordinate the handoff and client introduction promptly.',
    '',
    'Kind regards,',
    'Hanna Dunchenko',
    'Licensed Paralegal, Ontario',
    '+1 (437) 239-6833',
    'paralegal@hannadunchenko.com'
  ].join('\n');
  const delegateConversationGmailCompose = buildGmailComposeLink('', delegateConversationSubject, delegateConversationBody);
  const missingDocsDraftUrl = makeDashboardMacroUrl('missing_docs_draft');

  missingDocsSectionHtml = `
    <div style="margin-top:0;padding:15px 17px;border-radius:14px;background:radial-gradient(120% 130% at 14% 6%,rgba(255,255,255,0.78) 0%,rgba(255,255,255,0) 54%),linear-gradient(158deg,#fffdfa 0%,#f7ece0 52%,#f3e3d3 100%);border:1px solid #e3ccb5;box-shadow:0 10px 22px rgba(90,61,42,0.08);">
      <strong style="display:block;margin-bottom:8px;color:#5a3d2a;">Missing Docs Checklist</strong>
      <div style="margin:0 0 8px 0;color:#4b3a2b;font-size:13px;">Received by filename match: <strong>${receivedDocsCount}/${checklistRows.length}</strong> | Pending: <strong>${escapeHtml(missingDocsSummary)}</strong></div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.35;word-break:normal;overflow-wrap:break-word;">${checklistRowsHtml}</ul>
      <div style="margin-top:11px;">
        <a class="email-btn" href="${escapeHtml(missingDocsDraftUrl)}" target="_blank" style="display:inline-block;padding:9px 13px;border-radius:9px;background:linear-gradient(180deg,#fff9f1 0%,#f2ddc7 100%);color:#5a3d2a;text-decoration:none;font-weight:800;border:1px solid #d2b79c;">Open Missing Docs Draft Macro</a>
      </div>
    </div>
  `;
  conflictSectionHtml = `
    <div style="margin-top:${emailBlockGap};padding:15px 17px;border-radius:14px;background:radial-gradient(120% 130% at 14% 6%,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0) 52%),linear-gradient(160deg,#fffdfa 0%,#f9efe3 52%,#f4e5d5 100%);border:1px solid #e3ccb5;box-shadow:0 10px 22px rgba(90,61,42,0.08);">
      <strong style="display:block;margin-bottom:8px;color:#5a3d2a;">Conflict Check Snapshot</strong>
      <p style="margin:0 0 8px 0;color:#2f241b;"><strong>Status:</strong> ${escapeHtml(conflictStatus)}</p>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.35;word-break:normal;overflow-wrap:break-word;">${conflictRowsHtml}</ul>
      <div style="margin-top:11px;">
        <a class="email-btn" href="${escapeHtml(conflictMacroUrl)}" target="_blank" style="display:inline-block;padding:9px 13px;border-radius:9px;background:linear-gradient(180deg,#fff9f1 0%,#f2ddc7 100%);color:#5a3d2a;text-decoration:none;font-weight:800;border:1px solid #d2b79c;">Run Full Conflict Check</a>
      </div>
    </div>
  `;
  readyDraftSectionHtml = `
    <div style="margin-top:18px;padding:15px 17px;border-radius:14px;background:radial-gradient(120% 130% at 16% 8%,rgba(255,255,255,0.84) 0%,rgba(255,255,255,0) 52%),linear-gradient(160deg,#fffdf9 0%,#f7ede2 56%,#f4e4d4 100%);border:1px solid #e2c8ad;box-shadow:0 10px 22px rgba(90,61,42,0.08);">
      <strong style="display:block;margin-bottom:8px;color:#5a3d2a;">Ready-to-Send Client Draft</strong>
      <div style="margin:0 0 10px 0;padding:11px 13px;border-radius:11px;background:linear-gradient(180deg,#ffffff 0%,#fff9f2 100%);border:1px solid #ead8c7;font-size:15px;line-height:1.55;color:#3f2f22;">${readyDraftPreviewHtml}</div>
      <div style="margin-top:6px;">
        <a class="email-btn" href="${escapeHtml(readyDraftGmailCompose)}" target="_blank" style="display:inline-block;margin:0 8px 8px 0;padding:10px 14px;border-radius:9px;background:linear-gradient(180deg,#5a3d2a 0%,#3f2f22 100%);color:#ffffff;text-decoration:none;font-weight:800;border:1px solid #2f241b;box-shadow:0 4px 10px rgba(90,61,42,0.15);">Open Ready Draft (Gmail)</a>
      </div>
    </div>
  `;
  declineDraftSectionHtml = `
    <div style="margin-top:18px;padding:16px 18px;border-radius:14px;background:radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.16) 0%,rgba(255,255,255,0) 48%),linear-gradient(152deg,#ff75b5 0%,#ff4f9b 52%,#e6287a 100%);border:1px solid #dc2c7a;box-shadow:0 14px 28px rgba(214,27,107,0.28);">
      <strong style="display:block;margin-bottom:8px;color:#fff8fc;font-size:17px;line-height:1.2;">Polite Decline Template</strong>
      <div style="margin:0 0 10px 0;color:#ffe8f4;font-size:13px;line-height:1.55;font-weight:700;">One client-facing decline draft, ready to open in Mail or Gmail.</div>

      <div style="margin:0;padding:12px 13px;border-radius:11px;background:rgba(255,245,249,0.16);border:1px solid rgba(255,227,239,0.34);color:#fff6fa;font-size:12px;line-height:1.6;">
        <div style="margin:0 0 10px 0;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.92);border:1px solid rgba(255,218,234,0.92);font-size:13px;line-height:1.5;color:#5a2b3f;">${declineDraftPreviewHtml}</div>
        <div style="margin-top:6px;">
          <a class="email-btn" href="${escapeHtml(declineDraftGmailCompose)}" target="_blank" style="display:inline-block;margin:0 8px 8px 0;padding:11px 16px;border-radius:9px;background:linear-gradient(180deg,#fff4fa 0%,#ffd6ea 100%);color:#9c1855;text-decoration:none;font-weight:900;border:1px solid #ffc0de;box-shadow:0 8px 18px rgba(255,214,234,0.24);">Open Decline Draft (Gmail)</a>
        </div>
      </div>
    </div>
  `;
  forwardConversationSectionHtml = `
    <div style="margin-top:18px;padding:16px 18px;border-radius:14px;background:radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.16) 0%,rgba(255,255,255,0) 48%),linear-gradient(152deg,#ff89bf 0%,#ff67ac 52%,#f04490 100%);border:1px solid #e15397;box-shadow:0 14px 28px rgba(214,52,127,0.22);">
      <strong style="display:block;margin-bottom:8px;color:#fff8fc;font-size:17px;line-height:1.2;">Forward Conversation</strong>
      <div style="margin:0 0 10px 0;color:#fff0f7;font-size:13px;line-height:1.55;font-weight:700;">
        Choose one assignee who will take real ownership of this conversation.
        <br><br>
        Do not casually pass clients around or forward blindly just to “see who wants it.”
      </div>
      <div style="margin:0;padding:12px 13px;border-radius:11px;background:rgba(255,246,250,0.16);border:1px solid rgba(255,231,241,0.34);color:#fff7fb;font-size:12px;line-height:1.6;">
        Follow the instructions below as a checklist when forwarding a lead to ensure the process is smooth, transparent, and beneficial for all parties involved:<br>
        1) Pre‑qualify the lead to confirm fit.<br>
        2) Notify the receiving party in advance.<br>
        3) Clarify referral fee terms (including if the lead does not convert).<br>
        4) Confirm next‑step ownership.<br>
        5) Provide a concise lead summary with relevant background.<br>
        6) Set communication boundaries.<br>
        7) Document the agreement in writing.<br>
        8) Follow up post‑handoff to maintain accountability.
      </div>
      <div style="margin-top:12px;">
        <a class="email-btn" href="${escapeHtml(delegateConversationGmailCompose)}" target="_blank" style="display:inline-block;margin:0 8px 8px 0;padding:11px 16px;border-radius:9px;background:linear-gradient(180deg,#fff4fa 0%,#ffd6ea 100%);color:#9c1855;text-decoration:none;font-weight:900;border:1px solid #ffc0de;box-shadow:0 8px 18px rgba(255,214,234,0.24);">Delegate to...</a>
      </div>
    </div>
  `;
  timingBannerHtml = `
    <div style="margin-top:${emailBlockGap};margin-bottom:12px;padding:16px;border-radius:14px;background:radial-gradient(120% 130% at 12% 8%,rgba(255,255,255,0.76) 0%,rgba(255,255,255,0) 58%),linear-gradient(140deg,#fff4f6 0%,#ffe6eb 50%,#ffdfe7 100%);border:1px solid #e9b8bf;text-align:center;box-shadow:0 10px 20px rgba(143,28,28,0.08);">
      <div style="font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:#8f1c1c;font-weight:800;">Confirmed Intake Slot</div>
      <div class="email-slot-title" style="margin-top:4px;font-size:30px;line-height:1.08;font-weight:900;color:#8f1c1c;">${escapeHtml(targetSlotLabel)}</div>
      <div style="margin-top:8px;font-size:12px;color:#5a3d2a;">Email assembled at: <strong>${escapeHtml(assembledAtLabel)} (Toronto)</strong></div>
    </div>
  `;

  const plainTextBodyRaw = [
    internalWarningText,
    '',
    `Client: ${normalizeSingleLine(data.name || '')}`,
    `Service: ${normalizeSingleLine(getBookingServiceDisplayText(data) || data.service || 'N/A')}`,
    `DOB: ${normalizeSingleLine(data.dob || 'N/A')}`,
    `Age: ${normalizeSingleLine(data.age || 'N/A')}`,
    '',
    `NA slot (Toronto): ${targetSlotLabel}`,
    `Email assembled at (Toronto): ${assembledAtLabel}`,
    '',
    plainTextFileLines.join('\n'),

    '',
    `Missing docs pending: ${missingDocsCount}`,
    `Conflict: ${conflictStatus}`,
    `Payment/Retainer: ${paymentStatus} | Amount marker: ${paymentAmount}`,
    `Decline draft subject: ${declineDraftSubject}`,
    '',
    'Client draft:',
    readyDraftBody
  ].join('\n');

  const contactActions = [];
  const managementActions = [];
  const internetActions = [];
  const dangerActions = [];

  function addAction(target, icon, label, url, tone) {
    if (!url) return;
    target.push({
      label: `${icon ? icon + ' ' : ''}${label}`,
      url: url,
      tone: tone || 'secondary'
    });
  }

  // Management and Dashboard links removed to reduce total link count (Warnings: HTML email contains many links).


  const clientContactText = `Hello ${normalizeSingleLine(data.name)}, this is Hanna Dunchenko regarding your intake request.`;

  addAction(contactActions, '', 'Ready-to-Send Client Draft', readyDraftGmailCompose, 'primary');
  addAction(contactActions, '', 'Call', buildTelLink(data.phone), 'primary');
  addAction(contactActions, '', 'SMS', buildSmsLink(data.phone, clientContactText));
  addAction(contactActions, '', 'WhatsApp', buildWhatsAppLink(data.phone, clientContactText), 'whatsapp');
  addAction(contactActions, '', 'Telegram', buildTelegramPhoneLink(data.phone, clientContactText));
  addAction(contactActions, '', 'Viber', buildViberLink(data.phone));
  addAction(contactActions, '', 'Keep', keepCardActionUrl, 'keep');
  addAction(contactActions, '', 'Videocall by Site', `https://hannadunchenko.com/videocall?bookingId=${encodeUriValue(bookingId)}`, 'primary');


  const clientIntelQuery = normalizeSingleLine(`${data.name || ''} ${data.phone || ''} ${data.email || ''}`) || 'client lookup Toronto ON';
  const clientIntelName = normalizeSingleLine(data.name || data.email || data.phone || 'person');
  const clientIntelWhere = normalizeSingleLine(data.address || 'Toronto ON');
  addAction(internetActions, '', 'Google Client Search', buildGoogleSearchLink(clientIntelQuery));
  addAction(internetActions, '', 'Bing Client Search', buildBingSearchLink(clientIntelQuery));
  addAction(internetActions, '', 'DuckDuckGo Client Search', buildDuckDuckGoSearchLink(clientIntelQuery));

  addAction(internetActions, '', 'YellowPages Toronto', buildYellowPagesSearchLink(clientIntelName, clientIntelWhere));
  addAction(internetActions, '', '411.ca Toronto', build411CaSearchLink(clientIntelName, clientIntelWhere));
  addAction(internetActions, '', 'Yelp Toronto', buildYelpSearchLink(clientIntelName, clientIntelWhere));

  if (deleteUrl) {
    addAction(dangerActions, '[Delete]', 'Purge Client Everywhere', deleteUrl, 'danger');
  }

  contactGroupHtml = renderGroup('Contact with Client', contactActions, { hideTitle: true });
  externalIntelSectionHtml = renderGroup('External Intel', internetActions);


  // Hidden from assembled intake emails by request.
  const operationsInfoSectionHtml = '';
  const dangerActionsGroupHtml = '';
  const dashboardMacroSectionHtml = '';
  const killMacroRowsHtml = renderMacroButtons(killMacroRows, '#fff7f7', '#ffe7e7', 'rgba(61,7,17,0.38)', 'rgba(255,231,231,0.28)');
  killZoneSectionHtml = `
    <div style="margin-top:18px;padding:16px 18px;border-radius:14px;background:radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0) 54%),linear-gradient(165deg,#d95656 0%,#ac3535 48%,#7b2222 100%);border:1px solid #7b1e1e;box-shadow:0 12px 26px rgba(123,30,30,0.26);">
      <strong style="display:block;margin-bottom:10px;color:#fff7f7;">Kill Zone (${killMacroRows.length})</strong>
      <div style="margin:0 0 12px 0;padding:10px 12px;border-radius:10px;background:rgba(255,245,245,0.15);border:1px solid rgba(255,231,231,0.28);color:#fff1f1;font-size:12px;line-height:1.4;font-weight:700;">
        Intake status right now: ${escapeHtml(currentIntakeStatus.enabled ? 'RUNNING' : 'PAUSED')}
        ${currentIntakeStatus.enabled ? '' : `<br>Pause reason: ${escapeHtml(currentIntakeStatus.reason || 'N/A')}`}
      </div>
      <div style="margin:0 0 12px 0;padding:12px 14px;border-radius:10px;background:rgba(61,7,17,0.46);border:1px solid rgba(255,231,231,0.28);color:#fff7f7;font-size:12px;line-height:1.45;font-weight:800;">
        Warning: Stop Intake is a hard operational shutdown. Use it only if you intend to keep intake fully stopped for at least 2 days. Clicking Stop Intake opens a second confirmation screen before anything changes.
      </div>
      ${killMacroRowsHtml}
    </div>
  `;
  const dangerMacroRowsHtml = renderMacroButtons(dangerMacroRows, '#8f1c1c', '#5a2f2f', '#fff4f4', '#e7b3b3');
  const dangerMacroSectionHtml = `
    <div style="margin-top:18px;padding:15px 17px;border-radius:14px;background:radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fff6f6 0%,#ffe8e8 52%,#ffdede 100%);border:1px solid #e7b3b3;box-shadow:0 10px 22px rgba(143,28,28,0.1);">
      <strong style="display:block;margin-bottom:10px;color:#8f1c1c;">Danger Zone (${dangerMacroRows.length})</strong>
      ${dangerMacroRowsHtml}
    </div>
  `;
  const technicalDataInlineItems = [
    `<strong style="color:#8b6f5a;">Country / City:</strong> ${safeCountryCode} / ${safeCity}`,
    `<strong style="color:#8b6f5a;">IP:</strong> ${safeIp}`,
    `<strong style="color:#8b6f5a;">Geo:</strong> ${safeCoords}`,
    `<strong style="color:#8b6f5a;">Device:</strong> ${safePhoneModel}`,
    `<strong style="color:#8b6f5a;">Browser:</strong> <strong style="color:#2f241b;">${safeBrowser}</strong>`,
    `<strong style="color:#8b6f5a;">OS / Lang:</strong> ${safeOs} / ${safeLang}`,
    `<strong style="color:#8b6f5a;">Screen / Viewport:</strong> ${safeScreen} / ${safeViewport}`,
    `<strong style="color:#8b6f5a;">Timezone:</strong> ${safeTimezone}`,
    `<strong style="color:#8b6f5a;">CPU / RAM:</strong> ${safeCores} / ${safeMemory} GB`,
    `<strong style="color:#8b6f5a;">Network:</strong> ${safeNetwork}`,
    `<strong style="color:#8b6f5a;">Touch / Color:</strong> ${safeTouchPoints} / ${safeColorDepth}`,
    `<strong style="color:#8b6f5a;">Referrer:</strong> ${referrerAnchor}`,
    `<strong style="color:#8b6f5a;">Page URL:</strong> ${pageUrlAnchor}`,
  ].filter(Boolean);
  const technicalDataLineHtml = technicalDataInlineItems.join('<span style="color:#b99b82;"> &nbsp;|&nbsp; </span>');
  technicalDataSectionHtml = `
    <div style="margin-top:18px;padding:15px 17px;border-radius:14px;background:radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.84) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fffdfa 0%,#f8eee3 54%,#f2e1cf 100%);border:1px solid #e3ccb5;box-shadow:0 10px 22px rgba(90,61,42,0.08);">
      <strong style="display:block;margin-bottom:8px;color:#5a3d2a;">Technical Data</strong>
      <div style="font-size:13px;line-height:1.7;color:#2f241b;word-break:break-word;overflow-wrap:anywhere;">${technicalDataLineHtml}</div>
    </div>
  `;
  const databaseStatusSectionHtml = `
    <div style="margin-top:0;padding:15px 17px;border-radius:14px;background:radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fff9f1 0%,#f2dfcc 56%,#ead5bf 100%);border:1px solid #ddc1a4;box-shadow:0 10px 22px rgba(90,61,42,0.08);">
      <strong style="display:block;margin-bottom:6px;color:#5a3d2a;">Database status</strong>
      <div style="font-size:14px;color:#4a3829;">${safeDbStatus}</div>
      <div style="margin-top:8px;font-size:13px;color:#4a3829;"><strong>Booking ID:</strong> ${safeBookingId}</div>
      <div style="margin-top:6px;font-size:13px;color:#4a3829;"><strong>Table row:</strong> ${sheetWrite && sheetWrite.row ? sheetWrite.row : 'N/A'}</div>
      <div style="margin-top:6px;font-size:13px;color:#4a3829;"><strong>Spreadsheet:</strong> ${logSpreadsheetId || 'N/A'}</div>
    </div>
  `;
  clientSnapshotSectionHtml = `
    <div style="padding:16px 18px;border-radius:14px;background:radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.84) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fffaf2 0%,#f4e6d7 56%,#ecdbc7 100%);border:1px solid #ddc1a4;box-shadow:0 10px 22px rgba(90,61,42,0.09);">
      <table class="email-kv-table" role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:14px;line-height:1.45;word-break:normal;overflow-wrap:break-word;">
        <tr><td style="padding:7px 0;color:#8b6f5a;width:175px;">Name</td><td style="padding:7px 0;color:#2f241b;font-weight:700;">${safeName}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">Occupation</td><td style="padding:7px 0;color:#2f241b;">${safeOccupation}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">Email</td><td style="padding:7px 0;color:#2f241b;">${safeEmail}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">Phone</td><td style="padding:7px 0;color:#2f241b;">${safePhoneCellHtml}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">Service</td><td style="padding:7px 0;color:#2f241b;">${safeService}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">DOB</td><td style="padding:7px 0;color:#2f241b;">${safeDob}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">Age</td><td style="padding:7px 0;color:#2f241b;">${safeAge}</td></tr>
        ${safeReferralSource ? `<tr><td style="padding:7px 0;color:#8b6f5a;">Referral Source</td><td style="padding:7px 0;color:#2f241b;font-weight:700;">${safeReferralSource}</td></tr>` : ''}
        <tr><td style="padding:7px 0;color:#8b6f5a;">Deadline</td><td style="padding:7px 0;color:#2f241b;">${deadlineCellHtml}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">Terms accepted</td><td style="padding:7px 0;color:#2f241b;">${safeTerms}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">Address</td><td style="padding:7px 0;color:#2f241b;">${safeAddress}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">Service Option</td><td style="padding:7px 0;color:#2f241b;font-weight:700;">${safeMode}</td></tr>
        <tr><td style="padding:7px 0;color:#8b6f5a;">Appointment</td><td style="padding:7px 0;color:#2f241b;font-weight:700;">${escapeHtml(targetSlotLabel)}</td></tr>
      </table>
      <div style="margin-top:14px;padding:12px 14px;border-radius:11px;background:linear-gradient(180deg,#fffefe 0%,#fff8ef 100%);border:1px solid #e2ccb6;word-break:normal;overflow-wrap:break-word;">
        <strong style="display:block;margin-bottom:8px;color:#5a3d2a;">Brief / Notes</strong>
        <div style="white-space:pre-wrap;color:#3b2c1f;font-size:14px;line-height:1.5;">${safeNotes}</div>
      </div>
      <div style="margin-top:12px;padding:12px 14px;border-radius:11px;background:linear-gradient(180deg,#fffefe 0%,#fff8ef 100%);border:1px solid #e2ccb6;word-break:normal;overflow-wrap:break-word;">
        <strong style="display:block;margin-bottom:8px;color:#5a3d2a;">Attached files</strong>
        <ul style="margin:0;padding-left:18px;color:#3b2c1f;font-size:14px;line-height:1.45;">${fileHtml}</ul>
      </div>
    </div>
  `;
  topColumnsSectionHtml = `
    <div style="margin-top:${emailBlockGap};">
      ${clientSnapshotSectionHtml}
      <div style="margin-top:14px;">
        ${externalIntelSectionHtml}
        ${conflictSectionHtml}

      </div>
    </div>
  `;
  // Hidden from assembled intake emails by request.
  missingDocsSectionFullHtml = '';
  databaseStatusFooterHtml = `
    <div style="margin-top:${emailBlockGap};">
      ${databaseStatusSectionHtml}
    </div>
  `;
  const stripeBannerHtml = `
    <div class="email-stripe-wrap" style="padding:0 24px 12px 24px;background:linear-gradient(180deg,#efe1d2 0%,#e8d6c4 100%);">
      <div style="border-radius:0 0 18px 18px;overflow:hidden;border:1px solid #d9bca0;background:#f7ebdd;box-shadow:0 10px 20px rgba(90,61,42,0.14);">
        <table class="email-stripe-table" role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 18px 14px;background:#f1e1cf;">
              <table class="email-stripe-table" role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="height:10px;width:44%;background:#8b6f5a;border-radius:5px 0 0 5px;"></td>
                  <td style="height:10px;width:22%;background:#d4b89a;"></td>
                  <td style="height:10px;width:16%;background:#b99679;"></td>
                  <td style="height:10px;width:10%;background:#8b6f5a;border-radius:0 5px 5px 0;"></td>
                  <td style="height:10px;width:8%;background:#f1e1cf;"></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
  const mobileEmailStyleTag = `
<style>
@media screen and (max-width:720px) {
  .email-shell { padding:8px !important; }
  .email-card {
    width:100% !important;
    max-width:100% !important;
    border-radius:14px !important;
  }
  .email-hero { padding:18px 16px !important; }
  .email-content { padding:16px !important; }
  .email-stripe-wrap { padding:0 12px 10px 12px !important; }
  .email-slot-title { font-size:23px !important; line-height:1.2 !important; }
  .email-content,
  .email-content div,
  .email-content p,
  .email-content li,
  .email-content td,
  .email-content th,
  .email-content a,
  .email-content span,
  .email-content strong {
    box-sizing:border-box !important;
    max-width:100% !important;
    word-break:normal !important;
    overflow-wrap:break-word !important;
    hyphens:none !important;
  }
  .email-kv-table,
  .email-btn-table,
  .email-queue-table {
    width:100% !important;
    max-width:100% !important;
    table-layout:auto !important;
  }
  .email-btn-table,
  .email-btn-table tbody,
  .email-btn-table tr,
  .email-btn-cell {
    display:block !important;
    width:100% !important;
  }
  .email-btn-cell {
    padding:0 0 10px 0 !important;
  }
  .email-btn-desc {
    margin-top:6px !important;
  }
  .email-kv-table,
  .email-kv-table tbody,
  .email-kv-table tr {
    display:block !important;
    width:100% !important;
  }
  .email-kv-table td {
    display:block !important;
    width:100% !important;
    padding:5px 0 !important;
  }
  .email-kv-table td:first-child {
    padding-bottom:1px !important;
    font-weight:700 !important;
  }
  .email-btn {
    display:block !important;
    width:100% !important;
    box-sizing:border-box !important;
    text-align:center !important;
    white-space:normal !important;
    word-break:normal !important;
    overflow-wrap:break-word !important;
    line-height:1.35 !important;
  }
  .email-queue-table,
  .email-queue-table tbody,
  .email-queue-table tr,
  .email-queue-table td {
    display:block !important;
    width:100% !important;
  }
  .email-queue-table {
    border:0 !important;
    background:transparent !important;
  }
  .email-queue-table tr {
    margin:0 0 10px 0 !important;
    border:1px solid #e4cfbb !important;
    border-radius:10px !important;
    overflow:hidden !important;
    background:#ffffff !important;
  }
  .email-queue-table th {
    display:none !important;
  }
  .email-queue-table td {
    padding:8px 10px !important;
    border-top:1px solid #ead9cb !important;
    white-space:normal !important;
    word-break:normal !important;
    overflow-wrap:break-word !important;
  }
  .email-queue-table td:first-child {
    border-top:0 !important;
  }
  .email-queue-table td::before {
    content:attr(data-label) !important;
    display:block !important;
    margin-bottom:3px !important;
    color:#8b6f5a !important;
    font-size:11px !important;
    font-weight:700 !important;
  }
  .email-ua-cell {
    word-break:break-all !important;
    overflow-wrap:anywhere !important;
  }
}
</style>`;

  const htmlBody = `
${mobileEmailStyleTag}
<div class="email-shell" style="margin:0;padding:26px;background:radial-gradient(120% 120% at 8% 8%,rgba(255,255,255,0.38) 0%,rgba(255,255,255,0) 52%),radial-gradient(120% 120% at 94% 96%,rgba(255,239,221,0.42) 0%,rgba(255,239,221,0) 56%),linear-gradient(180deg,#f4e9dd 0%,#e7d4c0 100%);font-family:Helvetica,Arial,sans-serif;color:#3f2f22;">
  <div class="email-card" style="max-width:980px;margin:0 auto;background:linear-gradient(180deg,#fffdfa 0%,#fff8ef 100%);border:1px solid #d8c1aa;border-radius:20px;overflow:hidden;box-shadow:0 18px 42px rgba(90,61,42,0.2);">
    <div class="email-hero" style="padding:24px 28px;background:radial-gradient(120% 120% at 14% 6%,rgba(255,255,255,0.3) 0%,rgba(255,255,255,0) 56%),linear-gradient(136deg,#8c694f 0%,#6f4f39 58%,#5a3d2a 100%);color:#fff;text-align:center;">
      <div style="font-size:13px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.9;">Hanna Dunchenko - Intake Notification</div>
      <h2 style="margin:10px 0 0 0;font-size:24px;line-height:1.2;">New Consultation Request</h2>
      <div style="margin-top:4px;font-size:44px;font-weight:700;">${escapeHtml(targetSlotLabel)}</div>
    </div>

    <div class="email-content" style="padding:24px 28px;">
      ${contactGroupHtml}
      ${topColumnsSectionHtml}
      <hr style="border:0;height:1px;margin:14px 0;opacity:0;">
      ${declineDraftSectionHtml}
      ${forwardConversationSectionHtml}
      ${readyDraftSectionHtml}
      ${technicalDataSectionHtml}

      ${missingDocsSectionFullHtml}
      ${operationsInfoSectionHtml}
      ${killZoneSectionHtml}
      ${dangerActionsGroupHtml}
      ${dangerMacroSectionHtml}
      ${databaseStatusFooterHtml}
    </div>
  </div>
</div>`;

  // Keep current layout/responsiveness, but force the color palette from "google-apps-script - Copy.js".
  function applyCopyPaletteColors(html) {
    const safeHtml = String(html || '');
    const colorMap = [
      ['#fffdfa', '#fffaf5'],
      ['#fff8ef', '#fffaf5'],
      ['#fff9f1', '#f4ece4'],
      ['#f2ddc7', '#f4ece4'],
      ['#d2b79c', '#dbc8b6'],
      ['#947057', '#5a3d2a'],
      ['#6f4f39', '#5a3d2a'],
      ['#f8c96a', '#f3b63f'],
      ['#eba632', '#f3b63f'],
      ['#d74f4f', '#c63838'],
      ['#aa3131', '#c63838'],
      ['#7d233f', '#6d1630'],
      ['#561228', '#6d1630'],
      ['#e3ccb5', '#e8d9ca'],
      ['#ddc1a4', '#dfccba'],
      ['#e2c8ad', '#e8d9ca'],
      ['#efc7cf', '#e9b8bf'],
      ['#ffe9ec', '#fff5f6'],
      ['#ffe2e8', '#fff5f6'],
      ['#ce4f60', '#c63838'],
      ['#a42d3f', '#c63838'],
      ['#fff2f4', '#f8d7dc'],
      ['#f7d5dc', '#f8d7dc'],
      ['#f8eee3', '#f8efe7'],
      ['#f2e1cf', '#eadaca'],
      ['#e7d4c0', '#eadaca'],
      ['#efe1d2', '#f4e9dd'],
      ['#e8d6c4', '#eadaca'],
      ['#f7ebdd', '#f4e9dd'],
      ['#f1e1cf', '#eadaca'],
      ['#f4e6d7', '#f4e7d8'],
      ['#ecdbc7', '#f4e7d8'],
      ['#e2ccb6', '#e8d9ca'],
      ['#fbf1e7', '#f4ece4'],
      ['#f1dfcd', '#f4ece4'],
      ['radial-gradient(120% 120% at 8% 8%,rgba(255,255,255,0.38) 0%,rgba(255,255,255,0) 52%),radial-gradient(120% 120% at 94% 96%,rgba(255,239,221,0.42) 0%,rgba(255,239,221,0) 56%),linear-gradient(180deg,#f4e9dd 0%,#e7d4c0 100%)', 'linear-gradient(180deg,#f4e9dd 0%,#eadaca 100%)'],
      ['radial-gradient(120% 120% at 14% 6%,rgba(255,255,255,0.3) 0%,rgba(255,255,255,0) 56%),linear-gradient(136deg,#8c694f 0%,#6f4f39 58%,#5a3d2a 100%)', 'linear-gradient(135deg,#7a5a44 0%,#5a3d2a 100%)'],
      ['radial-gradient(120% 130% at 14% 6%,rgba(255,255,255,0.78) 0%,rgba(255,255,255,0) 54%),linear-gradient(158deg,#fffdfa 0%,#f7ece0 52%,#f3e3d3 100%)', '#fff'],
      ['radial-gradient(120% 130% at 14% 6%,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0) 52%),linear-gradient(160deg,#fffdfa 0%,#f9efe3 52%,#f4e5d5 100%)', '#fff'],
      ['radial-gradient(118% 128% at 16% 8%,rgba(255,255,255,0.8) 0%,rgba(255,255,255,0) 52%),linear-gradient(160deg,#fff9f2 0%,#f7eadc 54%,#f0dfcd 100%)', '#fff'],
      ['radial-gradient(120% 130% at 16% 8%,rgba(255,255,255,0.84) 0%,rgba(255,255,255,0) 52%),linear-gradient(160deg,#fffdf9 0%,#f7ede2 56%,#f4e4d4 100%)', '#fff'],
      ['radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fffdfa 0%,#f8eee3 54%,#f2e1cf 100%)', '#fff'],
      ['radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.84) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fffdfa 0%,#f8eee3 54%,#f2e1cf 100%)', '#f8efe7'],
      ['radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fff6f6 0%,#ffe8e8 52%,#ffdede 100%)', '#fff4f4'],
      ['radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fff9f1 0%,#f2dfcc 56%,#ead5bf 100%)', '#f4ece4'],
      ['radial-gradient(120% 130% at 14% 8%,rgba(255,255,255,0.84) 0%,rgba(255,255,255,0) 54%),linear-gradient(160deg,#fffaf2 0%,#f4e6d7 56%,#ecdbc7 100%)', '#f4e7d8'],
      ['linear-gradient(180deg,#fffefe 0%,#fff8ef 100%)', '#fffaf5']
    ];
    const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return colorMap.reduce((acc, entry) => {
      const fromColor = entry[0];
      const toColor = entry[1];
      return acc.replace(new RegExp(escapeRegExp(fromColor), 'gi'), toColor);
    }, safeHtml);
  }
  const EMAIL_HTML_SOFT_LIMIT = 85000;
  let copyPaletteHtmlBody = ensureUtf8HtmlEmailDocument(applyCopyPaletteColors(htmlBody));
  if (copyPaletteHtmlBody.length > EMAIL_HTML_SOFT_LIMIT) {
    const compactModeNoticeHtml = `
      <div style="margin:0 0 18px 0;padding:10px 12px;border-radius:10px;background:linear-gradient(180deg,#fff7dd 0%,#f7e7b0 100%);border:1px solid #dfc47d;color:#6d5216;font-size:12px;line-height:1.45;font-weight:700;">
        Compact email mode applied because the full HTML version was getting too large and could be clipped by mail clients.
      </div>
    `;
    const compactHtmlBody = `
${mobileEmailStyleTag}
<div class="email-shell" style="margin:0;padding:22px;background:linear-gradient(180deg,#f4e9dd 0%,#eadaca 100%);font-family:Helvetica,Arial,sans-serif;color:#3f2f22;">
  <div class="email-card" style="max-width:920px;margin:0 auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:18px;overflow:hidden;box-shadow:0 18px 42px rgba(90,61,42,0.16);">
    <div class="email-hero" style="padding:22px 26px;background:linear-gradient(135deg,#7a5a44 0%,#5a3d2a 100%);color:#fff;text-align:center;">
      <div style="font-size:13px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.9;">Hanna Dunchenko - Intake Notification</div>
      <h2 style="margin:10px 0 0 0;font-size:24px;line-height:1.2;">New Consultation Request</h2>
      <div style="margin-top:4px;font-size:44px;font-weight:700;"><a href="${escapeHtml(getScriptUrl())}" style="color:#ffffff;text-decoration:underline;">${escapeHtml(targetSlotLabel)}</a></div>
    </div>
    <div class="email-content" style="padding:22px 26px;">
      ${errorAlarmHtml}
      ${compactModeNoticeHtml}
      ${contactGroupHtml}
      ${topColumnsSectionHtml}
      ${missingDocsSectionFullHtml}
      ${technicalDataSectionHtml}
      ${killZoneSectionHtml}
      ${databaseStatusFooterHtml}
    </div>
  </div>
</div>`;
    copyPaletteHtmlBody = ensureUtf8HtmlEmailDocument(applyCopyPaletteColors(compactHtmlBody));
  }
  if (copyPaletteHtmlBody.length > EMAIL_HTML_SOFT_LIMIT) {
    const ultraCompactHtmlBody = `
${mobileEmailStyleTag}
<div class="email-shell" style="margin:0;padding:18px;background:linear-gradient(180deg,#f4e9dd 0%,#eadaca 100%);font-family:Helvetica,Arial,sans-serif;color:#3f2f22;">
  <div class="email-card" style="max-width:860px;margin:0 auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:18px;overflow:hidden;box-shadow:0 14px 32px rgba(90,61,42,0.14);">
    <div class="email-hero" style="padding:20px 24px;background:linear-gradient(135deg,#7a5a44 0%,#5a3d2a 100%);color:#fff;text-align:center;">
      <div style="font-size:13px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.9;">Hanna Dunchenko - Intake Notification</div>
      <h2 style="margin:10px 0 0 0;font-size:24px;line-height:1.2;">New Consultation Request</h2>
      <div style="margin-top:4px;font-size:44px;font-weight:700;"><a href="${escapeHtml(getScriptUrl())}" style="color:#ffffff;text-decoration:underline;">${escapeHtml(targetSlotLabel)}</a></div>
    </div>
    <div class="email-content" style="padding:22px 24px;">
      ${errorAlarmHtml}
      <div style="margin:0 0 18px 0;padding:10px 12px;border-radius:10px;background:linear-gradient(180deg,#fff7dd 0%,#f7e7b0 100%);border:1px solid #dfc47d;color:#6d5216;font-size:12px;line-height:1.45;font-weight:700;">
        Ultra-compact email mode applied to prevent clipping. Full details remain available in the sheet, Telegram alert, calendar entry, and client folder.
      </div>
      ${clientSnapshotSectionHtml}
      ${technicalDataSectionHtml}
      ${databaseStatusFooterHtml}
    </div>
  </div>
</div>`;
    copyPaletteHtmlBody = ensureUtf8HtmlEmailDocument(applyCopyPaletteColors(ultraCompactHtmlBody));
  }

  const normalizedPlainTextBody = normalizeEmailMojibakeText(plainTextBodyRaw);
  const normalizedHtmlBody = normalizeEmailMojibakeText(copyPaletteHtmlBody);
  const normalizedSubject = normalizeEmailMojibakeText(subject);

  const deliveryMessage = {
    to: recipient,
    subject: normalizedSubject,
    body: normalizedPlainTextBody,
    htmlBody: normalizedHtmlBody
  };
  const preflight = buildEmailDeliveryPreflight(deliveryMessage);
  const preflightWarningText = truncate((preflight.warnings || []).join(' | '), 900);

  if (preflight.warnings && preflight.warnings.length) {
    try {
      logUsage({
        event: 'EMAIL PREFLIGHT WARNING',
        severity: 'warning',
        details: truncate(
          `Booking ID: ${safeBookingId} | Recipients: ${preflight.recipients.join(', ') || 'none'} | Warnings: ${preflightWarningText}`,
          1000
        ),
        userInfo: data.userInfo || '',
        fingerprint: data.fingerprint || ''
      });
    } catch (logErr) { }
  }

  if (!preflight.ok) {
    let preflightLogError = '';
    try {
      const logResult = logUsage({
        event: 'EMAIL PREFLIGHT FAILED',
        severity: 'critical',
        details: truncate(
          `Booking ID: ${safeBookingId} | Error: ${preflight.error} | Invalid: ${preflight.invalidRecipients.join(', ') || 'none'} | Quota: ${preflight.quotaRemaining == null ? 'unknown' : preflight.quotaRemaining}/${preflight.quotaRequired || 0} | HTML: ${preflight.htmlLength} | Links: ${preflight.linkCount}`,
          1000
        ),
        userInfo: data.userInfo || '',
        fingerprint: data.fingerprint || ''
      });
      if (logResult && logResult.success === false) {
        preflightLogError = String(logResult.error || '');
      }
    } catch (logErr) {
      preflightLogError = String(logErr && logErr.message ? logErr.message : logErr);
    }
    return {
      ok: false,
      status: 'preflight_failed',
      error: truncate(preflight.error, 900),
      warning: preflightWarningText,
      sentAt: '',
      successRecipients: [],
      failedRecipients: [],
      invalidRecipients: preflight.invalidRecipients,
      quotaRemaining: preflight.quotaRemaining,
      quotaRequired: preflight.quotaRequired,
      htmlLength: preflight.htmlLength,
      linkCount: preflight.linkCount,
      fallbackUsed: false,
      logError: truncate(preflightLogError, 180)
    };
  }
  let richSendResults = null;
  try {
      richSendResults = sendEmailToMultipleRecipients({
      recipients: preflight.recipients,
      subject: normalizedSubject,
      body: normalizedPlainTextBody,
      htmlBody: normalizedHtmlBody
    });
  } catch (sendErr) {
    const fatalError = truncate(String(sendErr && sendErr.message ? sendErr.message : sendErr), 900);
    let logError = '';
    try {
      const logResult = logUsage({
        event: 'EMAIL SEND FAILED',
        severity: 'critical',
        details: truncate(`Booking ID: ${safeBookingId} | Fatal rich email send error: ${fatalError}`, 1000),
        userInfo: data.userInfo || '',
        fingerprint: data.fingerprint || ''
      });
      if (logResult && logResult.success === false) {
        logError = String(logResult.error || '');
      }
    } catch (logErr) {
      logError = String(logErr && logErr.message ? logErr.message : logErr);
    }
    return {
      ok: false,
      status: 'failed',
      error: fatalError,
      warning: preflightWarningText,
      sentAt: '',
      successRecipients: [],
      failedRecipients: preflight.recipients.map(recipientEmail => ({
        recipient: recipientEmail,
        error: fatalError
      })),
      invalidRecipients: preflight.invalidRecipients,
      quotaRemaining: preflight.quotaRemaining,
      quotaRequired: preflight.quotaRequired,
      htmlLength: preflight.htmlLength,
      linkCount: preflight.linkCount,
      fallbackUsed: false,
      logError: truncate(logError, 180)
    };
  }

  const richFailedEntries = Array.isArray(richSendResults && richSendResults.failed) ? richSendResults.failed : [];
  const allowPlainTextFallback = isFeatureEnabled(INTAKE_PLAIN_TEXT_FALLBACK_ENABLED_PROP, false);
  let fallbackSendResults = { success: [], failed: [], total: 0 };
  if (richFailedEntries.length && allowPlainTextFallback) {
    const fallbackBody = buildCompactIntakeFallbackBody(
      data,
      databaseSheetUrl,
      uploadedFiles,
      sheetWrite,
      control,
      { warning: preflightWarningText }
    );
    try {
      fallbackSendResults = sendEmailToMultipleRecipients({
        recipients: richFailedEntries.map(entry => entry && entry.recipient ? entry.recipient : ''),
        subject: `${normalizedSubject} [Plain Text Fallback]`,
        body: normalizeEmailMojibakeText(fallbackBody)
      });
    } catch (fallbackErr) {
      const fallbackErrorText = truncate(String(fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr), 300);
      fallbackSendResults = {
        success: [],
        failed: richFailedEntries.map(entry => ({
          recipient: entry && entry.recipient ? entry.recipient : '',
          error: fallbackErrorText
        })),
        total: richFailedEntries.length
      };
    }
  }

  const deliveredRecipients = normalizeEmailRecipientList(
    []
      .concat(Array.isArray(richSendResults.success) ? richSendResults.success : [])
      .concat(Array.isArray(fallbackSendResults.success) ? fallbackSendResults.success : [])
  );
  const failedRecipientMap = {};
  richFailedEntries.forEach((entry) => {
    const recipientEmail = normalizeSingleLine(entry && entry.recipient || '').toLowerCase();
    if (!recipientEmail) return;
    failedRecipientMap[recipientEmail] = {
      recipient: recipientEmail,
      error: truncate(String(entry && entry.error ? entry.error : 'Rich HTML send failed.'), 300)
    };
  });
  (fallbackSendResults.success || []).forEach((recipientEmail) => {
    const key = normalizeSingleLine(recipientEmail || '').toLowerCase();
    if (key && failedRecipientMap[key]) delete failedRecipientMap[key];
  });
  (fallbackSendResults.failed || []).forEach((entry) => {
    const recipientEmail = normalizeSingleLine(entry && entry.recipient || '').toLowerCase();
    if (!recipientEmail) return;
    failedRecipientMap[recipientEmail] = {
      recipient: recipientEmail,
      error: truncate(String(entry && entry.error ? entry.error : 'Fallback send failed.'), 300)
    };
  });

  const failedRecipients = Object.keys(failedRecipientMap).map(key => failedRecipientMap[key]);
  const fallbackRecoveredRecipients = normalizeEmailRecipientList(fallbackSendResults.success || []);
  const warningParts = [];
  if (preflightWarningText) warningParts.push(preflightWarningText);
  if (fallbackRecoveredRecipients.length) {
    warningParts.push(`Plain-text fallback delivered to: ${fallbackRecoveredRecipients.join(', ')}`);
  }
  if (richFailedEntries.length && !allowPlainTextFallback) {
    warningParts.push('Plain-text fallback retry is disabled.');
  }
  if (preflight.invalidRecipients.length) {
    warningParts.push(`Invalid configured recipients: ${preflight.invalidRecipients.join(', ')}`);
  }

  const errorParts = [];
  if (failedRecipients.length) {
    errorParts.push(summarizeFailedEmailRecipients(failedRecipients));
  }
  const warningText = truncate(warningParts.join(' | '), 900);
  const errorText = truncate(errorParts.join(' | '), 900);
  const partial = deliveredRecipients.length > 0 && (
    failedRecipients.length > 0
    || preflight.invalidRecipients.length > 0
    || fallbackRecoveredRecipients.length > 0
  );
  const sentAt = deliveredRecipients.length
    ? Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm:ss')
    : '';
  const status = deliveredRecipients.length
    ? (partial ? 'partial' : 'sent')
    : 'failed';

  if (status !== 'sent') {
    const eventName = status === 'partial' ? 'EMAIL SEND PARTIAL' : 'EMAIL SEND FAILED';
    const severity = status === 'partial' ? 'warning' : 'critical';
    try {
      logUsage({
        event: eventName,
        severity: severity,
        details: truncate(
          `Booking ID: ${safeBookingId} | Delivered: ${deliveredRecipients.join(', ') || 'none'} | Failed: ${summarizeFailedEmailRecipients(failedRecipients) || 'none'} | Invalid: ${preflight.invalidRecipients.join(', ') || 'none'} | Quota: ${preflight.quotaRemaining == null ? 'unknown' : preflight.quotaRemaining}/${preflight.quotaRequired || 0} | HTML: ${preflight.htmlLength} | Links: ${preflight.linkCount}`,
          1000
        ),
        userInfo: data.userInfo || '',
        fingerprint: data.fingerprint || ''
      });
    } catch (logErr) { }
  }

  return {
    ok: deliveredRecipients.length > 0,
    status: status,
    error: errorText,
    warning: warningText,
    sentAt: sentAt,
    successRecipients: deliveredRecipients,
    failedRecipients: failedRecipients,
    invalidRecipients: preflight.invalidRecipients,
    quotaRemaining: preflight.quotaRemaining,
    quotaRequired: preflight.quotaRequired,
    htmlLength: preflight.htmlLength,
    linkCount: preflight.linkCount,
    fallbackUsed: fallbackRecoveredRecipients.length > 0,
    renderError: renderErrorMsg
  };
}

