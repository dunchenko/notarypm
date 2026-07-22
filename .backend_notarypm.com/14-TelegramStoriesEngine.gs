/*
  Telegram lesson-story building, categorization, and selection logic.
  Uses lazy caches so the split remains robust when deployed as multiple GAS files.
*/

function buildTelegramLessonStories() {
  const stories = [];
  const seen = {};

  interleaveTelegramStoryPools(stories, seen, [
    TG_LEGACY_LESSON_STORIES,
    TG_NOTARY_TORONTO_STORIES,
    TG_TAX_STORIES,
    TG_REAL_CASE_STORIES
  ]);

  for (let roleIndex = 0; roleIndex < TG_STORY_ROLES.length && stories.length < TG_STORY_TARGET_COUNT; roleIndex += 1) {
    for (let cityIndex = 0; cityIndex < TG_STORY_CITIES.length && stories.length < TG_STORY_TARGET_COUNT; cityIndex += 1) {
      for (let scenarioIndex = 0; scenarioIndex < TG_STORY_SCENARIOS.length && stories.length < TG_STORY_TARGET_COUNT; scenarioIndex += 1) {
        const story = formatTelegramLessonStory(
          TG_STORY_ROLES[roleIndex],
          TG_STORY_CITIES[cityIndex],
          TG_STORY_SCENARIOS[scenarioIndex]
        );
        pushUniqueTelegramStory(stories, seen, story);
      }
    }
  }

  return stories;
}

function interleaveTelegramStoryPools(stories, seen, pools) {
  if (!Array.isArray(pools) || !pools.length) return;

  let offset = 0;
  let added = true;

  while (added) {
    added = false;

    for (let poolIndex = 0; poolIndex < pools.length; poolIndex += 1) {
      const pool = pools[poolIndex];
      if (!Array.isArray(pool) || offset >= pool.length) continue;

      pushUniqueTelegramStory(stories, seen, pool[offset]);
      added = true;
    }

    offset += 1;
  }
}

function formatTelegramLessonStory(role, city, scenario) {
  return normalizeSingleLine(
    `⚖️ ${role} ${city} ${scenario.mistake} — ${scenario.consequence}. Урок: ${scenario.lesson}! ⚖️`
  );
}

function pushUniqueTelegramStory(stories, seen, story) {
  const clean = normalizeSingleLine(story || '');
  if (!clean || seen[clean]) return;
  seen[clean] = true;
  stories.push(clean);
}


function buildCategorizedTelegramServiceStories() {
  const categorized = {};
  Object.keys(TG_SERVICE_LESSON_SOURCE_STORIES).forEach((service) => {
    const rules = Array.isArray(TG_SERVICE_LESSON_CATEGORY_RULES[service])
      ? TG_SERVICE_LESSON_CATEGORY_RULES[service]
      : [];
    const categories = {};
    const seen = {};

    rules.forEach((rule) => {
      if (rule && rule.name) categories[rule.name] = [];
    });
    categories.General = [];

    const sourceStories = Array.isArray(TG_SERVICE_LESSON_SOURCE_STORIES[service])
      ? TG_SERVICE_LESSON_SOURCE_STORIES[service]
      : [];

    sourceStories.forEach((story) => {
      const clean = normalizeSingleLine(story || '');
      if (!clean || seen[clean]) return;
      seen[clean] = true;

      const lower = clean.toLowerCase();
      let bucketName = 'General';
      for (let i = 0; i < rules.length; i += 1) {
        const rule = rules[i];
        if (rule && rule.pattern instanceof RegExp && rule.pattern.test(lower)) {
          bucketName = rule.name;
          break;
        }
      }
      categories[bucketName].push(clean);
    });

    if (!categories.General.length) delete categories.General;
    categorized[service] = categories;
  });
  return categorized;
}


function buildTelegramServiceLessonStoryPools() {
  const poolsByService = {};
  Object.keys(getTelegramServiceLessonCategories()).forEach((service) => {
    const categories = getTelegramServiceLessonCategories()[service] || {};
    const pool = [];
    const seen = {};
    const categoryNames = Object.keys(categories);
    interleaveTelegramStoryPools(
      pool,
      seen,
      categoryNames.map(name => categories[name])
    );
    poolsByService[service] = pool;
  });
  return poolsByService;
}



function getTelegramLessonStoryIndexPropKey(serviceCanonical) {
  const normalizedService = normalizeBookingServiceAlias(serviceCanonical || '');
  if (!normalizedService) return TG_LESSON_STORY_INDEX_PROP;
  return `${TG_LESSON_STORY_INDEX_PROP}:${normalizedService.replace(/\s+/g, '_')}`;
}


var __tgLessonStoriesCache = null;
var __tgServiceLessonCategoriesCache = null;
var __tgServiceLessonStoriesByServiceCache = null;

function getTelegramLessonStories() {
  if (!Array.isArray(__tgLessonStoriesCache) || !__tgLessonStoriesCache.length) {
    __tgLessonStoriesCache = buildTelegramLessonStories();
  }
  return __tgLessonStoriesCache;
}

function getTelegramServiceLessonCategories() {
  if (!__tgServiceLessonCategoriesCache || typeof __tgServiceLessonCategoriesCache !== 'object') {
    __tgServiceLessonCategoriesCache = buildCategorizedTelegramServiceStories();
  }
  return __tgServiceLessonCategoriesCache;
}

function getTelegramServiceLessonStoriesByService() {
  if (!__tgServiceLessonStoriesByServiceCache || typeof __tgServiceLessonStoriesByServiceCache !== 'object') {
    __tgServiceLessonStoriesByServiceCache = buildTelegramServiceLessonStoryPools();
  }
  return __tgServiceLessonStoriesByServiceCache;
}

function getNextTelegramLessonStory(serviceLike) {
  const serviceCanonical = serviceLike ? getBookingServiceCanonicalName(serviceLike) : '';
  if (serviceCanonical === 'Other' && Array.isArray(TG_OTHER_RANDOM_QUOTES) && TG_OTHER_RANDOM_QUOTES.length) {
    const randomIndex = Math.floor(Math.random() * TG_OTHER_RANDOM_QUOTES.length);
    return TG_OTHER_RANDOM_QUOTES[randomIndex] || '';
  }
  const serviceStories = serviceCanonical
    ? getTelegramServiceLessonStoriesByService()[serviceCanonical]
    : null;
  const pool = Array.isArray(serviceStories) && serviceStories.length
    ? serviceStories
    : getTelegramLessonStories();
  if (!Array.isArray(pool) || !pool.length) return '';
  const propKey = Array.isArray(serviceStories) && serviceStories.length
    ? getTelegramLessonStoryIndexPropKey(serviceCanonical)
    : TG_LESSON_STORY_INDEX_PROP;
  let index = 0;
  try {
    const props = PropertiesService.getScriptProperties();
    const raw = parseInt(props.getProperty(propKey) || '0', 10);
    index = Number.isInteger(raw) ? raw : 0;
    const safeIndex = ((index % pool.length) + pool.length) % pool.length;
    const story = pool[safeIndex] || '';
    props.setProperty(propKey, String((safeIndex + 1) % pool.length));
    return story;
  } catch (e) {
    const safeIndex = ((index % pool.length) + pool.length) % pool.length;
    return pool[safeIndex] || '';
  }
}

