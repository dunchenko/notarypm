/*
  Telegram bot core services.
  This module owns API calls, bootstrap, webhook setup, update parsing,
  deduplication, logging, and debug helpers used by TelegramBot.gs.
*/

/**
 * Calls the Telegram Bot API and returns the result payload.
 *
 * @param {string} method Telegram API method name.
 * @param {Object=} payload JSON payload.
 * @return {*} Telegram API result object.
 */
function callTelegramBotApi(method, payload) {
  const tgToken = normalizeSingleLine(typeof getTelegramToken === 'function' ? getTelegramToken() : '');
  if (!tgToken) {
    throw new Error('Telegram config missing: TG_TOKEN is empty.');
  }

  const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + tgToken + '/' + method, {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    muteHttpExceptions: true,
    payload: JSON.stringify(payload || {})
  });
  const status = Number(response.getResponseCode() || 0);
  const body = String(response.getContentText() || '');
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch (e) { }

  if (status < 200 || status >= 300 || !parsed || parsed.ok !== true) {
    const description = parsed && parsed.description ? parsed.description : 'HTTP ' + status;
    throw new Error(description);
  }
  return parsed.result;
}

/**
 * Sends one plain Telegram message to a specific chat.
 *
 * @param {string|number} chatId Telegram chat id.
 * @param {string} text Message text.
 * @return {Object} Send result.
 */
function sendTelegramDirectMessage(chatId, text) {
  const normalizedChatId = normalizeSingleLine(chatId || '');
  if (!normalizedChatId) {
    return { success: false, error: 'Missing chat_id.' };
  }
  try {
    const result = callTelegramBotApi('sendMessage', {
      chat_id: normalizedChatId,
      text: truncate(normalizeMultiLine(text || ''), 3900),
      disable_web_page_preview: true
    });
    return { success: true, result: result };
  } catch (err) {
    return { success: false, error: String(err && err.message ? err.message : err) };
  }
}

/**
 * Returns Telegram bot commands shown by Telegram clients.
 *
 * @return {Array<Object>} Command descriptors.
 */
function getTelegramPulseCommands() {
  return [
    { command: 'pulse', description: 'Enable booking error alerts' },
    { command: 'unpulse', description: 'Disable booking error alerts' },
    { command: 'pulse_status', description: 'Show current error alert status' },
    { command: 'today', description: 'Show today visitor statistics' },
    { command: 'yesterday', description: 'Show yesterday visitor statistics' },
    { command: 'stop_all', description: 'Stop website intake' },
    { command: 'start_all', description: 'Resume website intake' }
  ];
}

/**
 * Synchronizes Telegram command menu while preserving unrelated bot commands.
 *
 * @return {Array<Object>} Commands submitted to Telegram.
 */
function syncTelegramPulseBotCommands() {
  const required = getTelegramPulseCommands();
  let existing = [];
  try {
    const current = callTelegramBotApi('getMyCommands', {});
    if (Array.isArray(current)) {
      existing = current.map(item => ({
        command: normalizeSingleLine(item && item.command).toLowerCase(),
        description: truncate(normalizeSingleLine(item && item.description), 256)
      })).filter(item => item.command);
    }
  } catch (err) { }

  const byCommand = {};
  existing.forEach(item => {
    byCommand[item.command] = item;
  });
  required.forEach(item => {
    byCommand[item.command] = item;
  });

  const merged = Object.keys(byCommand)
    .sort()
    .map(key => byCommand[key])
    .slice(0, 100);

  callTelegramBotApi('setMyCommands', { commands: merged });
  return merged;
}

/**
 * Ensures admin ids, commands, and webhook are configured.
 *
 * @return {Object} Setup summary.
 */
function setupTelegramPulseControl() {
  const adminChatIds = getTelegramAdminChatIds();
  if (!adminChatIds.length) {
    throw new Error('Configure TG_CHAT_IDS or TG_BOT_ADMIN_CHAT_IDS before enabling Telegram pulse control.');
  }
  const commands = syncTelegramPulseBotCommands();
  const webhookSetup = ensureTelegramWebhookConfigured({ force: true });
  return {
    success: true,
    pulseEnabled: isTelegramErrorAlertsEnabled(),
    webhookUrl: webhookSetup.webhookUrl,
    adminChatIds: adminChatIds,
    commands: commands,
    webhookResult: webhookSetup.webhookResult,
    webhookInfo: webhookSetup.webhookInfo
  };
}

/**
 * Validates Telegram-related Script Properties and bootstraps the bot.
 *
 * @return {Object} Setup summary.
 */
