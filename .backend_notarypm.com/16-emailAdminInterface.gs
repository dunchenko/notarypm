/*
  Admin macros: Danger/Dashboard, Delete, Kill-zone, Keep card/bringForward actions.
  Extracted from google-apps-script.js for maintainability.
*/

function deleteClientRows(meta) {
  const sheet = getClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const lastCol = Math.max(1, sheet.getLastColumn());
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const bookingId = normalizeSingleLine(meta.bookingId || '').toLowerCase();
  const fallbackEmail = normalizeSingleLine(meta.email || '').toLowerCase();
  const fallbackPhone = String(meta.phone || '').replace(/\D/g, '');
  const fallbackSlotIso = normalizeSingleLine(meta.slotIso || '').toLowerCase();
  const targetRows = [];

  values.forEach((row, idx) => {
    const rowTextRaw = row.map(v => String(v || '')).join(' | ');
    const rowText = rowTextRaw.toLowerCase();
    const rowDigits = rowTextRaw.replace(/\D/g, '');
    let matched = false;
    if (bookingId && rowText.indexOf(bookingId) !== -1) {
      matched = true;
    } else if (!bookingId && fallbackEmail && rowText.indexOf(fallbackEmail) !== -1) {
      matched = true;
    } else if (!bookingId && fallbackPhone && rowDigits.indexOf(fallbackPhone) !== -1) {
      matched = true;
    } else if (!bookingId && fallbackSlotIso && rowText.indexOf(fallbackSlotIso) !== -1) {
      matched = true;
    }
    if (matched) targetRows.push(idx + 2);
  });

  targetRows.sort((a, b) => b - a).forEach(r => sheet.deleteRow(r));
  return targetRows.length;
}

function deleteLogRows(meta) {
  const logSpreadsheetId = getLogSpreadsheetId();
  if (!logSpreadsheetId) return 0;
  const ss = SpreadsheetApp.openById(logSpreadsheetId);
  const sheet = ss.getSheetByName(LOG_SHEET_NAME) || ss.getSheets()[0];
  if (!sheet) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const width = Math.max(LOG_HEADERS.length, sheet.getLastColumn(), 1);
  const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  const markers = makeSearchMarkers(meta);
  if (!markers.length) return 0;

  const targetRows = [];
  values.forEach((row, idx) => {
    const text = toLowerSearch(row.map(v => String(v || '')).join(' | '));
    if (markers.some(m => m && text.indexOf(m) !== -1)) {
      targetRows.push(idx + 2);
    }
  });
  targetRows.sort((a, b) => b - a).forEach(r => sheet.deleteRow(r));
  return targetRows.length;
}

function deleteCalendarBookingEvent(meta) {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const eventId = normalizeSingleLine(meta.eventId || '');
  const bookingId = normalizeSingleLine(meta.bookingId || '').toLowerCase();

  if (eventId) {
    try {
      const event = calendar.getEventById(eventId);
      if (event) {
        event.deleteEvent();
        return 1;
      }
    } catch (e) { }
  }

  const slotStart = parseSlotIsoToTorontoDate(meta.slotIso || '');
  if (!slotStart) return 0;
  const searchStart = new Date(slotStart.getTime() - (2 * 60 * 60 * 1000));
  const searchEnd = new Date(slotStart.getTime() + (2 * 60 * 60 * 1000));
  const events = calendar.getEvents(searchStart, searchEnd);
  let deleted = 0;
  events.forEach(ev => {
    if (!ev || !isBlockingEvent(ev)) return;
    const desc = toLowerSearch(ev.getDescription() || '');
    const title = toLowerSearch(ev.getTitle() || '');
    const email = toLowerSearch(meta.email || '');
    const phoneDigits = String(meta.phone || '').replace(/\D/g, '');
    const textDigits = `${ev.getTitle()}\n${ev.getDescription()}`.replace(/\D/g, '');
    const byBooking = bookingId && desc.indexOf(bookingId) !== -1;
    const byEmail = email && (desc.indexOf(email) !== -1 || title.indexOf(email) !== -1);
    const byPhone = phoneDigits && textDigits.indexOf(phoneDigits) !== -1;
    if (byBooking || byEmail || byPhone) {
      try {
        ev.deleteEvent();
        deleted++;
      } catch (err) { }
    }
  });
  return deleted;
}

function executeFullBookingDelete(meta) {
  const result = {
    calendarDeleted: 0,
    clientRowsDeleted: 0,
    logsDeleted: 0,
    driveFolderDeleted: 0,
    cameraFoldersDeleted: 0,
    errors: []
  };

  try {
    result.calendarDeleted = deleteCalendarBookingEvent(meta);
  } catch (e) {
    result.errors.push(`Calendar: ${e.message}`);
  }

  try {
    result.clientRowsDeleted = deleteClientRows(meta);
  } catch (e) {
    result.errors.push(`Client sheet: ${e.message}`);
  }

  try {
    result.driveFolderDeleted = trashFolderById(meta.folderId) ? 1 : 0;
  } catch (e) {
    result.errors.push(`Drive folder: ${e.message}`);
  }

  try {
    result.cameraFoldersDeleted = trashCameraEvidenceFoldersBySession(meta.cameraEvidenceSessionId);
  } catch (e) {
    result.errors.push(`Camera duplicates: ${e.message}`);
  }

  try {
    result.logsDeleted = deleteLogRows(meta);
  } catch (e) {
    result.errors.push(`Logs: ${e.message}`);
  }

  return result;
}

