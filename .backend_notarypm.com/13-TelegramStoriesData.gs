/*
  Telegram lesson-story source data and story pool definitions.
  Large static datasets live here to keep bot/alert logic readable.
*/

const TG_LEGACY_LESSON_STORIES = `
⚖️ У Торонто паралегал давав юридичні поради клієнту по телефону без ліцензії — спійманий Law Society of Ontario, оштрафований на 8500 CAD і відсторонений на 6 місяців. Урок: паралегали тільки допомагають, ніколи не радь сам! ⚖️
⚖️ Адвокат у Ванкувері змішав гроші клієнта з особистими на траст-рахунку — BC Law Society позбавив ліцензії на 3 роки. Урок: клієнтські кошти — святе, ніколи не чіпай! ⚖️
⚖️ Паралегал в Оттаві забув подати афідевіт вчасно — справу програно за замовчуванням, клієнт поскаржився в College of Paralegals. Урок: подавай документи за тиждень до дедлайну! ⚖️
⚖️ Юрист у Калгарі використав шаблон договору без оновлення під новий закон Альберти — договір визнали недійсним. Урок: оновлюй шаблони після кожної зміни законодавства! ⚖️
⚖️ Адвокат у Монреалі не попередив клієнта про ризики угоди — клієнт втратив будинок, виграв malpractice на 350 тис. CAD. Урок: завжди пояснюй усі ризики письмово! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував документ з виправленнями без примітки — банк відхилив. Урок: позначай усі виправлення та проси підписанта підтвердити! ⚖️
⚖️ Нотаріус у Торонто використав стару печатку після закінчення комісії — штраф від Attorney General. Урок: перевіряй термін комісії перед кожним актом! ⚖️
⚖️ Нотаріус у Торонто не пояснив підписанту зміст присяги — клієнт пізніше стверджував, що не розумів. Урок: завжди чітко пояснюй oath/affirmation! ⚖️
⚖️ Нотаріус у Торонто засвідчив копію, яка не була повною — імміграція відмовила. Урок: копія має бути повною та чіткою сторінка за сторінкою! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував для клієнта, який явно був під тиском — скаргу в LSO. Урок: відмовляйся, якщо є підозра на coercion! ⚖️
⚖️ Нотаріус у Торонто не зберіг копію ID у файлі — під час аудиту LSO проблеми. Урок: зберігай докази ідентифікації щонайменше 7 років! ⚖️
⚖️ Нотаріус у Торонто підписав certifіcate чорнилом, яке змазалося — документ не прийняли в ODS. Урок: використовуй тільки permanent ink! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував travel consent без присутності обох батьків — суд скасував. Урок: для child travel consent потрібна присутність усіх законних представників! ⚖️
⚖️ Нотаріус у Торонто забув вказати свій notary number — документ повернули з Land Registry. Урок: завжди вказуй registration number з комісії! ⚖️
⚖️ Нотаріус у Торонто прийняв афідевіт з нечітким текстом — клієнт програв справу. Урок: документ має бути розбірливим до нотарізації! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував для себе (власний документ) — комісію поставили під загрозу. Урок: ніколи не нотаріалізуй власні документи! ⚖️
⚖️ Нотаріус у Торонто не перевірив, чи документ для use in Ontario чи international — неправильний certifіcate. Урок: уточнюй мету документа заздалегідь! ⚖️
⚖️ Нотаріус у Торонто поставив печатку криво — ODS відхилив. Урок: печатка має бути чіткою та повною! ⚖️
⚖️ Нотаріус у Торонто дозволив клієнту підписати після нотарізації — порушення процедури. Урок: підпис лише в твоїй присутності! ⚖️
⚖️ Нотаріус у Торонто не оновив адресу в журналі — проблеми при перевірці LSO. Урок: веди журнал акуратно та оновлюй дані! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував statutory declaration без oath — недійсний. Урок: завжди проводь verbal oath/affirmation! ⚖️
⚖️ Нотаріус у Торонто прийняв foreign ID без Canadian equivalent — банк відхилив. Урок: для Онтаріо foreign ID має бути з photo та дійсним! ⚖️
⚖️ Нотаріус у Торонто забув дату в certifіcate — документ недійсний. Урок: дата — це святе, перевіряй тричі! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував у кафе без стола — підпис розмазався. Урок: забезпечуй професійне середовище! ⚖️
⚖️ Нотаріус у Торонто не відмовив клієнту, який вимагав "швидко без перевірки" — скаргу. Урок: ніколи не поступайся стандартам! ⚖️
⚖️ Нотаріус у Торонто використав шаблон certifіcate з помилкою — суд відхилив. Урок: завжди використовуй актуальний онтарійський шаблон! ⚖️
⚖️ Нотаріус у Торонто не зберіг запис про ID — аудит LSO виявив порушення. Урок: фіксуй усі деталі ідентифікації! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував power of attorney без witness — недійсний. Урок: для POA потрібні всі witnesses на місці! ⚖️
⚖️ Нотаріус у Торонто сперечався з клієнтом щодо змісту — втратив довіру. Урок: залишайся нейтральним! ⚖️
⚖️ Нотаріус у Торонто забув оновити комісію — працював з простроченою. Урок: перевіряй термін кожні 30 днів! ⚖️
⚖️ Нотаріус у Торонто засвідчив копію з водяними знаками невидимими — проблема. Урок: перевіряй якість копії! ⚖️
⚖️ Нотаріус у Торонто прийняв підпис з помилкою в імені — клієнт подав скаргу. Урок: звіряй ім’я з ID слово в слово! ⚖️
⚖️ Нотаріус у Торонто не провів oath для jurat — документ недійсний. Урок: jurat вимагає присяги! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував для неповнолітнього без опікуна — порушення. Урок: неповнолітні тільки з legal guardian! ⚖️
⚖️ Нотаріус у Торонто залишив печатку на столі — ризик крадіжки. Урок: зберігай печатку в сейфі! ⚖️
⚖️ Нотаріус у Торонто не перевірив, чи документ підроблений — кримінальна справа. Урок: довіряй, але перевіряй! ⚖️
⚖️ Нотаріус у Торонто поставив неправильний venue (написав "Canada" замість "Ontario") — ODS відхилив. Урок: venue завжди Province of Ontario! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував без блокнота — забув деталі. Урок: завжди записуй нотатки! ⚖️
⚖️ Нотаріус у Торонто дозволив клієнту змінити документ після підпису — недійсний. Урок: жодних змін після акту! ⚖️
⚖️ Нотаріус у Торонто не повідомив клієнта про обмеження нотаріуса — непорозуміння. Урок: чітко пояснюй межі повноважень! ⚖️
⚖️ Нотаріус у Торонто використав неофіційний штамп — LSO попередження. Урок: тільки офіційна печатка! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував late night без перевірки втоми клієнта — помилка. Урок: оцінюй capacity підписанта! ⚖️
⚖️ Нотаріус у Торонто забув журнал вдома — не міг підтвердити акт. Урок: носи журнал завжди! ⚖️
⚖️ Нотаріус у Торонто прийняв photocopy як ID — відмова в банку. Урок: тільки оригінал photo ID! ⚖️
⚖️ Нотаріус у Торонто не заповнив "subscribed and sworn" — jurat недійсний. Урок: використовуй правильну формулу! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував для конкурента клієнта — конфлікт. Урок: перевіряй зв’язки! ⚖️
⚖️ Нотаріус у Торонто поставив дату майбутню — документ відхилили. Урок: тільки поточна дата! ⚖️
⚖️ Нотаріус у Торонто не зберіг електронний запис — проблеми з LSO. Урок: резервне копіювання обов’язкове! ⚖️
⚖️ Нотаріус у Торонто дозволив підписати без читання — клієнт оскаржив. Урок: переконайся, що підписант розуміє! ⚖️
⚖️ Нотаріус у Торонто використав слабке чорнило — печать зникла. Урок: тільки archival ink! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував без перевірки віку — неповнолітній. Урок: перевіряй DOB з ID! ⚖️
⚖️ Нотаріус у Торонто не відмовив п’яному клієнту — скаргу. Урок: capacity перш за все! ⚖️
⚖️ Нотаріус у Торонто забув номер комісії в certifіcate — повернули. Урок: номер завжди! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував altered contract — суд скасував. Урок: не нотаріалізуй змінені без примітки! ⚖️
⚖️ Нотаріус у Торонто не оновив адресу офісу в комісії — технічне порушення. Урок: повідомляй Attorney General про зміни! ⚖️
⚖️ Нотаріус у Торонто прийняв ID з іншим прізвищем — помилка. Урок: звіряй кожну літеру! ⚖️
⚖️ Нотаріус у Торонто не провів affirmation для атеїста — порушення. Урок: пропонуй affirmation замість oath! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував у машині — нестабільне середовище. Урок: професійне місце обов’язкове! ⚖️
⚖️ Нотаріус у Торонто забув перевірити печатку на чистоту — розмита. Урок: чиста печатка = чіткий відбиток! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував для нерезидента без додаткової перевірки — проблеми з ODS. Урок: уточнюй країну використання! ⚖️
⚖️ Нотаріус у Торонто не зробив примітку про witness — недійсний. Урок: фіксуй усіх присутніх! ⚖️
⚖️ Нотаріус у Торонто прийняв expired passport — відмова. Урок: тільки valid ID! ⚖️
⚖️ Нотаріус у Торонто нотаріалізував без журналу — LSO штраф. Урок: журнал = доказ! ⚖️
⚖️ Нотаріус у Торонто поставив неправильний тип certifіcate (acknowledgment замість jurat) — недійсний. Урок: вибирай правильний тип акту! ⚖️
⚖️ Нотаріус у Торонто дозволив клієнту диктувати текст — ризик. Урок: документ готуй заздалегідь! ⚖️
⚖️ Нотаріус у Торонто не перевірив corporate seal — фальшивий. Урок: перевіряй усі seals! ⚖️
`.split(/\r?\n/).map(line => normalizeSingleLine(line)).filter(Boolean);
// Keep the lesson-story pools resilient even if dedicated source lists are absent.
const TG_NOTARY_TORONTO_STORIES = Array.isArray(TG_LEGACY_LESSON_STORIES)
  ? TG_LEGACY_LESSON_STORIES.filter(story => /нотаріус|notary/i.test(String(story || '')))
  : [];
