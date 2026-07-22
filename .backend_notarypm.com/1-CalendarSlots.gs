/*
  Calendar event helpers: reminders, timeline, trust ledger, conflict check, matter helpers.
  Extracted from google-apps-script.js for maintainability.
*/

function extractDescriptionField(description, field) {
  const prefix = `${String(field || '')}:`.toLowerCase();
  const lines = String(description || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || '');
    if (line.toLowerCase().indexOf(prefix) === 0) {
      return normalizeSingleLine(line.slice(prefix.length));
    }
  }
  return '';
}

function collectConsultationEventsForDay(calendar, dayStart, dayEnd) {
  if (!calendar || !(dayStart instanceof Date) || !(dayEnd instanceof Date)) return [];
  const events = calendar.getEvents(dayStart, dayEnd)
    .filter(ev => /^consultation:\s+/i.test(String(ev.getTitle() || '')));
  events.sort((a, b) => a.getStartTime().getTime() - b.getStartTime().getTime());
  return events.map(ev => {
    const title = normalizeSingleLine(ev.getTitle() || '');
    const name = normalizeSingleLine(title.replace(/^consultation:\s*/i, '')) || 'Client';
    const description = ev.getDescription() || '';
    const service = extractDescriptionField(description, 'Service');
    const status = extractDescriptionField(description, 'Matter Stage')
      || extractDescriptionField(description, 'Status')
      || 'Intake';
    const waiting = !/(closed|completed|done|cancelled|canceled|no show|noshow)/i.test(status);
    return {
      event: ev,
      name: name,
      service: service,
      status: status,
      waiting: waiting,
      start: ev.getStartTime()
    };
  });
}

function upsertOfficeBriefReminder(calendar, targetDate, context) {
  const bounds = getTorontoDayBounds(targetDate);
  if (!bounds || !calendar) return { success: false, eventId: '', dayKey: '' };

  const consultations = collectConsultationEventsForDay(calendar, bounds.start, bounds.end);
  const props = PropertiesService.getScriptProperties();
  const eventKey = `${OFFICE_BRIEF_PROP_PREFIX}${bounds.key}`;
  const hashKey = `${OFFICE_BRIEF_HASH_PREFIX}${bounds.key}`;
  const existingId = normalizeSingleLine(props.getProperty(eventKey) || '');

  if (!consultations.length) {
    if (existingId) {
      try {
        const oldEvent = calendar.getEventById(existingId);
        if (oldEvent) oldEvent.deleteEvent();
      } catch (e) { }
    }
    props.deleteProperty(eventKey);
    props.deleteProperty(hashKey);
    return { success: true, eventId: '', dayKey: bounds.key, deleted: true, clientsCount: 0 };
  }

  const firstStart = consultations[0].start;
  const now = new Date();
  const minimum = new Date(now.getTime() + 2 * 60 * 1000);
  let briefStart = new Date(firstStart.getTime() - OFFICE_BRIEF_LEAD_MINUTES * 60 * 1000);
  if (briefStart.getTime() < minimum.getTime()) briefStart = minimum;
  let briefEnd = new Date(briefStart.getTime() + OFFICE_BRIEF_DURATION_MINUTES * 60 * 1000);
  if (briefEnd.getTime() <= briefStart.getTime()) {
    briefEnd = new Date(briefStart.getTime() + 10 * 60 * 1000);
  }

  const lines = consultations.map((entry, idx) => {
    const timeLabel = Utilities.formatDate(entry.start, TORONTO_TZ, 'hh:mm a');
    const serviceLabel = entry.service ? ` - ${entry.service}` : '';
    return `${idx + 1}. ${timeLabel} - ${entry.name}${serviceLabel}`;
  });

  const title = bounds.key === Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd')
    ? 'TODAY CLIENT BRIEF (ROAD)'
    : `CLIENT BRIEF ${bounds.key}`;
  const description = [
    `Date: ${bounds.key}`,
    `Updated: ${Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm:ss')}`,
    context && context.lastSourceName ? `Last update from: ${normalizeSingleLine(context.lastSourceName)}` : '',
    '',
    'Clients:',
    lines.join('\n'),
    '',
    'This reminder updates when new bookings appear.'
  ].filter(Boolean).join('\n');

  let reminderEvent = null;
  if (existingId) {
    try {
      reminderEvent = calendar.getEventById(existingId);
    } catch (e) {
      reminderEvent = null;
    }
  }
  if (!reminderEvent) {
    reminderEvent = calendar.createEvent(title, briefStart, briefEnd, { description: description });
  } else {
    reminderEvent.setTitle(title);
    reminderEvent.setDescription(description);
    reminderEvent.setTime(briefStart, briefEnd);
  }
  try {
    reminderEvent.removeAllReminders();
    reminderEvent.addPopupReminder(10);
  } catch (e) { }

  const eventId = normalizeSingleLine(reminderEvent.getId() || '');
  props.setProperty(eventKey, eventId);

  const digestHash = sha256Hex(`${bounds.key}|${lines.join('|')}`);
  const previousHash = normalizeSingleLine(props.getProperty(hashKey) || '');
  props.setProperty(hashKey, digestHash);

  const todayKey = Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd');
  if (bounds.key === todayKey && previousHash && previousHash !== digestHash) {
    const msg = [
      '🔄 TODAY CLIENT LIST UPDATED',
      `📅 Date: ${bounds.key}`,
      `👥 Total: ${consultations.length}`,
      '📋 Clients:',
      lines.join('\n')
    ].join('\n');
    sendTelegramTextMessage(truncate(msg, 3500));
  }

  return {
    success: true,
    eventId: eventId,
    eventUrl: buildCalendarEventLink(eventId),
    dayKey: bounds.key,
    clientsCount: consultations.length
  };
}