function anonymizeClientRows(meta) {
  const sheet = getClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const lastCol = Math.max(1, sheet.getLastColumn());
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const markers = makeSearchMarkers(meta);
  const replacement = '[ANONYMIZED]';
  let updated = 0;

  values.forEach((row, idx) => {
    const text = toLowerSearch(row.map(v => String(v || '')).join(' | '));
    if (!markers.some(m => m && text.indexOf(m) !== -1)) return;

    const out = row.slice();
    const write = (colIndex, value) => {
      if (colIndex < out.length) out[colIndex] = value;
    };
    write(2, replacement); // Name
    write(3, replacement); // Phone
    write(4, replacement); // Email
    write(7, replacement); // DOB
    write(8, replacement); // Address
    write(9, replacement); // Notes
    write(10, replacement); // Files
    write(11, replacement); // Occupation
    write(13, replacement); // Referral source
    sheet.getRange(idx + 2, 1, 1, out.length).setValues([out]);
    updated++;
  });

  return updated;
}

function deleteClientReminderEvents(meta) {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const start = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000));
  const end = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
  const terms = [
    normalizeSingleLine(meta.bookingId || ''),
    normalizeSingleLine(meta.email || ''),
    normalizeSingleLine(meta.name || ''),
    String(meta.phone || '').replace(/\D/g, '')
  ].filter(Boolean);

  const map = {};
  terms.forEach(term => {
    try {
      calendar.getEvents(start, end, { search: term }).forEach(ev => {
        const id = normalizeSingleLine(ev.getId() || '');
        if (id) map[id] = ev;
      });
    } catch (e) { }
  });

  const events = Object.keys(map).map(id => map[id]);
  let deleted = 0;
  events.forEach(ev => {
    if (!ev) return;
    const title = toLowerSearch(ev.getTitle() || '');
    const desc = toLowerSearch(ev.getDescription() || '');
    const digits = `${ev.getTitle()}\n${ev.getDescription()}`.replace(/\D/g, '');
    const phoneDigits = String(meta.phone || '').replace(/\D/g, '');
    const byType = title.indexOf('deadline reminder') !== -1 || title.indexOf('office brief') !== -1;
    const byMeta = (meta.bookingId && desc.indexOf(toLowerSearch(meta.bookingId)) !== -1)
      || (meta.email && desc.indexOf(toLowerSearch(meta.email)) !== -1)
      || (phoneDigits && digits.indexOf(phoneDigits) !== -1);
    if (byType || byMeta) {
      try {
        ev.deleteEvent();
        deleted++;
      } catch (e) { }
    }
  });
  return deleted;
}

function runDangerMacro(payload) {
  const mode = normalizeSingleLine(payload.mode || '').toLowerCase();
  const bookingId = normalizeSingleLine(payload.bookingId || '');
  const allowMissingBookingId = mode === 'pause_intake' || mode === 'resume_intake';
  if (!mode) return { success: false, mode: '', details: ['Missing macro mode.'] };
  if (!bookingId && !allowMissingBookingId) return { success: false, mode: mode, details: ['Missing booking ID.'] };

  if (mode !== 'disable_links' && mode !== 'pause_intake' && mode !== 'resume_intake') {
    assertBookingActionAllowed(bookingId);
  }

  if (mode === 'pause_intake') {
    const current = getBookingIntakeStatus();
    if (current.enabled === false) {
      return {
        success: true,
        mode: mode,
        details: [
          'Intake is already paused. No changes made.',
          `Current reason: ${current.reason}`
        ]
      };
    }
    const status = setBookingIntakeStatus(false, payload.intakeReason || '', payload);
    return {
      success: true,
      mode: mode,
      details: [
        'Website intake is now paused.',
        `Current status: ${status.enabled ? 'Enabled' : 'Paused'}`,
        `Reason shown to clients: ${status.reason}`
      ]
    };
  }

  if (mode === 'resume_intake') {
    const current = getBookingIntakeStatus();
    if (current.enabled === true) {
      return {
        success: true,
        mode: mode,
        details: [
          'Intake is already active. No changes made.'
        ]
      };
    }
    setBookingIntakeStatus(true, '', payload);
    return {
      success: true,
      mode: mode,
      details: [
        'Website intake is now live again.',
        'Current status: Enabled',
        'Pause reason cleared.'
      ]
    };
  }

  if (mode === 'purge_all') {
    const result = executeFullBookingDelete(payload);
    const keepDeleted = payload.keepNoteName ? trashKeepNoteByName(payload.keepNoteName) : false;
    const details = [
      `Calendar events deleted: ${Number(result.calendarDeleted || 0)}`,
      `Client rows deleted: ${Number(result.clientRowsDeleted || 0)}`,
      `Drive folders trashed: ${Number(result.driveFolderDeleted || 0)}`,
      `Camera folders trashed: ${Number(result.cameraFoldersDeleted || 0)}`,
      `Log rows deleted: ${Number(result.logsDeleted || 0)}`,
      `Keep note trashed: ${keepDeleted ? 'Yes' : 'No'}`
    ];
    if (Array.isArray(result.errors) && result.errors.length) {
      return { success: false, mode: mode, details: details, errors: result.errors };
    }
    return { success: true, mode: mode, details: details };
  }

  if (mode === 'purge_files_only') {
    const driveDeleted = trashFolderById(payload.folderId) ? 1 : 0;
    const cameraDeleted = trashCameraEvidenceFoldersBySession(payload.cameraEvidenceSessionId);
    return {
      success: true,
      mode: mode,
      details: [
        `Drive folders trashed: ${driveDeleted}`,
        `Camera folders trashed: ${cameraDeleted}`
      ]
    };
  }

  if (mode === 'anonymize_client') {
    const rows = anonymizeClientRows(payload);
    return {
      success: true,
      mode: mode,
      details: [`Client rows anonymized: ${rows}`]
    };
  }

  if (mode === 'stop_reminders') {
    const removed = deleteClientReminderEvents(payload);
    return {
      success: true,
      mode: mode,
      details: [`Reminder events deleted: ${removed}`]
    };
  }

  if (mode === 'disable_links') {
    markBookingRevoked(bookingId);
    return {
      success: true,
      mode: mode,
      details: ['All action links for this booking are now disabled.']
    };
  }

  if (mode === 'quarantine_client') {
    markBookingQuarantined(bookingId);
    return {
      success: true,
      mode: mode,
      details: ['Client marked as quarantined in script properties.']
    };
  }

  if (mode === 'export_then_purge') {
    const exportUrl = exportClientSnapshot(payload);
    const result = executeFullBookingDelete(payload);
    const details = [
      `Snapshot file: ${exportUrl || 'N/A'}`,
      `Calendar events deleted: ${Number(result.calendarDeleted || 0)}`,
      `Client rows deleted: ${Number(result.clientRowsDeleted || 0)}`,
      `Drive folders trashed: ${Number(result.driveFolderDeleted || 0)}`,
      `Camera folders trashed: ${Number(result.cameraFoldersDeleted || 0)}`,
      `Log rows deleted: ${Number(result.logsDeleted || 0)}`
    ];
    if (Array.isArray(result.errors) && result.errors.length) {
      return { success: false, mode: mode, details: details, errors: result.errors };
    }
    return { success: true, mode: mode, details: details };
  }

  if (mode === 'undo_purge_24h') {
    return {
      success: false,
      mode: mode,
      details: ['Undo is not available because purge operations are destructive.']
    };
  }

  return { success: false, mode: mode, details: ['Unknown danger macro mode.'] };
}