function bootstrapTelegramFromScriptProperties() {
  const token = normalizeSingleLine(getScriptProperty(TG_TOKEN_PROP, ''));
  const chatIds = normalizeSingleLine(getScriptProperty(TG_CHAT_IDS_PROP, ''));
  const adminChatIds = normalizeSingleLine(getScriptProperty(TG_ADMIN_CHAT_IDS_PROP, ''));
  const webhookBaseUrl = normalizeTelegramWebhookBaseUrl(getScriptProperty(TG_WEBHOOK_BASE_URL_PROP, ''));

  if (!token) throw new Error('Missing Script Property: ' + TG_TOKEN_PROP);
  if (!chatIds) throw new Error('Missing Script Property: ' + TG_CHAT_IDS_PROP);
  if (!adminChatIds) throw new Error('Missing Script Property: ' + TG_ADMIN_CHAT_IDS_PROP);
  if (!webhookBaseUrl || !/\/exec$/i.test(webhookBaseUrl)) {
    throw new Error('Missing or invalid Script Property: ' + TG_WEBHOOK_BASE_URL_PROP + ' (expected /exec URL)');
  }

  return setupTelegramPulseControl();
}

/**
 * GAS entry point for manually bootstrapping Telegram from the editor.
 *
 * @return {Object} Setup summary or error payload.
 */