function refreshOfficeBriefReminderForSlot(slotIso) {
  const slotDate = parseSlotIsoToTorontoDate(slotIso);
  if (!slotDate) return false;
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  upsertOfficeBriefReminder(calendar, slotDate, {});
  return true;
}

function createDeadlineReminderEvent(calendar, data, ctx) {
  if (!calendar || !data || !data.deadline) return { success: false, eventId: '' };
  const deadlineRef = parseDeadlineDateOnly(data.deadline);
  if (!deadlineRef) return { success: false, eventId: '' };

  const now = new Date();
  const minFuture = new Date(now.getTime() + 2 * 60 * 1000);
  let reminderStart = new Date(deadlineRef.getTime() - DEADLINE_REMINDER_HOURS_BEFORE * 60 * 60 * 1000);
  if (reminderStart.getTime() < minFuture.getTime()) {
    reminderStart = new Date(deadlineRef.getTime() - 2 * 60 * 60 * 1000);
  }
  if (reminderStart.getTime() < minFuture.getTime()) {
    return { success: false, eventId: '', skipped: 'past' };
  }

  const reminderEnd = new Date(reminderStart.getTime() + 15 * 60 * 1000);
  const lines = [
    `Client: ${normalizeSingleLine(data.name || '')}`,
    `Deadline: ${normalizeSingleLine(data.deadline || '')}`,
    `Appointment: ${normalizeSingleLine(data.dateStr || '')}`,
    `Service: ${normalizeSingleLine(getBookingServiceDisplayText(data) || data.service || '')}`,
    `Phone: ${normalizeSingleLine(data.phone || '')}`,
    `Email: ${normalizeSingleLine(data.email || '')}`,
    ctx && ctx.keepNoteUrl ? `Keep: ${normalizeSingleLine(ctx.keepNoteUrl)}` : '',
    ctx && ctx.bookingId ? `Booking ID: ${normalizeSingleLine(ctx.bookingId)}` : ''
  ].filter(Boolean).join('\n');

  const event = calendar.createEvent(
    `DEADLINE REMINDER: ${normalizeSingleLine(data.name || 'Client')}`,
    reminderStart,
    reminderEnd,
    { description: lines }
  );
  try {
    event.removeAllReminders();
    event.addPopupReminder(10);
  } catch (e) { }

  const eventId = normalizeSingleLine(event.getId() || '');
  return {
    success: true,
    eventId: eventId,
    eventUrl: buildCalendarEventLink(eventId)
  };
}

function toLowerSearch(value) {
  return String(value || '').toLowerCase();
}

function makeSearchMarkers(meta) {
  const markers = [];
  const bookingId = normalizeSingleLine(meta.bookingId || '');
  const cameraSession = normalizeSingleLine(meta.cameraEvidenceSessionId || '');
  const email = normalizeSingleLine(meta.email || '').toLowerCase();
  const phone = String(meta.phone || '').replace(/\D/g, '');
  const slotIso = normalizeSingleLine(meta.slotIso || '');
  if (bookingId) markers.push(bookingId.toLowerCase());
  if (cameraSession) markers.push(cameraSession.toLowerCase());
  if (email) markers.push(email);
  if (phone) markers.push(phone);
  if (slotIso) markers.push(slotIso.toLowerCase());
  return markers;
}