const TG_REAL_CASE_STORIES = [];
const TG_TAX_STORIES = `
⚖️ Подали T1 General без усіх slip’ів (T4/T5) — CRA зробила reassessment. Урок: звіряй з CRA My Account! ⚖️
⚖️ Не включили income з side hustle — штраф. Урок: весь worldwide income обов’язковий! ⚖️
⚖️ Неправильно вибрали marital status — втратили credits. Урок: статус впливає на податки! ⚖️
⚖️ Claimнули CCB без права — повернення + пеня. Урок: перевір eligibility! ⚖️
⚖️ Пропустили deadline (30 квітня) — late penalty. Урок: filing ≠ payment, але обидва важливі! ⚖️
⚖️ Self-employed подав після 15 червня і не оплатив — interest. Урок: платіж до 30 квітня! ⚖️
⚖️ Не зберегли receipts — audit програли. Урок: 6 років зберігання! ⚖️
⚖️ Claimнули fake expenses — gross negligence penalty. Урок: тільки реальні витрати! ⚖️
⚖️ Не подали T2125 — бізнес дохід не підтверджений. Урок: self-employed = T2125! ⚖️
⚖️ Переплутали capital vs personal expense — відмова. Урок: капітальні активи амортизуються! ⚖️

⚖️ Claimнули home office без права — audit. Урок: strict rules! ⚖️
⚖️ Не розділили personal/business витрати — CRA відхилила. Урок: веди окремий облік! ⚖️
⚖️ Не задекларували foreign income — серйозні санкції. Урок: Канада оподатковує worldwide income! ⚖️
⚖️ Забули T1135 — штрафи великі. Урок: >100k CAD — обов’язково! ⚖️
⚖️ Claimнули tuition без slip T2202 — відмова. Урок: тільки офіційні документи! ⚖️
⚖️ Перенесли credits неправильно — втратили гроші. Урок: оптимізуй transfer! ⚖️
⚖️ Не використали carryforward losses — переплатили. Урок: перевір попередні роки! ⚖️
⚖️ Неправильний SIN — затримка. Урок: перевіряй цифри двічі! ⚖️
⚖️ Вказали неправильний address — missed notices. Урок: актуальні дані! ⚖️
⚖️ Не подали податки кілька років — CRA estimate. Урок: file навіть з нулем! ⚖️

⚖️ Claimнули medical без порогу — не зараховано. Урок: threshold rule! ⚖️
⚖️ Не включили spouse income — помилка credits. Урок: сімейний розрахунок важливий! ⚖️
⚖️ Claimнули donation без receipt — відмова. Урок: тільки офіційні charitable receipts! ⚖️
⚖️ Переплутали federal/provincial credits — неточність. Урок: Онтаріо має свої ставки! ⚖️
⚖️ Не врахували Ontario surtax — недоплата. Урок: провінція ≠ федерація! ⚖️
⚖️ Claimнули rent credit без права — reassessment. Урок: eligibility перевір! ⚖️
⚖️ Не подали T4 — missing income. Урок: всі T-slips враховуй! ⚖️
⚖️ Не задекларували tips — штраф. Урок: tips = taxable! ⚖️
⚖️ Переплутали employee vs contractor — проблеми. Урок: статус критичний! ⚖️
⚖️ Claimнули CCA на землю — відмова. Урок: земля не амортизується! ⚖️

⚖️ Неправильно розрахували HST — борг. Урок: правильні ставки Онтаріо! ⚖️
⚖️ Не зареєструвались для HST вчасно — штраф. Урок: threshold 30k! ⚖️
⚖️ Подали T6 без підстав — відмова. Урок: потрібні докази hardship! ⚖️
⚖️ Не відповіли CRA на review letter — reassessment. Урок: реагуй швидко! ⚖️
⚖️ Подали паперово з помилками — затримка. Урок: e-file швидше! ⚖️
⚖️ Неправильно вказали dependants — відмова. Урок: eligibility rules! ⚖️
⚖️ Claimнули childcare без підтвердження — audit. Урок: receipts обов’язкові! ⚖️
⚖️ Не включили EI benefits — борг. Урок: benefits taxable! ⚖️
⚖️ Не задекларували CERB — penalty. Урок: COVID payments теж оподатковуються! ⚖️
⚖️ Claimнули moving expenses без права — відмова. Урок: distance test! ⚖️

⚖️ Неправильно використали RRSP deduction — втратили вигоду. Урок: limit важливий! ⚖️
⚖️ Overcontribution в RRSP — penalty 1%/місяць. Урок: слідкуй за room! ⚖️
⚖️ Не задекларували TFSA overcontribution — штраф. Урок: TFSA теж контролюється! ⚖️
⚖️ Claimнули personal авто як 100% бізнес — audit. Урок: тільки business portion! ⚖️
⚖️ Не вели mileage log — відмова. Урок: лог обов’язковий! ⚖️
⚖️ Не задекларували crypto — проблеми. Урок: crypto = taxable! ⚖️
⚖️ Claimнули losses без бізнес-мети — CRA відмовила. Урок: profit intention! ⚖️
⚖️ Подали повторно без виправлень — затримка. Урок: use adjustment! ⚖️
⚖️ Не подали T1 Adjustment Request — помилки залишились. Урок: виправляй офіційно! ⚖️
⚖️ Claimнули GST credit неправильно — повернення. Урок: автоматично рахується! ⚖️

⚖️ Не врахували Ontario Trillium Benefit — втратили гроші. Урок: подай вчасно! ⚖️
⚖️ Подали без direct deposit — затримка. Урок: підключи депозит! ⚖️
⚖️ Не перевірили Notice of Assessment — пропустили помилки. Урок: завжди перевір! ⚖️
⚖️ Не оплатили balance — interest. Урок: CRA нараховує щодня! ⚖️
⚖️ Подали з округленням «на око» — discrepancy. Урок: точність! ⚖️
⚖️ Неправильно класифікували income — audit. Урок: тип доходу важливий! ⚖️
⚖️ Claimнули disability credit без T2201 — відмова. Урок: форма обов’язкова! ⚖️
⚖️ Не подали taxes взагалі — freeze benefits. Урок: filing unlocks benefits! ⚖️
⚖️ Подали як non-resident помилково — проблеми. Урок: residency test! ⚖️
⚖️ Не врахували tie-breaker rules — double tax risk. Урок: міжнародні угоди! ⚖️

⚖️ Claimнули interest без loan purpose — відмова. Урок: зв’язок з доходом! ⚖️
⚖️ Не розділили GST/HST collected — борг. Урок: це не твій дохід! ⚖️
⚖️ Не подали instalments — penalty. Урок: якщо CRA вимагає — плати! ⚖️
⚖️ Подали нульову декларацію з доходом — audit trigger. Урок: логіка має сходитися! ⚖️
⚖️ Claimнули tuition двічі — reassessment. Урок: перевір попередні роки! ⚖️
⚖️ Не задекларували rental income — штраф. Урок: все декларується! ⚖️
⚖️ Не подали T776 — rental не підтверджений. Урок: окрема форма! ⚖️
⚖️ Claimнули ремонт як expense замість capital — помилка. Урок: distinction важливий! ⚖️
⚖️ Не врахували depreciation recapture — сюрприз податок. Урок: продаж активів має наслідки! ⚖️
⚖️ Подали без перевірки software — помилки. Урок: review перед submit! ⚖️

⚖️ Дали клієнту неправильну пораду — liability. Урок: перевір джерела! ⚖️
⚖️ Не задокументували консультацію — спір. Урок: веди записи! ⚖️
⚖️ Пропустили CRA deadline reply — автоматичне рішення. Урок: строки критичні! ⚖️
⚖️ Подали T1 з чужими даними — breach. Урок: privacy! ⚖️
⚖️ Не перевірили ID клієнта — fraud. Урок: KYC важливий! ⚖️
⚖️ Подали з помилкою в banking — гроші не туди. Урок: double-check! ⚖️
⚖️ Не пояснили клієнту ризики — скарга. Урок: прозорість! ⚖️
⚖️ Ігнорували CRA calls — escalation. Урок: комунікація! ⚖️
⚖️ Не подали objection вчасно — втратили право. Урок: 90 днів! ⚖️
⚖️ Не використали T1 General попередніх років — втратили refunds. Урок: retro filing! ⚖️
`.split(/\r?\n/).map(line => normalizeSingleLine(line)).filter(Boolean);
const TG_STORY_TARGET_COUNT = 1030;
const TG_STORY_ROLES = ['Паралегал', 'Адвокат', 'Юрист'];
const TG_STORY_CITIES = [
  'у Торонто',
  'в Оттаві',
  'у Міссісазі',
  'у Брамптоні',
  'в Гамільтоні',
  'в Лондоні, Онтаріо',
  'у Віндзорі',
  'в Ошаві',
  'у Кінгстоні',
  'у Воні',
  'у Маркамі',
  'в Оквіллі'
];
const TG_STORY_SCENARIOS = [
  {
    mistake: 'відправив опоненту не той PDF з внутрішніми нотатками',
    consequence: 'довелося рятувати privilege і гасити зайвий конфлікт',
    lesson: 'перевіряй вкладення перед Send'
  },
  {
    mistake: 'залишив у файлі видимі Track Changes з внутрішньою стратегією',
    consequence: 'клієнт сам подарував опоненту свою позицію',
    lesson: 'очищуй metadata і Track Changes перед поданням'
  },
  {
    mistake: 'подав motion в останні хвилини й не помітив, що додаток не прикріпився',
    consequence: 'суд отримав порожню подачу, а дедлайн згорів',
    lesson: 'подавай усе завчасно і перевіряй receipt'
  },
  {
    mistake: 'не звірив часовий пояс Zoom hearing',
    consequence: 'зайшов після виклику справи і ледве не втратив виступ',
    lesson: 'перевіряй timezone в notice'
  },
  {
    mistake: 'назвав файл як "final_v7_REAL_final" і команда подала стару версію',
    consequence: 'у справу пішов документ з уже виправленими помилками',
    lesson: 'використовуй чітку версіонність файлів'
  },
  {
    mistake: 'забув прибрати чужий case number з шаблону',
    consequence: 'суд побачив сторонню справу і повернув документ',
    lesson: 'чисть шаблони перед кожним клієнтом'
  },
  {
    mistake: 'не перевірив conflict check перед консультацією',
    consequence: 'довелося повертати гонорар і терміново зніматися зі справи',
    lesson: 'conflict check роби до першої поради'
  },
  {
    mistake: 'пообіцяв клієнту "100% win"',
    consequence: 'скарга за misleading communication прилетіла швидше за hearing',
    lesson: 'ніколи не гарантуй результат'
  },
  {
    mistake: 'пропустив строк відповіді на motion, бо лист упав у spam',
    consequence: 'питання розглянули без позиції клієнта',
    lesson: 'монітор службову пошту і spam щодня'
  },
  {
    mistake: 'узяв термінову справу поза своєю спеціалізацією',
    consequence: 'зламав базову процедуру і підставив клієнта на зайві витрати',
    lesson: 'не dabble в чужій галузі'
  },
  {
    mistake: 'не попросив підписати retainer letter на старті',
    consequence: 'клієнт потім заперечив scope роботи і гонорар',
    lesson: 'фіксуй доручення письмово'
  },
  {
    mistake: 'вів листування з клієнтом з особистої пошти',
    consequence: 'важливі інструкції загубилися між приватними листами',
    lesson: 'усе робоче тримай у контрольованому inbox'
  },
  {
    mistake: 'не замаскував персональні дані в exhibit',
    consequence: 'зайва приватна інформація опинилася в матеріалах справи',
    lesson: 'редагуй sensitive data перед поданням'
  },
  {
    mistake: 'прийшов на Small Claims без паперової резервної копії',
    consequence: 'Wi-Fi підвів саме на ключовому документі',
    lesson: 'май backup і offline copy'
  },
  {
    mistake: 'не перевірив, чи filing fee реально пройшов',
    consequence: 'реєстрація зависла, а строк тихо сплив',
    lesson: 'fees контролюй окремим чек-листом'
  },
  {
    mistake: 'забув оновити адресу клієнта після переїзду',
    consequence: 'notice пішов у нікуди і все посипалося',
    lesson: 'оновлюй контактні дані на кожному етапі'
  },
  {
    mistake: 'переплутав hearing brief двох клієнтів',
    consequence: 'опонент побачив зайве, а команда отримала стрес-тест',
    lesson: 'маркуй справи жорстко і без двозначностей'
  },
  {
    mistake: 'залишив підписаний, але порожній аркуш для подальшого заповнення',
    consequence: 'створив собі ризик спору про справжність документа',
    lesson: 'ніколи не підписуй blank forms'
  },
  {
    mistake: 'не перечитав автоисправлення у Word перед відправкою',
    consequence: 'у заяві залишився чужий термін і сенс поїхав',
    lesson: 'вичитка після автозаміни обов’язкова'
  },
  {
    mistake: 'обговорював справу в ліфті суду занадто голосно',
    consequence: 'конфіденційність закінчилася ще до hearing',
    lesson: 'чутливі факти обговорюй тільки приватно'
  },
  {
    mistake: 'відкрив клієнтський файл на незаблокованому ноутбуці в кафе',
    consequence: 'ризик витоку виник буквально за хвилину',
    lesson: 'lock screen і не працюй з чутливим у публічних місцях'
  },
  {
    mistake: 'подав affidavit без фінальної перевірки exhibit tabs',
    consequence: 'суддя довго шукав додатки, а довіра до підготовки просіла',
    lesson: 'звіряй нумерацію додатків перед поданням'
  },
  {
    mistake: 'не зберіг підтвердження вручення',
    consequence: 'потім не зміг швидко довести service',
    lesson: 'service proof зберігай одразу'
  },
  {
    mistake: 'не пояснив клієнту різницю між consultation і full representation',
    consequence: 'очікування клієнта поїхали в інший бік',
    lesson: 'scope пояснюй просто і письмово'
  },
  {
    mistake: 'переслав судове посилання не тій людині',
    consequence: 'довелося терміново міняти доступ і пояснюватися',
    lesson: 'перевіряй адресатів перед кожним пересиланням'
  },
  {
    mistake: 'не попередив перекладача про зміну часу hearing',
    consequence: 'засідання стартувало без ключової людини',
    lesson: 'усіх учасників синхронізуй завчасно'
  },
  {
    mistake: 'завантажив фото-докази без назв і дат',
    consequence: 'у hearing їх було важко швидко прив’язати до подій',
    lesson: 'називай докази системно'
  },
  {
    mistake: 'не прибрав коментар "переписати красиво" перед відправкою клієнту',
    consequence: 'клієнт побачив усю внутрішню кухню',
    lesson: 'чисть comments перед send'
  },
  {
    mistake: 'погодив adjournment усно і не підтвердив письмово',
    consequence: 'сторони потім по-різному згадали домовленість',
    lesson: 'будь-яку домовленість фіксуй листом'
  },
  {
    mistake: 'не перевірив, що клієнт реально зрозумів умови settlement',
    consequence: 'після підписання спалахнув конфлікт через очікування',
    lesson: 'пояснюй settlement простими словами'
  }
];

