/*
  Google Keep API integration: client cards, checklist, case starter.
  Extracted from google-apps-script.js for maintainability.
*/

function callKeepApi(path, method, payloadObj) {
  const executionGate = validateKeepExecutionContext();
  if (!executionGate.ok) {
    return {
      status: 403,
      text: executionGate.error,
      json: {
        error: {
          message: executionGate.error
        }
      }
    };
  }
  const cleanPath = normalizeSingleLine(path || '');
  const safePath = cleanPath ? (cleanPath.charAt(0) === '/' ? cleanPath : `/${cleanPath}`) : '/';
  const url = `${KEEP_API_BASE_URL}${safePath}`;
  const httpMethod = String(method || 'get').trim().toLowerCase() || 'get';
  const options = {
    method: httpMethod,
    muteHttpExceptions: true,
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
      Accept: 'application/json'
    }
  };

  if (payloadObj != null && httpMethod !== 'get' && httpMethod !== 'delete') {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payloadObj);
  }

  try {
    const response = UrlFetchApp.fetch(url, options);
    const status = response.getResponseCode();
    const text = String(response.getContentText() || '');
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      json = null;
    }
    return {
      status: status,
      text: text,
      json: json
    };
  } catch (e) {
    const message = String(e && e.message ? e.message : e || 'Keep API request failed.');
    return {
      status: 500,
      text: message,
      json: {
        error: {
          message: message
        }
      }
    };
  }
}

function getKeepFormsChecklist(serviceRaw) {
  const service = getBookingServiceCanonicalName(serviceRaw);
  const mapped = KEEP_FORMS_BY_SERVICE[service];
  if (Array.isArray(mapped) && mapped.length) {
    return mapped.map(item => truncate(normalizeSingleLine(item), 220)).filter(Boolean);
  }
  const fallback = KEEP_FORMS_BY_SERVICE.Other || [];
  return fallback.map(item => truncate(normalizeSingleLine(item), 220)).filter(Boolean);
}

function getCaseStarterLinks(serviceRaw) {
  const service = getBookingServiceCanonicalName(serviceRaw);
  const mapped = CASE_STARTER_LINKS_BY_SERVICE[service];
  const base = Array.isArray(mapped) && mapped.length
    ? mapped
    : (CASE_STARTER_LINKS_BY_SERVICE.Other || []);
  return base
    .map(item => ({
      task: truncate(normalizeSingleLine(item && item.task || ''), 140),
      url: truncate(normalizeSingleLine(item && item.url || ''), 600),
      purpose: truncate(normalizeSingleLine(item && item.purpose || ''), 240),
      searchHint: truncate(normalizeSingleLine(item && (item.searchHint || item.task) || ''), 200)
    }))
    .filter(item => item.task && item.url);
}

function buildCaseStarterToolkit(data, cityRaw) {
  const serviceDisplay = getBookingServiceDisplayText(data);
  const serviceCanonical = getBookingServiceCanonicalName(data);
  const forms = getKeepFormsChecklist(serviceCanonical);
  const links = getCaseStarterLinks(serviceCanonical);

  const rows = links.map(item => {
    const quickQuery = [
      'Ontario',
      item.searchHint || item.task,
      serviceDisplay || serviceCanonical || 'Ontario legal matter'
    ].filter(Boolean).join(' ');
    return {
      task: item.task,
      officialUrl: item.url,
      purpose: item.purpose || '',
      quickUrl: buildGoogleSearchLink(quickQuery),
      quickUrlBing: buildBingSearchLink(quickQuery)
    };
  });

  const matterScopeQuery = (serviceCanonical === 'Employment Law')
    ? ['Ontario', 'Employment Law', 'official forms filing process'].join(' ')
    : [
      'Ontario',
      serviceDisplay || serviceCanonical || 'legal matter',
      'official forms filing process'
    ].join(' ');

  return {
    service: serviceDisplay || serviceCanonical || 'Other',
    forms: forms,
    rows: rows,
    scopeUrl: buildGoogleSearchLink(matterScopeQuery),
    scopeUrlBing: buildBingSearchLink(matterScopeQuery)
  };
}

