/*
  Telegram webhook command router.
  Keep this file focused on runtime command handling; shared API, bootstrap,
  logging, and parsing helpers live in TelegramBotCore.gs to avoid GAS globals
  with the same names in multiple files.
*/

/**
 * Handles Telegram webhook updates routed from doPost(e).
 *
 * @param {Object} e Apps Script POST event.
 * @param {Object} update Parsed Telegram update payload.
 * @return {TextOutput} JSON response for Telegram.
 */
function handleTelegramWebhookPost(e, update) {
  const query = (e && e.parameter) || {};
  const expectedSecret = normalizeSingleLine(getScriptProperty(TG_WEBHOOK_SECRET_PROP, ''));
  const providedSecret = normalizeSingleLine(query.tgk || query.telegramKey || '');

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    try {
      Logger.log('Telegram webhook ignored: secret mismatch.');
    } catch (logErr) { }
    return jsonOutput({ success: true, ignored: 'telegram-webhook-secret-mismatch' });
  }

  const duplicateCheck = claimTelegramUpdateProcessing(update);
  if (duplicateCheck.isDuplicate) {
    return jsonOutput({
      success: true,
      duplicate: true,
      updateId: duplicateCheck.updateId
    });
  }

  const payload = extractTelegramCommandPayload(update);
  if (!payload || !payload.chatId) {
    return jsonOutput({ success: true, ignored: 'telegram-update-without-chat' });
  }
  if (!payload.command) {
    return jsonOutput({ success: true, ignored: 'telegram-non-command' });
  }

  const adminChatIds = getTelegramAdminChatIds();
  const isAuthorized = adminChatIds.indexOf(payload.chatId) !== -1;
  if (!isAuthorized) {
    const logResult = logTelegramBotInteraction(update, payload, {
      authorized: false,
      status: 'unauthorized',
      replySent: false,
      details: 'silent-deny'
    });
    return jsonOutput({
      success: true,
      ignored: 'telegram-chat-not-authorized',
      silent: true,
      logged: logResult && logResult.success === true
    });
  }

  const flood = checkTelegramBotAntiFlood(payload.chatId, payload.command);
  if (flood.triggered) {
    return jsonOutput({
      success: true,
      throttled: true,
      waitRemainingMs: flood.waitRemaining
    });
  }

  let replyText = '';
  let commandHandled = true;
  let commandError = '';

  try {
    switch (payload.command) {
      case 'pulse':
        setTelegramErrorAlertsEnabled(true);
        replyText = 'Pulse enabled.\nBooking error alerts will be delivered to Telegram again.';
        break;
      case 'unpulse':
        setTelegramErrorAlertsEnabled(false);
        replyText = 'Pulse disabled.\nBooking error alerts are muted until you send /pulse.';
        break;
      case 'stop_all':
        if (typeof setBookingIntakeStatus !== 'function') {
          throw new Error('Booking intake controls are unavailable.');
        }
        if (payload.args !== 'confirm') {
          replyText = '⚠️ This will PAUSE the booking form for all clients.\n\nTo confirm, send:\n/stop_all confirm';
          break;
        }
        {
          const currentStatus = getBookingIntakeStatus();
          if (currentStatus.enabled === false) {
            replyText = '🛑 Intake is already paused. No changes made.';
            break;
          }
        }
        setBookingIntakeStatus(false, 'Intake paused by admin via Telegram.', { bookingId: 'telegram_bot' });
        replyText = '🛑 Intake is now paused. Clients will see a paused notice on the website.';
        break;
      case 'start_all':
        if (typeof setBookingIntakeStatus !== 'function') {
          throw new Error('Booking intake controls are unavailable.');
        }
        if (payload.args !== 'confirm') {
          replyText = '⚠️ This will RESUME the booking form on the website.\n\nTo confirm, send:\n/start_all confirm';
          break;
        }
        {
          const currentStatus = getBookingIntakeStatus();
          if (currentStatus.enabled === true) {
            replyText = '✅ Intake is already active. No changes made.';
            break;
          }
        }
        setBookingIntakeStatus(true, '', { bookingId: 'telegram_bot' });
        replyText = '✅ Intake is now resumed. Booking form is active on the website.';
        break;
      case 'pulse_status':
      case 'pulsestatus':
      case 'start':
      case 'help':
        replyText = buildTelegramPulseStatusText();
        break;
      case 'today': {
        const todayResult = sendTodayVisitorReport();
        if (!todayResult || todayResult.success !== true) {
          throw new Error(todayResult && todayResult.error ? todayResult.error : 'today-report-send-failed');
        }
        replyText = 'Report action recorded in sheet.';
        logReportActionToAuditSheet('Today');
        break;
      }
      case 'yesterday': {
        const yesterdayResult = sendYesterdayVisitorReport();
        if (!yesterdayResult || yesterdayResult.success !== true) {
          throw new Error(yesterdayResult && yesterdayResult.error ? yesterdayResult.error : 'yesterday-report-send-failed');
        }
        replyText = 'Report action recorded in sheet.';
        logReportActionToAuditSheet('Yesterday');
        break;
      }
      default:
        commandHandled = false;
        replyText = buildTelegramUnknownCommandText(payload.command);
        break;
    }
  } catch (err) {
    commandError = String(err && err.message ? err.message : err);
    replyText = 'Command failed: ' + commandError + '\nTry /pulse_status';
  }

  const sendResult = sendTelegramDirectMessage(payload.chatId, replyText);
  if (!sendResult || sendResult.success !== true) {
    try {
      Logger.log('Telegram command reply send failed: ' + String(sendResult && sendResult.error ? sendResult.error : 'unknown-send-error'));
    } catch (logErr) { }
  }

  const statusText = commandError
    ? 'command-error'
    : (commandHandled ? 'handled' : 'unknown-command');
  const logResult = logTelegramBotInteraction(update, payload, {
    authorized: true,
    status: statusText,
    replySent: sendResult && sendResult.success === true,
    details: commandError || ''
  });

  return jsonOutput({
    success: true,
    pulseEnabled: isTelegramErrorAlertsEnabled(),
    command: payload.command,
    handled: commandHandled,
    commandError: commandError,
    replySent: sendResult && sendResult.success === true,
    replyError: sendResult && sendResult.success !== true ? (sendResult.error || 'send-failed') : '',
    logged: logResult && logResult.success === true
  });
}
