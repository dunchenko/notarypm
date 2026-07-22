function generateMigrationCode() {
  const props = PropertiesService.getScriptProperties().getProperties();
  let output = "function runMigration() {\n  const data = {\n";
  
  for (let key in props) {
    // Экранируем обратные кавычки и знаки доллара для безопасности
    const safeValue = props[key].replace(/`/g, '\\`').replace(/\$/g, '\\$');
    output += `    '${key}': \`${safeValue}\`,\n`;
  }
  
  output += "  };\n  PropertiesService.getScriptProperties().setProperties(data);\n  console.log('Данные успешно перенесены!');\n}";
  console.log(output);
}