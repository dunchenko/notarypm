// Redirects Logger (Integrated with project Logging system)
function handleRedirectLog(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Перевіряємо, чи доступна основна функція логування проєкту
    if (typeof logUsage === 'function') {
      // Використовуємо штатну систему логування
      logUsage({
        event: 'REDIRECT_404',
        logType: 'Redirect',
        severity: 'info',
        details: 'Автоматичний редирект 404 на головну',
        pageUrl: data.oldUrl,     // Посилання, яке видало 404
        referer: data.referrer,    // Звідки прийшла людина
        userAgent: data.userAgent // Дані браузера
      });
    } else {
      // Фолбек: якщо файл Logging.gs не підключений, пишемо простим способом
      var sheetId = PropertiesService.getScriptProperties().getProperty('LOG_SPREADSHEET_ID');
      if (sheetId) {
        var ss = SpreadsheetApp.openById(sheetId);
        var sheet = ss.getSheets()[0];
        sheet.appendRow([new Date(), data.oldUrl, data.referrer, data.userAgent, "Simple Log Fallback"]);
      }
    }
    
    return ContentService.createTextOutput("Success");
  } catch(err) {
    return ContentService.createTextOutput("Error: " + err.message);
  }
}