function getMatchingClientRows(meta) {
  const sheet = getClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const lastCol = Math.max(1, sheet.getLastColumn());
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const markers = makeSearchMarkers(meta);
  const fallbackEmail = normalizeSingleLine(meta.email || '').toLowerCase();
  const fallbackPhone = String(meta.phone || '').replace(/\D/g, '');
  const fallbackName = normalizeSingleLine(meta.name || '').toLowerCase();

  const out = [];
  values.forEach((row, idx) => {
    const rawText = row.map(v => String(v || '')).join(' | ');
    const text = toLowerSearch(rawText);
    const digits = rawText.replace(/\D/g, '');
    let matched = false;
    if (markers.length) {
      matched = markers.some(m => m && text.indexOf(m) !== -1);
    } else if (fallbackEmail && text.indexOf(fallbackEmail) !== -1) {
      matched = true;
    } else if (fallbackPhone && digits.indexOf(fallbackPhone) !== -1) {
      matched = true;
    } else if (fallbackName && fallbackName.length >= 4 && text.indexOf(fallbackName) !== -1) {
      matched = true;
    }
    if (!matched) return;
    out.push({
      rowNumber: idx + 2,
      values: row
    });
  });
  return out;
}

function setMatterStage(meta, stageRaw) {
  const stage = truncate(normalizeSingleLine(stageRaw || ''), 80);
  if (!stage) return { success: false, stage: '', rowsUpdated: 0, eventUpdated: false };
  const rows = getMatchingClientRows(meta);
  const sheet = getClientSheet();
  rows.forEach(row => {
    try {
      sheet.getRange(row.rowNumber, MATTER_STAGE_COLUMN_INDEX).setValue(stage);
    } catch (e) { }
  });

  let eventUpdated = false;
  const eventId = normalizeSingleLine(meta.eventId || '');
  if (eventId) {
    try {
      const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
      const event = calendar.getEventById(eventId);
      if (event) {
        const updated = upsertDescriptionLine(event.getDescription() || '', 'Matter Stage: ', stage);
        event.setDescription(updated);
        eventUpdated = true;
      }
    } catch (e) { }
  }

  return {
    success: true,
    stage: stage,
    rowsUpdated: rows.length,
    eventUpdated: eventUpdated
  };
}

function createFollowupPlus7Event(meta) {
  const name = normalizeSingleLine(meta.name || 'Client');
  const service = normalizeSingleLine(meta.service || '');
  const bookingId = normalizeSingleLine(meta.bookingId || '');
  const phone = normalizeSingleLine(meta.phone || '');
  const email = normalizeSingleLine(meta.email || '');
  const nowToronto = getTorontoNowDate();
  const plus7 = new Date(nowToronto.getTime());
  plus7.setDate(plus7.getDate() + 7);

  const y = parseInt(Utilities.formatDate(plus7, TORONTO_TZ, 'yyyy'), 10);
  const m = parseInt(Utilities.formatDate(plus7, TORONTO_TZ, 'M'), 10) - 1;
  const d = parseInt(Utilities.formatDate(plus7, TORONTO_TZ, 'd'), 10);
  const start = getTorontoDate(y, m, d, 10, 0);
  const end = getTorontoDate(y, m, d, 10, 30);
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const title = `FOLLOW-UP +7D: ${name}`;
  const description = [
    `Booking ID: ${bookingId || 'N/A'}`,
    `Service: ${service || 'N/A'}`,
    `Phone: ${phone || 'N/A'}`,
    `Email: ${email || 'N/A'}`,
    `Source slot: ${normalizeSingleLine(meta.slotIso || 'N/A')}`
  ].join('\n');
  const event = calendar.createEvent(title, start, end, { description: description });
  try {
    event.removeAllReminders();
    event.addPopupReminder(60);
  } catch (e) { }
  const eventId = normalizeSingleLine(event.getId() || '');
  return {
    success: true,
    eventId: eventId,
    eventUrl: buildCalendarEventLink(eventId),
    dateLabel: Utilities.formatDate(start, TORONTO_TZ, 'yyyy-MM-dd hh:mm a')
  };
}

