/**
 * Функція для перевірки поточних квот та виведення довідкової інформації.
 * Результат з'явиться в Execution Log.
 */
function checkMyAppsScriptQuotas() {
  const report = [];
  report.push("=== ПЕРЕВІРКА КВОТ GOOGLE APPS SCRIPT ===");
  
  // 1. Перевірка доступної пошти (єдиний живий лічильник, доступний через API)
  try {
    const emailRemaining = MailApp.getRemainingDailyQuota();
    report.push(`📧 Email (залишилося на сьогодні): ${emailRemaining}`);
    report.push("   (Ліміт оновлюється кожні 24 години)");
  } catch (e) {
    report.push("❌ Не вдалося отримати квоту MailApp");
  }

  // 2. Довідкова інформація щодо інших лімітів
  // Дані базуються на офіційній специфікації Google для звичайних акаунтів (@gmail.com)
  report.push("");
  report.push("=== ДОВІДКОВІ ЛІМІТИ (для @gmail.com) ===");
  report.push("🌐 URL Fetch (запити до API/Telegram): 20,000 / день");
  report.push("⏱️ Runtime (час роботи одного скрипта): 6 хвилин");
  report.push("📅 Triggers (всього у проєкті): 20 тригерів");
  report.push("📁 Google Drive (створення файлів): Обмежено вільним місцем");
  report.push("📊 Spreadsheet (комірок в одній таблиці): 10,000,000");
  
  report.push("");
  report.push("💡 ПОРАДА: Якщо 'Email' показує 100 — у вас звичайний акаунт.");
  report.push("💡 ПОРАДА: Якщо 'Email' показує 1500 — у вас Workspace (бізнес) акаунт.");
  
  const finalMessage = report.join("\n");
  Logger.log(finalMessage);
  
  // Виводимо в інтерфейс таблиці, якщо запущено з меню
  try {
    SpreadsheetApp.getUi().alert(finalMessage);
  } catch (e) {}
}

/**
 * Додає пункт меню у вашу таблицю, щоб перевіряти квоти одним кліком.
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🛠️ Адмін-інструменти')
      .addItem('Перевірити квоти', 'checkMyAppsScriptQuotas')
      .addToUi();
  } catch (e) {}
}