function getDangerModeLabel(mode) {
  const map = {
    purge_all: 'Purge Client Everywhere',
    purge_files_only: 'Purge Files Only',
    anonymize_client: 'Anonymize Client',
    stop_reminders: 'Stop All Reminders',
    disable_links: 'Disable Action Links',
    quarantine_client: 'Quarantine Client',
    export_then_purge: 'Export Then Purge',
    undo_purge_24h: 'Undo Last Purge (24h)',
    pause_intake: 'Stop Intake',
    resume_intake: 'Resume Intake'
  };
  return map[mode] || mode;
}

function getDashboardModeLabel(mode) {
  const map = {
    stage_intake: 'Set Stage Intake',
    stage_docs_pending: 'Set Stage Docs Pending',
    stage_filed: 'Set Stage Filed',
    stage_hearing: 'Set Stage Hearing',
    stage_closed: 'Set Stage Closed',
    followup_plus7: 'Next Deadline +7d',
    timeline_doc: 'Generate Timeline',
    invoice_draft: 'Draft Invoice',
    trust_ledger: 'Trust Ledger',
    client_update_draft: 'Client Update Draft',
    missing_docs_draft: 'Missing Docs Draft',
    conflict_check: 'Conflict Check'
  };
  return map[mode] || mode;
}

function runDashboardMacro(payload) {
  const mode = normalizeSingleLine(payload.mode || '').toLowerCase();
  const bookingId = normalizeSingleLine(payload.bookingId || '');
  if (!mode) return { success: false, mode: '', details: ['Missing dashboard mode.'], links: [] };
  assertBookingActionAllowed(bookingId);

  if (mode === 'stage_intake') {
    const result = setMatterStage(payload, 'Intake');
    return {
      success: true,
      mode: mode,
      details: [`Matter stage set to Intake.`, `Rows updated: ${result.rowsUpdated}`, `Calendar updated: ${result.eventUpdated ? 'Yes' : 'No'}`],
      links: [{ label: 'Open Database', url: getDatabaseSheetUrl() }]
    };
  }

  if (mode === 'stage_docs_pending') {
    const result = setMatterStage(payload, 'Docs Pending');
    return {
      success: true,
      mode: mode,
      details: [`Matter stage set to Docs Pending.`, `Rows updated: ${result.rowsUpdated}`, `Calendar updated: ${result.eventUpdated ? 'Yes' : 'No'}`],
      links: [{ label: 'Open Database', url: getDatabaseSheetUrl() }]
    };
  }

  if (mode === 'stage_filed') {
    const result = setMatterStage(payload, 'Filed');
    return {
      success: true,
      mode: mode,
      details: [`Matter stage set to Filed.`, `Rows updated: ${result.rowsUpdated}`, `Calendar updated: ${result.eventUpdated ? 'Yes' : 'No'}`],
      links: [{ label: 'Open Database', url: getDatabaseSheetUrl() }]
    };
  }

  if (mode === 'stage_hearing') {
    const result = setMatterStage(payload, 'Hearing');
    return {
      success: true,
      mode: mode,
      details: [`Matter stage set to Hearing.`, `Rows updated: ${result.rowsUpdated}`, `Calendar updated: ${result.eventUpdated ? 'Yes' : 'No'}`],
      links: [{ label: 'Open Database', url: getDatabaseSheetUrl() }]
    };
  }

  if (mode === 'stage_closed') {
    const result = setMatterStage(payload, 'Closed');
    return {
      success: true,
      mode: mode,
      details: [`Matter stage set to Closed.`, `Rows updated: ${result.rowsUpdated}`, `Calendar updated: ${result.eventUpdated ? 'Yes' : 'No'}`],
      links: [{ label: 'Open Database', url: getDatabaseSheetUrl() }]
    };
  }

  if (mode === 'followup_plus7') {
    const eventResult = createFollowupPlus7Event(payload);
    return {
      success: true,
      mode: mode,
      details: [`Created calendar follow-up for: ${eventResult.dateLabel}`],
      links: eventResult.eventUrl ? [{ label: 'Open Follow-up Event', url: eventResult.eventUrl }] : []
    };
  }

  if (mode === 'timeline_doc') {
    const docResult = createMatterTimelineDoc(payload);
    return {
      success: true,
      mode: mode,
      details: ['Timeline document generated in Google Docs.'],
      links: docResult.docUrl ? [{ label: 'Open Timeline Doc', url: docResult.docUrl }] : []
    };
  }

  if (mode === 'invoice_draft') {
    const docResult = createInvoiceDraftDoc(payload);
    return {
      success: true,
      mode: mode,
      details: ['Invoice draft generated in Google Docs.'],
      links: docResult.docUrl ? [{ label: 'Open Invoice Draft', url: docResult.docUrl }] : []
    };
  }

  if (mode === 'trust_ledger') {
    const ledger = upsertTrustLedgerRow(payload);
    if (!ledger.success) {
      return { success: false, mode: mode, details: ['Could not create trust ledger row.'], links: [] };
    }
    return {
      success: true,
      mode: mode,
      details: [`Trust ledger row ready: ${ledger.row}`],
      links: ledger.url ? [{ label: 'Open Trust Ledger Row', url: ledger.url }] : []
    };
  }

  if (mode === 'client_update_draft') {
    const draft = createClientUpdateDraft(payload);
    if (!draft.success) {
      return { success: false, mode: mode, details: ['Client email is missing for draft creation.'], links: [] };
    }
    return {
      success: true,
      mode: mode,
      details: [`Gmail draft created: ${draft.subject}`],
      links: draft.url ? [{ label: 'Open Draft In Gmail', url: draft.url }] : []
    };
  }

  if (mode === 'missing_docs_draft') {
    const draft = createMissingDocsDraft(payload);
    if (!draft.success) {
      return { success: false, mode: mode, details: ['Client email is missing for draft creation.'], links: [] };
    }
    return {
      success: true,
      mode: mode,
      details: [`Missing-docs draft created: ${draft.subject}`],
      links: draft.url ? [{ label: 'Open Draft In Gmail', url: draft.url }] : []
    };
  }

  if (mode === 'conflict_check') {
    const check = runMatterConflictCheck(payload);
    const rows = check.rows || [];
    const details = [`Potential matches found: ${check.count}`];
    rows.slice(0, 8).forEach(row => {
      details.push(`Row ${row.rowNumber}: ${row.name || 'N/A'} | ${row.service || 'N/A'} | ${row.dateStr || 'N/A'}`);
    });
    const links = [{
      label: 'Open Database',
      url: getDatabaseSheetUrl()
    }];
    if (payload.email || payload.phone || payload.name) {
      links.push({
        label: 'Search In Gmail',
        url: buildGmailSearchLink(`${normalizeSingleLine(payload.email || '')} OR ${normalizeSingleLine(payload.phone || '')} OR ${normalizeSingleLine(payload.name || '')}`)
      });
    }
    return { success: true, mode: mode, details: details, links: links };
  }

  return { success: false, mode: mode, details: ['Unknown dashboard macro mode.'], links: [] };
}