function parseTelegramStoryList(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map(line => normalizeSingleLine(line))
    .filter(Boolean);
}

const TG_TRAFFIC_TICKET_SERVICE_STORIES = parseTelegramStoryList(`
⚖️ Не відповів на тікет в 15 днів — default conviction. Урок: завжди відповідай вчасно! ⚖️
⚖️ Заплатив штраф одразу — втратив points reduction. Урок: never pay without advice! ⚖️
⚖️ Не найняв paralegal — сам програв trial. Урок: hire professional defender! ⚖️
⚖️ Паралигал забув request disclosure — unprepared до суду. Урок: disclosure first! ⚖️
⚖️ Officer не з’явився в court — ticket dismissed. Урок: fight every ticket! ⚖️
⚖️ Не оскаржив radar calibration — штраф залишився. Урок: challenge the equipment! ⚖️
⚖️ Забули photo evidence для red light camera — lost case. Урок: full disclosure is key! ⚖️
⚖️ Паралигал неправильно підготував cross-examination — weak defence. Урок: practice questions! ⚖️
⚖️ Перемогли в trial — no demerit points. Урок: good strategy wins! ⚖️
⚖️ Не перевірили technical errors на тікеті — missed defence. Урок: read every detail! ⚖️
⚖️ Не пішли на early resolution — пропустили reduction. Урок: explore plea deals! ⚖️
⚖️ Паралигал пропустив court date — warrant issued. Урок: double-check dates! ⚖️
⚖️ Officer дав inconsistent testimony — ticket dismissed. Урок: listen carefully! ⚖️
⚖️ Не зібрали witness statements — weak case. Урок: bring witnesses! ⚖️
⚖️ Перемогли завдяки video evidence — charges dropped. Урок: record everything! ⚖️
⚖️ Claimнули necessity defence неправильно — відмова. Урок: facts must match! ⚖️
⚖️ Не перевірили licence status — extra fines. Урок: check your licence! ⚖️
⚖️ Паралигал negotiated plea — fine halved. Урок: negotiation power! ⚖️
⚖️ Забули про demerit points impact — licence suspended. Урок: calculate points! ⚖️
⚖️ Red light ticket скасовано через faulty camera. Урок: challenge tech! ⚖️
⚖️ Не подали motion for adjournment — forced to trial. Урок: request delay if needed! ⚖️
⚖️ Officer не знав точної speed limit — victory. Урок: know the law! ⚖️
⚖️ Паралигал пропустив insurance proof — extra penalty. Урок: bring documents! ⚖️
⚖️ Stop sign violation dismissed — no sign visible. Урок: photo the scene! ⚖️
⚖️ Не використали mistake of fact — програли. Урок: honest mistake defence! ⚖️
⚖️ Перемогли в distracted driving — phone not in hand. Урок: prove location! ⚖️
⚖️ Забули request officer notes — missed contradictions. Урок: full notes matter! ⚖️
⚖️ Паралигал виграв appeal — conviction overturned. Урок: appeal on time! ⚖️
⚖️ Improper lane change — reduced to warning. Урок: negotiate smart! ⚖️
⚖️ Не перевірили radar certification — evidence excluded. Урок: check certificates! ⚖️
⚖️ Client не з’явився з paralegal — lost by default. Урок: show up! ⚖️
⚖️ Following too closely dismissed — safe distance proven. Урок: dashcam saves! ⚖️
⚖️ Паралигал забув file Charter motion — missed rights violation. Урок: know Charter! ⚖️
⚖️ Seatbelt ticket скасовано — faulty buckle. Урок: bring proof! ⚖️
⚖️ Не подали character references — no leniency. Урок: good character helps! ⚖️
⚖️ Victory: zero points after plea bargain. Урок: lesser offence wins! ⚖️
⚖️ Не оскаржив laser timing — fine paid. Урок: timing errors exist! ⚖️
⚖️ Паралигал виграв careless driving — reduced to improper turn. Урок: downgrade possible! ⚖️
⚖️ Забули про young driver rules — extra sanctions. Урок: G1/G2 special rules! ⚖️
⚖️ Officer testimony contradicted report — dismissed. Урок: compare documents! ⚖️
⚖️ No insurance ticket reduced — proof provided late. Урок: late evidence ok sometimes! ⚖️
⚖️ Паралигал пропустив limitation period — no appeal. Урок: 15 days to file! ⚖️
⚖️ Speeding 50+ dismissed — pacing error. Урок: challenge pacing! ⚖️
⚖️ Не принесли Google Maps — scene not clear. Урок: visual aids win! ⚖️
⚖️ Victory: full dismissal due to procedural error. Урок: procedure matters! ⚖️
⚖️ Не перевірили ticket number — mismatch. Урок: check ticket details! ⚖️
⚖️ Паралигал успішно cross-examined — officer confused. Урок: stay calm! ⚖️
⚖️ Distracted driving reduced — hands-free proven. Урок: evidence of hands-free! ⚖️
⚖️ Забули request second officer — single witness weak. Урок: request backup! ⚖️
⚖️ Licence suspension avoided — points not added. Урок: fight points! ⚖️
⚖️ Не використали due diligence defence — guilty. Урок: reasonable steps matter! ⚖️
⚖️ Паралигал виграв fail to yield — yield sign hidden. Урок: photos of signs! ⚖️
⚖️ Improper turn ticket dismissed — lane marking faded. Урок: document road! ⚖️
⚖️ Victory: fine reduced 70% after negotiation. Урок: prosecutor talks! ⚖️
⚖️ Не подали pre-trial conference — missed chance. Урок: attend pre-trial! ⚖️
⚖️ Officer не пам’ятав details — reasonable doubt. Урок: memory fades! ⚖️
⚖️ Паралигал забув bring exhibits — weaker case. Урок: prepare exhibits! ⚖️
⚖️ Stop sign victory — stop line not visible. Урок: line condition key! ⚖️
⚖️ Не перевірили weather conditions — visibility defence. Урок: weather report! ⚖️
⚖️ Reduced to lesser charge — no insurance points. Урок: plea to minor! ⚖️
⚖️ Паралигал виграв phone ticket — passenger used phone. Урок: who held it? ⚖️
⚖️ Забули про out-of-province licence — extra hassle. Урок: check jurisdiction! ⚖️
⚖️ Victory: charges withdrawn before trial. Урок: early negotiation! ⚖️
⚖️ Не оскаржив speed survey data — lost speeding. Урок: check surveys! ⚖️
⚖️ Паралигал успішно argued necessity — emergency proven. Урок: real emergency! ⚖️
⚖️ Careless driving reduced — momentary lapse. Урок: momentary = not careless! ⚖️
⚖️ Не принесли maintenance records для vehicle — weak. Урок: vehicle records help! ⚖️
⚖️ Officer error in measurement — ticket gone. Урок: math errors happen! ⚖️
⚖️ Паралигал пропустив disclosure deadline — adjournment cost. Урок: file early! ⚖️
⚖️ Full victory: all points erased on appeal. Урок: appeal works! ⚖️
⚖️ Не перевірили officer training record — unqualified. Урок: check qualifications! ⚖️
⚖️ Red light camera ticket dismissed — plate mismatch. Урок: check photos! ⚖️
⚖️ Victory: fine only, no conviction. Урок: absolute discharge possible! ⚖️
⚖️ Паралигал виграв lane change — signal was on. Урок: prove signal! ⚖️
⚖️ Забули request video from cruiser — missed footage. Урок: ask for video! ⚖️
⚖️ Following too close reduced — tailgating not proven. Урок: distance proof! ⚖️
⚖️ Не використали expert witness — technical loss. Урок: experts win tech cases! ⚖️
⚖️ Паралигал negotiated zero demerits. Урок: points negotiation! ⚖️
⚖️ Seatbelt violation dismissed — medical exemption. Урок: medical proof! ⚖️
⚖️ Victory: case stayed due to delay. Урок: Jordan rules apply! ⚖️
⚖️ Не перевірили court location — wrong courthouse. Урок: confirm venue! ⚖️
⚖️ Officer notes incomplete — reasonable doubt. Урок: incomplete = win! ⚖️
⚖️ Паралигал забув update client — missed instructions. Урок: communicate! ⚖️
⚖️ Improper overtake dismissed — safe maneuver. Урок: safe = legal! ⚖️
⚖️ Не подали mitigation evidence — max fine. Урок: show mitigation! ⚖️
⚖️ Victory: ticket withdrawn by prosecutor. Урок: strong defence! ⚖️
⚖️ Speeding ticket reduced to 1-15 km/h — no points. Урок: downgrade magic! ⚖️
⚖️ Паралигал виграв через faulty radar — device error. Урок: maintenance logs! ⚖️
⚖️ Забули про Charter s. 11(b) — delay argument. Урок: delay defence! ⚖️
⚖️ No insurance victory — temporary lapse proven. Урок: short lapse ok! ⚖️
⚖️ Паралигал успішно argued duress — threat real. Урок: real duress! ⚖️
⚖️ Final victory: full acquittal after trial. Урок: never give up! ⚖️
⚖️ Не перевірили prosecutor disclosure — surprise evidence. Урок: review everything! ⚖️
⚖️ Паралигал забув close file properly — missed refund. Урок: paperwork last step! ⚖️
⚖️ Distracted driving dismissed — device in cradle. Урок: cradle = legal! ⚖️
⚖️ Victory: licence saved, no suspension. Урок: fight to the end! ⚖️
`);