function toKeepListItem(text, checked, childItems) {
  const normalizedText = truncate(normalizeSingleLine(text || ''), 600);
  if (!normalizedText) return null;
  const item = {
    text: { text: normalizedText },
    checked: !!checked
  };
  if (Array.isArray(childItems) && childItems.length) {
    item.childListItems = childItems;
  }
  return item;
}

function buildKeepChecklistItems(data, ctx) {
  const service = getBookingServiceDisplayText(data);
  const forms = getKeepFormsChecklist(service);
  const items = [];
  const pushItem = item => { if (item) items.push(item); };

  pushItem(toKeepListItem(`#${KEEP_CLIENT_TAG}`, true));
  pushItem(toKeepListItem(`Client: ${normalizeSingleLine(data && data.name || '')}`, true));
  pushItem(toKeepListItem(`Phone: ${normalizeSingleLine(data && data.phone || '')}`, true));
  pushItem(toKeepListItem(`Email: ${normalizeSingleLine(data && data.email || '')}`, true));
  pushItem(toKeepListItem(`Service: ${service || 'N/A'}`, true));
  pushItem(toKeepListItem(`DOB: ${normalizeSingleLine(data && data.dob || 'N/A')}`, true));
  pushItem(toKeepListItem(`Age: ${normalizeSingleLine(data && data.age || 'N/A')}`, true));
  pushItem(toKeepListItem(`Appointment: ${normalizeSingleLine(data && data.dateStr || 'N/A')}`, true));
  pushItem(toKeepListItem(`Deadline: ${normalizeSingleLine(data && data.deadline || 'N/A')}`, true));
  pushItem(toKeepListItem(`Address: ${normalizeSingleLine(data && data.address || 'N/A')}`, true));
  if (data && data.referralSource) {
    pushItem(toKeepListItem(`Referral Source: ${normalizeSingleLine(data.referralSource)}`, true));
  }
  pushItem(toKeepListItem(`Booking ID: ${normalizeSingleLine((ctx && ctx.bookingId) || '')}`, true));
  if (ctx && ctx.folderUrl) {
    pushItem(toKeepListItem(`Drive Folder: ${normalizeSingleLine(ctx.folderUrl)}`, true));
  }
  if (ctx && ctx.calendarEventUrl) {
    pushItem(toKeepListItem(`Calendar Event: ${normalizeSingleLine(ctx.calendarEventUrl)}`, true));
  }

  const formChildren = forms
    .map(formName => toKeepListItem(formName, false))
    .filter(Boolean);
  pushItem(toKeepListItem(`Ontario forms checklist (${service || 'General'})`, false, formChildren));

  if (data && data.notes) {
    pushItem(toKeepListItem(`Notes: ${truncate(normalizeMultiLine(data.notes), 560)}`, false));
  } else {
    pushItem(toKeepListItem('Notes: None', false));
  }

  return items;
}

function buildKeepFallbackText(data, ctx, forms) {
  const lines = [
    `#${KEEP_CLIENT_TAG}`,
    `Name: ${normalizeSingleLine(data && data.name || '')}`,
    `Phone: ${normalizeSingleLine(data && data.phone || '')}`,
    `Email: ${normalizeSingleLine(data && data.email || '')}`,
    `Service: ${getBookingServiceDisplayText(data) || normalizeSingleLine(data && data.service || '')}`,
    `DOB: ${normalizeSingleLine(data && data.dob || 'N/A')}`,
    `Age: ${normalizeSingleLine(data && data.age || 'N/A')}`,
    `Appointment: ${normalizeSingleLine(data && data.dateStr || '')}`,
    `Deadline: ${normalizeSingleLine(data && data.deadline || 'N/A')}`,
    `Address: ${normalizeSingleLine(data && data.address || 'N/A')}`,
    data && data.referralSource ? `Referral Source: ${normalizeSingleLine(data.referralSource)}` : '',
    `Booking ID: ${normalizeSingleLine((ctx && ctx.bookingId) || '')}`,
    ctx && ctx.folderUrl ? `Drive Folder: ${normalizeSingleLine(ctx.folderUrl)}` : '',
    ctx && ctx.calendarEventUrl ? `Calendar Event: ${normalizeSingleLine(ctx.calendarEventUrl)}` : '',
    '',
    'Ontario forms checklist:',
    ...forms.map(f => `[ ] ${f}`),
    '',
    data && data.notes ? `Notes:\n${normalizeMultiLine(data.notes)}` : 'Notes: None'
  ].filter(Boolean);
  return truncate(lines.join('\n'), 20000);
}