function renderDeleteBookingHtml(meta, result, hasError) {
  const title = hasError ? 'Delete Action Failed' : 'Delete Action Completed';
  const subtitle = hasError
    ? 'The link was invalid/expired, or deletion could not be completed.'
    : 'Requested data was removed across calendar, spreadsheet, Drive, and logs.';

  const safeBookingId = escapeHtml(meta && meta.bookingId ? meta.bookingId : 'N/A');
  const safeEmail = escapeHtml(meta && meta.email ? meta.email : 'N/A');
  const safeErrors = (result && Array.isArray(result.errors) ? result.errors : [])
    .map(e => `<li style="margin:0 0 6px 0;">${escapeHtml(e)}</li>`)
    .join('');

  const counters = result || {};
  return HtmlService.createHtmlOutput(`
    <html>
      <body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f4e9dd;color:#3f2f22;">
        <div style="max-width:760px;margin:40px auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:14px;padding:22px;box-shadow:0 8px 26px rgba(90,61,42,0.12);">
          <h2 style="margin:0 0 10px 0;color:${hasError ? '#a53b3b' : '#5a3d2a'};">${escapeHtml(title)}</h2>
          <p style="margin:0 0 14px 0;line-height:1.45;">${escapeHtml(subtitle)}</p>
          <p style="margin:0 0 8px 0;"><strong>Booking ID:</strong> ${safeBookingId}</p>
          <p style="margin:0 0 14px 0;"><strong>Email:</strong> ${safeEmail}</p>
          <div style="padding:12px 14px;border:1px solid #dfccba;border-radius:10px;background:#f9f2ea;">
            <p style="margin:0 0 6px 0;">Calendar events deleted: <strong>${Number(counters.calendarDeleted || 0)}</strong></p>
            <p style="margin:0 0 6px 0;">Client rows deleted: <strong>${Number(counters.clientRowsDeleted || 0)}</strong></p>
            <p style="margin:0 0 6px 0;">Drive folders moved to trash: <strong>${Number(counters.driveFolderDeleted || 0)}</strong></p>
            <p style="margin:0 0 6px 0;">Camera duplicate folders moved to trash: <strong>${Number(counters.cameraFoldersDeleted || 0)}</strong></p>
            <p style="margin:0;">Log rows deleted: <strong>${Number(counters.logsDeleted || 0)}</strong></p>
          </div>
          ${safeErrors ? `<div style="margin-top:14px;padding:12px 14px;border:1px solid #e5b8b8;border-radius:10px;background:#fff3f3;"><strong style="display:block;margin-bottom:8px;color:#a53b3b;">Warnings</strong><ul style="margin:0;padding-left:18px;">${safeErrors}</ul></div>` : ''}
        </div>
      </body>
    </html>
  `);
}

function handleDeleteBookingAction(e) {
  try {
    const payload = decodeSignedActionPayload(e);
    const bookingId = normalizeSingleLine(payload.bookingId || '');
    if (!bookingId) throw new Error('Missing booking identifier.');
    assertBookingActionAllowed(bookingId);
    assertSingleUseActionTokenAvailable(payload);
    const result = executeFullBookingDelete(payload);
    consumeSingleUseActionToken(payload);
    return renderDeleteBookingHtml(payload, result, false);
  } catch (err) {
    return renderDeleteBookingHtml({ bookingId: '', email: '' }, { errors: [String(err && err.message ? err.message : err)] }, true);
  }
}