function createMatterTimelineDoc(meta) {
  const bookingId = normalizeSingleLine(meta.bookingId || '') || Utilities.getUuid().slice(0, 8);
  const name = normalizeSingleLine(meta.name || 'Client');
  const service = normalizeSingleLine(meta.service || 'N/A');
  const rows = getMatchingClientRows(meta);
  const doc = DocumentApp.create(`Matter Timeline - ${name} - ${bookingId}`);
  const body = doc.getBody();
  body.appendParagraph('Matter Timeline').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Generated: ${Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm:ss')}`);
  body.appendParagraph(`Booking ID: ${bookingId}`);
  body.appendParagraph(`Client: ${name}`);
  body.appendParagraph(`Service: ${service}`);
  body.appendParagraph(`Email: ${normalizeSingleLine(meta.email || 'N/A')}`);
  body.appendParagraph(`Phone: ${normalizeSingleLine(meta.phone || 'N/A')}`);
  body.appendParagraph(`Appointment: ${normalizeSingleLine(meta.slotIso || 'N/A')}`);
  body.appendParagraph('');
  body.appendParagraph('Matched spreadsheet rows').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (!rows.length) {
    body.appendParagraph('No matching rows found.');
  } else {
    rows.slice(0, 20).forEach(entry => {
      const v = entry.values || [];
      const rowSummary = [
        `Row ${entry.rowNumber}`,
        `Created: ${normalizeSingleLine(v[0] || '') || 'N/A'}`,
        `Appointment: ${normalizeSingleLine(v[1] || '') || 'N/A'}`,
        `Name: ${normalizeSingleLine(v[2] || '') || 'N/A'}`,
        `Service: ${normalizeSingleLine(v[5] || '') || 'N/A'}`,
        `Stage: ${normalizeSingleLine(v[6] || '') || 'N/A'}`
      ].join(' | ');
      body.appendListItem(rowSummary);
    });
  }
  doc.saveAndClose();

  const docId = doc.getId();
  const folder = getFolderByIdSafe(meta.folderId);
  const movedUrl = moveFileToFolderSafe(docId, folder);
  const fileUrl = movedUrl || `https://docs.google.com/document/d/${docId}/edit`;
  return { success: true, docUrl: fileUrl };
}

function createInvoiceDraftDoc(meta) {
  const bookingId = normalizeSingleLine(meta.bookingId || '') || Utilities.getUuid().slice(0, 8);
  const name = normalizeSingleLine(meta.name || 'Client');
  const service = normalizeSingleLine(meta.service || 'N/A');
  const doc = DocumentApp.create(`Invoice Draft - ${name} - ${bookingId}`);
  const body = doc.getBody();
  body.appendParagraph('INVOICE DRAFT').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Date: ${Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd')}`);
  body.appendParagraph(`Booking ID: ${bookingId}`);
  body.appendParagraph(`Client: ${name}`);
  body.appendParagraph(`Service: ${service}`);
  body.appendParagraph(`Email: ${normalizeSingleLine(meta.email || 'N/A')}`);
  body.appendParagraph(`Phone: ${normalizeSingleLine(meta.phone || 'N/A')}`);
  body.appendParagraph('');
  body.appendParagraph('Line Items').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendListItem('[ ] Intake review - 0.00 CAD');
  body.appendListItem('[ ] Document drafting - 0.00 CAD');
  body.appendListItem('[ ] Filing/prep - 0.00 CAD');
  body.appendParagraph('');
  body.appendParagraph('Notes:');
  body.appendParagraph('This is an internal draft. Validate rates, HST, trust offsets, and disbursements before sending.');
  doc.saveAndClose();

  const docId = doc.getId();
  const folder = getFolderByIdSafe(meta.folderId);
  const movedUrl = moveFileToFolderSafe(docId, folder);
  const fileUrl = movedUrl || `https://docs.google.com/document/d/${docId}/edit`;
  return { success: true, docUrl: fileUrl };
}

function getOrCreateTrustLedgerSheet() {
  const ss = SpreadsheetApp.openById(getPrimarySpreadsheetId());
  let sheet = ss.getSheetByName(TRUST_LEDGER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TRUST_LEDGER_SHEET_NAME);
  }
  if (sheet.getLastRow() < 1) {
    sheet.appendRow([
      'Updated',
      'Booking ID',
      'Client',
      'Email',
      'Phone',
      'Service',
      'Stage',
      'Retainer CAD',
      'Credit CAD',
      'Debit CAD',
      'Balance CAD',
      'Notes'
    ]);
  }
  return sheet;
}

function upsertTrustLedgerRow(meta) {
  const bookingId = normalizeSingleLine(meta.bookingId || '');
  if (!bookingId) return { success: false, row: 0, url: '' };
  const sheet = getOrCreateTrustLedgerSheet();
  const lastRow = sheet.getLastRow();
  const values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, Math.max(12, sheet.getLastColumn())).getValues() : [];
  let targetRow = 0;
  for (let i = 0; i < values.length; i++) {
    const rowBooking = normalizeSingleLine(values[i][1] || '');
    if (rowBooking && rowBooking === bookingId) {
      targetRow = i + 2;
      break;
    }
  }

  const rows = getMatchingClientRows(meta);
  const stage = rows.length ? normalizeSingleLine(rows[0].values[6] || '') : '';
  const record = [
    Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm:ss'),
    bookingId,
    normalizeSingleLine(meta.name || ''),
    normalizeSingleLine(meta.email || ''),
    normalizeSingleLine(meta.phone || ''),
    normalizeSingleLine(meta.service || ''),
    stage || 'Intake',
    0,
    0,
    0,
    0,
    'Auto-created from intake dashboard macro'
  ];
  if (!targetRow) {
    sheet.appendRow(record);
    targetRow = sheet.getLastRow();
  } else {
    sheet.getRange(targetRow, 1, 1, record.length).setValues([record]);
  }
  const url = `https://docs.google.com/spreadsheets/d/${getPrimarySpreadsheetId()}/edit#gid=${sheet.getSheetId()}&range=A${targetRow}`;
  return { success: true, row: targetRow, url: url };
}