function createKeepClientCard(data, ctx) {
  const forms = getKeepFormsChecklist(data && data.service);
  const checklistItems = buildKeepChecklistItems(data, ctx);
  const title = truncate(`#${KEEP_CLIENT_TAG} ${normalizeSingleLine(data && data.name || 'Client')}`, 500);
  const checklistPayload = {
    title: title,
    body: {
      list: {
        listItems: checklistItems
      }
    }
  };
  const fallbackPayload = {
    title: title,
    body: {
      text: {
        text: buildKeepFallbackText(data, ctx, forms)
      }
    }
  };

  try {
    let api = callKeepApi('/notes', 'post', checklistPayload);
    if (api.status < 200 || api.status >= 300 || !api.json || !api.json.name) {
      api = callKeepApi('/notes', 'post', fallbackPayload);
      if (api.status < 200 || api.status >= 300 || !api.json || !api.json.name) {
        const detail = api.json && api.json.error && api.json.error.message
          ? api.json.error.message
          : truncate(api.text || `HTTP ${api.status}`, 300);
        const keepHint = api.status === 403
          ? ' (403 PERMISSION_DENIED: enable Google Keep API in the Apps Script cloud project and re-authorize script scopes.)'
          : '';
        return { success: false, error: `${detail}${keepHint}` };
      }
    }
    const noteName = normalizeSingleLine(api.json.name || '');
    return {
      success: true,
      noteName: noteName,
      noteUrl: buildKeepNoteUrl(noteName)
    };
  } catch (e) {
    return { success: false, error: String(e && e.message ? e.message : e) };
  }
}

function buildKeepClientSearchQuery(data, ctx) {
  const bookingId = normalizeSingleLine((ctx && ctx.bookingId) || '');
  const email = normalizeSingleLine(data && data.email);
  const phoneDigits = String((data && data.phone) || '').replace(/\D/g, '');
  const name = normalizeSingleLine(data && data.name);
  return [bookingId, email, phoneDigits, name].filter(Boolean).join(' ');
}

function collectKeepListTexts(listItems, bucket) {
  if (!Array.isArray(listItems)) return;
  listItems.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const line = normalizeSingleLine(item.text && item.text.text ? item.text.text : '');
    if (line) bucket.push(line);
    if (Array.isArray(item.childListItems) && item.childListItems.length) {
      collectKeepListTexts(item.childListItems, bucket);
    }
  });
}

function extractKeepNoteText(note) {
  const title = normalizeSingleLine(note && note.title ? note.title : '');
  const bodyText = normalizeMultiLine(
    note && note.body && note.body.text && note.body.text.text
      ? note.body.text.text
      : ''
  );
  const listLines = [];
  collectKeepListTexts(
    note && note.body && note.body.list && Array.isArray(note.body.list.listItems)
      ? note.body.list.listItems
      : [],
    listLines
  );
  const listText = normalizeMultiLine(listLines.join('\n'));
  const noteName = normalizeSingleLine(note && note.name ? note.name : '');
  return [title, bodyText, listText, noteName].filter(Boolean).join('\n');
}