function renderKillZoneConfirmationHtml(payload) {
  const request = buildSignedActionRequest('dangerMacro', payload);
  const status = getBookingIntakeStatus();
  const bookingId = escapeHtml(normalizeSingleLine(payload && payload.bookingId ? payload.bookingId : 'N/A'));
  const safeName = escapeHtml(normalizeSingleLine(payload && payload.name ? payload.name : 'N/A'));
  const safeStatus = escapeHtml(status.enabled ? 'RUNNING' : 'PAUSED');
  const safeReason = escapeHtml(status.reason || 'Intake is temporarily paused. Please call +1 (437) 239-6833 or email paralegal@hannadunchenko.com.');

  return HtmlService.createHtmlOutput(`
    <html>
      <body style="margin:0;padding:24px;font-family:Arial,sans-serif;background:#6f101f;color:#fff4f4;">
        <div style="max-width:820px;margin:40px auto;background:#8d1f2d;border:1px solid #4e0915;border-radius:18px;padding:28px;box-shadow:0 12px 34px rgba(40,0,0,0.34);">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#3d0711;color:#ffd7d7;font-weight:800;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Kill Zone Confirmation</div>
          <h2 style="margin:16px 0 12px 0;font-size:28px;line-height:1.15;color:#fff8f8;">Stop Intake Confirmation Required</h2>
          <p style="margin:0 0 12px 0;font-size:16px;line-height:1.55;color:#fff2f2;">
            This action fully stops website intake and booking submissions. Treat it as a hard shutdown for a minimum of 2 days.
          </p>
          <p style="margin:0 0 18px 0;font-size:16px;line-height:1.55;color:#fff2f2;">
            Clients will see the paused notice instead of a working booking flow until intake is manually resumed.
          </p>

          <div style="margin:0 0 18px 0;padding:14px 16px;border-radius:12px;background:rgba(61,7,17,0.45);border:1px solid rgba(255,215,215,0.22);">
            <p style="margin:0 0 8px 0;font-size:14px;line-height:1.45;"><strong>Current intake status:</strong> ${safeStatus}</p>
            ${status.enabled ? '' : `<p style="margin:0;font-size:14px;line-height:1.45;"><strong>Current pause reason:</strong> ${safeReason}</p>`}
          </div>

          <div style="margin:0 0 18px 0;padding:16px 18px;border-radius:12px;background:#fff1f1;color:#5f1220;border:1px solid #f0b8bf;">
            <strong style="display:block;margin-bottom:8px;font-size:15px;">Before you continue</strong>
            <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.5;">
              <li>New clients will not be able to submit the intake form.</li>
              <li>This is intended for a minimum 2-day operational stop.</li>
              <li>You will need to use the separate Resume Intake button later to restore booking.</li>
            </ul>
          </div>

          <div style="margin:0 0 18px 0;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);font-size:14px;line-height:1.5;color:#fff7f7;">
            <div><strong>Booking ID:</strong> ${bookingId}</div>
            <div><strong>Client:</strong> ${safeName}</div>
          </div>

          <form method="get" action="${escapeHtml(getScriptUrl())}" style="margin:0;">
            <input type="hidden" name="action" value="${escapeHtml(request.action)}">
            <input type="hidden" name="p" value="${escapeHtml(request.p)}">
            <input type="hidden" name="s" value="${escapeHtml(request.s)}">
            <input type="hidden" name="confirm" value="1">
            <label style="display:flex;align-items:flex-start;gap:10px;margin:0 0 18px 0;padding:14px 16px;border-radius:12px;background:rgba(61,7,17,0.4);border:1px solid rgba(255,215,215,0.22);cursor:pointer;">
              <input type="checkbox" name="ack" required style="margin-top:2px;transform:scale(1.15);">
              <span style="font-size:15px;line-height:1.5;color:#fff7f7;">I understand that this fully stops intake and should be treated as a minimum 2-day shutdown.</span>
            </label>
            <div style="display:flex;flex-wrap:wrap;gap:12px;">
              <button type="submit" style="padding:12px 18px;border-radius:12px;border:1px solid #3d0711;background:#4e0915;color:#fff7f7;font-weight:800;font-size:14px;cursor:pointer;">Confirm Stop Intake</button>
              <a href="#" onclick="window.close(); return false;" style="display:inline-block;padding:12px 18px;border-radius:12px;border:1px solid rgba(255,255,255,0.24);background:rgba(255,255,255,0.08);color:#fff7f7;text-decoration:none;font-weight:700;font-size:14px;">Cancel</a>
            </div>
          </form>
        </div>
      </body>
    </html>
  `);
}

