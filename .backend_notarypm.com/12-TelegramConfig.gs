/*
  Telegram bot configuration and helpers.
  All shared constants (timezone, validation limits, services, etc.)
  are defined in Config.gs — do NOT redeclare them here.

  In the GAS editor this file should be named: TelegramConfig.gs
*/

// TELEGRAM CREDENTIALS & PROPERTY KEYS
const TG_TOKEN = '';
const TG_CHAT_IDS = [];
const TG_CHAT_ID = TG_CHAT_IDS[0] || '';
const TG_LESSON_STORY_INDEX_PROP = 'TG_LESSON_STORY_INDEX_V1';
const TG_TOKEN_PROP = 'TG_TOKEN';
const TG_CHAT_IDS_PROP = 'TG_CHAT_IDS';
const TG_ERROR_ALERTS_ENABLED_PROP = 'TG_ERROR_ALERTS_ENABLED';
const TG_WEBHOOK_SECRET_PROP = 'TG_WEBHOOK_SECRET_V1';
const TG_WEBHOOK_BASE_URL_PROP = 'TG_WEBHOOK_BASE_URL';
const TG_ADMIN_CHAT_IDS_PROP = 'TG_BOT_ADMIN_CHAT_IDS';
const BOOKING_FAILURE_TELEGRAM_THROTTLE_SECONDS = 20 * 60;


function getTelegramToken() {
  return getScriptProperty(TG_TOKEN_PROP, TG_TOKEN);
}

function getTelegramRecommendedScriptPropertiesConfig() {
  return {
    TG_CHAT_IDS: normalizeSingleLine(getScriptProperty(TG_CHAT_IDS_PROP, '')),
    TG_TOKEN: normalizeSingleLine(getScriptProperty(TG_TOKEN_PROP, '')),
    TG_BOT_ADMIN_CHAT_IDS: normalizeSingleLine(getScriptProperty(TG_ADMIN_CHAT_IDS_PROP, '')),
    TG_WEBHOOK_BASE_URL: normalizeSingleLine(getScriptProperty(TG_WEBHOOK_BASE_URL_PROP, ''))
  };
}

function getTelegramAutoManagedPropertyPrefixes() {
  return [`${TG_LESSON_STORY_INDEX_PROP}:`];
}

function getTelegramAutoManagedExactPropertyKeys() {
  return [TG_LESSON_STORY_INDEX_PROP];
}

function getTelegramOptionalManualPropertyKeys() {
  return [TG_TOKEN_PROP, TG_CHAT_IDS_PROP, TG_ADMIN_CHAT_IDS_PROP, TG_WEBHOOK_BASE_URL_PROP];
}


function getTelegramChatIds() {
  const ids = [];
  const rawPropIds = getScriptProperty(TG_CHAT_IDS_PROP, '');
  if (rawPropIds) {
    rawPropIds.split(/[,\s;]+/).forEach((value) => {
      const clean = normalizeSingleLine(value || '');
      if (clean && ids.indexOf(clean) === -1) ids.push(clean);
    });
  }
  if (Array.isArray(TG_CHAT_IDS)) {
    TG_CHAT_IDS.forEach((value) => {
      const clean = normalizeSingleLine(value || '');
      if (clean && ids.indexOf(clean) === -1) ids.push(clean);
    });
  }
  const fallbackId = normalizeSingleLine(TG_CHAT_ID || '');
  if (fallbackId && ids.indexOf(fallbackId) === -1) ids.push(fallbackId);
  return ids;
}



function isTelegramErrorAlertsEnabled() {
  return isTruthyFlag(getScriptProperty(TG_ERROR_ALERTS_ENABLED_PROP, 'true'));
}

function setTelegramErrorAlertsEnabled(enabled) {
  const nextValue = enabled === true;
  PropertiesService.getScriptProperties().setProperty(TG_ERROR_ALERTS_ENABLED_PROP, nextValue ? 'true' : 'false');
  return nextValue;
}

function getTelegramAdminChatIds() {
  const configured = splitDelimitedList(getScriptProperty(TG_ADMIN_CHAT_IDS_PROP, ''));
  if (configured.length) return configured;
  try {
    const fallback = typeof getTelegramChatIds === 'function' ? getTelegramChatIds() : [];
    return (Array.isArray(fallback) ? fallback : [])
      .map(value => normalizeSingleLine(value))
      .filter(Boolean);
  } catch (err) {
    return [];
  }
}

function ensureTelegramWebhookSecret() {
  const props = PropertiesService.getScriptProperties();
  const existing = normalizeSingleLine(props.getProperty(TG_WEBHOOK_SECRET_PROP) || '');
  if (existing) return existing;
  const generated = Utilities.getUuid().replace(/-/g, '');
  props.setProperty(TG_WEBHOOK_SECRET_PROP, generated);
  return generated;
}

function normalizeTelegramWebhookBaseUrl(rawUrl) {
  let baseUrl = normalizeSingleLine(rawUrl || '');
  if (!baseUrl) return '';
  const qIndex = baseUrl.indexOf('?');
  if (qIndex !== -1) baseUrl = baseUrl.slice(0, qIndex);
  baseUrl = baseUrl.replace(/\/dev$/i, '/exec');
  return baseUrl;
}

function getTelegramWebhookBaseUrl() {
  const manualUrl = normalizeTelegramWebhookBaseUrl(getScriptProperty(TG_WEBHOOK_BASE_URL_PROP, ''));
  if (manualUrl) return manualUrl;
  return '';
}

function getTelegramWebhookUrl() {
  const baseUrl = normalizeTelegramWebhookBaseUrl(
    PropertiesService.getScriptProperties().getProperty(TG_WEBHOOK_BASE_URL_PROP) || ''
  );
  if (!baseUrl || !/\/exec$/i.test(baseUrl)) {
    throw new Error(`Set Script Property ${TG_WEBHOOK_BASE_URL_PROP} to valid Apps Script /exec URL.`);
  }
  const secret = ensureTelegramWebhookSecret();
  const separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
  return `${baseUrl}${separator}telegramWebhook=1&tgk=${encodeURIComponent(secret)}`;
}

function debugWebhookBaseProp() {
  const raw = PropertiesService.getScriptProperties().getProperty(TG_WEBHOOK_BASE_URL_PROP) || '';
  const normalized = normalizeTelegramWebhookBaseUrl(raw);
  const payload = {
    property: TG_WEBHOOK_BASE_URL_PROP,
    raw: raw,
    normalized: normalized,
    validExec: /\/exec$/i.test(normalized)
  };
  Logger.log('debugWebhookBaseProp:\n' + JSON.stringify(payload, null, 2));
  return payload;
}