function findExistingKeepClientCard(data, ctx) {
  const bookingId = normalizeSingleLine((ctx && ctx.bookingId) || '').toLowerCase();
  const email = normalizeSingleLine(data && data.email).toLowerCase();
  const phoneDigits = String((data && data.phone) || '').replace(/\D/g, '');
  const name = normalizeSingleLine(data && data.name).toLowerCase();
  const service = normalizeSingleLine(data && data.service).toLowerCase();
  let pageToken = '';
  const maxPages = 8;

  for (let page = 0; page < maxPages; page++) {
    const queryParts = ['pageSize=100'];
    if (pageToken) queryParts.push(`pageToken=${encodeUriValue(pageToken)}`);

    const api = callKeepApi(`/notes?${queryParts.join('&')}`, 'get');
    if (api.status < 200 || api.status >= 300 || !api.json) {
      const detail = api.json && api.json.error && api.json.error.message
        ? api.json.error.message
        : truncate(api.text || `HTTP ${api.status}`, 300);
      const keepHint = api.status === 403
        ? ' (403 PERMISSION_DENIED: enable Google Keep API in the Apps Script cloud project and re-authorize script scopes.)'
        : '';
      return { success: false, found: false, error: `${detail}${keepHint}` };
    }

    const notes = Array.isArray(api.json.notes) ? api.json.notes : [];
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const rawText = extractKeepNoteText(note);
      if (!rawText) continue;

      const haystack = rawText.toLowerCase();
      const digitsOnly = rawText.replace(/\D/g, '');

      let matched = false;
      if (bookingId && haystack.indexOf(bookingId) !== -1) {
        matched = true;
      } else if (email && haystack.indexOf(email) !== -1) {
        matched = true;
      } else if (phoneDigits && digitsOnly.indexOf(phoneDigits) !== -1) {
        matched = true;
      } else if (name && name.length >= 4 && haystack.indexOf(name) !== -1) {
        if (!service || haystack.indexOf(service) !== -1) {
          matched = true;
        }
      }

      if (matched) {
        const noteName = normalizeSingleLine(note && note.name ? note.name : '');
        return {
          success: true,
          found: true,
          noteName: noteName,
          noteUrl: buildKeepNoteUrl(noteName)
        };
      }
    }

    pageToken = normalizeSingleLine(api.json.nextPageToken || '');
    if (!pageToken) break;
  }

  return { success: true, found: false };
}

function upsertKeepClientCard(data, ctx) {
  const searchQuery = buildKeepClientSearchQuery(data, ctx);
  const searchUrl = buildKeepSearchLink(searchQuery || normalizeSingleLine(data && data.name || 'Client'));

  const existing = findExistingKeepClientCard(data, ctx);
  if (existing && existing.success && existing.found) {
    return {
      success: true,
      existed: true,
      noteName: existing.noteName || '',
      noteUrl: existing.noteUrl || searchUrl,
      searchUrl: searchUrl
    };
  }

  const created = createKeepClientCard(data, ctx);
  if (created && created.success) {
    return {
      success: true,
      existed: false,
      noteName: created.noteName || '',
      noteUrl: created.noteUrl || searchUrl,
      searchUrl: searchUrl
    };
  }

  const errors = [];
  if (existing && existing.success === false && existing.error) {
    errors.push(`Find error: ${existing.error}`);
  }
  if (created && created.error) {
    errors.push(`Create error: ${created.error}`);
  }
  return {
    success: false,
    existed: false,
    noteName: '',
    noteUrl: '',
    searchUrl: searchUrl,
    error: errors.length ? errors.join(' | ') : 'Unable to access Google Keep.'
  };
}

function trashKeepNoteByName(noteName) {
  const clean = normalizeSingleLine(noteName || '');
  if (!clean) return false;
  const noteId = clean.replace(/^notes\//i, '').trim();
  if (!noteId) return false;
  try {
    const api = callKeepApi(`/notes/${encodeUriValue(noteId)}`, 'delete');
    return api.status >= 200 && api.status < 300;
  } catch (e) {
    return false;
  }
}