function renderDangerMacroHtml(payload, macroResult, hasError) {
  const bookingId = escapeHtml(normalizeSingleLine(payload && payload.bookingId ? payload.bookingId : 'N/A'));
  const modeRaw = normalizeSingleLine(payload && payload.mode ? payload.mode : 'unknown');
  const mode = escapeHtml(getDangerModeLabel(modeRaw));
  const isKillZoneAction = modeRaw === 'pause_intake' || modeRaw === 'resume_intake';
  const lines = Array.isArray(macroResult && macroResult.details) ? macroResult.details : [];
  const errors = Array.isArray(macroResult && macroResult.errors) ? macroResult.errors : [];
  const safeLines = lines.map(line => `<li style="margin:0 0 6px 0;">${escapeHtml(line)}</li>`).join('');
  const safeErrors = errors.map(line => `<li style="margin:0 0 6px 0;">${escapeHtml(line)}</li>`).join('');
  const title = hasError
    ? (isKillZoneAction ? 'Kill Zone Action Failed' : 'Danger Macro Failed')
    : (isKillZoneAction ? 'Kill Zone Action Completed' : 'Danger Macro Completed');
  const subtitle = hasError
    ? (isKillZoneAction ? 'The intake control action did not complete fully. Review details below.' : 'The macro did not complete fully. Review details below.')
    : (isKillZoneAction ? 'The intake control action completed successfully.' : 'The requested macro completed successfully.');

  return HtmlService.createHtmlOutput(`
    <html>
      <body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f7e3e3;color:#3f2f22;">
        <div style="max-width:760px;margin:40px auto;background:#fff7f7;border:1px solid #e1b2b2;border-radius:14px;padding:22px;box-shadow:0 8px 26px rgba(120,20,20,0.12);">
          <h2 style="margin:0 0 10px 0;color:${hasError ? '#a53b3b' : '#7d1f1f'};">${escapeHtml(title)}</h2>
          <p style="margin:0 0 10px 0;line-height:1.45;">${escapeHtml(subtitle)}</p>
          <p style="margin:0 0 6px 0;"><strong>Booking ID:</strong> ${bookingId}</p>
          <p style="margin:0 0 12px 0;"><strong>Macro:</strong> ${mode}</p>
          ${safeLines ? `<div style="padding:10px 12px;border-radius:10px;background:#fff;border:1px solid #e8caca;"><strong style="display:block;margin-bottom:8px;">Details</strong><ul style="margin:0;padding-left:18px;">${safeLines}</ul></div>` : ''}
          ${safeErrors ? `<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:#fff1f1;border:1px solid #e5b8b8;"><strong style="display:block;margin-bottom:8px;color:#9b2020;">Errors</strong><ul style="margin:0;padding-left:18px;">${safeErrors}</ul></div>` : ''}
        </div>
      </body>
    </html>
  `);
}

function handleDangerMacroAction(e) {
  try {
    const payload = decodeSignedActionPayload(e);
    const mode = normalizeSingleLine(payload.mode || '').toLowerCase();
    const confirmRequested = normalizeSingleLine(getActionQueryValue(e, ['confirm'])).toLowerCase() === '1';
    assertSingleUseActionTokenAvailable(payload);
    if (mode === 'pause_intake' && !confirmRequested) {
      return renderKillZoneConfirmationHtml(payload);
    }
    const result = runDangerMacro(payload);
    if (result && result.success) {
      consumeSingleUseActionToken(payload);
    }
    return renderDangerMacroHtml(payload, result, !result.success);
  } catch (err) {
    try {
      const actionName = normalizeSingleLine(getActionQueryValue(e, ['action'])) || 'unknown';
      const payloadRaw = getActionQueryValue(e, ['p']) || '';
      const sigRaw = getActionQueryValue(e, ['s']) || '';
      logUsage({
        event: 'DANGER MACRO ERROR',
        severity: 'warning',
        details: `Action: ${actionName} | Error: ${truncate(String(err && err.message ? err.message : err), 800)} | pLen: ${String(payloadRaw).length} | sLen: ${String(sigRaw).length}`
      });
    } catch (logErr) { }
    return renderDangerMacroHtml(
      {},
      { success: false, details: [], errors: [String(err && err.message ? err.message : err)] },
      true
    );
  }
}

function renderDashboardMacroHtml(payload, macroResult, hasError) {
  const bookingId = escapeHtml(normalizeSingleLine(payload && payload.bookingId ? payload.bookingId : 'N/A'));
  const modeRaw = normalizeSingleLine(payload && payload.mode ? payload.mode : '');
  const modeLabel = escapeHtml(getDashboardModeLabel(modeRaw || 'unknown'));
  const lines = Array.isArray(macroResult && macroResult.details) ? macroResult.details : [];
  const links = Array.isArray(macroResult && macroResult.links) ? macroResult.links : [];
  const safeLines = lines.map(line => `<li style="margin:0 0 6px 0;">${escapeHtml(line)}</li>`).join('');
  const safeLinks = links
    .map(item => `<a href="${escapeHtml(item.url)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 14px;border-radius:9px;background:#5a3d2a;color:#fff;text-decoration:none;font-weight:700;font-size:13px;">${escapeHtml(item.label || 'Open')}</a>`)
    .join('');
  const title = hasError ? 'Dashboard Action Failed' : 'Dashboard Action Completed';
  const subtitle = hasError
    ? 'The requested dashboard action could not finish.'
    : 'The requested dashboard action completed.';

  return HtmlService.createHtmlOutput(`
    <html>
      <body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f4e9dd;color:#3f2f22;">
        <div style="max-width:760px;margin:40px auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:14px;padding:22px;box-shadow:0 8px 26px rgba(90,61,42,0.12);">
          <h2 style="margin:0 0 10px 0;color:${hasError ? '#a53b3b' : '#5a3d2a'};">${escapeHtml(title)}</h2>
          <p style="margin:0 0 10px 0;line-height:1.45;">${escapeHtml(subtitle)}</p>
          <p style="margin:0 0 6px 0;"><strong>Booking ID:</strong> ${bookingId}</p>
          <p style="margin:0 0 12px 0;"><strong>Action:</strong> ${modeLabel}</p>
          ${safeLines ? `<div style="padding:10px 12px;border-radius:10px;background:#fff;border:1px solid #e8d9ca;"><strong style="display:block;margin-bottom:8px;">Details</strong><ul style="margin:0;padding-left:18px;">${safeLines}</ul></div>` : ''}
          ${safeLinks ? `<div style="margin-top:12px;">${safeLinks}</div>` : ''}
        </div>
      </body>
    </html>
  `);
}

function handleDashboardMacroAction(e) {
  try {
    const payload = decodeSignedActionPayload(e);
    assertSingleUseActionTokenAvailable(payload);
    const result = runDashboardMacro(payload);
    if (result && result.success) {
      consumeSingleUseActionToken(payload);
    }
    return renderDashboardMacroHtml(payload, result, !result.success);
  } catch (err) {
    return renderDashboardMacroHtml(
      {},
      { success: false, details: [String(err && err.message ? err.message : err)], links: [] },
      true
    );
  }
}

function renderKeepCardHtml(payload, keepResult, hasError) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const result = keepResult && typeof keepResult === 'object' ? keepResult : {};
  const rawName = normalizeSingleLine(safePayload.name || 'Client');
  const safeName = escapeHtml(rawName || 'Client');
  const safeBookingId = escapeHtml(normalizeSingleLine(safePayload.bookingId || 'N/A'));
  const expectedKeepAccount = escapeHtml(getKeepOwnerEmail());
  const existingNoteUrl = toAccountAgnosticKeepUrl(result.noteUrl || safePayload.keepNoteUrl || '');
  const fallbackSearchUrl = toAccountAgnosticKeepUrl(
    result.searchUrl
    || buildKeepSearchLink(buildKeepClientSearchQuery(
      {
        name: normalizeSingleLine(safePayload.name || ''),
        email: normalizeSingleLine(safePayload.email || ''),
        phone: normalizeSingleLine(safePayload.phone || ''),
        service: normalizeSingleLine(safePayload.service || '')
      },
      { bookingId: normalizeSingleLine(safePayload.bookingId || '') }
    ))
  );
  const targetUrl = existingNoteUrl || fallbackSearchUrl || 'https://keep.google.com/';
  const safeTargetUrl = escapeHtml(targetUrl);
  const safeSearchUrl = escapeHtml(fallbackSearchUrl || 'https://keep.google.com/');
  const safeError = escapeHtml(result.error || '');
  const statusLabel = hasError
    ? 'Keep action needs attention'
    : (result.existed ? 'Existing Keep card opened' : 'New Keep card created');
  const subtitle = hasError
    ? 'The Keep card could not be created automatically. Use the fallback buttons below.'
    : (result.existed
      ? 'An existing client card was found in Google Keep. Redirecting now.'
      : 'A new client card was created in Google Keep. Redirecting now.');
  const accountHint = expectedKeepAccount
    ? `Target Keep account: ${expectedKeepAccount}`
    : 'Target Keep account: configured deployment owner';
  const autoRedirect = !hasError && targetUrl
    ? `<meta http-equiv="refresh" content="0;url=${safeTargetUrl}">`
    : '';

  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        ${autoRedirect}
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${hasError ? 'Keep Card Error' : 'Keep Card Ready'}</title>
      </head>
      <body style="margin:0;padding:24px;background:#f4e9dd;font-family:Arial,sans-serif;color:#3f2f22;">
        <div style="max-width:640px;margin:0 auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:18px;box-shadow:0 18px 42px rgba(90,61,42,0.14);overflow:hidden;">
          <div style="padding:22px 24px;background:linear-gradient(135deg,#f0c85b 0%,#d9ae34 100%);color:#4a3413;">
            <div style="font-size:12px;letter-spacing:1.1px;text-transform:uppercase;font-weight:800;">Google Keep</div>
            <h2 style="margin:8px 0 0 0;font-size:24px;line-height:1.2;">${escapeHtml(statusLabel)}</h2>
          </div>
          <div style="padding:22px 24px;">
            <p style="margin:0 0 10px 0;line-height:1.45;">${escapeHtml(subtitle)}</p>
            <p style="margin:0 0 8px 0;"><strong>Client:</strong> ${safeName}</p>
            <p style="margin:0 0 8px 0;"><strong>Booking ID:</strong> ${safeBookingId}</p>
            <p style="margin:0 0 14px 0;color:#7a614d;font-size:13px;">${accountHint}</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <a href="${safeTargetUrl}" style="display:inline-block;padding:10px 14px;border-radius:9px;background:#f3b63f;color:#3f2f22;text-decoration:none;font-weight:800;">Open Keep</a>
              <a href="${safeSearchUrl}" style="display:inline-block;padding:10px 14px;border-radius:9px;background:#fff5d8;color:#6b4d00;text-decoration:none;font-weight:800;border:1px solid #e3c76d;">Search In Keep</a>
              <a href="https://keep.google.com/" style="display:inline-block;padding:10px 14px;border-radius:9px;background:#f4ece4;color:#5a3d2a;text-decoration:none;font-weight:700;border:1px solid #dbc8b6;">Open Keep Home</a>
            </div>
            ${safeError ? `<div style="margin-top:14px;padding:10px 12px;border-radius:10px;border:1px solid #e5b8b8;background:#fff3f3;color:#7a2e2e;font-size:13px;"><strong>Error:</strong> ${safeError}</div>` : ''}
          </div>
        </div>
      </body>
    </html>
  `);
}