function createClientUpdateDraft(meta) {
  const to = normalizeSingleLine(meta.email || '');
  if (!to) return { success: false, url: '', subject: '' };
  const name = normalizeSingleLine(meta.name || 'Client');
  const service = normalizeSingleLine(meta.service || 'your matter');
  const subject = `Case update - ${name}`;
  const body = [
    `Hello ${name},`,
    '',
    `This is a quick update regarding your ${service}.`,
    'We are currently reviewing the next procedural step and will send the exact action list shortly.',
    '',
    'If you have any urgent updates, reply to this email.',
    '',
    'Regards,',
    'Hanna Dunchenko'
  ].join('\n');
  GmailApp.createDraft(to, subject, body);
  return {
    success: true,
    subject: subject,
    url: buildGmailSearchLink(`in:drafts subject:\"${subject}\" to:${to}`)
  };
}

function createMissingDocsDraft(meta) {
  const to = normalizeSingleLine(meta.email || '');
  if (!to) return { success: false, url: '', subject: '' };
  const name = normalizeSingleLine(meta.name || 'Client');
  const service = normalizeSingleLine(meta.service || '');
  const forms = getKeepFormsChecklist(service).slice(0, 12);
  const list = forms.length ? forms.map(f => `- [ ] ${f}`).join('\n') : '- [ ] Government ID\n- [ ] Supporting documents';
  const subject = `Documents needed - ${name}`;
  const body = [
    `Hello ${name},`,
    '',
    'To move your file forward, please send the following documents:',
    list,
    '',
    'If a document is unavailable, reply with a short explanation.',
    '',
    'Regards,',
    'Hanna Dunchenko'
  ].join('\n');
  GmailApp.createDraft(to, subject, body);
  return {
    success: true,
    subject: subject,
    url: buildGmailSearchLink(`in:drafts subject:\"${subject}\" to:${to}`)
  };
}

function runMatterConflictCheck(meta) {
  const sheet = getClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { count: 0, rows: [] };
  }
  const values = sheet.getRange(2, 1, lastRow - 1, Math.max(1, sheet.getLastColumn())).getValues();
  const email = normalizeSingleLine(meta.email || '').toLowerCase();
  const phone = String(meta.phone || '').replace(/\D/g, '');
  const name = normalizeSingleLine(meta.name || '').toLowerCase();
  const rows = [];
  values.forEach((row, idx) => {
    const raw = row.map(v => String(v || '')).join(' | ');
    const text = toLowerSearch(raw);
    const digits = raw.replace(/\D/g, '');
    const byEmail = email && text.indexOf(email) !== -1;
    const byPhone = phone && digits.indexOf(phone) !== -1;
    const byName = name && name.length >= 4 && text.indexOf(name) !== -1;
    if (byEmail || byPhone || byName) {
      rows.push({
        rowNumber: idx + 2,
        name: normalizeSingleLine(row[2] || ''),
        service: normalizeSingleLine(row[5] || ''),
        dateStr: normalizeSingleLine(row[1] || '')
      });
    }
  });
  return {
    count: rows.length,
    rows: rows.slice(0, 20)
  };
}