const TG_SCC_SERVICE_STORIES = parseTelegramStoryList(`
⚖️ Не подав Defence в 20 днів — default judgment. Урок: завжди відповідай вчасно! ⚖️
⚖️ Паралігал забув serve Plaintiff's Claim — позов відхилили. Урок: правильне вручення ключ! ⚖️
⚖️ Не з’явився на pre-trial conference — claim struck out. Урок: відвідуй всі конференції! ⚖️
⚖️ Забули Limitations Act — 2 роки минули. Урок: перевіряй строк давності! ⚖️
⚖️ Неправильно оформили Affidavit of Service — service invalid. Урок: тільки Form 8A! ⚖️
⚖️ Паралігал не підготував evidence bundle — weak trial. Урок: збирай всі докази! ⚖️
⚖️ Виграв motion to strike — no reasonable cause. Урок: Rule 12.02 працює! ⚖️
⚖️ Не claimнули costs — втратили $500+. Урок: завжди проси витрати! ⚖️
⚖️ Client не приніс contracts — zero proof. Урок: contracts + invoices! ⚖️
⚖️ Перемогли в settlement conference — 100% recovery. Урок: торгуйся рано! ⚖️
⚖️ Неправильний jurisdiction — case transferred. Урок: тільки Онтаріо! ⚖️
⚖️ Паралігал пропустив amendment — old pleadings. Урок: оновлюй позов вчасно! ⚖️
⚖️ Не request disclosure — surprise witnesses. Урок: вимагай документи! ⚖️
⚖️ Witness не з’явився — lost case. Урок: subpoena обов’язково! ⚖️
⚖️ Victory: default judgment + garnishment. Урок: enforcement tools! ⚖️
⚖️ Не подали Request for Default Judgment — delay. Урок: Clerk form швидко! ⚖️
⚖️ Паралігал забув post-judgment interest — менше грошей. Урок: 5% + court rate! ⚖️
⚖️ Неправильно вказали amount claimed — over limit. Урок: max $35,000! ⚖️
⚖️ Перемогли завдяки photos of damage — full award. Урок: візуальні докази! ⚖️
⚖️ Не перевірили defendant assets — empty judgment. Урок: check before filing! ⚖️
⚖️ Паралігал не подав Costs Outline — no representation fee. Урок: tariff rules! ⚖️
⚖️ Забули serve Defence on plaintiff — struck out. Урок: serve everyone! ⚖️
⚖️ Victory: claim dismissed за delay. Урок: want of prosecution! ⚖️
⚖️ Не підготував witness statements — hearsay weak. Урок: affidavits від witnesses! ⚖️
⚖️ Неправильний address for service — missed court date. Урок: актуальні дані! ⚖️
⚖️ Паралігал виграв full trial — $12k awarded. Урок: strong evidence wins! ⚖️
⚖️ Не request mediation — missed free settlement. Урок: mediation = must try! ⚖️
⚖️ Забули про Rule 7.01 — defective claim. Урок: правильна форма 7A! ⚖️
⚖️ Перемогли через no jurisdiction — dismissed instantly. Урок: territorial limit! ⚖️
⚖️ Паралігал забув file pre-trial brief — judge unhappy. Урок: готовий бриф! ⚖️
⚖️ Не claimнули punitive damages — only compensatory. Урок: SCC limits! ⚖️
⚖️ Victory: motion for summary judgment granted. Урок: no triable issue! ⚖️
⚖️ Client не приніс bank statements — no proof of loss. Урок: financial records! ⚖️
⚖️ Не подали Notice of Garnishment — money stuck. Урок: enforcement step 1! ⚖️
⚖️ Паралігал пропустив 30-day appeal — lost forever. Урок: 30 днів максимум! ⚖️
⚖️ Неправильний defendant name — case dismissed. Урок: check corporate search! ⚖️
⚖️ Перемогли завдяки expert report — full amount. Урок: experts allowed! ⚖️
⚖️ Забули request adjournment — forced to trial unprepared. Урок: motion in time! ⚖️
⚖️ Паралігал виграв на technicality — improper service. Урок: rules save cases! ⚖️
⚖️ Не перевірили insurance coverage — no payout. Урок: defendant insured? ⚖️
⚖️ Victory: settlement + costs — $8k net. Урок: good negotiation! ⚖️
⚖️ Не подали Affidavit for substituted service — denied. Урок: special service rules! ⚖️
⚖️ Client дав wrong version of contract — lost credibility. Урок: original docs only! ⚖️
⚖️ Паралігал забув close file — missed enforcement. Урок: judgment to collection! ⚖️
⚖️ Перемогли в trial — defendant paid + interest. Урок: court order strong! ⚖️
⚖️ Забули про Rule 9.03 — defence incomplete. Урок: повна відповідь! ⚖️
⚖️ Не request written reasons — hard to appeal. Урок: ask for reasons! ⚖️
⚖️ Паралігал виграв dismissal — statute barred. Урок: Limitations Act defence! ⚖️
⚖️ Неправильно розрахували amount — over $35k rejected. Урок: stay under limit! ⚖️
⚖️ Victory: costs awarded to paralegal client. Урок: tariff + disbursements! ⚖️
⚖️ Не з’явився на assessment hearing — default confirmed. Урок: attend everything! ⚖️
⚖️ Забули serve Notice of Contempt — no teeth. Урок: enforce orders! ⚖️
⚖️ Паралігал negotiated full release — clean win. Урок: settlement agreement! ⚖️
⚖️ Не підготував trial plan — judge confused. Урок: structure your case! ⚖️
⚖️ Перемогли завдяки video evidence — clear proof. Урок: record everything! ⚖️
⚖️ Неправильний court location — transferred + delay. Урок: check venue! ⚖️
⚖️ Паралігал забув update client — missed instructions. Урок: communicate always! ⚖️
⚖️ Victory: claim withdrawn after strong defence. Урок: pressure works! ⚖️
⚖️ Не request order for payment terms — lump sum only. Урок: ask for instalments! ⚖️
⚖️ Забули про Rule 13 motion — missed chance. Урок: motions save time! ⚖️
⚖️ Паралігал виграв на cross-examination — contradictions. Урок: good questions! ⚖️
⚖️ Client не приніс photos — no visual proof. Урок: before/after shots! ⚖️
⚖️ Перемогли — full judgment + 5% interest. Урок: post-judgment magic! ⚖️
⚖️ Не перевірили corporate status — dissolved defendant. Урок: business search! ⚖️
⚖️ Паралігал пропустив disclosure deadline — adjournment cost. Урок: file early! ⚖️
⚖️ Victory: case stayed за Jordan delay. Урок: delay defence! ⚖️
⚖️ Забули request certified copies — originals only. Урок: court accepts certified! ⚖️
⚖️ Неправильно вказали parties — amendment needed. Урок: correct names! ⚖️
⚖️ Паралігал виграв enforcement — wage garnishment. Урок: collect fast! ⚖️
⚖️ Не подали Costs Outline at end — zero costs. Урок: submit before judge leaves! ⚖️
⚖️ Перемогли завдяки character references — leniency. Урок: good reputation helps! ⚖️
⚖️ Забули про Rule 10 pre-trial — no settlement push. Урок: pre-trial = key! ⚖️
⚖️ Паралігал забув bring exhibits — weaker case. Урок: labeled binders! ⚖️
⚖️ Victory: full dismissal + costs. Урок: strong motion! ⚖️
⚖️ Не перевірили limitation on counterclaim — lost counter. Урок: same 2 years! ⚖️
⚖️ Неправильний service on corporation — invalid. Урок: director + registered office! ⚖️
⚖️ Паралігал negotiated reduced amount + no interest. Урок: smart deal! ⚖️
⚖️ Забули request writ of seizure — no assets seized. Урок: enforcement tools! ⚖️
⚖️ Перемогли в trial — defendant paid immediately. Урок: pressure after win! ⚖️
⚖️ Не подали amended claim — old facts. Урок: update when new info! ⚖️
⚖️ Паралігал виграв на technical error — defective pleading. Урок: rules matter! ⚖️
⚖️ Victory: judgment enforced via sheriff. Урок: use sheriff services! ⚖️
⚖️ Client дав verbal agreement only — weak. Урок: written proof best! ⚖️
⚖️ Не перевірили court file number — filing mismatch. Урок: confirm file details! ⚖️
⚖️ Забули про Rule 14 trial scheduling — delay. Урок: set trial date fast! ⚖️
⚖️ Паралігал забув file Notice of Appeal — lost right. Урок: 30 days strict! ⚖️
⚖️ Перемогли завдяки expert invoice — full award. Урок: professionals help! ⚖️
⚖️ Не request order for costs against plaintiff — missed. Урок: ask every time! ⚖️
⚖️ Неправильно розрахували HST — wrong total. Урок: include tax correctly! ⚖️
⚖️ Паралігал виграв settlement before trial — saved time. Урок: early resolution! ⚖️
⚖️ Victory: absolute discharge of claim. Урок: clean win! ⚖️
⚖️ Забули перевірити defendant SIN — hard to enforce. Урок: know your debtor! ⚖️
⚖️ Паралігал пропустив update address — missed notices. Урок: current info! ⚖️
⚖️ Перемогли — full amount + court costs. Урок: never settle cheap! ⚖️
⚖️ Не подали final Costs Outline — judge refused. Урок: submit on time! ⚖️
⚖️ Паралігал виграв через incomplete defence — struck. Урок: incomplete = loss! ⚖️
⚖️ Victory: paralegal client recovered 100% + interest. Урок: good prep wins! ⚖️
⚖️ Забули request video evidence — missed proof. Урок: ask for CCTV! ⚖️
⚖️ Паралігал забув close paralegal file — missed refund. Урок: paperwork last! ⚖️
⚖️ Перемогли в SCC trial — licence saved, money recovered. Урок: fight to the end! ⚖️
`);