function handleKeepCardAction(e) {
  try {
    const payload = decodeSignedActionPayload(e);
    assertPrivilegedActionAccess({ requireKnownEmail: true });
    assertBookingActionAllowed(payload.bookingId || '');
    const keepData = {
      name: normalizeSingleLine(payload.name || ''),
      occupation: normalizeSingleLine(payload.occupation || ''),
      phone: normalizeSingleLine(payload.phone || ''),
      email: normalizeSingleLine(payload.email || ''),
      service: normalizeSingleLine(payload.service || ''),
      dob: normalizeSingleLine(payload.dob || ''),
      age: normalizeSingleLine(payload.age || ''),
      dateStr: normalizeSingleLine(payload.dateStr || payload.slotIso || ''),
      deadline: normalizeSingleLine(payload.deadline || ''),
      address: normalizeSingleLine(payload.address || ''),
      referralSource: normalizeSingleLine(payload.referralSource || ''),
      notes: truncate(normalizeMultiLine(payload.notes || ''), 560)
    };
    const keepContext = {
      bookingId: normalizeSingleLine(payload.bookingId || ''),
      folderUrl: normalizeSingleLine(payload.folderUrl || ''),
      calendarEventUrl: normalizeSingleLine(payload.calendarEventUrl || '')
    };
    const keepResult = upsertKeepClientCard(keepData, keepContext);
    return renderKeepCardHtml(payload, keepResult, !(keepResult && keepResult.success));
  } catch (err) {
    return renderKeepCardHtml(
      {},
      {
        success: false,
        existed: false,
        noteUrl: '',
        searchUrl: 'https://keep.google.com/',
        error: String(err && err.message ? err.message : err)
      },
      true
    );
  }
}