function runTelegramBootstrap() {
  try {
    const result = bootstrapTelegramFromScriptProperties();
    Logger.log('runTelegramBootstrap (safe):\n' + JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    const errorMsg = String(err && err.message ? err.message : err);
    Logger.log('runTelegramBootstrap ERROR: ' + errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Creates or updates the Telegram webhook when needed.
 *
 * @param {Object=} options Setup options.
 * @return {Object} Webhook setup summary.
 */
function ensureTelegramWebhookConfigured(options) {
  const opts = options && typeof options === 'object' ? options : {};
  const force = opts.force === true;
  const webhookUrl = getTelegramWebhookUrl();
  let currentInfo = null;
  let currentUrl = '';

  try {
    currentInfo = callTelegramBotApi('getWebhookInfo', {});
    currentUrl = normalizeSingleLine(currentInfo && currentInfo.url || '');
  } catch (err) {
    currentInfo = null;
    currentUrl = '';
  }

  let webhookResult = null;
  let changed = false;
  if (force || currentUrl !== webhookUrl) {
    webhookResult = callTelegramBotApi('setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message', 'edited_message']
    });
    changed = true;
  }

  const webhookInfo = callTelegramBotApi('getWebhookInfo', {});
  return {
    success: true,
    changed: changed,
    webhookUrl: webhookUrl,
    previousWebhookUrl: currentUrl,
    webhookResult: webhookResult,
    webhookInfo: webhookInfo
  };
}

/**
 * Saves the Apps Script /exec URL used as Telegram webhook base URL.
 *
 * @param {string} execUrl Apps Script deployment URL ending with /exec.
 * @return {Object} Saved URL summary.
 */
function setTelegramWebhookBaseUrl(execUrl) {
  const normalized = normalizeTelegramWebhookBaseUrl(execUrl || '');
  if (!normalized || !/\/exec$/i.test(normalized)) {
    throw new Error('Pass valid Apps Script exec URL ending with /exec.');
  }
  PropertiesService.getScriptProperties().setProperty(TG_WEBHOOK_BASE_URL_PROP, normalized);
  return {
    success: true,
    webhookBaseUrl: normalized
  };
}

/**
 * Removes the Telegram webhook without dropping pending updates.
 *
 * @return {Object} Delete webhook summary.
 */
function removeTelegramPulseControl() {
  const deleteResult = callTelegramBotApi('deleteWebhook', { drop_pending_updates: false });
  return {
    success: true,
    pulseEnabled: isTelegramErrorAlertsEnabled(),
    deleteWebhook: deleteResult
  };
}

/**
 * Checks whether a POST body is a Telegram webhook update.
 *
 * @param {Object} payload Parsed request payload.
 * @return {boolean} True when the payload looks like Telegram.
 */
function isTelegramWebhookPayload(payload) {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    payload.update_id != null &&
    (
      payload.message ||
      payload.edited_message ||
      payload.channel_post
    )
  );
}

/**
 * Extracts chat id, command, and text from a Telegram update.
 *
 * @param {Object} update Telegram update payload.
 * @return {Object|null} Command payload or null.
 */
function extractTelegramCommandPayload(update) {
  const message = (update && (update.message || update.edited_message || update.channel_post)) || null;
  if (!message) return null;
  const text = normalizeMultiLine(message.text || message.caption || '');
  const match = text.match(/^\/([A-Za-z0-9_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  if (!match) {
    return {
      chatId: normalizeSingleLine(message.chat && message.chat.id),
      text: text,
      command: '',
      args: ''
    };
  }
  return {
    chatId: normalizeSingleLine(message.chat && message.chat.id),
    text: text,
    command: normalizeSingleLine(match[1]).toLowerCase(),
    args: normalizeSingleLine(match[2] || '')
  };
}

/**
 * Builds status/help text for bot admins.
 *
 * @return {string} Status text.
 */
function buildTelegramPulseStatusText() {
  const pulseEnabled = isTelegramErrorAlertsEnabled();
  const intake = typeof getBookingIntakeStatus === 'function'
    ? getBookingIntakeStatus()
    : { enabled: true, reason: '' };
  const adminChatIds = getTelegramAdminChatIds();
  return [
    'Pulse status: ' + (pulseEnabled ? 'ENABLED' : 'DISABLED'),
    'Intake status: ' + (intake.enabled ? 'ACTIVE' : 'PAUSED'),
    intake.reason && !intake.enabled ? 'Pause reason: ' + intake.reason : '',
    '',
    'Commands:',
    '/pulse - enable booking error alerts',
    '/unpulse - disable booking error alerts',
    '/pulse_status - show current status',
    '/today - show today visitor statistics',
    '/yesterday - show yesterday visitor statistics',
    '/stop_all - stop website intake',
    '/start_all - resume website intake',
    adminChatIds.length ? 'Admin chats: ' + adminChatIds.join(', ') : 'Admin chats are not configured.'
  ].filter(line => line !== '').join('\n');
}

/**
 * Builds a compact unknown-command response.
 *
 * @param {string} command Telegram command without slash.
 * @return {string} Response text.
 */
function buildTelegramUnknownCommandText(command) {
  const safeCommand = normalizeSingleLine(command || '').toLowerCase();
  const available = getTelegramPulseCommands().map(item => '/' + item.command);
  return [
    safeCommand ? 'Unknown command: /' + safeCommand : 'Unknown command.',
    'Available commands:',
    available.join('\n')
  ].join('\n');
}

/**
 * Claims a Telegram update id once to avoid duplicate webhook processing.
 *
 * @param {Object} update Telegram update payload.
 * @return {Object} Duplicate check result.
 */
function claimTelegramUpdateProcessing(update) {
  const updateIdRaw = update && update.update_id != null ? update.update_id : '';
  const updateId = normalizeSingleLine(updateIdRaw);
  const updateIdNum = Number(updateId);
  if (!updateId || !Number.isFinite(updateIdNum)) {
    return { isDuplicate: false, updateId: updateId };
  }

  const propKey = 'TG_LAST_PROCESSED_UPDATE_ID_V1';
  let lock = null;
  try {
    lock = LockService.getScriptLock();
    lock.waitLock(5000);
    const props = PropertiesService.getScriptProperties();
    const lastProcessedRaw = normalizeSingleLine(props.getProperty(propKey) || '0');
    const lastProcessed = Number(lastProcessedRaw);
    if (Number.isFinite(lastProcessed) && updateIdNum <= lastProcessed) {
      return { isDuplicate: true, updateId: updateId };
    }
    props.setProperty(propKey, String(updateIdNum));
  } catch (err) {
    try {
      const cache = CacheService.getScriptCache();
      const key = 'tgupd:' + updateId;
      if (cache.get(key)) {
        return { isDuplicate: true, updateId: updateId };
      }
      cache.put(key, '1', 6 * 60 * 60);
    } catch (cacheErr) { }
  } finally {
    try {
      if (lock) lock.releaseLock();
    } catch (releaseErr) { }
  }
  return { isDuplicate: false, updateId: updateId };
}

/**
 * Rate-limits repeated admin commands per chat.
 *
 * @param {string} chatId Telegram chat id.
 * @param {string} command Telegram command.
 * @return {Object} Flood check result.
 */
function checkTelegramBotAntiFlood(chatId, command) {
  const props = PropertiesService.getScriptProperties();
  const key = 'tg_flood:' + normalizeSingleLine(chatId || '') + ':' + normalizeSingleLine(command || '');
  const now = Date.now();
  const last = Number(props.getProperty(key) || 0);
  const wait = 2000;
  const diff = now - last;

  if (diff < wait) return { triggered: true, waitRemaining: wait - diff };
  props.setProperty(key, String(now));
  return { triggered: false };
}

/**
 * Returns the spreadsheet id used for Telegram bot command logs.
 *
 * @return {string} Spreadsheet id.
 */
function getTelegramBotLogSpreadsheetId() {
  const fallback = '1Q2-FH5SA7ESvHawriZF3DMbI_8wrIyuGWMsZ2tb9QxQ';
  const configured = normalizeSingleLine(getScriptProperty('TG_BOT_LOG_SPREADSHEET_ID', ''));
  return configured || fallback;
}

/**
 * Returns the sheet name used for Telegram bot command logs.
 *
 * @return {string} Sheet name.
 */
function getTelegramBotLogSheetName() {
  return normalizeSingleLine(getScriptProperty('TG_BOT_LOG_SHEET_NAME', 'Telegram Bot Log')) || 'Telegram Bot Log';
}

/**
 * Ensures the Telegram bot log sheet and header row exist.
 *
 * @param {Spreadsheet} ss Spreadsheet object.
 * @return {Sheet} Log sheet.
 */
function ensureTelegramBotLogSheet(ss) {
  const sheetName = getTelegramBotLogSheetName();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Timestamp',
      'Update ID',
      'Chat ID',
      'Username',
      'First Name',
      'Command',
      'Text',
      'Authorized',
      'Status',
      'Reply Sent',
      'Details'
    ]]);
  }
  return sheet;
}