const TG_LTB_LEGACY_SERVICE_STORIES = parseTelegramStoryList(`
⚖️ Подали T6 без підстав — відмова. Урок: потрібні докази hardship! ⚖️
`);

const TG_LTB_SERVICE_STORIES = parseTelegramStoryList(`
⚖️ Не подав L1 після N4 — tenant залишився. Урок: 5 днів максимум! ⚖️
⚖️ Паралігал забув serve N4 properly — L1 dismissed. Урок: personal service or email! ⚖️
⚖️ Не з’явився на LTB hearing — eviction order issued. Урок: завжди приходь! ⚖️
⚖️ Забули attach lease copy — weak evidence. Урок: повний пакет документів! ⚖️
⚖️ Перемогли в L1 — full eviction + arrears. Урок: правильний N4 wins! ⚖️
⚖️ Неправильно розрахували rent arrears — partial order. Урок: include NSF fees! ⚖️
⚖️ Паралігал не request costs — втратили $500+. Урок: завжди проси representation fee! ⚖️
⚖️ Не подали T6 за repairs — tenant lost money. Урок: фото + work orders! ⚖️
⚖️ Victory: L2 eviction granted за illegal act. Урок: police report helps! ⚖️
⚖️ Забули про 1-year limitation — application late. Урок: RTA s.29(1)! ⚖️
⚖️ Паралігал пропустив serve Notice of Hearing — case delayed. Урок: check LTB portal! ⚖️
⚖️ Не принесли bank statements — no proof of payment. Урок: transaction history! ⚖️
⚖️ Перемогли в T2 — harassment proven. Урок: emails + texts win! ⚖️
⚖️ Неправильний N5 notice — 7 days instead of 20. Урок: check termination form! ⚖️
⚖️ Паралігал забув file evidence bundle — judge ignored. Урок: labeled PDF! ⚖️
⚖️ Victory: rent abatement 3 months — maintenance breach. Урок: T6 magic! ⚖️
⚖️ Не request mediation — missed settlement. Урок: free mediation works! ⚖️
⚖️ Client не приніс photos of damage — no award. Урок: before/after shots! ⚖️
⚖️ Паралігал виграв L9 — illegal lockout reversed. Урок: tenant rights strong! ⚖️
⚖️ Забули про s.78 ex parte — full hearing forced. Урок: use ex parte wisely! ⚖️
⚖️ Неправильно вказали unit address — application error. Урок: exact match! ⚖️
⚖️ Перемогли — eviction order + $2k arrears. Урок: strong cross-examination! ⚖️
⚖️ Паралігал пропустив 10-day response to L1 — default. Урок: calendar reminder! ⚖️
⚖️ Не подали T1 за illegal rent increase — lost $$. Урок: N1/N2 rules! ⚖️
⚖️ Victory: application dismissed — improper service. Урок: technical win! ⚖️
⚖️ Забули request adjournment — forced unprepared. Урок: motion 5 days before! ⚖️
⚖️ Паралігал не підготував witness — hearsay weak. Урок: subpoena + affidavit! ⚖️
⚖️ Перемогли в T3 — superintendent harassment. Урок: recordings save! ⚖️
⚖️ Не перевірили corporate landlord — wrong party. Урок: business search! ⚖️
⚖️ Паралігал забув post-hearing costs submission — zero. Урок: submit before judge leaves! ⚖️
⚖️ Victory: full rent repayment + interest. Урок: RTA s.136! ⚖️
⚖️ Неправильний N4 amount — tenant won defence. Урок: exact arrears! ⚖️
⚖️ Не з’явився на review hearing — order confirmed. Урок: 30 днів на review! ⚖️
⚖️ Паралігал пропустив serve L1 package — dismissed. Урок: serve everyone! ⚖️
⚖️ Перемогли завдяки video evidence — breach proven. Урок: CCTV from building! ⚖️
⚖️ Забули про above-guideline rent increase rules — denied. Урок: Form N2! ⚖️
⚖️ Паралігал виграв T5 — bad faith eviction. Урок: compensation $! ⚖️
⚖️ Не request writ of possession — sheriff delay. Урок: enforce fast! ⚖️
⚖️ Victory: tenant stayed + rent abatement. Урок: good tenant defence! ⚖️
⚖️ Неправильно оформили Affidavit of Service — invalid. Урок: Form L1/L2 only! ⚖️
⚖️ Паралігал забув update LTB portal — missed notices. Урок: check daily! ⚖️
⚖️ Перемогли в L3 — substantial interference. Урок: neighbour complaints! ⚖️
⚖️ Не принесли lease amendment — old terms. Урок: latest agreement! ⚖️
⚖️ Паралігал negotiated settlement — full arrears paid. Урок: mediated deal! ⚖️
⚖️ Забули request storage of belongings — tenant loss. Урок: s.41 rights! ⚖️
⚖️ Victory: application withdrawn after strong defence. Урок: pressure works! ⚖️
⚖️ Не перевірили tenant SIN — hard to collect. Урок: know your tenant! ⚖️
⚖️ Паралігал пропустив disclosure deadline — weak case. Урок: file evidence early! ⚖️
⚖️ Перемогли — no eviction, payment plan. Урок: reasonable arrears! ⚖️
⚖️ Неправильний court location for enforcement — delay. Урок: sheriff jurisdiction! ⚖️
⚖️ Забули про RTA s.82 — no termination without order. Урок: self-help illegal! ⚖️
⚖️ Паралігал виграв на technicality — defective notice. Урок: N-forms matter! ⚖️
⚖️ Victory: $5k compensation for illegal entry. Урок: s.26 breach! ⚖️
⚖️ Не подали T7 за maintenance — tenant suffered. Урок: urgent repairs! ⚖️
⚖️ Паралігал забув bring exhibits — judge confused. Урок: numbered binders! ⚖️
⚖️ Перемогли в L4 — persistent late payment. Урок: payment history! ⚖️
⚖️ Неправильно розрахували HST on arrears — error. Урок: tax correctly! ⚖️
⚖️ Victory: eviction order with 10 days to vacate. Урок: fast enforcement! ⚖️
⚖️ Не request written reasons — hard to review. Урок: ask every time! ⚖️
⚖️ Паралігал пропустив 30-day review period — lost. Урок: strict deadline! ⚖️
⚖️ Перемогли завдяки expert inspector report. Урок: professional evidence! ⚖️
⚖️ Забули serve Notice of Termination copy — invalid. Урок: attach to L1! ⚖️
⚖️ Паралігал виграв T4 — tenant rights violation. Урок: privacy breach! ⚖️
⚖️ Не перевірили building insurance — no coverage. Урок: landlord proof! ⚖️
⚖️ Victory: full dismissal + costs awarded. Урок: strong motion! ⚖️
⚖️ Неправильний party name — amendment needed. Урок: exact spelling! ⚖️
⚖️ Паралігал забув file amended application — old facts. Урок: update fast! ⚖️
⚖️ Перемогли — rent reduced below guideline. Урок: T1 win! ⚖️
⚖️ Не request order for instalments — lump sum only. Урок: flexible payment! ⚖️
⚖️ Victory: sheriff enforcement same day. Урок: writ of possession! ⚖️
⚖️ Забули про above-guideline capital repairs — denied. Урок: N3 rules! ⚖️
⚖️ Паралігал пропустив serve counter-application — missed. Урок: file T-response! ⚖️
⚖️ Перемогли в hearing — no rent increase. Урок: invalid N1! ⚖️
⚖️ Не принесли utility bills — no proof of extra costs. Урок: hydro + water! ⚖️
⚖️ Паралігал виграв на cross-examination — landlord contradicted. Урок: good questions! ⚖️
⚖️ Victory: tenant compensated for heat loss. Урок: s.20 breach! ⚖️
⚖️ Неправильно вказали filing fee — application rejected. Урок: exact amount! ⚖️
⚖️ Забули request electronic hearing — in-person delay. Урок: Zoom preferred! ⚖️
⚖️ Паралігал забув close file — missed refund. Урок: final paperwork! ⚖️
⚖️ Перемогли — eviction avoided, full payment. Урок: last-minute deal! ⚖️
⚖️ Не перевірили landlord licence — illegal unit. Урок: municipal rules! ⚖️
⚖️ Victory: L8 dismissed — no substantial interference. Урок: weak evidence! ⚖️
⚖️ Паралігал пропустив update client — missed instructions. Урок: communicate! ⚖️
⚖️ Перемогли завдяки neighbour witnesses. Урок: affidavits work! ⚖️
⚖️ Забули про RTA s.49 — personal use eviction rules. Урок: bad faith risk! ⚖️
⚖️ Паралігал виграв settlement before hearing. Урок: early resolution! ⚖️
⚖️ Victory: full arrears + legal costs. Урок: never settle cheap! ⚖️
⚖️ Не подали T6 urgent — repairs delayed. Урок: emergency motion! ⚖️
⚖️ Неправильний service on tenant — case struck. Урок: mail + email proof! ⚖️
⚖️ Паралігал забув request video from landlord — missed. Урок: ask for CCTV! ⚖️
⚖️ Перемогли в review — original order overturned. Урок: new evidence! ⚖️
⚖️ Забули attach bank confirmation — no payment proof. Урок: screenshots! ⚖️
⚖️ Victory: tenant rights upheld, no eviction. Урок: procedural error! ⚖️
⚖️ Паралігал виграв L6 — unauthorized occupant. Урок: sublet rules! ⚖️
⚖️ Не request costs against bad faith landlord — missed. Урок: ask every time! ⚖️
⚖️ Перемогли — compensation $10k за illegal eviction. Урок: s.57! ⚖️
⚖️ Паралігал пропустив LTB e-filing deadline — late fee. Урок: portal 24/7! ⚖️
⚖️ Victory: order for immediate repair. Урок: T6 fast track! ⚖️
⚖️ Забули перевірити tenant history — repeat offender. Урок: LTB search! ⚖️
⚖️ Паралігал забув bring lease — credibility lost. Урок: original docs! ⚖️
⚖️ Перемогли в full hearing — landlord paid costs. Урок: fight to the end! ⚖️
⚖️ Не подали final Costs Outline — zero awarded. Урок: submit on time! ⚖️
⚖️ Паралігал виграв через incomplete landlord evidence — dismissed. Урок: rules matter! ⚖️
⚖️ Victory: paralegal client recovered everything + interest. Урок: good prep wins LTB! ⚖️
`);