function renderBringForwardHtml(payload, keepResult, hasError) {
  const rawName = normalizeSingleLine(payload && payload.name ? payload.name : 'Client');
  const safeName = escapeHtml(rawName);
  const safeBookingId = escapeHtml(normalizeSingleLine(payload && payload.bookingId ? payload.bookingId : 'N/A'));
  const noteUrl = toAccountAgnosticKeepUrl(keepResult && keepResult.noteUrl ? keepResult.noteUrl : '');
  const targetUrl = noteUrl || 'https://keep.google.com/';
  const safeTargetUrl = escapeHtml(targetUrl);
  const safeError = escapeHtml(keepResult && keepResult.error ? keepResult.error : '');
  const title = hasError ? 'Brought Forward Failed' : 'Client Opened In Keep';
  const subtitle = hasError
    ? 'Could not open the client Keep card from this link. Use the fallback links below.'
    : 'Redirecting you to the existing Google Keep card now.';
  const autoRedirect = !hasError && targetUrl
    ? `<meta http-equiv="refresh" content="0;url=${safeTargetUrl}">`
    : '';

  return HtmlService.createHtmlOutput(`
    <html>
      <head>${autoRedirect}</head>
      <body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f4e9dd;color:#3f2f22;">
        <div style="max-width:760px;margin:40px auto;background:#fffaf5;border:1px solid #d8c1aa;border-radius:14px;padding:22px;box-shadow:0 8px 26px rgba(90,61,42,0.12);">
          <h2 style="margin:0 0 10px 0;color:${hasError ? '#a53b3b' : '#5a3d2a'};">${escapeHtml(title)}</h2>
          <p style="margin:0 0 10px 0;line-height:1.45;">${escapeHtml(subtitle)}</p>
          <p style="margin:0 0 8px 0;"><strong>Client:</strong> ${safeName}</p>
          <p style="margin:0 0 14px 0;"><strong>Booking ID:</strong> ${safeBookingId}</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <a href="${safeTargetUrl}" style="display:inline-block;padding:10px 14px;border-radius:9px;background:#f3b63f;color:#3f2f22;text-decoration:none;font-weight:800;">Open Keep Card</a>
            <a href="https://keep.google.com/" style="display:inline-block;padding:10px 14px;border-radius:9px;background:#f4ece4;color:#5a3d2a;text-decoration:none;font-weight:700;border:1px solid #dbc8b6;">Open Keep Home</a>
          </div>
          ${hasError ? '' : '<div style="margin-top:12px;color:#7a614d;font-size:13px;">Set reminder time in Keep after opening this card (bell icon).</div>'}
          ${safeError ? `<div style="margin-top:14px;padding:10px 12px;border-radius:10px;border:1px solid #e5b8b8;background:#fff3f3;color:#7a2e2e;font-size:13px;"><strong>Error:</strong> ${safeError}</div>` : ''}
        </div>
      </body>
    </html>
  `);
}

function handleBringForwardAction(e) {
  try {
    const payload = decodeSignedActionPayload(e);
    assertBookingActionAllowed(payload.bookingId || '');
    const keepUrl = resolveBringForwardKeepUrl(payload);
    if (!keepUrl) {
      return renderBringForwardHtml(
        payload,
        {
          success: false,
          noteUrl: '',
          error: 'Keep card link is missing in this email. Use a newer intake email.'
        },
        true
      );
    }
    return renderBringForwardHtml(payload, { success: true, noteUrl: keepUrl }, false);
  } catch (err) {
    return renderBringForwardHtml(
      {},
      {
        success: false,
        noteUrl: '',
        error: String(err && err.message ? err.message : err)
      },
      true
    );
  }
}

function resolveBringForwardKeepUrl(payload) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const keepUrlFromPayload = toAccountAgnosticKeepUrl(safePayload.keepNoteUrl || '');
  const keepUrlFromName = toAccountAgnosticKeepUrl(buildKeepNoteUrl(normalizeSingleLine(safePayload.keepNoteName || '')));
  if (keepUrlFromPayload || keepUrlFromName) {
    return keepUrlFromPayload || keepUrlFromName;
  }

  // Backward compatibility for old emails that did not include keepNoteUrl/keepNoteName.
  try {
    const existing = findExistingKeepClientCard(
      {
        name: normalizeSingleLine(safePayload.name || ''),
        email: normalizeSingleLine(safePayload.email || ''),
        phone: normalizeSingleLine(safePayload.phone || ''),
        service: normalizeSingleLine(safePayload.service || '')
      },
      { bookingId: normalizeSingleLine(safePayload.bookingId || '') }
    );
    if (existing && existing.success && existing.noteUrl) {
      return toAccountAgnosticKeepUrl(existing.noteUrl);
    }
  } catch (ignore) { }

  const fallbackQuery = [
    normalizeSingleLine(safePayload.bookingId || ''),
    normalizeSingleLine(safePayload.email || ''),
    String(safePayload.phone || '').replace(/\D/g, ''),
    normalizeSingleLine(safePayload.name || '')
  ].filter(Boolean).join(' ');
  if (fallbackQuery) {
    return buildKeepSearchLink(fallbackQuery);
  }
  return '';
}