/**
 * Appends one Telegram bot interaction to the command log sheet.
 *
 * @param {Object} update Telegram update payload.
 * @param {Object} payload Extracted command payload.
 * @param {Object} meta Logging metadata.
 * @return {Object} Log result.
 */
function logTelegramBotInteraction(update, payload, meta) {
  try {
    const spreadsheetId = getTelegramBotLogSpreadsheetId();
    if (!spreadsheetId) return { success: false, skipped: 'no-spreadsheet-id' };

    const safePayload = payload && typeof payload === 'object' ? payload : {};
    const safeMeta = meta && typeof meta === 'object' ? meta : {};
    const msg = update && (update.message || update.edited_message || update.channel_post) || {};
    const from = msg && msg.from ? msg.from : {};
    const timestamp = Utilities.formatDate(
      new Date(),
      (typeof TORONTO_TZ !== 'undefined' ? TORONTO_TZ : Session.getScriptTimeZone()),
      'yyyy-MM-dd HH:mm:ss'
    );

    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ensureTelegramBotLogSheet(ss);
    sheet.appendRow([
      timestamp,
      normalizeSingleLine(update && update.update_id != null ? update.update_id : ''),
      normalizeSingleLine(safePayload.chatId || (msg.chat && msg.chat.id) || ''),
      normalizeSingleLine(from.username || ''),
      normalizeSingleLine(from.first_name || ''),
      normalizeSingleLine(safePayload.command || ''),
      truncate(normalizeMultiLine(safePayload.text || msg.text || msg.caption || ''), 1000),
      safeMeta.authorized === true ? 'YES' : 'NO',
      normalizeSingleLine(safeMeta.status || ''),
      safeMeta.replySent === true ? 'YES' : 'NO',
      truncate(normalizeMultiLine(safeMeta.details || ''), 1000)
    ]);
    return { success: true };
  } catch (err) {
    try {
      Logger.log('Telegram bot log write failed: ' + String(err && err.message ? err.message : err));
    } catch (logErr) { }
    return { success: false, error: String(err && err.message ? err.message : err) };
  }
}

/**
 * Debug helper for Telegram setup.
 *
 * @return {Object} Setup result.
 */
function debugSetupTelegram() {
  const res = setupTelegramPulseControl();
  Logger.log('debugSetupTelegram:\n' + JSON.stringify(res, null, 2));
  return res;
}

/**
 * Debug helper for Telegram webhook info.
 *
 * @return {Object} Webhook info.
 */
function debugWebhookInfo() {
  const info = callTelegramBotApi('getWebhookInfo', {});
  Logger.log('debugWebhookInfo:\n' + JSON.stringify(info, null, 2));
  return info;
}

/**
 * Debug helper for Telegram bot identity.
 *
 * @return {Object} Bot identity.
 */
function debugBotIdentity() {
  const me = callTelegramBotApi('getMe', {});
  Logger.log('debugBotIdentity:\n' + JSON.stringify(me, null, 2));
  return me;
}

/**
 * Debug helper combining setup, webhook, and bot identity.
 *
 * @return {Object} Telegram status.
 */
function debugTelegramStatus() {
  const setup = debugSetupTelegram();
  const webhook = debugWebhookInfo();
  const me = debugBotIdentity();
  const status = {
    ok: true,
    at: new Date().toISOString(),
    setup: setup,
    webhook: webhook,
    bot: me
  };
  Logger.log('debugTelegramStatus:\n' + JSON.stringify(status, null, 2));
  return status;
}

/**
 * Extracts chat id and command details from a pasted Telegram update sample.
 *
 * @param {Object} sampleUpdate Telegram update object.
 * @return {Object} Extracted command payload.
 */
function debugMyChatIdFromUpdate(sampleUpdate) {
  const payload = sampleUpdate && typeof sampleUpdate === 'object'
    ? sampleUpdate
    : null;
  if (!payload) {
    const msg = 'Pass Telegram update JSON object into debugMyChatIdFromUpdate(sampleUpdate).';
    Logger.log(msg);
    return { success: false, error: msg };
  }
  const extracted = extractTelegramCommandPayload(payload);
  Logger.log('debugMyChatIdFromUpdate:\n' + JSON.stringify(extracted, null, 2));
  return extracted;
}