const TG_OTHER_RANDOM_QUOTES = parseTelegramStoryList(`
⚖️ Не перевірив conflict of interest — клієнт пішов. Урок: завжди роби повну перевірку! ⚖️
⚖️ Паралігал забув retainer agreement — zero payment. Урок: контракт спочатку! ⚖️
⚖️ Перемогли в settlement — клієнт зекономив $10k. Урок: negotiation = сила! ⚖️
⚖️ Не підтвердив повноваження — суд відмовив. Урок: Form 4.1 обов’язково! ⚖️
⚖️ Victory: full costs awarded. Урок: проси завжди representation fee! ⚖️
⚖️ Забули про confidentiality breach — втратили клієнта. Урок: protect info 24/7! ⚖️
⚖️ Паралігал виграв на cross-examination — judge impressed. Урок: preparation wins! ⚖️
⚖️ Не подали evidence bundle вчасно — weak case. Урок: deadlines sacred! ⚖️
⚖️ Перемогли завдяки strong client communication. Урок: updates = trust! ⚖️
⚖️ Неправильно розрахували filing fee — application rejected. Урок: double-check everything! ⚖️
⚖️ Паралігал negotiated win-win — both sides happy. Урок: creative solutions work! ⚖️
⚖️ Забули request adjournment — unprepared trial. Урок: plan ahead! ⚖️
⚖️ Victory: motion granted instantly. Урок: solid legal research pays off! ⚖️
⚖️ Не перевірив client capacity — ethical issue. Урок: know your client! ⚖️
⚖️ Паралігал забув update portal — missed notices. Урок: tech tools save time! ⚖️
⚖️ Перемогли в full hearing — client thrilled. Урок: evidence + strategy = success! ⚖️
⚖️ Неправильний service — case delayed. Урок: perfect service = half win! ⚖️
⚖️ Victory: claim dismissed on technicality. Урок: rules are your friends! ⚖️
⚖️ Не request costs outline — zero recovery. Урок: ask every single time! ⚖️
⚖️ Паралігал виграв через calm professionalism. Урок: stay cool under pressure! ⚖️
⚖️ Забули про limitation period — lost forever. Урок: calendar is your best friend! ⚖️
⚖️ Перемогли — full compensation + interest. Урок: never give up early! ⚖️
⚖️ Неправильно оформили affidavit — invalid. Урок: perfect documents matter! ⚖️
⚖️ Паралігал negotiated reduced settlement — client saved. Урок: talk to the other side! ⚖️
⚖️ Victory: appeal overturned previous loss. Урок: second chance exists! ⚖️
⚖️ Не підготував witness statements — hearsay weak. Урок: affidavits save cases! ⚖️
⚖️ Перемогли завдяки video evidence. Урок: record smartly! ⚖️
⚖️ Забули request written reasons — hard to appeal. Урок: ask judge always! ⚖️
⚖️ Паралігал виграв на ethics defence. Урок: know the rules inside out! ⚖️
⚖️ Victory: client recovered 100% + costs. Урок: preparation beats talent! ⚖️
⚖️ Не перевірив corporate status — wrong party. Урок: search before filing! ⚖️
⚖️ Перемогли в mediation — fast resolution. Урок: talk first, fight later! ⚖️
⚖️ Паралігал забув bring exhibits — judge confused. Урок: labeled binders win! ⚖️
⚖️ Victory: order for immediate payment. Урок: enforcement is part of the job! ⚖️
⚖️ Неправильний jurisdiction — case transferred. Урок: file in the right court! ⚖️
⚖️ Паралігал виграв через strong closing argument. Урок: end strong! ⚖️
⚖️ Забули про post-judgment interest — менше грошей. Урок: 5% + court rate! ⚖️
⚖️ Перемогли — no conviction, clean record. Урок: fight every detail! ⚖️
⚖️ Не request expert report — technical loss. Урок: professionals help! ⚖️
⚖️ Victory: settlement before trial. Урок: early wins are best wins! ⚖️
⚖️ Паралігал забув update client — missed instructions. Урок: communicate daily! ⚖️
⚖️ Перемогли завдяки character references. Урок: good reputation matters! ⚖️
⚖️ Неправильно вказали parties — amendment needed. Урок: exact names! ⚖️
⚖️ Паралігал виграв на procedural error. Урок: rules protect you! ⚖️
⚖️ Victory: full dismissal + costs. Урок: technical wins count! ⚖️
⚖️ Забули request disclosure — surprise evidence. Урок: demand everything! ⚖️
⚖️ Перемогли в urgent motion. Урок: speed + accuracy = power! ⚖️
⚖️ Не подали Costs Outline — zero awarded. Урок: submit before judge leaves! ⚖️
⚖️ Паралігал negotiated zero penalties. Урок: smart deals exist! ⚖️
⚖️ Victory: client licence saved. Урок: fight for your client! ⚖️
⚖️ Забули про conflict waiver — ethical complaint. Урок: document everything! ⚖️
⚖️ Перемогли завдяки neighbour witnesses. Урок: community proof works! ⚖️
⚖️ Паралігал виграв на cross — contradictions everywhere. Урок: sharp questions! ⚖️
⚖️ Victory: rent reduced + compensation. Урок: tenant rights strong! ⚖️
⚖️ Не перевірив insurance — no payout. Урок: know the coverage! ⚖️
⚖️ Перемогли в full trial — judge agreed. Урок: belief + prep = victory! ⚖️
⚖️ Забули request video footage — missed proof. Урок: ask for everything! ⚖️
⚖️ Паралігал забув close file — missed refund. Урок: paperwork last step! ⚖️
⚖️ Victory: enforcement same week. Урок: follow through! ⚖️
⚖️ Неправильний address — missed service. Урок: current info only! ⚖️
⚖️ Перемогли — clean settlement agreement. Урок: write it down! ⚖️
⚖️ Паралігал виграв через due diligence. Урок: reasonable steps win! ⚖️
⚖️ Victory: appeal success after loss. Урок: never too late to fight! ⚖️
⚖️ Не request pre-trial conference — missed chance. Урок: use every tool! ⚖️
⚖️ Перемогли завдяки photos + timestamps. Урок: visuals speak louder! ⚖️
⚖️ Забули про ethical obligations — complaint. Урок: integrity first! ⚖️
⚖️ Паралігал negotiated full recovery. Урок: persistence pays! ⚖️
⚖️ Victory: case stayed due to delay. Урок: time is on your side! ⚖️
⚖️ Не підготував trial plan — judge unhappy. Урок: structure wins! ⚖️
⚖️ Перемогли в review hearing. Урок: new evidence = new chance! ⚖️
⚖️ Паралігал забув bring originals — credibility lost. Урок: certified copies! ⚖️
⚖️ Victory: client happy + referral. Урок: results bring more work! ⚖️
⚖️ Неправильно розрахували HST — error. Урок: numbers never lie! ⚖️
⚖️ Перемогли завдяки calm client prep. Урок: prepare your client! ⚖️
⚖️ Забули request order for instalments — lump sum. Урок: ask for flexibility! ⚖️
⚖️ Паралігал виграв на technical defence. Урок: details matter! ⚖️
⚖️ Victory: full acquittal. Урок: reasonable doubt is powerful! ⚖️
⚖️ Не перевірив limitation on counterclaim. Урок: same rules apply! ⚖️
⚖️ Перемогли — compensation + interest. Урок: fight for every dollar! ⚖️
⚖️ Паралігал negotiated reduced amount. Урок: good deals save time! ⚖️
⚖️ Victory: writ of enforcement issued. Урок: collect what you win! ⚖️
⚖️ Забули про Charter rights — missed defence. Урок: know the Constitution! ⚖️
⚖️ Перемогли в urgent repair order. Урок: fast action wins! ⚖️
⚖️ Не request written endorsement — hard to enforce. Урок: get it in writing! ⚖️
⚖️ Паралігал виграв через strong mitigation. Урок: show the human side! ⚖️
⚖️ Victory: no suspension, points erased. Урок: strategy over luck! ⚖️
⚖️ Забули serve everyone — struck out. Урок: serve correctly! ⚖️
⚖️ Перемогли завдяки expert testimony. Урок: professionals elevate! ⚖️
⚖️ Паралігал забув update address — missed order. Урок: current data! ⚖️
⚖️ Victory: settlement + full costs. Урок: never settle for less! ⚖️
⚖️ Неправильно вказали amount — over limit. Урок: stay within rules! ⚖️
⚖️ Перемогли в full hearing — client free. Урок: preparation is everything! ⚖️
⚖️ Паралігал виграв на ethics motion. Урок: protect the profession! ⚖️
⚖️ Victory: paralegal client recovered all + more. Урок: good prep always wins! ⚖️
⚖️ Забули request costs against bad faith — missed. Урок: ask every time! ⚖️
⚖️ Перемогли — clean record restored. Урок: fight to the end! ⚖️
⚖️ Паралігал забув close paralegal file properly. Урок: final step matters! ⚖️
⚖️ Victory: order enforced immediately. Урок: follow-through = success! ⚖️
⚖️ Не перевірив all documents — surprise at hearing. Урок: triple-check! ⚖️
⚖️ Перемогли завдяки team work з client. Урок: client is your partner! ⚖️
⚖️ Паралігал виграв на last-minute evidence. Урок: never too late! ⚖️
⚖️ Victory: full paralegal fee recovered. Урок: value your work! ⚖️
⚖️ Забули про motivational client call — lost momentum. Урок: inspire your client! ⚖️
⚖️ Перемогли — justice served. Урок: paralegals make the difference! ⚖️
`);

const TG_SERVICE_LESSON_SOURCE_STORIES = {
  'Traffic Ticket Defense': TG_TRAFFIC_TICKET_SERVICE_STORIES,
  'Civil matter': TG_SCC_SERVICE_STORIES,
  'LTB related issue': TG_LTB_LEGACY_SERVICE_STORIES.concat(TG_LTB_SERVICE_STORIES)
};

const TG_SERVICE_LESSON_CATEGORY_RULES = {
  'Traffic Ticket Defense': [
    { name: 'Deadlines and attendance', pattern: /(15 днів|15 days|court date|show up|default|adjournment|appeal|review|on time|warrant|pre-trial|forced to trial|30-day|30 days|15 days to file)/i },
    { name: 'Disclosure and evidence', pattern: /(disclosure|photo evidence|video evidence|witness|witness statements|google maps|maintenance records|officer notes|cruiser|documents|photos|record everything|bring documents|full notes|visual aids|backup|proof provided|dashcam|medical proof)/i },
    { name: 'Technical and equipment issues', pattern: /(radar|laser|calibration|camera|faulty|speed survey|pacing|measurement|certification|training record|timing|plate mismatch|equipment|math errors|maintenance logs|certificates|qualifications|device error)/i },
    { name: 'Hearings and testimony', pattern: /(officer|testimony|cross-examination|reasonable doubt|memory fades|listen carefully|compare documents|officer confused|single witness|who held it|phone not in hand|necessity defence|mistake of fact|due diligence|charter|duress)/i },
    { name: 'Negotiation and outcomes', pattern: /(negotiated|reduced|warning|plea|halved|bargain|withdrawn|charges dropped|absolute discharge|lesser offence|downgrade|fine reduced|withdrawn by prosecutor|prosecutor talks|negotiation|no conviction|full acquittal)/i },
    { name: 'Points and licence impact', pattern: /(demerit|points|licence|license|suspension|young driver|g1\/g2|licence saved|no suspension|driving record)/i }
  ],
  'Civil matter': [
    { name: 'Deadlines and procedure', pattern: /(20 днів|2 роки|30-day appeal|30 days|30 днів|deadline|limitation|limitations act|jordan|pre-trial conference|assessment hearing|trial scheduling|review|conference|delay|want of prosecution|motion in time|appeal)/i },
    { name: 'Service and filing', pattern: /(serve|service|affidavit of service|substituted service|wrong address for service|registered office|form 8a|rule 7\\.01|wrong party|correct names|court location|venue|clerk form|amended claim|pleadings|defendant name|corporation|corporate search)/i },
    { name: 'Evidence and witnesses', pattern: /(evidence bundle|contracts|photos|video evidence|bank statements|expert report|expert invoice|financial records|witness|subpoena|affidavits|cctv|character references|visual proof|original docs|written proof|google maps|certified copies|proof of loss)/i },
    { name: 'Motions and trial strategy', pattern: /(motion|rule 12\\.02|summary judgment|cross-examination|trial plan|technicality|defective pleading|hearsay|good questions|structure your case|no triable issue|reasonable cause|strike|rule 13|rule 14|rule 9\\.03|rule 10)/i },
    { name: 'Settlement and costs', pattern: /(settlement|negotiated|costs|tariff|representation fee|disbursements|release|leniency|saved time|full release|no interest|never settle cheap|mediation)/i },
    { name: 'Enforcement and collection', pattern: /(garnishment|wage garnishment|writ of seizure|sheriff|payment terms|instalments|collect|post-judgment|interest|judgment enforced|assets|debtor|paid immediately|enforcement tools|order for costs)/i }
  ],
  'LTB related issue': [
    { name: 'Notices and filing', pattern: /(n4|n5|n1|n2|n3|l1|l2|l3|l4|l6|l8|l9|t1|t2|t3|t4|t5|t6|t7|application|file|attach lease|rent increase|notice|termination|arrears|bad faith eviction|personal use eviction|unauthorized occupant|illegal rent increase)/i },
    { name: 'Service and portal', pattern: /(serve|service|affidavit of service|portal|e-filing|notice of hearing|mail \+ email proof|exact match|update ltb portal|serve everyone|attach to l1|electronic hearing|zoom preferred|form l1\/l2 only)/i },
    { name: 'Evidence and hearing prep', pattern: /(evidence bundle|photos|video evidence|bank statements|witness|subpoena|affidavit|recordings|expert inspector report|lease amendment|utility bills|cctv|neighbour witnesses|lease|exhibits|binders|proof of payment|screenshots|original docs|transaction history)/i },
    { name: 'Tenant remedies and landlord duties', pattern: /(repairs|maintenance|harassment|illegal entry|heat loss|illegal lockout|tenant rights|rent abatement|compensation|privacy breach|urgent repairs|above-guideline|s\\.20|s\\.26|s\\.57|s\\.136|s\\.82|s\\.49|storage of belongings|personal use eviction)/i },
    { name: 'Orders, enforcement, and review', pattern: /(eviction order|writ of possession|sheriff|review hearing|30 днів на review|30-day review|order confirmed|order overturned|enforce|costs awarded|payment plan|10 days to vacate|full arrears|legal costs|review period)/i },
    { name: 'Settlement and technical wins', pattern: /(mediat|settlement|technical|defective notice|pressure works|strong defence|cross-examination|technicality|procedural error|rules matter|bad faith|technical win|last-minute deal|good tenant defence)/i }
  ]
};

