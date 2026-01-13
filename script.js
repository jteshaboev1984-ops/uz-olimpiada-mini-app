const APP_VERSION = '1.0';
// TEMP: режим теста (показывать все направления)
const DEV_UNLOCK_ALL_DIRECTIONS = true;

document.addEventListener('DOMContentLoaded', function () {

  // ✅ ВАЖНО: объявляем ДО использования
  let telegramUserId = null;
  let telegramData = { firstName: null, lastName: null, photoUrl: null, languageCode: null };
  let tgInitData = "";
  let internalDbId = null;
  let currentTourId = null;
  let currentTourTitle = "";
  let currentTourEndDate = null;
  let currentUserData = null;
  let tourQuestionsAllCache = [];     // ВСЕ вопросы тура (для статистики/ошибок)
  let tourQuestionsSelected = [];     // 15 выбранных на тест (для прохождения)
  let tourQuestionsCache = [];   // кэш вопросов тура
  let userAnswersCache = [];          // ответы ТОЛЬКО текущего тура + текущего языка
  let currentLbFilter = 'republic';
  let currentLang = 'uz';
  let tourCompleted = false;
  let isLangLocked = false;
  let isProfileLocked = false;
  let isInitialized = false;
  let tourEnded = false;
  let tourTaken = false;
  let activeSubject = null;
  let directionsMeta = [];
  let directionSubjectsMap = {};
  let unlockedDirectionKeys = [];
  let selectedDirectionKey = null;
  let pendingDirectionModal = false;
  let reviewState = {
    tours: [],
    progressByTourId: {},
    selectedTourId: null,
    selectedTourTitle: '',
    answers: [],
    subjectStats: [],
    errorsBySubject: {},
    currentSubjectKey: '',
    currentErrorIndex: 0,
    totalQuestions: 0,
    correctQuestions: 0
  };

  function initTelegram() {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      console.error("Telegram.WebApp not found");
      tgInitData = "";
      return;
    }

    tg.ready();
    tg.expand?.();
    tgInitData = tg.initData || "";

    const user = tg.initDataUnsafe?.user;
    if (user) {
      telegramUserId = String(user.id);
      telegramData.firstName = user.first_name || null;
      telegramData.lastName = user.last_name || null;
      telegramData.photoUrl = user.photo_url || null;
      telegramData.languageCode = user.language_code || null;
    }
    
  }
  
// === НАСТРОЙКИ SUPABASE (для браузера) ===
const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

// Важно: используем window.supabase из CDN
if (!window.supabase) {
  throw new Error('Supabase CDN not loaded: window.supabase is undefined');
}
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
const supabaseClient = supabase;
  
  // Безопасный запуск приложения
async function startApp() {
    try {
        initTelegram();
        await checkProfileAndTour();
    } catch (err) {
        console.error("Критическая ошибка при запуске:", err);
        const loader = document.getElementById('app-loader');
        if (loader) loader.style.display = 'none';
        alert("Произошла ошибка запуска приложения. Попробуйте позже.");
    }
}
      
   // === ПЕРЕМЕННЫЕ ТЕСТА И АНТИ-ЧИТА ===
    let questions = [];
    let currentQuestionIndex = 0;
    let correctCount = 0;
    let timerInterval = null;
    let selectedAnswer = null;
  
    // =====================
// PRACTICE MODE STATE
// =====================
let practiceMode = false;
let practiceAnswers = {}; // { [questionId]: { answer: string, isCorrect: boolean } }
let practiceFilters = normalizePracticeFilters({ subjects: [], difficulty: 'all', count: 20, practiceTourId: null });
let practiceElapsedSec = 0;
let practiceStopwatchInterval = null;
let practiceReturnScreen = 'cabinet-screen';
let reviewReturnScreen = 'cabinet-screen';
let practiceTourQuestionsCache = new Map();
let practiceCompletedToursCache = { userId: null, list: [] };
  // === TIMERS & BEHAVIOR METRICS ===

// total test timer
let totalTimerInterval = null;
let totalTimeSec = 0;

// per-question timer
let questionTimerInterval = null;
let questionTimeSec = 0;
let perQuestionTimes = []; // seconds per question

// behavior tracking
let tabSwitchCountTotal = 0;
let tabSwitchCountPerQuestion = [];
let visibilityLog = []; // { type: 'hidden'|'visible', t: timestamp, q: index }
let tabSwitchThisQuestion = 0;
// ВАЖНО: объявить ДО первого возможного вызова handleVisibilityChange
let cheatWarningCount = 0;
let isTestActive = false;
function isReviewScreenActive() {
  const reviewScreen = document.getElementById('review-screen');
  return !!(reviewScreen && !reviewScreen.classList.contains('hidden'));
}

function handleVisibilityChange() {
  if (!isTestActive || practiceMode || isReviewScreenActive()) return;

  const type = document.visibilityState === 'hidden' ? 'hidden' : 'visible';

  visibilityLog.push({
    type,
    t: Date.now(),
    q: currentQuestionIndex
  });

  if (type === 'hidden') {
    tabSwitchCountTotal++;
    tabSwitchThisQuestion++;
    tabSwitchCountPerQuestion[currentQuestionIndex] =
      (tabSwitchCountPerQuestion[currentQuestionIndex] || 0) + 1;
    cheatWarningCount++;
    if (cheatWarningCount >= 2) finishTour();
    else document.getElementById('cheat-warning-modal')?.classList.remove('hidden');
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

function getPracticeTourIdValue(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str || str === 'all') return null;
  return str;
}

function practiceStorageKey(practiceTourId) {
  const tourKey = getPracticeTourIdValue(practiceTourId) || String(currentTourId || '');
  return `practice_v1:${internalDbId}:${tourKey}:${currentLang}`;
}
function formatMMSS(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function normalizePracticeFilters(raw) {
  const f = raw || {};
  let subjects = [];
  if (Array.isArray(f.subjects)) {
    subjects = f.subjects;
  } else if (Array.isArray(f.subject)) {
    subjects = f.subject;
  } else if (typeof f.subject === 'string') {
    subjects = f.subject === 'all' ? [] : [f.subject];
  } else if (typeof f.subjects === 'string') {
    subjects = f.subjects === 'all' ? [] : [f.subjects];
  }
  subjects = subjects
    .map(s => normalizeSubjectKey(s))
    .filter(Boolean);
  const unique = Array.from(new Set(subjects));
  subjects = unique.includes('all') ? [] : unique;

  const difficulty = typeof f.difficulty === 'string' ? f.difficulty : 'all';
  let count = Number(f.count);
  if (!Number.isFinite(count) || count <= 0) count = 20;
  // разрешаем маленькие сессии (1–200)
  count = Math.max(1, Math.min(200, Math.floor(count)));
  const practiceTourId = getPracticeTourIdValue(f.practiceTourId);
  return { subjects, difficulty, count, practiceTourId };
}

async function fetchDirectionsMetaAndSubjects() {
  const { data: directionsData, error: directionsError } = await supabaseClient
    .from('directions')
    .select('id, key, title_ru, title_uz, title_en, sort, is_active')
    .eq('is_active', true)
    .order('sort', { ascending: true });

  if (directionsError) {
    console.error('[directions] meta fetch error:', directionsError);
    directionsMeta = [];
  } else {
    directionsMeta = directionsData || [];
  }

  const { data: subjectsData, error: subjectsError } = await supabaseClient
    .from('direction_subjects')
    .select('direction_id, subject_key, sort, is_active')
    .eq('is_active', true)
    .order('direction_id', { ascending: true })
    .order('sort', { ascending: true });

  if (subjectsError) {
    console.error('[directions] subjects fetch error:', subjectsError);
    directionSubjectsMap = {};
    return { directionsMeta, directionSubjectsMap };
  }

  const idToKey = new Map((directionsMeta || []).map(item => [String(item.id), String(item.key)]));
  const map = {};
  (subjectsData || []).forEach(row => {
    const directionKey = idToKey.get(String(row.direction_id));
    if (!directionKey) return;
    if (!map[directionKey]) map[directionKey] = [];
    map[directionKey].push(row.subject_key);
  });
  directionSubjectsMap = map;
  return { directionsMeta, directionSubjectsMap };
}

async function fetchUserDirections(force = false) {
  if (!internalDbId) return { unlocked: [], selected: null };
  let unlocked = currentUserData?.unlocked_direction_keys;
  let selected = currentUserData?.direction_selected_key;

  const needsFetch =
    force ||
    !Array.isArray(unlocked) ||
    (selected !== null && selected !== undefined && typeof selected !== 'string');

  if (needsFetch) {
    const { data, error } = await supabaseClient
      .from('users')
      .select('unlocked_direction_keys, direction_selected_key')
      .eq('id', internalDbId)
      .maybeSingle();
    if (error) {
      console.error('[directions] user fetch error:', error);
    } else if (data) {
      currentUserData = { ...currentUserData, ...data };
      unlocked = data.unlocked_direction_keys;
      selected = data.direction_selected_key;
    }
  }

  unlockedDirectionKeys = Array.isArray(unlocked) ? unlocked.map(item => String(item)) : [];
  selectedDirectionKey = selected ? String(selected) : null;
  return { unlocked: unlockedDirectionKeys, selected: selectedDirectionKey };
}

function getAvailableDirectionsForUser() {
  const unlocked = new Set((unlockedDirectionKeys || []).map(item => String(item)));
  return (directionsMeta || []).filter(item => unlocked.has(String(item.key)));
}

function getDirectionTitle(direction) {
  if (!direction) return '';
  const lang = currentLang || 'uz';
  const fallback = direction.title_ru || direction.title_en || direction.title_uz || direction.key || '';
  if (lang === 'ru') return direction.title_ru || fallback;
  if (lang === 'en') return direction.title_en || fallback;
  return direction.title_uz || fallback;
}

function normalizeSelectedDirection() {
  const available = getAvailableDirectionsForUser();
  const availableKeys = new Set(available.map(item => String(item.key)));
  if (selectedDirectionKey && !availableKeys.has(String(selectedDirectionKey))) {
    selectedDirectionKey = null;
  }
  if (selectedDirectionKey && !getAllowedSubjectsByDirection(selectedDirectionKey).length) {
    selectedDirectionKey = null;
  }
  if (!selectedDirectionKey && available.length === 1) {
    selectedDirectionKey = String(available[0].key);
  }
}

function shouldOpenDirectionModal() {
  const available = getAvailableDirectionsForUser();
  if (available.length <= 1) return false;
  normalizeSelectedDirection();
  const hasSubjects = getAllowedSubjectsByDirection(selectedDirectionKey).length > 0;
  return !selectedDirectionKey || !hasSubjects;
}

function openDirectionSelectModal({ force = false } = {}) {
  const modal = document.getElementById('direction-select-modal');
  const listEl = document.getElementById('direction-list');
  const saveBtn = document.getElementById('direction-save-btn');
  const closeBtn = document.getElementById('direction-close-btn');
  if (!modal || !listEl) return;

  const available = getAvailableDirectionsForUser();
  if (!available.length) return;

  listEl.innerHTML = '';
  const selectedKey = selectedDirectionKey;
  available.forEach(direction => {
    const key = String(direction.key);
    const subjects = getAllowedSubjectsByDirection(key);
    const label = document.createElement('label');
    label.className = 'direction-item';
    label.innerHTML = `
      <input type="radio" name="direction-radio" value="${escapeHTML(key)}" ${selectedKey === key ? 'checked' : ''}>
      <div>
        <div class="direction-item-title">${escapeHTML(getDirectionTitle(direction))}</div>
        <div class="direction-item-sub">${escapeHTML(subjects.map(subjectDisplayName).join(', '))}</div>
      </div>
    `;
    listEl.appendChild(label);
  });

  const required = force || shouldOpenDirectionModal();
  if (closeBtn) closeBtn.classList.toggle('hidden', required);
  if (saveBtn) saveBtn.disabled = !selectedDirectionKey && required;

  modal.classList.remove('hidden');
}

async function saveSelectedDirectionFromModal() {
  const modal = document.getElementById('direction-select-modal');
  const listEl = document.getElementById('direction-list');
  if (!modal || !listEl) return;

  const selectedInput = listEl.querySelector('input[name="direction-radio"]:checked');
  const nextKey = selectedInput ? String(selectedInput.value) : '';
  if (!nextKey) return;

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .update({ direction_selected_key: nextKey })
      .eq('id', internalDbId)
      .select('direction_selected_key, unlocked_direction_keys')
      .maybeSingle();

    if (error) throw error;
    if (data) {
      currentUserData = { ...currentUserData, ...data };
    }
  } catch (e) {
    console.error('[directions] save failed', e);
  }

  selectedDirectionKey = nextKey;
  modal.classList.add('hidden');

  const allowedSubjects = getAllowedSubjectsByDirection(selectedDirectionKey);
  if (allowedSubjects.length) {
    applyDirectionSubjectsToHomeUI(allowedSubjects);
    ensureActiveSubjectValid(allowedSubjects);
  } else {
    initSubjectSelectionFlow();
  }
}

async function syncDirectionState({ forceModal = false } = {}) {
  await fetchDirectionsMetaAndSubjects();
  await fetchUserDirections(true);
  normalizeSelectedDirection();
  if (
    selectedDirectionKey &&
    currentUserData &&
    String(currentUserData.direction_selected_key || '') !== String(selectedDirectionKey)
  ) {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .update({ direction_selected_key: selectedDirectionKey })
        .eq('id', internalDbId)
        .select('direction_selected_key')
        .maybeSingle();
      if (error) throw error;
      if (data) currentUserData = { ...currentUserData, ...data };
    } catch (e) {
      console.error('[directions] auto-select save failed', e);
    }
  }
  if (forceModal && shouldOpenDirectionModal()) {
    openDirectionSelectModal({ force: true });
  }
}

function stopPracticeStopwatch() {
  if (practiceStopwatchInterval) clearInterval(practiceStopwatchInterval);
  practiceStopwatchInterval = null;
}
function startPracticeStopwatch() {
  stopPracticeStopwatch();
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = formatMMSS(practiceElapsedSec);

  practiceStopwatchInterval = setInterval(() => {
    practiceElapsedSec += 1;
    const el = document.getElementById('timer');
    if (el) el.textContent = formatMMSS(practiceElapsedSec);
  }, 1000);
}

function loadPracticeSession(practiceTourId) {
  try {
    // Practice хранится локально
    const raw = localStorage.getItem(practiceStorageKey(practiceTourId));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || obj.v !== 1) return null;
    if (obj.lang !== currentLang) return null;
// тур для практики валидируем по practiceTourId
const storedTourId = getPracticeTourIdValue(obj.practiceTourId);
const wantTourId = getPracticeTourIdValue(practiceTourId);
if (wantTourId && String(storedTourId) !== String(wantTourId)) return null;

    return obj;
  } catch (e) {
    console.warn('[practice] load failed', e);
    return null;
  }
}

function savePracticeSession() {
  try {
    // Practice хранится локально
    const normalized = normalizePracticeFilters(practiceFilters);
    practiceFilters = normalized;
    const payload = {
      v: 1,
      tourId: normalized.practiceTourId || currentTourId,
      lang: currentLang,
      orderIds: (questions || []).map(q => Number(q.id)),
      index: currentQuestionIndex,
      answers: practiceAnswers,
      filters: normalized,
      practiceTourId: normalized.practiceTourId || null,
      elapsedSec: practiceElapsedSec,
      savedAt: Date.now()
    };
    
  localStorage.setItem(practiceStorageKey(normalized.practiceTourId), JSON.stringify(payload));
  } catch (e) {
    console.warn('[practice] save failed', e);
  }
}

function clearPracticeSession(practiceTourId) {
  try { localStorage.removeItem(practiceStorageKey(practiceTourId)); } catch (e) {}
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function practiceSeenStorageKey(practiceTourId) {
  const tourKey = getPracticeTourIdValue(practiceTourId) || 'all';
  return `practice_seen_ids_v1:${internalDbId}:${tourKey}:${currentLang}`;
}

function loadPracticeSeenIds(practiceTourId) {
  try {
    const raw = localStorage.getItem(practiceSeenStorageKey(practiceTourId));
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return new Set();
    return new Set(data.map(id => String(id)));
  } catch (e) {
    console.warn('[practice] seenIds load failed', e);
    return new Set();
  }
}

function savePracticeSeenIds(practiceTourId, seenSet) {
  try {
    const list = Array.from(seenSet || []).map(id => String(id));
    localStorage.setItem(practiceSeenStorageKey(practiceTourId), JSON.stringify(list));
  } catch (e) {
    console.warn('[practice] seenIds save failed', e);
  }
}

async function loadPracticeSeenIdsFromDb(practiceTourId, subjectKeys) {
  try {
    if (!supabaseClient || !internalDbId) return new Set();

    const tourId = getPracticeTourIdValue(practiceTourId);
    if (!tourId) return new Set();

    // subjectKeys: массив нормализованных ключей предметов (bio, chem, sat, ielts...)
    const keys = Array.isArray(subjectKeys)
  ? subjectKeys
      .map(k => String(k || '').trim())
      .map(k => normalizeSubjectKey(k) || k.toLowerCase())
      .filter(Boolean)
  : [];


    let q = supabaseClient
      .from('user_answers')
      .select('question_id')
      .eq('user_id', internalDbId)
      .eq('mode', 'practice')
      .eq('tour_id', Number(tourId));

    if (keys.length) {
      q = q.in('subject_key', keys);
    }

    const { data, error } = await q;
    if (error) throw error;

    const s = new Set();
    (data || []).forEach(row => {
      if (row && row.question_id != null) s.add(String(row.question_id));
    });
    return s;
  } catch (e) {
    console.warn('[practice] load seen ids from DB failed', e);
    return new Set();
  }
}
  
async function getPracticeQuestionsForTour(practiceTourId) {
  const normalizedTourId = getPracticeTourIdValue(practiceTourId);
  if (!normalizedTourId) {
  return [];
}

// если это текущий тур — используем полный кеш вопросов тура, а не выбранный пул
if (String(normalizedTourId) === String(currentTourId)) {
  return tourQuestionsAllCache || tourQuestionsCache || [];
}


  const cacheKey = `${normalizedTourId}:${currentLang}`;
  if (practiceTourQuestionsCache.has(cacheKey)) {
    return practiceTourQuestionsCache.get(cacheKey);
  }

  const { data: qData, error: qErr } = await supabaseClient
    .from('questions')
    .select('id, subject, topic, question_text, options_text, type, tour_id, time_limit_seconds, language, difficulty, image_url')
    .eq('tour_id', normalizedTourId)
    .eq('language', currentLang)
    .order('id', { ascending: true });

  if (qErr) {
    console.error('[practice] questions fetch error:', qErr);
    return [];
  }

  const result = qData || [];
  practiceTourQuestionsCache.set(cacheKey, result);
  return result;
}

async function getCompletedToursForPractice() {
  if (!internalDbId) return [];
  if (practiceCompletedToursCache.userId === internalDbId && practiceCompletedToursCache.list.length) {
    return practiceCompletedToursCache.list;
  }

  const { data: toursData, error: toursError } = await supabaseClient
    .from('tours')
    .select('id, title, start_date, end_date')
    .order('start_date', { ascending: true });

  if (toursError) {
    console.error('[practice] tours fetch error:', toursError);
    return [];
  }

  const { data: progressData, error: progressError } = await supabaseClient
    .from('tour_progress')
    .select('tour_id, score')
    .eq('user_id', internalDbId);

  if (progressError) {
    console.error('[practice] progress fetch error:', progressError);
    return [];
  }

  const completedIds = new Set(
    (progressData || [])
      .filter(row => row && row.score !== null && row.score !== undefined)
      .map(row => String(row.tour_id))
  );

  const completedTours = (toursData || []).filter(tour => completedIds.has(String(tour.id)));
  practiceCompletedToursCache = { userId: internalDbId, list: completedTours };
  return completedTours;
}
  
function normalizeSubjectKey(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  // 1) Если это SAT/IELTS — считаем отдельным предметом (не распаковываем скобки)
  if (/^SAT\s*\(/i.test(s)) return 'sat';
  if (/^IELTS\s*\(/i.test(s)) return 'ielts';

  // 2) Берём базовую часть до скобок: "Biologiya (Enzymes)" -> "Biologiya"
  const base = s.split('(')[0].trim().toLowerCase();

  // 3) Маппинг вариантов написания в единые ключи
  const map = {
    math: ['matematika', 'математика', 'math', 'mathematics'],
    physics: ['fizika', 'физика', 'physics', 'phys'],
    chem: ['kimyo', 'химия', 'chem', 'chemistry'],
    bio:  ['biologiya', 'биология', 'bio', 'biology'],
    it:   ['informatika', 'информатика', 'it', 'computer science', 'cs', 'computer_science'],
    thinking_skills: ['thinking_skills', 'thinking skills', 'мышление', 'логика', 'critical thinking'],
    global_perspectives: ['global_perspectives', 'global perspectives', 'global', 'perspectives'],
    business: ['business', 'biznes', 'бизнес'],
    accounting: ['accounting', 'buxgalteriya', 'бухгалтерия'],
    eco:  ['iqtisodiyot', 'экономика', 'eco', 'economics', 'economy'],
    sat:  ['sat'],
    ielts:['ielts']
  };


  for (const [key, arr] of Object.entries(map)) {
    if (arr.includes(base)) return key;
  }

  // fallback
  return base;
}

function sanitizeText(s) {
  return String(s || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')   // control chars
    .replace(/[<>"]/g, '')                  // главный мусор: < > "
    .replace(/\s+/g, ' ')
    .trim();
}

function safeUrl(u) {
  return String(u || '')
    .replace(/[\s<>"']/g, '')
    .trim();
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function subjectDisplayName(key) {
  // key уже lower-case
  const k = String(key || '').toLowerCase();
  const map = {
    math: t('subj_math'),
    physics: t('subj_phys'),
    chem: t('subj_chem'),
    bio: t('subj_bio'),
    it: t('subj_it'),
    computer_science: t('subj_it'),
    thinking_skills: t('subj_thinking'),
    global_perspectives: t('subj_global'),
    business: t('subj_business'),
    accounting: t('subj_accounting'),
    eco: t('subj_eco'),
    sat: 'SAT',
    ielts: 'IELTS'
 };
  return map[k] || (k ? (k[0].toUpperCase() + k.slice(1)) : '');
}  
const SUBJECTS_STORAGE_KEY = 'olympiad_subjects';
const SUBJECTS_LOCK_KEY = 'olympiad_subjects_locked';
const BOOKS = [
  {
    title: 'Математика • Сборник задач',
    subtitle: 'PDF',
    url: '#' // TODO: заменить на реальный путь PDF (например ./books/math.pdf)
  },
  {
    title: 'Химия • Базовый курс',
    subtitle: 'PDF',
    url: '#' // TODO: заменить на реальный путь PDF (например ./books/chemistry.pdf)
  },
  {
    title: 'Биология • Конспекты',
    subtitle: 'PDF',
    url: '#' // TODO: заменить на реальный путь PDF (например ./books/biology.pdf)
  }
];

function getDirectionSubjectFallback(directionKey) {
  const fallback = {
    dir_stem: ['math', 'physics', 'computer_science', 'thinking_skills'],
    dir_life: ['biology', 'chemistry', 'global_perspectives'],
    dir_econ: ['economics', 'business', 'accounting', 'global_perspectives']
  };
  const list = fallback[String(directionKey || '').toLowerCase()] || [];
  return list.map(key => normalizeSubjectKey(key)).filter(Boolean);
}

function getAllowedSubjectsByDirection(directionKey) {
  const key = String(directionKey || '').trim();
  if (!key) return [];
  const list = directionSubjectsMap[key];
  const normalized = Array.isArray(list)
    ? list.map(item => normalizeSubjectKey(item)).filter(Boolean)
    : [];
  if (normalized.length) return Array.from(new Set(normalized));
  return Array.from(new Set(getDirectionSubjectFallback(key)));
}

function isDirectionTourMode() {
  const allowed = getAllowedSubjectsByDirection(selectedDirectionKey);
  return Array.isArray(allowed) && allowed.length > 0;
}

function getSubjectCards({ includeHidden = true, includeDirectionOnly = isDirectionTourMode() } = {}) {
  return Array.from(document.querySelectorAll('.subject-card[data-subject]')).filter(card => {
    if (!includeHidden && card.classList.contains('is-hidden')) return false;
    const isDirectionOnly = card.dataset.directionOnly === 'true';
    if (!includeDirectionOnly && isDirectionOnly) return false;
    return true;
  });
}

function getAvailableSubjectKeys(options = {}) {
  const { includeHidden = true, includeDirectionOnly = isDirectionTourMode() } = options;
  return getSubjectCards({ includeHidden, includeDirectionOnly })
    .map(card => normalizeSubjectKey(card.dataset.subject))
    .filter(Boolean);
}

function getSubjectOrderForCurrentMode() {
  if (isDirectionTourMode()) {
    return getAllowedSubjectsByDirection(selectedDirectionKey);
  }
  return ['math', 'chem', 'bio', 'it', 'eco', 'sat', 'ielts'];
}

function getSelectedSubjects() {
  if (isDirectionTourMode()) return [];
  let raw = null;
  try {
    raw = localStorage.getItem(SUBJECTS_STORAGE_KEY);
  } catch (e) {
    console.warn('[subjects] read failed', e);
  }

  let list = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed;
  } catch (e) {
    list = [];
  }

  const available = new Set(getAvailableSubjectKeys({ includeHidden: true, includeDirectionOnly: false }));
  const normalized = list
    .map(item => normalizeSubjectKey(item))
    .filter(Boolean)
    .filter(key => !available.size || available.has(key));

  return Array.from(new Set(normalized));
}

function isSubjectsLocked() {
  try {
    return localStorage.getItem(SUBJECTS_LOCK_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function setSubjectsLocked() {
  try {
    localStorage.setItem(SUBJECTS_LOCK_KEY, '1');
  } catch (e) {
    console.warn('[subjects] lock failed', e);
  }
}

function clearSubjectsLock() {
  try {
    localStorage.removeItem(SUBJECTS_LOCK_KEY);
  } catch (e) {
    console.warn('[subjects] unlock failed', e);
  }
}

function ensureActiveSubjectValid(selected) {
  const directionList = isDirectionTourMode() ? getAllowedSubjectsByDirection(selectedDirectionKey) : [];
  const list = Array.isArray(selected) && selected.length
    ? selected
    : (directionList.length ? directionList : getAvailableSubjectKeys({ includeHidden: false, includeDirectionOnly: isDirectionTourMode() }));
  if (!list.length) return;

  let saved = null;
  try {
    saved = localStorage.getItem('active_subject');
  } catch (e) {
    console.warn('[activeSubject] read failed', e);
  }

  const normalizedSaved = normalizeSubjectKey(saved);
  const next = list.includes(normalizedSaved) ? normalizedSaved : list[0];
  if (next) setActiveSubject(next);
}

function applySelectedSubjectsToHomeUI(selected) {
  const list = Array.isArray(selected) ? selected : [];
  const allowed = new Set(list);
  const isDirectionMode = isDirectionTourMode();
  document.querySelectorAll('.subject-card[data-subject]').forEach(card => {
    const key = normalizeSubjectKey(card.dataset.subject);
    const isDirectionOnly = card.dataset.directionOnly === 'true';
    if (!list.length) {
      const shouldShow = isDirectionMode ? !isDirectionOnly : !isDirectionOnly;
      card.classList.toggle('is-hidden', !shouldShow);
    } else {
      card.classList.toggle('is-hidden', !allowed.has(key));
    }
  });
  renderSubjectTabsUI();
}

function applyDirectionSubjectsToHomeUI(subjects) {
  const list = Array.isArray(subjects) ? subjects.map(s => normalizeSubjectKey(s)).filter(Boolean) : [];
  const allowed = new Set(list);
  document.querySelectorAll('.subject-card[data-subject]').forEach(card => {
    const key = normalizeSubjectKey(card.dataset.subject);
    card.classList.toggle('is-hidden', !allowed.has(key));
  });
  renderSubjectTabsUI();
  renderAllSubjectCardProgress();
  renderHomeContextUI();
}

function isSelectedSubjectsValid(list) {
  return Array.isArray(list) && list.length >= 1 && list.length <= 3;
}

function initSubjectSelectionFlow() {
  if (shouldOpenDirectionModal()) {
    openDirectionSelectModal({ force: true });
    return;
  }
  if (isDirectionTourMode()) {
    const subjects = getAllowedSubjectsByDirection(selectedDirectionKey);
    applyDirectionSubjectsToHomeUI(subjects);
    ensureActiveSubjectValid(subjects);
    return;
  }
  const selected = getSelectedSubjects();
  const locked = isSubjectsLocked();

  if (locked && !isSelectedSubjectsValid(selected)) {
    clearSubjectsLock();
    openSubjectSelectModal();
    return;
  }

  if (locked && isSelectedSubjectsValid(selected)) {
    applySelectedSubjectsToHomeUI(selected);
    ensureActiveSubjectValid(selected);
    return;
  }

  if (!locked) {
    if (selected.length) {
      applySelectedSubjectsToHomeUI(selected);
      ensureActiveSubjectValid(selected);
      return;
    }
    openSubjectSelectModal();
    return;
  }
}

function getSubjectsFromCache() {
  const set = new Set();

  (tourQuestionsCache || []).forEach(q => {
    const key = normalizeSubjectKey(q.subject);
    if (key) set.add(key);
  });

  return Array.from(set).sort();
}    
    // === ФУНКЦИЯ РЕНДЕРИНГА LATEX ===
    function renderLaTeX() {
        if (window.renderMathInElement) {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false}
                ],
                throwOnError: false
            });
        }
    } 

function applyPracticeModalTranslations() {
  const titleEl = document.getElementById('practice-modal-title');
  if (titleEl) titleEl.textContent = tSafe('practice_title', 'Practice');
  const subtitleEl = document.getElementById('practice-modal-subtitle');
  if (subtitleEl) subtitleEl.textContent = tSafe('practice_subtitle', 'Choose subject, difficulty, and question count.');
  const subjectLabel = document.getElementById('practice-label-subject');
  if (subjectLabel) subjectLabel.textContent = tSafe('practice_filter_subject', 'Subject');
  const diffLabel = document.getElementById('practice-label-difficulty');
  if (diffLabel) diffLabel.textContent = tSafe('practice_filter_difficulty', 'Difficulty');
  const countLabel = document.getElementById('practice-label-count');
  if (countLabel) countLabel.textContent = tSafe('practice_filter_count', 'Question count');
  const tourLabel = document.getElementById('practice-label-tour');
  if (tourLabel) tourLabel.textContent = tSafe('practice_filter_tour', 'Tour');
  
  const backBtn = document.getElementById('practice-back-btn');
  if (backBtn) backBtn.textContent = tSafe('btn_back', 'Back');
  const contBtn = document.getElementById('practice-continue-btn');
  if (contBtn) contBtn.textContent = tSafe('btn_continue_practice', 'Continue practice');
  const startBtn = document.getElementById('practice-start-btn');
  if (startBtn) startBtn.textContent = tSafe('btn_start_practice', 'Start practice');

  const closeBtn = document.getElementById('practice-close-btn');
  if (closeBtn) {
    const closeText = tSafe('btn_close', 'Close');
    closeBtn.setAttribute('aria-label', closeText);
    closeBtn.setAttribute('title', closeText);
  }

  const allOption = document.querySelector('#practice-difficulty option[value="all"]');
  if (allOption) allOption.textContent = tSafe('practice_filter_all', 'All');
}

function getPracticeSubjectOptions() {
  const subjects = getSubjectsFromCache();
  const allowedSubjects = [
    'math',
    'physics',
    'chem',
    'bio',
    'it',
    'thinking_skills',
    'eco',
    'business',
    'accounting',
    'global_perspectives',
    'sat',
    'ielts'
  ];
  const available = new Set(subjects.map(s => normalizeSubjectKey(s)));
  const list = allowedSubjects.filter(key => available.has(key));
  const subjectList = list.length ? list : allowedSubjects.slice();
  const locked = isSubjectsLocked();
  const selected = getSelectedSubjects();

  if (locked && selected.length) {
    const filtered = selected.filter(key => subjectList.includes(key));
    const finalList = filtered.length ? filtered : selected.slice();
    return { subjectList: finalList, allowAll: finalList.length >= 2 };
  }

  return { subjectList, allowAll: true };
}

function ensurePracticeTourSelect() {
  const modal = document.getElementById('practice-config-modal');
  if (!modal) return null;

  let field = document.getElementById('practice-tour-field');
  if (!field) {
    field = document.createElement('div');
    field.id = 'practice-tour-field';
    field.className = 'practice-field';

    const label = document.createElement('div');
    label.className = 'practice-label';
    label.id = 'practice-label-tour';
    label.textContent = tSafe('practice_filter_tour', 'Tour');

    const select = document.createElement('select');
    select.id = 'practice-tour';
    select.className = 'input';

    field.appendChild(label);
    field.appendChild(select);

    const firstField = modal.querySelector('.practice-field');
    if (firstField && firstField.parentElement) {
      firstField.parentElement.insertBefore(field, firstField);
    } else {
      modal.appendChild(field);
    }

    select.addEventListener('change', () => {
      const nextValue = select.value || '';
      practiceFilters = normalizePracticeFilters({
        ...practiceFilters,
        practiceTourId: nextValue
      });
      updatePracticeContinueButton(nextValue);
    });
  }

  return field.querySelector('#practice-tour');
}

async function updatePracticeTourOptions() {
  const selectEl = ensurePracticeTourSelect();
  if (!selectEl) return;

  selectEl.innerHTML = '';
  const tours = await getCompletedToursForPractice();

  if (!tours.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = tSafe('review_no_data', 'No data');
    opt.disabled = true;
    selectEl.appendChild(opt);
    selectEl.value = '';
    return;
  }

  tours.forEach((tour, index) => {
    const opt = document.createElement('option');
    opt.value = String(tour.id);
    opt.textContent = formatTourTitle(tour.title || `${t('stat_tour')} ${index + 1}`);
    selectEl.appendChild(opt);
  });

  const normalized = getPracticeTourIdValue(practiceFilters.practiceTourId);
  const fallbackId = tours[0]?.id;
  const nextValue = tours.some(t => String(t.id) === String(normalized)) ? normalized : String(fallbackId || '');
  selectEl.value = nextValue || '';
  practiceFilters = normalizePracticeFilters({
    ...practiceFilters,
    practiceTourId: nextValue
  });
  updatePracticeContinueButton(nextValue);
}

function updatePracticeContinueButton(practiceTourId) {
  const contBtn = document.getElementById('practice-continue-btn');
  if (!contBtn) return;
  const saved = loadPracticeSession(practiceTourId);
  contBtn.classList.toggle('hidden', !saved);
}

function openPracticeConfigModal({ canContinue }) {
  const modal = document.getElementById('practice-config-modal');
  if (!modal) {
    // на крайний случай — если модалки нет, стартуем с дефолтом
  beginPracticeNew({ subjects: [], difficulty: 'all', count: 20 });
  return;
  }

  applyPracticeModalTranslations();
  practiceFilters = normalizePracticeFilters(practiceFilters);  
  // собрать предметы из кеша вопросов
  const { subjectList, allowAll } = getPracticeSubjectOptions();
  const allowedSet = new Set(subjectList.map(key => normalizeSubjectKey(key)));
  const currentSubjects = normalizePracticeFilters(practiceFilters).subjects || [];
  let nextSubjects = currentSubjects.filter(key => allowedSet.has(normalizeSubjectKey(key)));
  if (subjectList.length === 1 && nextSubjects.length === 0) {
    nextSubjects = [subjectList[0]];
  }
  practiceFilters = normalizePracticeFilters({
    ...practiceFilters,
    subjects: nextSubjects
  });
  const chipsWrap = document.getElementById('practice-subject-chips');
  if (chipsWrap) {
    chipsWrap.innerHTML = '';
    if (allowAll) {
      chipsWrap.appendChild(makeChip(tSafe('practice_filter_all', 'All'), 'all', false));
    }

    subjectList.forEach(key => {
      const label = subjectDisplayName(key);
      chipsWrap.appendChild(makeChip(label, key, false));
});
    updatePracticeSubjectChips(chipsWrap);
  }

  const diffEl = document.getElementById('practice-difficulty');
  if (diffEl) diffEl.value = practiceFilters.difficulty || 'all';

  const countEl = document.getElementById('practice-count');
  if (countEl) countEl.value = String(practiceFilters.count || 20);

  const contBtn = document.getElementById('practice-continue-btn');
  if (contBtn) {
    contBtn.classList.toggle('hidden', !canContinue);
  }

  updatePracticeTourOptions();

  modal.classList.remove('hidden');
}

function closePracticeConfigModal() {
  const modal = document.getElementById('practice-config-modal');
  if (modal) modal.classList.add('hidden');
}

function openTourInfoModal({ practiceAllowed }) {
  const modal = document.getElementById('tour-info-modal');
  if (!modal) return;

  const titleEl = modal.querySelector('h2');
  const messageEl = modal.querySelector('p');
  const iconWrap = modal.querySelector('.modal-icon-big');
  const iconEl = iconWrap ? iconWrap.querySelector('i') : null;
  const primaryBtn = modal.querySelector('.btn-primary');
  const secondaryBtn = modal.querySelector('.btn-text-simple');

  if (practiceAllowed) {
    if (titleEl) titleEl.textContent = t('tour_info_practice_title');
    if (messageEl) messageEl.textContent = t('tour_info_practice_msg');
    if (iconWrap) {
      iconWrap.style.background = "#e8f8ec";
      iconWrap.style.color = "var(--success)";
    }
    if (iconEl) iconEl.className = "fa-solid fa-calendar-check";
   // В профиле больше ничего не открываем — пользователь остаётся на главном экране
if (primaryBtn) {
  primaryBtn.removeAttribute('onclick');
  primaryBtn.textContent = t('btn_understood');
  primaryBtn.onclick = () => modal.classList.add('hidden');
  primaryBtn.classList.remove('hidden');
}
if (secondaryBtn) {
  secondaryBtn.classList.add('hidden');
}

  } else {
    if (titleEl) titleEl.textContent = t('tour_info_practice_locked_title');
    if (messageEl) messageEl.textContent = t('tour_info_practice_locked_msg');
    if (iconWrap) {
      iconWrap.style.background = "#FFF2F2";
      iconWrap.style.color = "var(--danger)";
    }
    if (iconEl) iconEl.className = "fa-solid fa-lock";
    if (primaryBtn) {
      primaryBtn.removeAttribute('onclick');
      primaryBtn.textContent = t('btn_understood');
      primaryBtn.onclick = () => modal.classList.add('hidden');
    }
    if (secondaryBtn) secondaryBtn.classList.add('hidden');
  }

  modal.classList.remove('hidden');
}

function showAccessLockModal() {
  const modal = document.getElementById('tour-info-modal');
  if (!modal) return;

  const titleEl = modal.querySelector('h2');
  const messageEl = modal.querySelector('p');
  const iconWrap = modal.querySelector('.modal-icon-big');
  const iconEl = iconWrap ? iconWrap.querySelector('i') : null;
  const primaryBtn = modal.querySelector('.btn-primary');
  const secondaryBtn = modal.querySelector('.btn-text-simple');

  if (titleEl) titleEl.textContent = t('access_locked_title');
  if (messageEl) messageEl.textContent = t('access_locked_msg');
  if (iconWrap) {
    iconWrap.style.background = "#FFF2F2";
    iconWrap.style.color = "var(--danger)";
  }
  if (iconEl) iconEl.className = "fa-solid fa-lock";
  if (primaryBtn) {
    primaryBtn.removeAttribute('onclick');
    primaryBtn.textContent = t('btn_understood');
    primaryBtn.onclick = () => modal.classList.add('hidden');
  }
  if (secondaryBtn) secondaryBtn.classList.add('hidden');

  modal.classList.remove('hidden');
}

function makeChip(label, value, selected) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chip' + (selected ? ' active' : '');
  btn.textContent = label;
  btn.dataset.value = value;

  btn.addEventListener('click', () => {
    const wrap = btn.parentElement;
    if (!wrap) return;
    if (value === 'all') {
      practiceFilters = normalizePracticeFilters({
        ...practiceFilters,
        subjects: []
      });
      updatePracticeSubjectChips(wrap);
      return;
    }

    const current = normalizePracticeFilters(practiceFilters).subjects || [];
    const normalizedValue = normalizeSubjectKey(value);
    let next = current.filter(s => normalizeSubjectKey(s) !== normalizedValue);
    if (next.length === current.length) next = [...current, normalizedValue];

    practiceFilters = normalizePracticeFilters({
      ...practiceFilters,
      subjects: next
    });
    updatePracticeSubjectChips(wrap);
  });

  return btn;
}
  
function updatePracticeSubjectChips(wrap) {
  if (!wrap) return;
  const current = normalizePracticeFilters(practiceFilters).subjects || [];
  const subjectSet = new Set(current.map(s => normalizeSubjectKey(s)));
  let anyActive = false;

  [...wrap.querySelectorAll('.chip')].forEach(chip => {
    const value = chip.dataset.value;
    if (value === 'all') return;
    const isActive = subjectSet.has(normalizeSubjectKey(value));
    chip.classList.toggle('active', isActive);
    if (isActive) anyActive = true;
  });

  const allChip = wrap.querySelector('.chip[data-value="all"]');
  if (allChip) {
    allChip.classList.toggle('active', !anyActive || subjectSet.size === 0);
  }
}

function getPracticeConfigFromUI() {
  const chipsWrap = document.getElementById('practice-subject-chips');
  let subjects = [];
  if (chipsWrap) {
    const activeChips = [...chipsWrap.querySelectorAll('.chip.active')];
    subjects = activeChips
      .map(chip => chip.dataset.value)
      .filter(value => value && value !== 'all')
      .map(value => normalizeSubjectKey(value));
  }
  const diffEl = document.getElementById('practice-difficulty');
  const difficulty = diffEl ? (diffEl.value || 'all') : 'all';
  const countEl = document.getElementById('practice-count');
  let count = countEl ? parseInt(countEl.value, 10) : 20;
  if (!Number.isFinite(count) || count <= 0) count = 20;

  const tourEl = document.getElementById('practice-tour');
  const practiceTourId = tourEl ? tourEl.value : null;

  const locked = isSubjectsLocked();
  const selected = getSelectedSubjects();
  if (locked && selected.length) {
    const allowedSet = new Set(selected.map(key => normalizeSubjectKey(key)));
    if (!subjects.length) subjects = selected.slice();
    subjects = subjects.filter(key => allowedSet.has(normalizeSubjectKey(key)));
    if (!subjects.length) subjects = selected.slice();
  }

return normalizePracticeFilters({ subjects, difficulty, count, practiceTourId });
}

async function beginPracticeNew(filters) {
  practiceMode = true;
  isTestActive = false;

  practiceFilters = normalizePracticeFilters(filters);
  practiceAnswers = {};
  practiceElapsedSec = 0;
  // фильтруем вопросы
  const practiceTourId = getPracticeTourIdValue(practiceFilters.practiceTourId);
  let pool = await getPracticeQuestionsForTour(practiceTourId);
  pool = Array.isArray(pool) ? pool.slice() : [];

  if (practiceTourId) {
    pool = pool.filter(q => String(q.tour_id) === String(practiceTourId));
  }

 const subjects = practiceFilters.subjects || [];
  const subjectSet = new Set(subjects.map(s => normalizeSubjectKey(s)));
  if (subjectSet.size && !subjectSet.has('all')) {
    pool = pool.filter(q => subjectSet.has(normalizeSubjectKey(q.subject)));  
}

  if (practiceFilters.difficulty && practiceFilters.difficulty !== 'all') {
    const want = String(practiceFilters.difficulty).toLowerCase();
    pool = pool.filter(q => String(q.difficulty || '').toLowerCase() === want);
  }

// ✅ "Пройдено" в practice считаем по БАЗЕ (и дополняем локальным кэшем)
const localSeen = loadPracticeSeenIds(practiceTourId);

// subjects уже есть в practiceFilters; для БД используем subject_key
const subjectsForDb = (practiceFilters.subjects || [])
  .map(s => normalizeSubjectKey(s))
  .filter(s => s && s !== 'all');

const dbSeen = await loadPracticeSeenIdsFromDb(practiceTourId, subjectsForDb);

const seenIds = new Set([...localSeen, ...dbSeen]);

const unseen = pool.filter(q => !seenIds.has(String(q.id)));
const targetCount = practiceFilters.count || 20;

// ✅ Если новых вопросов уже нет — не запускаем practice (всё пройдено)
if (!unseen.length) {
  alert('Практика завершена: по выбранному предмету в этом туре новых вопросов больше нет.');
  return;
}

let limited = [];

if (unseen.length >= targetCount) {
  const shuffledUnseen = unseen.slice();
  shuffleArray(shuffledUnseen);
  limited = shuffledUnseen.slice(0, targetCount);
} else {
  const shuffledUnseen = unseen.slice();
  shuffleArray(shuffledUnseen);
  limited = shuffledUnseen.slice(); // все новые, что есть

  const remaining = targetCount - limited.length;
  if (remaining > 0) {
    // добор из полного пула (повторы разрешены, если новых не хватило)
    limited = limited.concat(pickNWithRepeats(pool, remaining));
  }
}

// опционально перемешать итоговый список
shuffleArray(limited);

  practiceQuestionOrder = limited.map(q => q.id);
  
  questions = limited;
  currentQuestionIndex = 0;
  correctCount = 0;
  selectedAnswer = null;

  showScreen('quiz-screen');

  // UI для Practice
  const exitBtn = document.getElementById('practice-exit-btn');
  if (exitBtn) exitBtn.classList.remove('hidden');

  const prevBtn = document.getElementById('prev-button');
  if (prevBtn) prevBtn.classList.remove('hidden');

  startPracticeStopwatch();
  showQuestion();

  savePracticeSession();
}

async function beginPracticeContinue() {
  const saved = loadPracticeSession(practiceFilters.practiceTourId);
  if (!saved) return;

  practiceMode = true;
  isTestActive = false;

  // восстановим фильтры/ответы/индекс/время
  practiceFilters = normalizePracticeFilters((saved && saved.filters) || { subjects: [], difficulty: 'all', count: 20, practiceTourId: saved.practiceTourId });
  practiceAnswers = saved.answers || {};
  currentQuestionIndex = Number(saved.index || 0);
  // восстановим порядок вопросов по orderIds
  const orderIds = Array.isArray(saved.orderIds) ? saved.orderIds : [];
  const pool = await getPracticeQuestionsForTour(practiceFilters.practiceTourId);
  const byId = new Map((pool || []).map(q => [String(q.id), q]));
  const restored = orderIds.map(id => byId.get(String(id))).filter(Boolean);

  if (!restored.length) {
    // если по какой-то причине не восстановилось — начинаем заново с текущими фильтрами
    await beginPracticeNew(practiceFilters);
    return;
  }
  questions = restored;

  showScreen('quiz-screen');

  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = 'Practice';

  // включаем UI “выход” и “назад”
  const exitBtn = document.getElementById('practice-exit-btn');
  if (exitBtn) exitBtn.classList.remove('hidden');

  const prevBtn = document.getElementById('prev-button');
  if (prevBtn) prevBtn.classList.toggle('hidden', currentQuestionIndex <= 0);

 startPracticeStopwatch();
  showQuestion();
}

function exitPracticeToReturnScreen() {
  savePracticeSession();
  stopPracticeStopwatch();
  isTestActive = false;
  selectedAnswer = null;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (totalTimerInterval) {
    clearInterval(totalTimerInterval);
    totalTimerInterval = null;
  }
  if (questionTimerInterval) {
    clearInterval(questionTimerInterval);
    questionTimerInterval = null;
  }

  const exitBtn = document.getElementById('practice-exit-btn');
  if (exitBtn) exitBtn.classList.add('hidden');
  const prevBtn = document.getElementById('prev-button');
  if (prevBtn) prevBtn.classList.add('hidden');

  showScreen(practiceReturnScreen);
}
  
    // === ФУНКЦИЯ ПЕРЕВОДА НАЗВАНИЯ ТУРА ===
    function formatTourTitle(raw) {
        if (!raw) return t('start_tour_btn');
        return raw.replace(/Tur|Тур|Tour/i, t('stat_tour'));
    }
    
    // === СЛОВАРЬ ПЕРЕВОДОВ ===
    const translations = {
        uz: {
            reg_title: "Ro'yxatdan o'tish",
            reg_subtitle: "Ma'lumotlaringizni kiriting",
            participant_label: "Ishtirokchi",
            label_full_name: "F.I.O. (Sertifikat uchun)",
            label_class: "Sinf",
            label_region: "Viloyat",
            label_district: "Tuman / Shahar",
            label_school: "Maktab",
            consent_title: "Ma'lumotlarni qayta ishlashga rozilik",
            consent_desc: "Reyting uchun.",
            btn_save: "Saqlash va Tasdiqlash", 
            profile_locked_msg: "Ma'lumotlar tasdiqlangan",
            profile_locked_hint: "Xatolik bo'lsa 'Yordam' bo'limiga yozing. (Til o'zgartirilmaydi!)",
            btn_to_main: "Bosh sahifaga",
            btn_cancel: "Bekor qilish",
            greeting_hi: "Salom",
            greeting_sub: "Olimpiadaga xush kelibsiz.",
            btn_leaderboard: "Reyting",
            btn_about: "Loyiha haqida",
            subjects_title: "Fanlar",
            subj_math: "Matematika",
            subj_eng: "Ingliz tili",
            subj_phys: "Fizika",
            subj_chem: "Kimyo",
            subj_bio: "Biologiya",
            subj_it: "Informatika",
            subj_eco: "Iqtisodiyot",
            subj_thinking: "Thinking Skills",
            subj_global: "Global Perspectives",
            subj_business: "Biznes",
            subj_accounting: "Buxgalteriya",
            direction_title: "Yo'nalish",
            direction_subtitle: "Yo'nalishni tanlang. Mavjud yo'nalishlar turlar natijalariga ko'ra ochiladi.",
            cert_title: "Sertifikat",
            certs_title: "Sertifikat",
            cert_subtitle: "Fanlar olimpiadasi ishtirokchisi",
            cert_rank: "O'rin",
            cert_score: "Ball",
            cert_date: "Sana",
            cert_download_pdf: "PDF yuklab olish",
            cert_share: "Ulashish",
            cert_share_text: "Smart Olympiad sertifikati",
            cert_note: "Sertifikatni tekshirish ID orqali amalga oshiriladi.",
            cert_sign: "Komissiya raisi",
            cert_soon: "Soon",
            link_copied: "Havola nusxalandi",
            cert_share_unavailable: "Ulashish hozircha mavjud emas",
            cert_desc: "PDF yuklab olish",
            res_title: "Resurslar",
            res_vid_title: "Video darslar",
            res_vid_desc: "Masalalar yechimi",
            res_ch_title: "Kanal",
            res_ch_desc: "Yangiliklar",
            res_grp_title: "Ishtirokchilar chati",
            res_grp_desc: "Muhokama",
            res_materials: "Materiallar",
            res_books_title: "Kitoblar",
            res_books_desc: "PDF va materiallar",
            next_event_title: "Yaqin tadbir",
            next_event_label: "Keyingi tur",
            next_event_soon: "Keyingi tur tez orada",
            lb_title: "Reyting",
            loading: "Yuklanmoqda...",
            btn_exit: "Chiqish",
            btn_next: "Keyingi",
            res_screen_title: "Tur natijasi",
            res_finished: "Tur yakunlandi!",
            res_saved: "Natijangiz saqlandi",
            stat_tour: "TUR",
            stat_total: "JAMI",
            stat_correct: "TO'G'RI",
            review_title: "Xatolar ustida ishlash",
            review_pick_tour_subtitle: "Yakunlangan turni tanlang va xatolar ustida ishlang.",
            review_results_title: "Natijalar: {n}",
            review_results_caption: "Fanlar bo'yicha umumiy statistika",
            review_subjects: "Fanlar",
            review_result_label: "Natija",
            review_completed_on: "yakunlangan",
            review_your_answer: "Sizning javobingiz",
            review_correct_answer: "To'g'ri javob",
            review_explanation: "Tushuntirish",
            review_incorrect: "Noto'g'ri",
            review_correct: "To'g'ri",
            review_no_data: "Ma'lumot yo'q",
            review_errors: "Xatolar",
            review_question: "Savol",
            review_back_to_results: "Natijalarga qaytish",
            review_choose_other_tour: "Boshqa turni tanlash",
            review_to_cabinet: "Shaxsiy kabinetga",
            review_success_title: "Ajoyib ish!",
            review_success_text: "{subject} bo'yicha barcha xatolar ko'rib chiqildi.",
            review_progress_label: "PROGRESS",
            review_progress_complete: "100% yakunlandi",
            data_saved: "Ma'lumotlar saqlandi",
            review_desc: "Batafsil tahlil natijalar e'lon qilingandan so'ng mavjud bo'ladi.",
            btn_download_cert: "Sertifikatni yuklash",
            lb_title: "Reyting",
            lb_republic: "Respublika",
            lb_region: "Viloyat",
            lb_district: "Tuman",
            lb_participant: "ISHTIROKCHI",
            lb_score: "BALL",
            you: "Siz",
            lb_points: "BALL",
            lb_rank: "O'rin",
            stat_tours: "Turlar",
            warn_title: "Diqqat",
            warn_msg_1: "Sizda",
            warn_msg_2: "ta savol uchun",
            warn_msg_3: "daqiqa vaqt bor.",
            warn_hint: "Savollar oddiydan qiyinga qarab boradi.",
            warn_hint_2: "Orqaga qaytish imkonsiz!",
            btn_start: "Boshlash",
            btn_close: "Yopish",
            my_certs: "Mening sertifikatlarim",
            tour_passed_title: "Tur yakunlangan!",
            tour_passed_msg: "Siz ushbu bosqich javoblarini topshirgansiz. Natijalar Reyting bo'limida.",
            btn_channel: "Kanalga o'tish",
            locked_alert_title: "O'zgartirish imkonsiz",
            locked_alert_desc: "Olimpiada yakunlanguncha tahrirlash o'chirilgan.",
            btn_understood: "Tushunarli",
            about_platform: "Platforma haqida",
            about_text: "O'zbekiston o'quvchilari uchun <b>Cambridge IGCSE</b>, <b>SAT</b> va <b>IELTS</b> standartlarini birlashtirgan noyob platforma.",
            about_features: "Xususiyatlar",
            feat_1: "Xalqaro standartlar",
            feat_2: "Tezkor natijalar",
            feat_3: "Hududlar bo'yicha reyting",
            feat_4: "Ishtirok sertifikatlari",
            select_region: "Viloyatni tanlang",
            select_district: "Tumanni tanlang",
            select_class: "Sinfni tanlang",
            class_s: "sinf",
            save_saving: "Saqlash...",
            alert_fill: "Barcha maydonlarni to'ldiring!",
            no_active_tour: "Faol turlar yo'q",
            tour_completed_btn: "Tur yakunlangan",
            start_tour_btn: "Turni boshlash",
            main_btn_completed_hint: "Amaliyot va xatolar tahlili — «Amallar» bo‘limida",
            main_btn_completed_hint_locked: "Amaliyot va xatolar tahlili tur yakunlangach mavjud bo‘ladi",
            main_btn_practice_hint: "Amaliyot yakunlangan turlar uchun mavjud",
            main_btn_start_hint: "Boshlash uchun bosing",
            practice_btn: "Amaliyot",
            minutes: "daqiqa",
            questions: "savol",
            correct_txt: "to'g'ri",
            no_data: "Ma'lumot yo'q",
            your_answer: "Sizning javobingiz",
            correct_answer: "To'g'ri javob",
            review_available_after_end: "Tahlil tur yoki olimpiada yakunlangandan so'ng mavjud bo'ladi",
            curr_tour: "Joriy tur",
            total_q: "Jami savollar",
            school_prefix: "Maktab",
            anonymous: "Anonim",
            city_tashkent: "Toshkent sh.",
            saving_ans: "Saqlash...",
            repeat: "Qayta urinish",
            error: "Xatolik",
            answer_placeholder: "Javobni kiriting...",
            answer_required_to_continue: "Keyingi savolga o'tish uchun javobni kiriting. Zarur bo'lsa, orqaga qaytishingiz mumkin. Saqlash barcha savollar tugagach amalga oshiriladi.",
            answer_required_short: "Davom etish uchun javob bering",
            menu_my_data: "Ma'lumotlarim",
            menu_my_data_desc: "Sinf, maktab, hudud",
            menu_lang: "Til",
            menu_certs: "Sertifikatlar",
            menu_certs_desc: "Yutuqlar arxivi",
            menu_support: "Yordam",
            menu_support_desc: "Admin bilan aloqa",
            btn_delete_account: "Hisobni o'chirish",
            del_title: "Hisobni o'chirish?",
            del_msg: "Barcha natijalaringiz va reytingdagi o'rningiz o'chib ketadi. Qayta tiklab bo'lmaydi.",
            btn_delete_confirm: "O'chirish",
            del_error_active_tour: "Joriy tur topshirilganligi sababli hisobni o'chirish mumkin emas. Iltimos, tur yakunlanishini kuting.",
            btn_back: "Orqaga",
            practice_title: "Amaliyot",
            practice_subtitle: "Fan, daraja va savollar sonini tanlang.",
            practice_filter_subject: "Fan",
            practice_filter_difficulty: "Qiyinchilik",
            practice_filter_count: "Savollar soni",
            practice_filter_tour: "Tur",
            practice_filter_all: "Barchasi",
            btn_start_practice: "Amaliyotni boshlash",
            btn_continue_practice: "Amaliyotni davom ettirish",
            menu_mistakes: "Xatolar tahlili",
            menu_mistakes_desc: "Javoblarni ko'rish",
            menu_practice: "Amaliyot",
            menu_practice_desc: "Amaliyot rejimi",
            home_practice_subtitle: "Taymersiz amaliyot",
            home_mistakes_subtitle: "Noto'g'ri javoblar tahlili",
            lock_review_title: "Tahlil yopiq",
            lock_review_msg: "Adolatli raqobat uchun xatolar tahlili olimpiada yakunlangandan so'ng ochiladi.",
            access_locked_title: "Kirish yopiq",
            access_locked_msg: "Amaliyot va xatolar tahlili faqat kamida 1 ta tur yakunlangandan so'ng ochiladi.",
            tour_info_practice_title: "Tur yakunlangan",
            tour_info_practice_msg: "Amaliyot va xatolar tahlili shaxsiy kabinetda mavjud.",
            tour_info_practice_locked_title: "Amaliyot yopiq",
            tour_info_practice_locked_msg: "Amaliyot tur yakunlangach ochiladi.",
            btn_open_profile: "Profilga o'tish",
            subject_select_title: "Fanlarni tanlang",
            subject_select_subtitle: "1 dan 3 tagacha fan tanlash mumkin. Tasdiqlangandan so‘ng 7 tur tugaguncha o‘zgartirib bo‘lmaydi.",
            subject_select_warning: "3 tadan ko‘p bo‘lishi mumkin emas.",
            subject_select_next: "Davom etish",
            subject_confirm_title: "Tanlovni tasdiqlaysizmi?",
            subject_confirm_you_selected: "Siz tanladingiz:",
            subject_confirm_subtitle: "Tasdiqlangandan so‘ng fanlarni 7 tur yakunlanguncha o‘zgartirib bo‘lmaydi.",
            tour_subject_pick_title: "Tur uchun fanni tanlang",
            tour_label: "Tur",
            tour_status_active: "Faol",
            tour_status_done: "Yakunlangan",
            tour_status_locked: "Yopiq",
            lang_warning_reg: "Diqqat: Til va ma'lumotlar saqlangandan so'ng o'zgartirib bo'lmaydi!",
            lang_locked_reason: "Adolatli raqobat uchun tilni o'zgartirish imkoniyati o'chirilgan.",
            overall_title: "Jami",
            last_completed_tour: "Oxirgi yakunlangan tur",
            home_subjects: "Fanlar",
            home_actions: "Amallar",
            home_resources: "Resurslar",
            cheat_title: "DIQQAT! QOIDABUZARLIK!",
            cheat_msg: "Ilovadan chiqish yoki oynani almashtirish taqiqlanadi. Yana takrorlansa, test avtomatik ravishda yakunlanadi!"
        },
        ru: {
            reg_title: "Регистрация",
            reg_subtitle: "Введите данные",
            participant_label: "Участник",
            label_full_name: "Ф.И.О. (Для сертификата)",
            label_class: "Класс",
            label_region: "Регион",
            label_district: "Район / Город",
            label_school: "Школа",
            consent_title: "Согласие на обработку",
            consent_desc: "Для рейтинга.",
            btn_save: "Сохранить и Подтвердить",
            profile_locked_msg: "Данные подтверждены",
            profile_locked_hint: "Ошибка? Пишите в 'Помощь'. (Смена языка запрещена!)",
            btn_to_main: "На главную",
            btn_cancel: "Отмена",
            greeting_hi: "Привет",
            greeting_sub: "Добро пожаловать на олимпиаду.",
            btn_leaderboard: "Рейтинг",
            btn_about: "О проекте",
            subjects_title: "Предметы",
            subj_math: "Математика",
            subj_eng: "Английский",
            subj_phys: "Физика",
            subj_chem: "Химия",
            subj_bio: "Биология",
            subj_it: "Информатика",
            subj_eco: "Экономика",
            subj_thinking: "Thinking Skills",
            subj_global: "Global Perspectives",
            subj_business: "Бизнес",
            subj_accounting: "Бухгалтерия",
            direction_title: "Направление",
            direction_subtitle: "Выберите направление. Доступные направления открываются по результатам туров.",
            cert_title: "Сертификат",
            certs_title: "Сертификат",
            cert_subtitle: "Участник предметной олимпиады",
            cert_rank: "Место",
            cert_score: "Баллы",
            cert_date: "Дата",
            cert_download_pdf: "Скачать PDF",
            cert_share: "Поделиться",
            cert_share_text: "Сертификат Smart Olympiad",
            cert_note: "Проверка сертификата по ID.",
            cert_sign: "Председатель комиссии",
            cert_soon: "Soon",
            link_copied: "Ссылка скопирована",
            cert_share_unavailable: "Поделиться пока нельзя",
            cert_desc: "Скачать PDF",
            res_title: "Ресурсы",
            res_vid_title: "Видеоуроки",
            res_vid_desc: "Разборы задач",
            res_ch_title: "Канал",
            res_ch_desc: "Новости",
            res_grp_title: "Чат участников",
            res_grp_desc: "Обсуждение",
            res_materials: "Материалы",
            res_books_title: "Книги",
            res_books_desc: "PDF и материалы",
            next_event_title: "Ближайшее событие",
            next_event_label: "Следующий тур",
            next_event_soon: "Следующий тур скоро",
            lb_title: "Рейтинг",
            loading: "Загрузка...",
            btn_exit: "Выход",
            btn_next: "Далее",
            res_screen_title: "Результат тура",
            res_finished: "Тур завершён!",
            res_saved: "Ваш результат сохранен",
             stat_tour: "ТУР",
            stat_total: "ВСЕГО",
            stat_correct: "ВЕРНО",
            review_title: "Работа над ошибками",
            review_pick_tour_subtitle: "Выберите завершённый тур, чтобы разобрать ответы.",
            review_results_title: "Результаты: {n}",
            review_results_caption: "Сводная статистика по предметам",
            review_subjects: "Предметы",
            review_result_label: "Результат",
            review_completed_on: "завершён",
            review_your_answer: "Ваш ответ",
            review_correct_answer: "Правильный ответ",
            review_explanation: "Пояснение",
            review_incorrect: "Неверно",
            review_correct: "Верно",
            review_no_data: "Нет данных",
            review_errors: "Ошибки",
            review_question: "Вопрос",
            review_back_to_results: "Назад к результатам",
            review_choose_other_tour: "Выбрать другой тур",
            review_to_cabinet: "В личный кабинет",
            review_success_title: "Отличная работа!",
            review_success_text: "Все ошибки по предмету {subject} успешно просмотрены.",
            review_progress_label: "ПРОГРЕСС",
            review_progress_complete: "100% завершено",
            data_saved: "Данные сохранены",
            review_desc: "Детальный разбор будет доступен после подведения итогов.",
            btn_download_cert: "Скачать сертификат",
            lb_title: "Лидерборд",
            lb_republic: "Республика",
            lb_region: "Регион",
            lb_district: "Район",
            lb_participant: "УЧАСТНИК",
            lb_score: "БАЛЛЫ",
            you: "Вы",
            lb_points: "БАЛЛЫ",
            lb_rank: "Место",
            stat_tours: "Туров",
            warn_title: "Предупреждение",
            warn_msg_1: "У вас будет",
            warn_msg_2: "на",
            warn_msg_3: "вопросов.",
            warn_hint: "Вопросы идут от простых к сложным.",
            warn_hint_2: "Вернуться назад нельзя!",
            btn_start: "Начать",
            btn_close: "Закрыть",
            my_certs: "Мои сертификаты",
            tour_passed_title: "Тур уже пройден!",
            tour_passed_msg: "Вы уже сдали ответы на текущий этап. Результаты доступны в Лидерборде.",
            btn_channel: "Перейти в канал",
            locked_alert_title: "Изменение невозможно",
            locked_alert_desc: "До окончания олимпиады редактирование данных отключено.",
            btn_understood: "Понятно",
            about_platform: "О платформе",
            about_text: "Уникальная платформа для школьников Узбекистана, объединяющая стандарты <b>Cambridge IGCSE</b>, <b>SAT</b> и <b>IELTS</b>.",
            about_features: "Особенности",
            feat_1: "Международные стандарты",
            feat_2: "Мгновенные результаты",
            feat_3: "Рейтинг по регионам",
            feat_4: "Сертификаты участия",
            select_region: "Выберите регион",
            select_district: "Выберите район",
            select_class: "Выберите класс",
            class_s: "класс",
            save_saving: "Сохранение...",
            alert_fill: "Заполните все поля!",
             no_active_tour: "Нет активных туров",
            tour_completed_btn: "Текущий тур пройден",
            start_tour_btn: "Начать тур",
            main_btn_completed_hint: "Практика и работа над ошибками — в разделе «Действия»",
            main_btn_completed_hint_locked: "Практика и работа над ошибками будут доступны после завершения тура",
            main_btn_practice_hint: "Практика доступна после завершения тура",
            main_btn_start_hint: "Нажмите, чтобы начать текущий тур",
            practice_btn: "Практика",
            minutes: "минут",
            questions: "вопросов",
            correct_txt: "верно",
            no_data: "Нет данных",
            your_answer: "Ваш ответ",
            correct_answer: "Правильный ответ",
            review_available_after_end: "Разбор доступен после окончания тура/олимпиады",
            curr_tour: "Текущий тур",
            total_q: "Всего вопросов",
            school_prefix: "Школа",
            anonymous: "Аноним",
            city_tashkent: "г. Ташкент",
            saving_ans: "Сохранение...",
            repeat: "Повторить",
            error: "Ошибка",
            answer_placeholder: "Введите ответ...",
            answer_required_to_continue: "Введите ответ, чтобы перейти к следующему вопросу. При необходимости можете вернуться. Сохранение будет после завершения всех вопросов.",
            answer_required_short: "Ответьте на вопрос, чтобы продолжить",
            menu_my_data: "Мои данные",
            menu_my_data_desc: "Класс, школа, регион",
            menu_lang: "Язык",
            menu_certs: "Сертификаты",
            menu_certs_desc: "Архив достижений",
            menu_support: "Помощь",
            menu_support_desc: "Связь с админом",
            btn_delete_account: "Удалить аккаунт",
            del_title: "Удалить аккаунт?",
            del_msg: "Все ваши результаты и место в рейтинге будут удалены безвозвратно.",
            btn_delete_confirm: "Удалить",
            del_error_active_tour: "Удаление невозможно, так как вы уже сдали текущий тур. Дождитесь его завершения.",
            btn_back: "Назад",
            practice_title: "Практика",
            practice_subtitle: "Выберите предмет, сложность и количество вопросов.",
            practice_filter_subject: "Предмет",
            practice_filter_difficulty: "Сложность",
            practice_filter_count: "Количество вопросов",
            practice_filter_tour: "Тур",
            practice_filter_all: "Все",
            btn_start_practice: "Начать практику",
            btn_continue_practice: "Продолжить практику",
            menu_mistakes: "Работа над ошибками",
            menu_mistakes_desc: "Посмотреть ответы",
            menu_practice: "Практика",
            menu_practice_desc: "Режим практики",
            home_practice_subtitle: "Практика без таймера",
            home_mistakes_subtitle: "Разбор неверных ответов",
            lock_review_title: "Разбор закрыт",
            lock_review_msg: "В целях честной игры разбор ошибок станет доступен после окончания олимпиады.",
            access_locked_title: "Доступ закрыт",
            access_locked_msg: "Практика и разбор ошибок доступны после завершения хотя бы одного тура.",
             tour_info_practice_title: "Тур завершён",
            tour_info_practice_msg: "Практика и разбор ошибок доступны в разделе «Действия» на главном экране.",
            tour_info_practice_locked_title: "Практика недоступна",
            tour_info_practice_locked_msg: "Практика откроется после завершения тура.",
            btn_open_profile: "В профиль",
            subject_select_title: "Выберите предметы",
            subject_select_subtitle: "Можно выбрать от 1 до 3 предметов. После подтверждения изменить нельзя до конца 7 туров.",
            subject_select_warning: "Не более 3 предметов.",
            subject_select_next: "Продолжить",
            subject_confirm_title: "Подтвердить выбор?",
            subject_confirm_you_selected: "Вы выбрали:",
            subject_confirm_subtitle: "После подтверждения изменить предметы нельзя до завершения всех 7 туров.",
            tour_subject_pick_title: "Выберите предмет для тура",
            tour_label: "Тур",
            tour_status_active: "Активен",
            tour_status_done: "Завершён",
            tour_status_locked: "Заблокирован",
            lang_warning_reg: "Внимание: Язык и данные профиля нельзя будет изменить после сохранения!",
            lang_locked_reason: "Смена языка отключена для обеспечения честной конкуренции.",
            overall_title: "Итого",
            last_completed_tour: "Последний завершённый тур",
            home_subjects: "Предметы",
            home_actions: "Действия",
            home_resources: "Ресурсы",
            cheat_title: "НАРУШЕНИЕ!",
            cheat_msg: "Покидать приложение во время теста запрещено! При повторном нарушении тест будет завершен принудительно."
        },
        en: {
            reg_title: "Registration",
            reg_subtitle: "Enter your details",
            participant_label: "Participant",
            label_full_name: "Full Name (For certificate)",
            label_class: "Grade",
            label_region: "Region",
            label_district: "District / City",
            label_school: "School",
            consent_title: "Data Processing Consent",
            consent_desc: "For leaderboard ranking.",
            btn_save: "Save & Confirm",
            profile_locked_msg: "Data Locked",
            profile_locked_hint: "Mistake? Contact Support. (Language cannot be changed!)",
            btn_to_main: "Go to Home",
            btn_cancel: "Cancel",
            greeting_hi: "Hi",
            greeting_sub: "Welcome to the Olympiad.",
            btn_leaderboard: "Leaderboard",
            btn_about: "About",
            subjects_title: "Subjects",
            subj_math: "Math",
            subj_eng: "English",
            subj_phys: "Physics",
            subj_chem: "Chemistry",
            subj_bio: "Biology",
            subj_it: "Computer Science",
            subj_eco: "Economics",
            subj_thinking: "Thinking Skills",
            subj_global: "Global Perspectives",
            subj_business: "Business",
            subj_accounting: "Accounting",
            direction_title: "Direction",
            direction_subtitle: "Choose a direction. Available directions open based on tour results.",
            cert_title: "Certificate",
            certs_title: "Certificate",
            cert_subtitle: "Subject olympiad participant",
            cert_rank: "Rank",
            cert_score: "Score",
            cert_date: "Date",
            cert_download_pdf: "Download PDF",
            cert_share: "Share",
            cert_share_text: "Smart Olympiad certificate",
            cert_note: "Certificate verification is available by ID.",
            cert_sign: "Commission Chair",
            cert_soon: "Soon",
            link_copied: "Link copied",
            cert_share_unavailable: "Sharing is unavailable right now",
            cert_desc: "Download PDF",
            res_title: "Resources",
            res_vid_title: "Video Lessons",
            res_vid_desc: "Problem solving",
            res_ch_title: "Channel",
            res_ch_desc: "News",
            res_grp_title: "Chat Group",
            res_grp_desc: "Discussion",
            res_materials: "Materials",
            res_books_title: "Books",
            res_books_desc: "PDFs and materials",
            next_event_title: "Upcoming event",
            next_event_label: "Next tour",
            next_event_soon: "Next tour soon",
            lb_title: "Leaderboard",
            loading: "Loading...",
            btn_exit: "Exit",
            btn_next: "Next",
            res_screen_title: "Tour Result",
            res_finished: "Tour Finished!",
            res_saved: "Your result is saved",
            stat_tour: "TOUR",
            stat_total: "TOTAL",
            stat_correct: "CORRECT",
            review_title: "Mistake Review",
            review_pick_tour_subtitle: "Choose a completed tour to review your answers.",
            review_results_title: "Results: {n}",
            review_results_caption: "Subject breakdown summary",
            review_subjects: "Subjects",
            review_result_label: "Result",
            review_completed_on: "completed",
            review_your_answer: "Your answer",
            review_correct_answer: "Correct answer",
            review_explanation: "Explanation",
            review_incorrect: "Incorrect",
            review_correct: "Correct",
            review_no_data: "No data",
            review_errors: "Errors",
            review_question: "Question",
            review_back_to_results: "Back to results",
            review_choose_other_tour: "Choose another tour",
            review_to_cabinet: "Go to profile",
            review_success_title: "Great job!",
            review_success_text: "All errors for {subject} have been reviewed.",
            review_progress_label: "PROGRESS",
            review_progress_complete: "100% completed",
            data_saved: "Data Saved",
            review_desc: "Detailed review will be available after results.",
            btn_download_cert: "Download Certificate",
            lb_title: "Leaderboard",
            lb_republic: "Republic",
            lb_region: "Region",
            lb_district: "District",
            lb_participant: "PARTICIPANT",
            lb_score: "SCORE",
            you: "You",
            lb_points: "POINTS",
            lb_rank: "Rank",
            stat_tours: "Tours",
            warn_title: "Warning",
            warn_msg_1: "You have",
            warn_msg_2: "for",
            warn_msg_3: "questions.",
            warn_hint: "Questions go from Easy to Hard.",
            warn_hint_2: "You cannot go back!",
            btn_start: "Start",
            btn_close: "Close",
            my_certs: "My Certificates",
            tour_passed_title: "Tour Completed!",
            tour_passed_msg: "You have already submitted answers. Check the Leaderboard.",
            btn_channel: "Go to Channel",
            locked_alert_title: "Editing Disabled",
            locked_alert_desc: "Changes are not allowed until Olympiad ends.",
            btn_understood: "Understood",
            about_platform: "About Platform",
            about_text: "Unique platform for Uzbekistan students combining <b>Cambridge IGCSE</b>, <b>SAT</b>, and <b>IELTS</b> standards.",
            about_features: "Features",
            feat_1: "International Standards",
            feat_2: "Instant Results",
            feat_3: "Regional Ranking",
            feat_4: "Participation Certificates",
            select_region: "Select Region",
            select_district: "Select District",
            select_class: "Select Grade",
            class_s: "grade",
            save_saving: "Saving...",
            alert_fill: "Fill in all fields!",
             no_active_tour: "No Active Tours",
            tour_completed_btn: "Tour Completed",
            start_tour_btn: "Start Tour",
            main_btn_completed_hint: "Practice and mistake review are in the Actions section",
            main_btn_completed_hint_locked: "Practice and mistake review become available after the tour ends",
            main_btn_practice_hint: "Practice is available after the tour ends",
            main_btn_start_hint: "Tap to start the current tour",
            practice_btn: "Practice",
            minutes: "minutes",
            questions: "questions",
             correct_txt: "correct",
            no_data: "No data",
            your_answer: "Your answer",
            correct_answer: "Correct answer",
            review_available_after_end: "Review is available after the tour/Olympiad ends",
            curr_tour: "Current Tour",
            total_q: "Total Questions",
            school_prefix: "School",
            anonymous: "Anonymous",
            city_tashkent: "Tashkent City",
            saving_ans: "Saving...",
            repeat: "Retry",
            error: "Error",
            answer_placeholder: "Enter answer...",
            answer_required_to_continue: "Please enter an answer to move to the next question. You can go back if needed. Saving happens after all questions are completed.",
            answer_required_short: "Answer the question to continue",
            menu_my_data: "My Details",
            menu_my_data_desc: "Grade, school, region",
            menu_lang: "Language",
            menu_certs: "Certificates",
            menu_certs_desc: "Archive",
            menu_support: "Support",
            menu_support_desc: "Contact Admin",
            btn_delete_account: "Delete Account",
            del_title: "Delete Account?",
            del_msg: "All your results and ranking will be lost permanently.",
            btn_delete_confirm: "Delete",
            del_error_active_tour: "Cannot delete account while you have submitted the current tour. Please wait.",
            btn_back: "Back",
            practice_title: "Practice",
            practice_subtitle: "Choose subject, difficulty, and question count.",
            practice_filter_subject: "Subject",
            practice_filter_difficulty: "Difficulty",
            practice_filter_count: "Question count",
            practice_filter_tour: "Tour",
            practice_filter_all: "All",
            btn_start_practice: "Start practice",
            btn_continue_practice: "Continue practice",
            menu_mistakes: "Mistake Review",
            menu_mistakes_desc: "Check answers",
            menu_practice: "Practice",
            menu_practice_desc: "Practice mode",
            home_practice_subtitle: "Timer-free practice",
            home_mistakes_subtitle: "Review incorrect answers",
            lock_review_title: "Review Locked",
            lock_review_msg: "To ensure fair play, mistake review will be available after the Olympiad ends.",
            access_locked_title: "Access locked",
            access_locked_msg: "Practice and mistake review unlock after completing at least one tour.",
            tour_info_practice_title: "Tour completed",
            tour_info_practice_msg: "Practice and mistake review are available in your profile.",
            tour_info_practice_locked_title: "Practice unavailable",
            tour_info_practice_locked_msg: "Practice opens after the tour ends.",
            btn_open_profile: "Open profile",
            subject_select_title: "Choose subjects",
            subject_select_subtitle: "You can choose 1 to 3 subjects. After confirmation, you can't change them until all 7 tours are completed.",
            subject_select_warning: "No more than 3 subjects.",
            subject_select_next: "Continue",
            subject_confirm_title: "Confirm selection?",
            subject_confirm_you_selected: "You selected:",
            subject_confirm_subtitle: "After confirmation, you cannot change subjects until all 7 tours are completed.",
            tour_subject_pick_title: "Choose a subject for the tour",
            tour_label: "Tour",
            tour_status_active: "Active",
            tour_status_done: "Completed",
            tour_status_locked: "Locked",
            lang_warning_reg: "Attention: Language and profile data cannot be changed after saving!",
            lang_locked_reason: "Language changing is disabled to ensure fair competition.",
            overall_title: "Overall",
            last_completed_tour: "Last completed tour",
            home_subjects: "Subjects",
            home_actions: "Actions",
            home_resources: "Resources",
            cheat_title: "VIOLATION!",
            cheat_msg: "Leaving the app is prohibited! Next time the test will be terminated automatically."
        }
    };

  function t(key) {
        return (translations[currentLang] && translations[currentLang][key]) || key;
    }

    function tSafe(key, fallback) {
        const value = t(key);
        return value && value !== key ? value : fallback;
    }

    // FIX #2: Улучшенная функция setLanguage - не вызывает повторные обновления UI если язык не изменился  
  function setLanguage(lang, forceUpdate = false) {
        if (isLangLocked && lang !== currentLang && !forceUpdate) {
            return; 
        }
        
        if (!translations[lang]) lang = 'uz'; 
        
        // Если язык не изменился и не форсированное обновление - выходим
        if (lang === currentLang && !forceUpdate && isInitialized) {
            return;
        }
        
        currentLang = lang;
        
        const regLangSel = document.getElementById('reg-lang-select');
        if (regLangSel) regLangSel.value = lang;
        
        const cabLangSel = document.getElementById('lang-switcher-cab');
        if (cabLangSel) cabLangSel.value = lang;
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                el.innerHTML = translations[lang][key]; 
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[lang] && translations[lang][key]) {
                el.placeholder = translations[lang][key];
            }
        });
        updateSelectPlaceholders();
        
        // Не трогаем главную кнопку пока приложение не инициализировано
if (!isInitialized) {
  // оставляем как есть (Yuklanmoqda...)
} else {
  if (tourCompleted) {
    updateMainButton('completed');
  } else if (currentTourId) {
    updateMainButton('start', currentTourTitle);
  } else {
    updateMainButton('inactive');
  }
}

        
        if (currentTourId && isInitialized) fetchStatsData();
    }

    function updateSelectPlaceholders() {
        const regionSel = document.getElementById('region-select');
        if (regionSel && regionSel.options.length > 0) regionSel.options[0].textContent = t('select_region');
        
        const districtSel = document.getElementById('district-select');
        if (districtSel && districtSel.options.length > 0) districtSel.options[0].textContent = t('select_district');

        const classSel = document.getElementById('class-select');
        if (classSel && classSel.options.length > 0) classSel.options[0].textContent = t('select_class');
    }

    const langSwitcherCab = document.getElementById('lang-switcher-cab');
    if (langSwitcherCab) {
        langSwitcherCab.addEventListener('change', (e) => {
            if (!isLangLocked) {
                setLanguage(e.target.value);
                try {
                    localStorage.setItem('user_lang', e.target.value); 
                } catch (err) { console.warn(err); }
            } else {
                langSwitcherCab.value = currentLang;
                alert(t('lang_locked_reason'));
            }
        });
    }
    
    const regLangSelect = document.getElementById('reg-lang-select');
    if (regLangSelect) {
        regLangSelect.addEventListener('change', (e) => {
            if (!isLangLocked) {
                setLanguage(e.target.value);
                try {
                    localStorage.setItem('user_lang', e.target.value);
                } catch (err) { console.warn(err); }
            }
        });
    }

    // === ИНИЦИАЛИЗАЦИЯ TELEGRAM (SECURE MODE) ===
        
    // FIX #2: Исправленная функция инициализации языка - единая точка инициализации
    function initializeLanguage(dbLang) {
        // Priority: 1. DB fixed_language, 2. localStorage, 3. Telegram language, 4. default 'uz'
        if (dbLang && translations[dbLang]) {
            currentLang = dbLang;
            setLanguage(dbLang, true); // force update
            return;
        }
        
        let savedLang = null;
        try {
            savedLang = localStorage.getItem('user_lang');
        } catch (e) {
            console.warn("LocalStorage access denied");
        }
        
        if (savedLang && translations[savedLang]) {
            currentLang = savedLang;
            setLanguage(savedLang, true);
        } else if (telegramData.languageCode) {
            if (telegramData.languageCode === 'ru') {
                currentLang = 'ru';
                setLanguage('ru', true);
            } else if (telegramData.languageCode === 'en') {
                currentLang = 'en';
                setLanguage('en', true);
            } else {
                currentLang = 'uz';
                setLanguage('uz', true);
            }
        } else {
            currentLang = 'uz';
            setLanguage('uz', true);
        }
    }

    // === ДАННЫЕ РЕГИОНОВ ===
    const regions = {
        "Toshkent shahri": ["Bektemir tumani", "Chilonzor tumani", "Mirobod tumani", "Mirzo Ulug'bek tumani", "Olmazor tumani", "Sergeli tumani", "Shayxontohur tumani", "Uchtepa tumani", "Yakkasaroy tumani", "Yangihayot tumani", "Yashnobod tumani", "Yunusobod tumani"],
        "Andijon viloyati": ["Andijon shahri", "Xonobod shahri", "Andijon tumani", "Asaka tumani", "Baliqchi tumani", "Bo'z tumani", "Buloqboshi tumani", "Izboskan tumani", "Jalaquduq tumani", "Marhamat tumani", "Oltinko'l tumani", "Paxtaobod tumani", "Qo'rg'ontepa tumani", "Shahrixon tumani", "Ulug'nor tumani", "Xo'jaobod tumani"],
        "Buxoro viloyati": ["Buxoro shahri", "Kogon shahri", "Buxoro tumani", "G'ijduvon tumani", "Jondor tumani", "Kogon tumani", "Olot tumani", "Peshku tumani", "Qorako'l tumani", "Qorovulbozor tumani", "Romitan tumani", "Shofirkon tumani", "Vobkent tumani"],
        "Farg'ona viloyati": ["Farg'ona shahri", "Marg'ilon shahri", "Qo'qon shahri", "Quvasoy shahri", "Bag'dod tumani", "Beshariq tumani", "Buvayda tumani", "Dang'ara tumani", "Farg'ona tumani", "Furqat tumani", "Oltiariq tumani", "Qo'shtepa tumani", "Quva tumani", "Rishton tumani", "So'x tumani", "Toshloq tumani", "Uchko'prik tumani", "O'zbekiston tumani", "Yozyovon tumani"],
        "Jizzax viloyati": ["Jizzax shahri", "Arnasoy tumani", "Baxmal tumani", "Do'stlik tumani", "Forish tumani", "G'allaorol tumani", "Jizzax tumani", "Mirzacho'l tumani", "Paxtakor tumani", "Sharof Rashidov tumani", "Yangiobod tumani", "Zomin tumani", "Zarbdor tumani", "Zafarobod tumani"],
        "Xorazm viloyati": ["Urganch shahri", "Xiva shahri", "Bog'ot tumani", "Gurlan tumani", "Xiva tumani", "Hazorasp tumani", "Xonqa tumani", "Q'shko'pir tumani", "Shovot tumani", "Urganch tumani", "Yangiariq tumani", "Yangibozor tumani"],
        "Namangan viloyati": ["Namangan shahri", "Chortoq tumani", "Chust tumani", "Kosonsoy tumani", "Mingbuloq tumani", "Namangan tumani", "Norin tumani", "Pop tumani", "To'raqo'rg'on tumani", "Uchqo'rg'on tumani", "Uychi tumani", "Yangiqo'rg'on tumani"],
        "Navoiy viloyati": ["Navoiy shahri", "Zarafshon shahri", "G'ozg'on shahri", "Konimex tumani", "Karmana tumani", "Qiziltepa tumani", "Xatirchi tumani", "Navbahor tumani", "Nurota tumani", "Tomdi tumani", "Uchquduq tumani"],
        "Qashqadaryo viloyati": ["Qarshi shahri", "Shahrisabz shahri", "Chiroqchi tumani", "Dehqonobod tumani", "G'uzor tumani", "Qamashi tumani", "Qarshi tumani", "Kasbi tumani", "Kitob tumani", "Koson tumani", "Mirishkor tumani", "Muborak tumani", "Nishon tumani", "Shahrisabz tumani", "Yakkabog' tumani", "Ko'kdala tumani"],
        "Qoraqalpog'iston Respublikasi": ["Nukus shahri", "Amudaryo tumani", "Beruniy tumani", "Chimboy tumani", "Ellikqal'a tumani", "Kegeyli tumani", "Mo'ynoq tumani", "Nukus tumani", "Qanliko'l tumani", "Qo'ng'irot tumani", "Qorao'zak tumani", "Shumanay tumani", "Taxtako'pir tumani", "To'rtko'l tumani", "Xo'jayli tumani", "Taxiatosh tumani", "Bo'zatov tumani"],
        "Samarqand viloyati": ["Samarqand shahri", "Kattaqo'rg'on shahri", "Bulung'ur tumani", "Ishtixon tumani", "Jomboy tumani", "Kattaqo'rg'on tumani", "Qo'shrabot tumani", "Narpay tumani", "Nurabod tumani", "Oqdaryo tumani", "Paxtachi tumani", "Payariq tumani", "Pastdarg'om tumani", "Samarqand tumani", "Toyloq tumani", "Urgut tumani"],
        "Sirdaryo viloyati": ["Guliston shahri", "Yangiyer shahri", "Shirin shahri", "Oqoltin tumani", "Boyovut tumani", "Guliston tumani", "Xovos tumani", "Mirzaobod tumani", "Sayxunobod tumani", "Sardoba tumani", "Sirdaryo tumani"],
        "Surxondaryo viloyati": ["Termiz shahri", "Angor tumani", "Bandixon tumani", "Boysun tumani", "Denov tumani", "Jarqo'rg'on tumani", "Qiziriq tumani", "Qumqo'rg'on tumani", "Muzrabot tumani", "Oltinsoy tumani", "Sariosiyo tumani", "Sherobod tumani", "Sho'rchi tumani", "Termiz tumani", "Uzun tumani"],
        "Toshkent viloyati": ["Nurafshon shahri", "Olmaliq shahri", "Angren shahri", "Bekobod shahri", "Ohangaron shahri", "Chirchiq shahri", "Yangiyo'l shahri", "Bekobod tumani", "Bo'stonliq tumani", "Bo'ka tumani", "Chinoz tumani", "Qibray tumani", "Ohangaron tumani", "Oqqo'rg'on tumani", "Parkent tumani", "Piskent tumani", "Quyi Chirchiq tumani", "O'rta Chirchiq tumani", "Yangiyo'l tumani", "Yuqori Chirchiq tumani", "Zangiota tumani"]
    };
  
    // Настройка селектов
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.innerHTML = `<option value="" disabled selected>${t('select_region')}</option>`;
        Object.keys(regions).sort().forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });
        
        regionSelect.addEventListener('change', () => {
            const districtSelect = document.getElementById('district-select');
            if (!districtSelect) return;
            districtSelect.innerHTML = `<option value="" disabled selected>${t('select_district')}</option>`;
            districtSelect.disabled = false;
            const selected = regionSelect.value;
            if (selected && regions[selected]) {
                regions[selected].sort().forEach(district => {
                    const option = document.createElement('option');
                    option.value = district;
                    option.textContent = district;
                    districtSelect.appendChild(option);
                });
            }
        });
    }
  
    const classSelect = document.getElementById('class-select');
    if (classSelect) {
        classSelect.innerHTML = `<option value="" disabled selected>${t('select_class')}</option>`;
        for (let i = 8; i <= 11; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i + ' ' + t('class_s');
            classSelect.appendChild(option);
        }
    }

    // FIX #1: Исправленная проверка профиля - правильная валидация isComplete
    function isProfileComplete(authData) {
         if (!authData) {
            return false;
        }
        
        // FIX: Проверяем full_name - должно быть непустой строкой > 2 символов
        const hasFullName = authData.full_name && 
                           String(authData.full_name).trim().length > 2;
        
        // FIX: class может быть числом (8,9,10,11) или строкой ("8","9","10","11")
        // Просто проверяем что значение существует и не пустое
        const hasClass = authData.class !== null && 
                        authData.class !== undefined && 
                        String(authData.class).trim() !== '';
        
        // FIX: region и district - проверяем что это непустые строки
        const hasRegion = authData.region && 
                         String(authData.region).trim() !== '';
        
        const hasDistrict = authData.district && 
                           String(authData.district).trim() !== '';
        
        const isComplete = hasFullName && hasClass && hasRegion && hasDistrict;
        
       return isComplete;
    } 
   
   async function checkProfileAndTour() {
    if (!tgInitData) {
    console.error('[checkProfileAndTour] INITDATA EMPTY');
    const loader = document.getElementById('app-loader');
    if (loader) loader.style.display = 'none';
    alert("Приложение доступно только внутри Telegram.");
    return;
  }

  // основной логин
  const { data: authData, error: authError } = await supabaseClient
    .rpc('telegram_login', { p_init_data: tgInitData })
    .single();

  if (authError || !authData || authData.id == null) {
    console.error("Auth error detail:", authError);
    const msg = authError ? authError.message : "Identifikatsiya xatosi (ID null)";
    throw new Error(msg);
  }

  internalDbId = String(authData.id);
  currentUserData = authData;

  // telegramUserId fallback
  if (!telegramUserId && authData.telegram_id) {
    telegramUserId = String(authData.telegram_id);
  }

  // UI name
  const uiName = (() => {
    const tgName = [telegramData.firstName, telegramData.lastName].filter(Boolean).join(' ').trim();
    if (tgName) return tgName;

    const dbName = (authData.full_name || authData.name || '').trim();
    if (dbName) return dbName;

    return t('participant_label');
  })();

  const homeName = document.getElementById('home-user-name');
  if (homeName) homeName.textContent = uiName;

  const regName = document.getElementById('reg-user-name');
  if (regName) regName.textContent = uiName;

  const cabName = document.getElementById('cab-name');
  if (cabName) cabName.textContent = uiName;

  const elID = document.getElementById('cab-id');
  if (elID) elID.textContent = String(telegramUserId || '').slice(-6);

  const resolvedAvatarUrl = authData.avatar_url || telegramData.photoUrl || null;
  if (!authData.avatar_url && telegramData.photoUrl) {
    try {
      await supabaseClient.from('users').update({ avatar_url: telegramData.photoUrl }).eq('id', internalDbId);
      currentUserData.avatar_url = telegramData.photoUrl;
    } catch (e) {
      console.warn('[avatar] update skipped', e);
    }
  }

  if (resolvedAvatarUrl) {
    const cabAvatar = document.getElementById('cab-avatar-img');
    if (cabAvatar) cabAvatar.src = resolvedAvatarUrl;

    const regAvatar = document.querySelector('.profile-info-card .avatar-circle img');
    if (regAvatar) regAvatar.src = resolvedAvatarUrl;
  }

  const versionEl = document.getElementById('cab-app-version');
  if (versionEl) versionEl.textContent = `v${APP_VERSION}`;

  // язык: приоритет БД
  if (authData.fixed_language && translations[authData.fixed_language]) {
    isLangLocked = true;
    initializeLanguage(authData.fixed_language);
    try { localStorage.setItem('user_lang', authData.fixed_language); } catch (e) { console.warn(e); }

    const cabLang = document.getElementById('lang-switcher-cab');
    if (cabLang) {
      cabLang.disabled = true;
      cabLang.style.opacity = '0.5';
      cabLang.style.cursor = 'not-allowed';
    }
   } else {
    initializeLanguage(null);
  }

  await syncDirectionState();

  // профиль
  const isComplete = isProfileComplete(authData);
  if (!isComplete) {
    showScreen('reg-screen');
    unlockProfileForm();
    const backBtn = document.getElementById('reg-back-btn');
    if (backBtn) backBtn.classList.add('hidden');
  } else {
    isProfileLocked = true;
    isLangLocked = true;

    const cabLang = document.getElementById('lang-switcher-cab');
    if (cabLang) {
      cabLang.disabled = true;
      cabLang.style.opacity = '0.5';
      cabLang.style.cursor = 'not-allowed';
    }

    const regLang = document.getElementById('reg-lang-select');
    if (regLang) {
      regLang.disabled = true;
      regLang.style.opacity = '0.5';
    }

     fillProfileForm(authData);
    showScreen('home-screen');
    initSubjectSelectionFlow();
    await fetchStatsData();
  }
  // 1) берём активный тур, иначе последний
  let { data: tourData, error: tourErr } = await supabaseClient
    .from('tours')
    .select('id, title, start_date, end_date, is_active')
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tourErr) console.error("Tour fetch error:", tourErr);

  if (!tourData) {
    const lastRes = await supabaseClient
      .from('tours')
      .select('id, title, start_date, end_date, is_active')
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    tourData = lastRes.data;
    if (lastRes.error) console.error("Last tour fetch error:", lastRes.error);
  }

  
  // если туров нет вообще
  if (!tourData) {
    currentTourId = null;
    currentTourTitle = "";
    currentTourEndDate = null;
    tourCompleted = false;
    updateMainButton('inactive');
    isInitialized = true;
    return;
  }

  currentTourId = tourData.id;
  currentTourTitle = tourData.title;
  currentTourEndDate = tourData.end_date;

  const nowTour = new Date();
  const end = currentTourEndDate ? new Date(currentTourEndDate) : null;

  const isTourEnded = !!(end && nowTour >= end); // конец тура = только end_date

  
  const unlockEl = document.getElementById('review-unlock-date');
  if (unlockEl && currentTourEndDate) {
    unlockEl.textContent = new Date(currentTourEndDate).toLocaleString();
  }

  // 2) грузим вопросы ВСЕГДА (даже если тур завершён) — нужно для practice
  const { data: qData, error: qErr } = await supabaseClient
    .from('questions')
    .select('id, subject, topic, question_text, options_text, type, tour_id, time_limit_seconds, language, difficulty, image_url')
    .eq('tour_id', currentTourId)
    .eq('language', currentLang)
    .order('id', { ascending: true });

  if (qErr) {
    console.error('[TOUR] questions fetch error:', qErr);
    tourQuestionsCache = [];
  } else {
    tourQuestionsCache = qData || [];
  }

  // 3) проверяем прогресс
  const { data: pData, error: pErr } = await supabaseClient
    .from('tour_progress')
    .select('score')
    .eq('user_id', internalDbId)
    .eq('tour_id', currentTourId)
    .maybeSingle();

  if (pErr) console.error('[TOUR] progress fetch error:', pErr);

  const doneByProgress = !!(pData && pData.score !== null);

// tourCompleted = "пользователь сдавал и результат есть"
tourCompleted = doneByProgress;

// Состояние тура:
if (isTourEnded) {
  // ENDED_TAKEN / ENDED_NOT_TAKEN
  if (doneByProgress) updateMainButton('completed', tourData.title);         // сдавал → completed (Practice по клику)
  else updateMainButton('ended_not_taken', tourData.title);                   // не сдавал → сразу Practice
} else {
  // ACTIVE
  if (tourData.is_active === true) {
    if (doneByProgress) updateMainButton('completed', tourData.title);        // ACTIVE_TAKEN (Practice закрыт до end_date)
    else updateMainButton('start', tourData.title);                           // ACTIVE_AVAILABLE
  } else {
    updateMainButton('inactive');                                             // не активен и не завершён
  }
}
    // ✅ После того как currentTourId определён и прогресс прочитан — перерисовать карточки
  // Иначе при первом рендере будет "Тур —/7" и серые dots
  renderSubjectTabsUI?.();
  renderAllSubjectCardProgress?.();
  renderHomeContextUI?.();

  isInitialized = true;
}

function fillProfileForm(data) {
    const fullNameInput = document.getElementById('full-name-input');
    const classSelectEl = document.getElementById('class-select');
    const regionSelectEl = document.getElementById('region-select');
    const districtSelectEl = document.getElementById('district-select');
    const schoolInput = document.getElementById('school-input');

    if (fullNameInput) fullNameInput.value = data.full_name || '';
    if (classSelectEl) classSelectEl.value = data.class || '';

    if (regionSelectEl && data.region) {
        regionSelectEl.value = data.region;
        regionSelectEl.dispatchEvent(new Event('change'));

        setTimeout(() => {
            if (districtSelectEl && data.district) {
                districtSelectEl.value = data.district;
            }
        }, 50);
    }
    if (schoolInput) schoolInput.value = data.school || '';
}
    
    function lockProfileForm(showMessage = false) {
        const inputs = ['full-name-input', 'class-select', 'region-select', 'district-select', 'school-input', 'research-consent'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = true;
                el.style.opacity = '0.6';
            }
        });
        
        const regLangEl = document.getElementById('reg-lang-select');
        if (regLangEl) {
            regLangEl.disabled = true;
            regLangEl.style.opacity = '0.5';
        }
        
        const saveBtn = document.getElementById('save-profile');
        if (saveBtn) saveBtn.classList.add('hidden');
        
        const lockedBanner = document.getElementById('reg-locked-banner');
        if (lockedBanner) lockedBanner.classList.remove('hidden');
        
        const warningText = document.getElementById('lang-warning-text');
        if (warningText) warningText.classList.add('hidden');
    }
    
    function unlockProfileForm() {
        const inputs = ['full-name-input', 'class-select', 'region-select', 'district-select', 'school-input', 'research-consent'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = false;
                el.style.opacity = '1';
            }
        });
        
        const regLangEl = document.getElementById('reg-lang-select');
        if (regLangEl && !isLangLocked) {
            regLangEl.disabled = false;
            regLangEl.style.opacity = '1';
        }
        
        const saveBtn = document.getElementById('save-profile');
        if (saveBtn) saveBtn.classList.remove('hidden');
        
        const lockedBanner = document.getElementById('reg-locked-banner');
        if (lockedBanner) lockedBanner.classList.add('hidden');
        
        const warningText = document.getElementById('lang-warning-text');
        if (warningText && !isLangLocked) warningText.classList.remove('hidden');
    }

    // FIX #5: Исправленная статистика - получаем данные по текущему языку пользователя
    async function fetchStatsData() {
  if (!internalDbId) return;

  // Для карточек предметов нужны данные "не только текущего тура":
  // берём все завершённые туры пользователя + текущий (если есть), чтобы:
  //  - "Нет данных" исчезало (есть ответы из прошлых туров)
  //  - прогресс/точность считались стабильно
  let tourIds = [];

  try {
    const { data: progressData, error: progressErr } = await supabaseClient
      .from('tour_progress')
      .select('tour_id, score')
      .eq('user_id', internalDbId);

    if (progressErr) console.error('[fetchStatsData] tour_progress error:', progressErr);

    const completed = new Set(
      (progressData || [])
        .filter(row => row && row.score !== null && row.score !== undefined)
        .map(row => String(row.tour_id))
    );

    tourIds = Array.from(completed);

    if (currentTourId) tourIds.push(String(currentTourId));
    tourIds = Array.from(new Set(tourIds)).filter(Boolean);
  } catch (e) {
    console.warn('[fetchStatsData] tour_progress fetch failed', e);
    if (currentTourId) tourIds = [String(currentTourId)];
  }

  if (!tourIds.length) return;

  // 1) Вопросы по выбранным турам на текущем языке — для статистики
  const { data: qData, error: qErr } = await supabaseClient
    .from('questions')
    .select('id, subject, topic, difficulty, tour_id, language')
    .in('tour_id', tourIds.map(id => Number(id)).filter(Number.isFinite))
    .eq('language', currentLang);

  if (qErr) console.error('[fetchStatsData] questions error:', qErr);
  tourQuestionsAllCache = qData || [];

  // 2) Ответы пользователя по этим вопросам (JOIN к questions)
  const { data: ansData, error: aErr } = await supabaseClient
    .from('user_answers')
    .select('question_id, is_correct, questions!inner(id, tour_id, language)')
    .eq('user_id', internalDbId)
    .eq('questions.language', currentLang)
    .in('questions.tour_id', tourIds.map(id => Number(id)).filter(Number.isFinite));

  // Если JOIN не сработал — fallback: берём ответы без JOIN и фильтруем по allowedIds
  if (aErr) {
    console.error('[fetchStatsData] answers join error:', aErr);

    const { data: rawAns, error: rawErr } = await supabaseClient
      .from('user_answers')
      .select('question_id, is_correct')
      .eq('user_id', internalDbId);

    if (rawErr) console.error('[fetchStatsData] fallback answers error:', rawErr);

    const allowedIds = new Set((tourQuestionsAllCache || []).map(q => q.id));
    userAnswersCache = (rawAns || []).filter(a => allowedIds.has(a.question_id));

    refreshCabinetAccessUI();
    renderAllSubjectCardProgress();
    renderHomeContextUI();
    return;
  }

  userAnswersCache = (ansData || []).map(a => ({
    question_id: a.question_id,
    is_correct: a.is_correct
  }));

  refreshCabinetAccessUI();
  renderAllSubjectCardProgress();
  renderHomeContextUI();
}

 function calculateSubjectStats(prefix) {
  const normalizedPrefix = normalizeSubjectKey(prefix);
  const subjectQuestions = (tourQuestionsAllCache || []).filter(q => {
    const normalizedSubject = normalizeSubjectKey(q.subject);
    return normalizedSubject && normalizedSubject === normalizedPrefix;
  });   

  let correct = 0;
  subjectQuestions.forEach(q => {
    const a = (userAnswersCache || []).find(x => x.question_id === q.id);
    if (a && a.is_correct) correct++;
  });

  return { total: subjectQuestions.length, correct };
}

  function renderSubjectInlineStats(card, prefix) {
  if (!card) return;
  const inlineEl = card.querySelector('.subject-inline');
  if (!inlineEl) return;

  inlineEl.classList.remove('hidden');

  const key = normalizeSubjectKey(prefix);

  // Общая статистика по всем турам (по тем вопросам, которые загружены в tourQuestionsAllCache)
  const allQs = (tourQuestionsAllCache || []).filter(q => {
    const normalizedSubject = normalizeSubjectKey(q?.subject);
    return normalizedSubject && normalizedSubject === key;
  }); 

  const allIds = new Set(allQs.map(q => q.id));
  const allAns = (userAnswersCache || []).filter(a => allIds.has(a.question_id));

  const allTotal = allQs.length;
  const allCorrect = allAns.filter(a => !!a.is_correct).length;

  // Статистика по текущему туру (или по последнему завершённому — это тот же номер/тур в UI)
  const currentTourIdNum = Number(currentTourId);
  const tourQs = allQs.filter(q => Number(q.tour_id) === currentTourIdNum);
  const tourIds = new Set(tourQs.map(q => q.id));
  const tourAns = (userAnswersCache || []).filter(a => tourIds.has(a.question_id));
  const tourTotal = tourQs.length;
  const tourCorrect = tourAns.filter(a => !!a.is_correct).length;

  const tourLabelBase = tSafe('tour_label', 'Тур');
  const currentTourLabel = tSafe('curr_tour', 'Текущий тур');
  const tourNumber = getCurrentTourNumber();
  const isCompleted = !!tourCompleted;

  const completedLabel = `${tSafe('last_completed_tour', 'Последний завершённый тур')}${
    Number.isFinite(tourNumber) ? ` (${tourLabelBase} ${tourNumber})` : ''
  }`;

  const tourLabel = isCompleted ? completedLabel : currentTourLabel;

  inlineEl.innerHTML = `
    <div class="subject-inline-section">
      <div class="subject-inline-title">${tSafe('overall_title', 'Итого')}</div>
      <div class="subject-inline-row">
        <span>${tSafe('total_q', 'Всего вопросов')}</span>
        <strong>${allTotal}</strong>
      </div>
      <div class="subject-inline-row">
        <span>${tSafe('correct_txt', 'Верно')}</span>
        <strong>${allCorrect}</strong>
      </div>
    </div>

    <div class="subject-inline-section">
      <div class="subject-inline-title">${tourLabel}</div>
      <div class="subject-inline-row">
        <span>${tSafe('total_q', 'Всего вопросов')}</span>
        <strong>${tourTotal}</strong>
      </div>
      <div class="subject-inline-row">
        <span>${tSafe('correct_txt', 'Верно')}</span>
        <strong>${tourCorrect}</strong>
      </div>
    </div>
  `;
}
 

    window.openSubjectStats = function(prefix) {
        const modal = document.getElementById('subject-details-modal');
        const content = document.getElementById('sd-content');
        const title = document.getElementById('sd-title');
        
        if (!modal || !content) return;
        
        let subjTitle = t('subj_' + prefix);
        if (!subjTitle || subjTitle === ('subj_' + prefix)) subjTitle = prefix.toUpperCase();

        if (title) title.textContent = subjTitle;
        
        const stats = calculateSubjectStats(prefix);
        const html = `
            <div class="stat-list-item">
                <div class="stat-list-info">
                    <h4>${t('curr_tour')}</h4>
                    <p>${t('total_q')}: ${stats.total || 0}</p> 
                </div>
                <div class="stat-list-value" style="color:${stats.correct > 0 ? 'var(--success)' : 'var(--text-sec)'}">
                    ${stats.correct} ${t('correct_txt')}
                </div>
            </div>`;
        content.innerHTML = html; 
         modal.classList.remove('hidden');
    };

    function setActiveSubject(prefix) {
        const normalized = normalizeSubjectKey(prefix);
        if (!normalized) return;
        const selected = isDirectionTourMode()
          ? getAllowedSubjectsByDirection(selectedDirectionKey)
          : getSelectedSubjects();
        if (selected.length && !selected.includes(normalized)) return;
        activeSubject = normalized;
        try {
            localStorage.setItem('active_subject', normalized);
        } catch (e) {
            console.warn('[activeSubject] localStorage failed', e);
        }
         renderSubjectTabsUI();
         renderHomeContextUI();
        renderAllSubjectCardProgress();
    }

     function initActiveSubject() {
  ensureActiveSubjectValid(getSelectedSubjects());
  // На старте нужно сразу “разбудить” карточки:
  // - подсветка активного предмета
  // - прогресс тура (dots + label)
  // - preinfo ("Верно x/y"), без ожидания клика
  renderSubjectTabsUI();
  renderAllSubjectCardProgress();
  renderHomeContextUI();
}

    function renderSubjectTabsUI() {
        document.querySelectorAll('.subject-card[data-subject]').forEach(card => {
            const isActive = normalizeSubjectKey(card.dataset.subject) === activeSubject;
            card.classList.toggle('is-active', isActive);
        });
    }
    function renderHomeContextUI() {
        renderNextEventCard();
    }

    function renderNextEventCard() {
        const nextTourEl = document.getElementById('next-tour-text');
        if (!nextTourEl) return;
        const totalTours = 7;
        const currentNumber = getCurrentTourNumber();
        if (Number.isFinite(currentNumber) && currentNumber > 0) {
            if (currentNumber < totalTours) {
                nextTourEl.textContent = `Тур ${currentNumber + 1} скоро`;
                return;
            }
            if (currentNumber === totalTours) {
                nextTourEl.textContent = `Все ${totalTours} туров завершены`;
                return;
            }
        }
        nextTourEl.textContent = 'Следующий тур скоро';
    }
  
    function getCurrentTourNumber() {
        if (Number.isFinite(currentTourId)) return currentTourId;
        const numericId = Number(currentTourId);
        if (Number.isFinite(numericId)) return numericId;
        if (currentTourTitle) {
            const match = String(currentTourTitle).match(/\d+/);
            if (match) return Number(match[0]);
        }
        return null;
    }

    function getCompletedToursCount() {
        const counts = [];
        if (currentUserData) {
            const values = [
                currentUserData.completed_tours,
                currentUserData.tours_completed,
                currentUserData.completedTours,
                currentUserData.tours_count
            ];
            values.forEach(val => {
                if (Number.isFinite(val)) counts.push(Number(val));
            });
        }
        const currentNumber = getCurrentTourNumber();
        if (tourCompleted && Number.isFinite(currentNumber)) counts.push(currentNumber);
        if (!counts.length) return 0;
        return Math.max(...counts);
    }

    function hasSubjectAnswersInCurrentTour(subjectKey) {
        const normalized = normalizeSubjectKey(subjectKey);
        if (!normalized) return false;
        const ids = new Set(
            (tourQuestionsAllCache || [])
                .filter(q => String(q.subject || '').toLowerCase().startsWith(normalized))
                .map(q => q.id)
        );
        if (!ids.size) return false;
        return (userAnswersCache || []).some(a => ids.has(a.question_id));
    }

    function renderSubjectCardProgress(prefix, cardEl) {
        const card = cardEl || document.querySelector(`.subject-card[data-subject="${prefix}"]`);
        if (!card) return;
        const dotsEl = card.querySelector('.tour-dots');
        const labelEl = card.querySelector('.tour-label');
        if (!dotsEl && !labelEl) return;
        const totalTours = 7;
        const tourNumber = getCurrentTourNumber();
        const isValidTour = Number.isFinite(tourNumber) && tourNumber > 0;
        const activeCount = isValidTour ? Math.min(totalTours, tourNumber) : 0;
        const tourLabel = tSafe('tour_label', 'Тур');
        if (labelEl) {
            labelEl.textContent = isValidTour
                ? `${tourLabel} ${activeCount} / ${totalTours}`
                : `${tourLabel} — / ${totalTours}`;
        }
                if (dotsEl) {
            dotsEl.innerHTML = Array.from({ length: totalTours }, (_, index) => (
                `<span class="tour-dot${index < activeCount ? ' is-active' : ''}"></span>`
            )).join('');
        }

        // === pre-info (до раскрытия карточки) ===
        const preWrap = card.querySelector('.subject-preinfo');
        if (preWrap) {
            const pillProgress = preWrap.querySelector('[data-kind="progress"]');
            const pillAccuracy = preWrap.querySelector('[data-kind="accuracy"]');

            if (pillProgress && labelEl) {
                pillProgress.textContent = labelEl.textContent || '—';
            }

            if (pillAccuracy) {
                const stats = calculateSubjectStats(prefix);
                const total = Number(stats.total || 0);
                const correct = Number(stats.correct || 0);

                if (total > 0) {
                    pillAccuracy.textContent = `${tSafe('correct_txt', 'Верно')} ${correct}/${total}`;
                } else {
                    pillAccuracy.textContent = tSafe('no_data', 'Нет данных');
                }
            }
        }
    }


    function renderAllSubjectCardProgress() {
        document.querySelectorAll('.subject-card[data-subject]').forEach(card => {
            renderSubjectCardProgress(card.dataset.subject, card);
        });
    }

    function renderSubjectSelectList(selected) {
        const listEl = document.getElementById('subject-select-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        const list = Array.isArray(selected) ? selected : [];
        const subjects = getAvailableSubjectKeys({ includeHidden: true, includeDirectionOnly: false });
        subjects.forEach(key => {
            const item = document.createElement('label');
            item.className = 'subject-select-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = key;
            checkbox.checked = list.includes(key);

            const text = document.createElement('span');
            text.textContent = subjectDisplayName(key);

            item.appendChild(checkbox);
            item.appendChild(text);
            listEl.appendChild(item);
        });
    }

    function updateSubjectSelectState() {
        const listEl = document.getElementById('subject-select-list');
        if (!listEl) return;
        const inputs = Array.from(listEl.querySelectorAll('input[type="checkbox"]'));
        const checked = inputs.filter(input => input.checked);
        const count = checked.length;
        const btn = document.getElementById('subject-select-next');
        if (btn) btn.disabled = count < 1;

        inputs.forEach(input => {
            input.disabled = !input.checked && count >= 3;
        });
    }

    function getSelectedSubjectsFromModal() {
        const listEl = document.getElementById('subject-select-list');
        if (!listEl) return [];
        return Array.from(listEl.querySelectorAll('input[type="checkbox"]:checked'))
            .map(input => normalizeSubjectKey(input.value))
            .filter(Boolean);
    }

    function openSubjectSelectModal(options = {}) {
        if (isDirectionTourMode()) return;
        if (isSubjectsLocked()) return;
        const modal = document.getElementById('subject-select-modal');
        if (!modal) return;
        if (!options.preserve) {
            const selected = getSelectedSubjects();
            renderSubjectSelectList(selected);
        }
        updateSubjectSelectState();
        modal.classList.remove('hidden');
    }

    function openSubjectConfirmModal(selected) {
        const modal = document.getElementById('subject-confirm-modal');
        if (!modal) return;
        const list = Array.isArray(selected) ? selected : [];
        const textEl = document.getElementById('subject-confirm-text');
        if (textEl) {
            const names = list.map(key => subjectDisplayName(key)).join(', ');
            const prefix = (typeof t === 'function') ? t('subject_confirm_you_selected') : 'Вы выбрали:';
            textEl.textContent = `${prefix} ${names}.`;
        }
        modal.classList.remove('hidden');
    }

    // === ЛИДЕРБОРД ===
    window.setLeaderboardFilter = function(filter) {
        currentLbFilter = filter;
        document.querySelectorAll('.lb-segment').forEach(el => el.classList.remove('active'));
        const filterEl = document.getElementById(`filter-${filter}`);
        if (filterEl) filterEl.classList.add('active');
        loadLeaderboard();
    };

    async function loadLeaderboard() {
        const podium = document.getElementById('lb-podium');
        const listEl = document.getElementById('lb-list');
        const stickyBar = document.getElementById('lb-user-sticky');
        
        if (podium) podium.innerHTML = `<p style="text-align:center;width:100%;color:#999;margin-top:20px;"><i class="fa-solid fa-spinner fa-spin"></i> ${t('loading')}</p>`;
        if (listEl) listEl.innerHTML = '';

        if (!currentUserData && internalDbId) {
            const { data } = await supabaseClient
  .from('users')
  .select('id, name, full_name, class, avatar_url, region, district, school, fixed_language')
  .eq('id', internalDbId)
  .single();
            currentUserData = data;
        }

        let progressData = [];

        try {
            if (currentLbFilter === 'republic') {
                let query = supabaseClient.from('tour_progress').select('user_id, score').order('score', { ascending: false }).limit(50);
                if (currentTourId) query = query.eq('tour_id', currentTourId);
                const { data, error } = await query;
                if (error) throw error;
                progressData = data || [];
            } else {
                if (!currentUserData) {
                    if (podium) podium.innerHTML = '<p style="text-align:center;width:100%;color:#999;">Error: No Profile</p>';
                    return;
                }
                let userQuery = supabaseClient.from('users').select('id');
                if (currentLbFilter === 'region') userQuery = userQuery.eq('region', currentUserData.region);
                else if (currentLbFilter === 'district') userQuery = userQuery.eq('district', currentUserData.district);

                let pQuery = supabaseClient.from('tour_progress').select('user_id, score').order('score', { ascending: false }).limit(300);
                if (currentTourId) pQuery = pQuery.eq('tour_id', currentTourId);
                const { data: pData } = await pQuery;
                if (pData && pData.length > 0) {
                    const pUserIds = pData.map(p => p.user_id);
                    const { data: localUsers } = await userQuery.in('id', pUserIds);
                    if (localUsers) {
                        const localIds = localUsers.map(u => u.id);
                        progressData = pData.filter(p => localIds.includes(p.user_id));
                    }
                }
            }

            if (!progressData || progressData.length === 0) {
                if (podium) podium.innerHTML = `<p style="text-align:center;width:100%;color:#999;margin-top:20px;">${t('no_data')}</p>`;
                return;
            }

            const userIdsToFetch = [...new Set(progressData.map(p => p.user_id))];
            const { data: usersData, error } = await supabaseClient
                .from('users')
                .select('id, name, full_name, class, avatar_url, region, district, school') 
                .in('id', userIdsToFetch);
            
            if (error) throw error;

             const fullList = progressData.map(p => {
                const u = (usersData || []).find(user => user.id === p.user_id);
                if (!u) return null;
                const isMe = String(u.id) === String(internalDbId);
                return {
                    id: u.id,
                    name: u.full_name || u.name || t('anonymous'),
                    classVal: u.class || '?',
                    region: u.region,
                    district: u.district,
                    school: u.school,
                    avatarUrl: u.avatar_url || (isMe ? telegramData.photoUrl : null),
                    score: p.score,
                    isMe
                };
            }).filter(item => item !== null);

            fullList.sort((a, b) => b.score - a.score);
            renderLeaderboardUI(fullList, podium, listEl);
            updateMyStickyBar(fullList, stickyBar);
        } catch (e) {
            console.error(e);
            if (podium) podium.innerHTML = `<p style="text-align:center;color:red;">${t('error')}</p>`;
        }
    }

    function renderLeaderboardUI(list, podiumEl, listEl) {
        if (!podiumEl || !listEl) return;
        
        podiumEl.innerHTML = '';
        listEl.innerHTML = '';
        
        const top3 = [list[1], list[0], list[2]]; 
        const ranks = ['second', 'first', 'third'];
        const rkClasses = ['rk-2', 'rk-1', 'rk-3'];
        const realRanks = [2, 1, 3];
        const defaultAvatar = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23E1E1E6"/><text x="50" y="60" font-size="40" text-anchor="middle" fill="%23666">?</text></svg>';

      top3.forEach((player, i) => {
  if (player) {
    const rawName = sanitizeText(player.name) || t('anonymous');
    const displayName = rawName.split(/\s+/).slice(0, 2).join(' ');
    const safeDisplayName = escapeHTML(displayName);
    const initial = escapeHTML(rawName.charAt(0) || '?');

    const safeAvatarUrl = escapeHTML(safeUrl(player.avatarUrl));

    const avatarHtml = safeAvatarUrl
      ? `<img src="${safeAvatarUrl}" class="winner-img" onerror="this.onerror=null;this.src='${defaultAvatar}';">`
      : `<div class="winner-img" style="background:#E1E1E6; display:flex; align-items:center; justify-content:center; font-size:24px; color:#666;">${initial}</div>`;

    const shortRegion = sanitizeText(player.region).replace(" viloyati", "").replace(" shahri", "").replace(" vil", "").trim();
    const shortDistrict = sanitizeText(player.district).replace(" tumani", "").replace(" района", "").trim();

    const locParts = [shortRegion, shortDistrict].filter(Boolean);
    const shortLoc = escapeHTML(locParts.join(', '));

    let schoolRaw = sanitizeText(player.school);
    if (schoolRaw && !/^№/i.test(schoolRaw)) schoolRaw = `№${schoolRaw}`;
    const safeSchool = escapeHTML(schoolRaw);

    const metaParts = [];
    if (shortLoc) metaParts.push(shortLoc);
    if (safeSchool) metaParts.push(safeSchool);
    const metaLine = metaParts.join(' • ');

    const html = `
      <div class="winner ${ranks[i]}">
        <div class="avatar-wrapper">
          ${avatarHtml}
          <div class="rank-circle ${rkClasses[i]}">${realRanks[i]}</div>
        </div>

        <div class="winner-name">${safeDisplayName}</div>
        <div class="winner-class">${metaLine ? metaLine : ''}</div>
        <div class="winner-score">${player.score}</div>
      </div>
    `;

    podiumEl.insertAdjacentHTML('beforeend', html);
  } else {
    // Плейсхолдер только когда реально нет игрока
    podiumEl.insertAdjacentHTML('beforeend', `<div class="winner ${ranks[i]}" style="opacity:0"></div>`);
  }
});

        list.slice(3).forEach((player, index) => {
            const realRank = index + 4;
            const safeName = escapeHTML(sanitizeText(player.name) || t('anonymous'));
            const safeAvatarUrl = escapeHTML(safeUrl(player.avatarUrl));
            const avatarHtml = safeAvatarUrl
            ? `<img src="${safeAvatarUrl}" onerror="this.onerror=null;this.src='${defaultAvatar}';">`
            : '';
            const rawName = String(player.name || '').trim() || t('anonymous');
            const displayName = rawName.split(/\s+/).slice(0, 2).join(' ');
            const safeDisplayName = escapeHTML(displayName);
            const fallbackAvatar = `<div class="no-img">${escapeHTML(rawName.charAt(0) || '?')}</div>`;
            
            const reg = (player.region || "").replace(" viloyati", "").replace(" shahri", "").replace(" vil", "").trim();
            const dist = (player.district || "").replace(" tumani", "").replace(" района", "").trim();
            const schoolRaw = String(player.school || "").trim();

            const locParts = [reg, dist].filter(Boolean);
            const loc = locParts.join(', ');

            let school = schoolRaw;
            if (school && !/^№/i.test(school)) school = `№${school}`;

            const metaParts = [];
            if (loc) metaParts.push(loc);
            if (school) metaParts.push(school);

            const metaInfo = metaParts.join(' • ');


            const cardStyle = player.isMe ? 'background:#F0F8FF; border:1px solid var(--primary);' : '';

            const html = `
                <div class="leader-card" style="${cardStyle}">
                    <div class="l-rank">${realRank}</div>
                    <div class="l-avatar">
                        ${avatarHtml}
                        ${player.avatarUrl ? fallbackAvatar.replace('class="no-img"', 'class="no-img" style="display:none"') : fallbackAvatar}
                    </div>
                    <div class="l-info">
                        <span class="l-name" style="font-weight:700; display:block; color:#000; font-size:14px;">${safeDisplayName}</span>
                        ${metaInfo ? `<div class="l-sub" style="font-size:11px; color:#8E8E93; margin-top:2px;">${escapeHTML(metaInfo)}</div>` : ``}
                    </div>
                    <div class="l-score" style="font-weight:800; color:var(--primary); font-size:16px; min-width:35px; text-align:right;">${player.score}</div>
                </div>
            `;
            listEl.insertAdjacentHTML('beforeend', html);
        });
    }

    async function updateMyStickyBar(currentList, stickyEl) {
        if (!internalDbId || !stickyEl) return;
        
        let me = currentList.find(p => p.isMe);
        let myRank = currentList.findIndex(p => p.isMe) + 1;

        if (!me && currentTourId) {
            const { data } = await supabaseClient
                .from('tour_progress')
                .select('score')
                .eq('user_id', internalDbId)
                .eq('tour_id', currentTourId)
                .maybeSingle();
            
            if (data) {
                me = { score: data.score };
                myRank = "50+";
            }
        }
        
        if (me) {
            const myRankVal = document.getElementById('my-rank-val');
            if (myRankVal) myRankVal.textContent = myRank === "50+" ? ">50" : `#${myRank}`;
            
            const myClassVal = document.getElementById('my-class-val');
            if (myClassVal && currentUserData) myClassVal.textContent = `${currentUserData.class} ${t('class_s')}`;
            
            const myScoreVal = document.getElementById('my-score-val');
            if (myScoreVal) myScoreVal.textContent = me.score;
            
            stickyEl.classList.remove('hidden');
            
            const cabRank = document.getElementById('cab-rank');
            if (cabRank) cabRank.textContent = myRank === "50+" ? ">50" : `#${myRank}`;
        } else {
            stickyEl.classList.add('hidden');
        }
    }

    // Флаг защиты от повторных нажатий
    let isSavingProfile = false;

    const saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            if (isSavingProfile) return;

            if (!telegramUserId || telegramUserId === "null" || telegramUserId === "undefined") {
                if (window.Telegram && Telegram.WebApp.initDataUnsafe.user) {
                    telegramUserId = String(Telegram.WebApp.initDataUnsafe.user.id);
                }
            }

            if (!telegramUserId || telegramUserId === "null" || isNaN(Number(telegramUserId))) {
                alert("Xatolik: Telegram ID topilmadi. Iltimos botni qayta ishga tushiring.");
                return;
            }

            const fullNameInput = document.getElementById('full-name-input');
            const classSelectEl = document.getElementById('class-select');
            const regionSelectEl = document.getElementById('region-select');
            const districtSelectEl = document.getElementById('district-select');
            const schoolInput = document.getElementById('school-input');
            const researchConsent = document.getElementById('research-consent');

            const fullName = fullNameInput ? fullNameInput.value.trim() : '';
            const classVal = classSelectEl ? classSelectEl.value : '';
            const region = regionSelectEl ? regionSelectEl.value : '';
            const district = districtSelectEl ? districtSelectEl.value : '';
            const school = schoolInput ? schoolInput.value.trim() : '';
            
            if (!fullName || !classVal || !region || !district || !school) { 
                alert(t('alert_fill')); 
                return; 
            }
            
            const btn = document.getElementById('save-profile');
            const originalText = btn.innerHTML;

            try { 
                isSavingProfile = true;
                btn.disabled = true;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('save_saving')}`;

                const updateData = { 
        full_name: fullName, 
        class: classVal, 
        region: region, 
        district: district, 
        school: school, 
        research_consent: researchConsent ? researchConsent.checked : false,
        fixed_language: currentLang
    };

    const { data, error } = await supabaseClient
        .from('users')
        .update(updateData)
        .eq('id', internalDbId)
        .select()
        .maybeSingle();
                
                if (error) throw error;
                
                if (data) {
                    currentUserData = data;
                    internalDbId = String(data.id); 
                    isProfileLocked = true;
                    isLangLocked = true;
                    
                    // FIX: Блокируем переключатель языка сразу после сохранения профиля
                    const cabLang = document.getElementById('lang-switcher-cab');
                    if (cabLang) {
                        cabLang.disabled = true;
                        cabLang.style.opacity = '0.5';
                        cabLang.style.cursor = 'not-allowed';
                    }
                    
                    const regLangEl = document.getElementById('reg-lang-select');
                    if (regLangEl) {
                        regLangEl.disabled = true;
                        regLangEl.style.opacity = '0.5';
                    }
                    
                    // Обновляем localStorage чтобы соответствовал сохранённому языку
                    try {
                        localStorage.setItem('user_lang', currentLang);
                    } catch (e) { console.warn(e); }
                    
                   showScreen('home-screen');
                    await syncDirectionState({ forceModal: true });
                    initSubjectSelectionFlow();
                    await fetchStatsData();
                } else {
                    alert("Xatolik: Ma'lumotlar bazadan qaytmadi.");
                }
            } catch (e) {
                console.error("Save error:", e);
                alert(t('error') + ': ' + e.message);
            } finally {
                isSavingProfile = false;
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    // === ЛОГИКА УДАЛЕНИЯ АККАУНТА ===
    safeAddListener('delete-account-btn', 'click', () => {
        if (tourCompleted) {
            alert(t('del_error_active_tour'));
        } else {
            const modal = document.getElementById('delete-confirm-modal');
            if (modal) modal.classList.remove('hidden');
        }
    });

    safeAddListener('confirm-delete-btn', 'click', async () => {
        const btn = document.getElementById('confirm-delete-btn');
        if (!btn) return;
        
        btn.disabled = true;
        btn.innerHTML = '...';
        
        try {
            const { error } = await supabaseClient.from('users').delete().eq('id', internalDbId);
            if (error) throw error;
            
            try {
                localStorage.clear();
            } catch (e) { console.warn(e); }
            
            location.reload(); 
        } catch (e) {
            alert(t('error') + ': ' + e.message);
            btn.disabled = false;
            btn.innerHTML = t('btn_delete_confirm');
        }
   });

    function hasCompletedTourAccess() {
        if (currentUserData) {
            if (typeof currentUserData.completed_tours === 'number') return currentUserData.completed_tours > 0;
            if (typeof currentUserData.tours_completed === 'number') return currentUserData.tours_completed > 0;
            if (typeof currentUserData.completedTours === 'number') return currentUserData.completedTours > 0;
            if (typeof currentUserData.tours_count === 'number') return currentUserData.tours_count > 0;
        }

        if (tourCompleted) return true;

        const cabTours = document.getElementById('cab-tours');
        const value = cabTours ? Number(cabTours.textContent) : 0;
        return Number.isFinite(value) && value > 0;
    }

    function refreshCabinetAccessUI() {
        const isLocked = !hasCompletedTourAccess();
        const mistakeLockIcon = document.getElementById('mistake-lock-icon');
        const practiceLockIcon = document.getElementById('practice-lock-icon');
        const mistakesBtn = document.getElementById('btn-mistakes');
        const practiceBtn = document.getElementById('btn-practice');

        if (mistakeLockIcon) mistakeLockIcon.style.display = isLocked ? 'inline-block' : 'none';
        if (practiceLockIcon) practiceLockIcon.style.display = isLocked ? 'inline-block' : 'none';
        if (mistakesBtn) mistakesBtn.classList.toggle('access-locked', isLocked);
        if (practiceBtn) practiceBtn.classList.toggle('access-locked', isLocked);
    }

    // === ЛОГИКА РАЗБОРА ОШИБОК ===
    function resetReviewState() {
        reviewState.selectedTourId = null;
        reviewState.selectedTourTitle = '';
        reviewState.answers = [];
        reviewState.subjectStats = [];
        reviewState.errorsBySubject = {};
        reviewState.currentSubjectKey = '';
        reviewState.currentErrorIndex = 0;
        reviewState.totalQuestions = 0;
        reviewState.correctQuestions = 0;
    }

    function formatReviewDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return '';
        const localeMap = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
        return date.toLocaleDateString(localeMap[currentLang] || 'en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function getReviewProgressPercent(score) {
        if (!Number.isFinite(score)) return 0;
        let percent = score;
        if (percent <= 1) percent = percent * 100;
        return Math.max(0, Math.min(100, Math.round(percent)));
    }

    function showReviewView(viewKey) {
        const viewMap = {
            tours: 'review-tours-view',
            results: 'review-results-view',
            errors: 'review-errors-view',
            success: 'review-success-view'
        };
        const headerMap = {
            tours: 'review-header-tours',
            results: 'review-header-results',
            errors: 'review-header-errors',
            success: 'review-header-success'
        };
        const actionMap = {
            tours: 'review-tours-actions',
            results: 'review-results-actions',
            errors: 'review-errors-actions',
            success: 'review-success-actions'
        };

        Object.values(viewMap).forEach(id => document.getElementById(id)?.classList.add('hidden'));
        Object.values(headerMap).forEach(id => document.getElementById(id)?.classList.add('hidden'));
        Object.values(actionMap).forEach(id => document.getElementById(id)?.classList.add('hidden'));

        const viewId = viewMap[viewKey];
        const headerId = headerMap[viewKey];
        const actionId = actionMap[viewKey];

        if (viewId) document.getElementById(viewId)?.classList.remove('hidden');
        if (headerId) document.getElementById(headerId)?.classList.remove('hidden');
        if (actionId) document.getElementById(actionId)?.classList.remove('hidden');
    }

    function formatReviewResultsTitle(tourTitle) {
        const displayTitle = formatTourTitle(tourTitle || '');
        return t('review_results_title').replace('{n}', displayTitle || t('stat_tour'));
    }

    function renderReviewToursList() {
        const listEl = document.getElementById('review-tours-list');
        if (!listEl) return;

        if (!reviewState.tours || reviewState.tours.length === 0) {
            listEl.innerHTML = `<div class="review-empty">${t('review_no_data')}</div>`;
            return;
        }

        const now = new Date();
        listEl.innerHTML = '';

        reviewState.tours.forEach((tour, index) => {
            const progress = reviewState.progressByTourId[tour.id];
            const hasProgress = progress && progress.score !== null && progress.score !== undefined;
            const end = tour.end_date ? new Date(tour.end_date) : null;
            const isEnded = end ? now >= end : true;
            const isAvailable = hasProgress && isEnded;
            const percent = getReviewProgressPercent(progress?.score);
            const displayTitle = formatTourTitle(tour.title || `${t('stat_tour')} ${index + 1}`);
            const dateLabel = end ? `${t('review_completed_on')} ${formatReviewDate(tour.end_date)}` : '';

            const card = document.createElement('button');
            card.type = 'button';
            card.className = `review-tour-card${isAvailable ? '' : ' disabled'}`;
            card.dataset.tourId = tour.id;
            if (!isAvailable) card.disabled = true;

            card.innerHTML = `
                <div class="review-tour-title">${displayTitle}</div>
                <div class="review-tour-meta">
                    <span>${t('review_result_label')}: ${percent}%</span>
                    <span>${dateLabel}</span>
                </div>
                <div class="review-progress">
                    <div class="review-progress-fill" style="width:${percent}%"></div>
                </div>
                ${isAvailable ? '' : '<i class="fa-solid fa-lock review-tour-lock"></i>'}
            `;

            listEl.appendChild(card);
        });
    }

    async function loadReviewTours() {
        const listEl = document.getElementById('review-tours-list');
        if (listEl) {
            listEl.innerHTML = `<div class="review-empty"><i class="fa-solid fa-spinner fa-spin"></i> ${t('loading')}</div>`;
        }

        if (!internalDbId) {
            if (listEl) listEl.innerHTML = `<div class="review-empty">${t('review_no_data')}</div>`;
            return;
        }

        const { data: toursData, error: toursError } = await supabaseClient
            .from('tours')
            .select('id, title, start_date, end_date, is_active')
            .order('start_date', { ascending: true });

        if (toursError) {
            if (listEl) listEl.innerHTML = `<div class="review-empty">${t('review_no_data')}</div>`;
            return;
        }

        const { data: progressData } = await supabaseClient
            .from('tour_progress')
            .select('tour_id, score')
            .eq('user_id', internalDbId);

        const progressByTourId = {};
        (progressData || []).forEach(row => {
            if (row && row.tour_id != null) progressByTourId[row.tour_id] = row;
        });

        reviewState.tours = toursData || [];
        reviewState.progressByTourId = progressByTourId;

        renderReviewToursList();
    }

    function buildReviewSubjectStats(answers) {
        const subjectMap = {};
        const errorsBySubject = {};
        let total = 0;
        let correct = 0;

        (answers || []).forEach(row => {
            const q = row.questions;
            if (!q) return;
            const key = normalizeSubjectKey(q.subject);
            if (!key) return;

            total += 1;
            if (row.is_correct) correct += 1;

            if (!subjectMap[key]) {
                subjectMap[key] = { key, total: 0, correct: 0 };
            }
            subjectMap[key].total += 1;
            if (row.is_correct) subjectMap[key].correct += 1;

            if (!row.is_correct) {
                if (!errorsBySubject[key]) errorsBySubject[key] = [];
                errorsBySubject[key].push({ ...row, questions: q });
            }
        });

        const subjectStats = Object.values(subjectMap).map(stat => ({
            ...stat,
            percent: stat.total ? Math.round((stat.correct / stat.total) * 100) : 0
        }));

         const order = getSubjectOrderForCurrentMode();
        subjectStats.sort((a, b) => {
            const aIndex = order.indexOf(a.key);
            const bIndex = order.indexOf(b.key);
            if (aIndex === -1 && bIndex === -1) return a.key.localeCompare(b.key);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
        // Оставляем только выбранные предметы (и исключаем sat/ielts пока скрыты)
const selected = isDirectionTourMode()
  ? getAllowedSubjectsByDirection(selectedDirectionKey)
  : ((typeof getSelectedSubjects === 'function') ? getSelectedSubjects() : []);
const allowed = new Set(
  (selected.length ? selected : ['math', 'chem', 'bio', 'it', 'eco'])
    .map(s => String(s).toLowerCase())
    .filter(s => !['sat', 'ielts'].includes(s))
);

const filteredStats = subjectStats.filter(s => allowed.has(String(s.key).toLowerCase()));

const filteredErrors = {};
Object.keys(errorsBySubject || {}).forEach(k => {
  const kk = String(k).toLowerCase();
  if (allowed.has(kk)) filteredErrors[kk] = errorsBySubject[k];
});

// дальше используем filteredStats/filteredErrors вместо subjectStats/errorsBySubject

        return { subjectStats: filteredStats, errorsBySubject: filteredErrors, total, correct };
    }

    function renderReviewResults() {
        const titleEl = document.getElementById('review-results-title');
        if (titleEl) titleEl.textContent = formatReviewResultsTitle(reviewState.selectedTourTitle);

        const listEl = document.getElementById('review-subjects-list');
        if (!listEl) return;

        listEl.innerHTML = '';
        if (!reviewState.subjectStats || reviewState.subjectStats.length === 0) {
            listEl.innerHTML = `<div class="review-empty">${t('review_no_data')}</div>`;
        }

        reviewState.subjectStats.forEach(stat => {
            const subjectName = subjectDisplayName(stat.key);
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'review-subject-card';
            card.dataset.subjectKey = stat.key;
            card.innerHTML = `
                <div class="review-subject-info">
                    <div class="review-subject-name">${subjectName}</div>
                    <div class="review-subject-progress"><span style="width:${stat.percent}%"></span></div>
                    <div class="review-subject-meta">${stat.correct}/${stat.total} ${t('review_correct')}</div>
                </div>
                <div class="review-subject-score">${stat.percent}%</div>
            `;
            listEl.appendChild(card);
        });

        const total = reviewState.totalQuestions || 0;
        const correct = reviewState.correctQuestions || 0;
        const percent = total ? Math.round((correct / total) * 100) : 0;
        const percentEl = document.getElementById('review-results-percent');
        if (percentEl) percentEl.textContent = `${percent}%`;
        const circle = document.getElementById('review-results-circle');
        if (circle) circle.style.background = `conic-gradient(var(--primary) 0% ${percent}%, #E5E5EA ${percent}% 100%)`;
        const caption = document.getElementById('review-results-caption');
        if (caption) caption.textContent = t('review_results_caption');
    }

    async function openReviewResultsForTour(tourId) {
        const tour = reviewState.tours.find(item => String(item.id) === String(tourId));
        if (!tour) return;

        reviewState.selectedTourId = tour.id;
        reviewState.selectedTourTitle = tour.title || '';
        reviewState.answers = [];
        reviewState.subjectStats = [];
        reviewState.errorsBySubject = {};
        reviewState.currentSubjectKey = '';
        reviewState.currentErrorIndex = 0;

        showReviewView('results');
        const titleEl = document.getElementById('review-results-title');
        if (titleEl) titleEl.textContent = formatReviewResultsTitle(reviewState.selectedTourTitle);

        const listEl = document.getElementById('review-subjects-list');
        if (listEl) listEl.innerHTML = `<div class="review-empty"><i class="fa-solid fa-spinner fa-spin"></i> ${t('loading')}</div>`;

        const { data: answers, error } = await supabaseClient
            .from('user_answers')
            .select(`
                answer,
                is_correct,
                questions!inner (*)
            `)
            .eq('user_id', internalDbId)
            .eq('questions.tour_id', tour.id)
            .eq('questions.language', currentLang);

         if (error || !answers || answers.length === 0) {
            if (listEl) listEl.innerHTML = `<div class="review-empty">${t('review_no_data')}</div>`;
            return;
        }

        let filteredAnswers = answers;
        if (Array.isArray(tourQuestionsAllCache) && tourQuestionsAllCache.length) {
            const allowedIds = new Set(
                tourQuestionsAllCache
                    .filter(q => String(q.tour_id) === String(tour.id))
                    .map(q => q.id)
            );
            if (allowedIds.size) {
                filteredAnswers = (answers || []).filter(row => allowedIds.has(row.questions?.id));
            }
        }

        if (!filteredAnswers || filteredAnswers.length === 0) {
            if (listEl) listEl.innerHTML = `<div class="review-empty">${t('review_no_data')}</div>`;
            return;
        }

        const summary = buildReviewSubjectStats(filteredAnswers);
        reviewState.answers = filteredAnswers;
        reviewState.subjectStats = summary.subjectStats;
        reviewState.errorsBySubject = summary.errorsBySubject;
        reviewState.totalQuestions = summary.total;
        reviewState.correctQuestions = summary.correct;

        renderReviewResults();
    }

    function renderReviewErrorCard() {
        const errors = reviewState.errorsBySubject[reviewState.currentSubjectKey] || [];
        if (!errors || errors.length === 0) {
            showReviewSuccess();
            return;
        }

        const row = errors[reviewState.currentErrorIndex];
        const q = row.questions || {};
        const subjectTitle = `${subjectDisplayName(reviewState.currentSubjectKey)} • ${t('review_errors')}`;
        const titleEl = document.getElementById('review-errors-title');
        if (titleEl) titleEl.textContent = subjectTitle;

        const counterEl = document.getElementById('review-errors-counter');
        if (counterEl) counterEl.textContent = `${reviewState.currentErrorIndex + 1}/${errors.length}`;

        const dotsEl = document.getElementById('review-errors-dots');
        if (dotsEl) {
            dotsEl.innerHTML = '';
            errors.forEach((_, index) => {
                const dot = document.createElement('span');
                dot.className = `dot${index === reviewState.currentErrorIndex ? ' active' : ''}`;
                dotsEl.appendChild(dot);
            });
        }

        const cardEl = document.getElementById('review-error-card');
        if (!cardEl) return;

        const answer = row.answer ?? '-';
        const correctAnswer = q.correct_answer ?? '-';
        const isCorrect = !!row.is_correct;
        const badgeLabel = isCorrect ? t('review_correct') : t('review_incorrect');
        const badgeClass = isCorrect ? 'correct' : 'incorrect';
        const questionLabel = `${t('review_question')} ${reviewState.currentErrorIndex + 1}`;
        const explanation = q.explanation || q.solution || q.explanation_text || q.solution_text || '';

        cardEl.innerHTML = `
            <div class="review-error-card">
                <div class="review-question-meta">
                    <span>${questionLabel}</span>
                    <span class="review-status-badge ${badgeClass}">${badgeLabel}</span>
                </div>
                <div class="review-question-text">${q.question_text || ''}</div>
                ${q.image_url ? `<img src="${q.image_url}" alt="Question image" style="max-width:100%; border-radius:12px;">` : ''}
                <div class="review-answer-box incorrect">
                    <span>${t('review_your_answer')}</span>
                    <div>${answer}</div>
                </div>
                <div class="review-answer-box correct">
                    <span>${t('review_correct_answer')}</span>
                    <div>${correctAnswer}</div>
                </div>
                ${explanation ? `<div class="review-explanation"><strong>${t('review_explanation')}</strong><div>${explanation}</div></div>` : ''}
            </div>
        `;

        const prevBtn = document.getElementById('review-prev-btn');
        const nextBtn = document.getElementById('review-next-btn');
        if (prevBtn) prevBtn.disabled = reviewState.currentErrorIndex === 0;
        if (nextBtn) nextBtn.disabled = false;

        renderLaTeX();
    }

    function showReviewSuccess() {
        const subjectName = subjectDisplayName(reviewState.currentSubjectKey) || t('review_subjects');
        const textEl = document.getElementById('review-success-text');
        if (textEl) textEl.textContent = t('review_success_text').replace('{subject}', subjectName);
        const countEl = document.getElementById('review-success-count');
        const errors = reviewState.errorsBySubject[reviewState.currentSubjectKey] || [];
        if (countEl) countEl.textContent = errors.length;
        showReviewView('success');
    } 

    function openReviewErrorsForSubject(subjectKey) {
        reviewState.currentSubjectKey = subjectKey;
        reviewState.currentErrorIndex = 0;
        showReviewView('errors');
        renderReviewErrorCard();
    }

  const handleMistakesClick = () => {
        if (!hasCompletedTourAccess()) {
            showAccessLockModal();
            return;
        }

        const now = new Date();
        const end = currentTourEndDate ? new Date(currentTourEndDate) : null;

        if (end && now < end) {
            const modal = document.getElementById('review-lock-modal');
            if (modal) modal.classList.remove('hidden');
            return;
        }

        practiceMode = false;
        isTestActive = false;
        resetReviewState();
        showScreen('review-screen');
        showReviewView('tours');
        loadReviewTours();
    };

     const handlePracticeClick = () => {
        startPracticeMode();
    };

    safeAddListener('btn-mistakes', 'click', () => {
        reviewReturnScreen = 'cabinet-screen';
        handleMistakesClick();
    });
    safeAddListener('home-mistakes-btn', 'click', () => {
        reviewReturnScreen = 'home-screen';
        handleMistakesClick();
    });

    safeAddListener('btn-practice', 'click', () => {
        practiceReturnScreen = 'cabinet-screen';
        handlePracticeClick();
    });
    safeAddListener('home-practice-btn', 'click', () => {
        practiceReturnScreen = 'home-screen';
        handlePracticeClick();
    });
 

    safeAddListener('close-lock-review-modal', 'click', () => {
        const modal = document.getElementById('review-lock-modal');
        if (modal) modal.classList.add('hidden');
    });

    safeAddListener('review-tours-back', 'click', () => showScreen(reviewReturnScreen));
    safeAddListener('review-tours-close', 'click', () => showScreen(reviewReturnScreen));
    safeAddListener('review-results-back', 'click', () => showReviewView('tours'));
    safeAddListener('review-results-back-list', 'click', () => showReviewView('tours'));
    safeAddListener('review-results-close', 'click', () => showScreen(reviewReturnScreen));
    safeAddListener('review-errors-back', 'click', () => showReviewView('results'));
    safeAddListener('review-back-results-btn', 'click', () => showReviewView('results'));
    safeAddListener('review-close-btn', 'click', () => showScreen(reviewReturnScreen));
    safeAddListener('review-success-back-results', 'click', () => showReviewView('results'));
    safeAddListener('review-success-other-tour', 'click', () => showReviewView('tours'));
    safeAddListener('review-success-to-cabinet', 'click', () => showScreen(reviewReturnScreen));

    safeAddListener('review-prev-btn', 'click', () => {
        if (reviewState.currentErrorIndex > 0) {
            reviewState.currentErrorIndex -= 1;
            renderReviewErrorCard();
        }
    });

    safeAddListener('review-next-btn', 'click', () => {
        const errors = reviewState.errorsBySubject[reviewState.currentSubjectKey] || [];
        if (reviewState.currentErrorIndex < errors.length - 1) {
            reviewState.currentErrorIndex += 1;
            renderReviewErrorCard();
        } else {
            showReviewSuccess();
        }
    });

    safeAddListener('review-tours-list', 'click', (event) => {
        const target = event.target.closest('.review-tour-card');
        if (!target || target.classList.contains('disabled')) return;
        const tourId = target.dataset.tourId;
        if (tourId) openReviewResultsForTour(tourId);
    });

    safeAddListener('review-subjects-list', 'click', (event) => {
        const target = event.target.closest('.review-subject-card');
        if (!target) return;
        const key = target.dataset.subjectKey;
        if (key) openReviewErrorsForSubject(key);
    });




  safeAddListener('close-cheat-modal', 'click', () => {
        const modal = document.getElementById('cheat-warning-modal');
        if (modal) modal.classList.add('hidden');
    });

    // Modals close handlers
    safeAddListener('close-tour-info', 'click', () => {
        const modal = document.getElementById('tour-info-modal');
        if (modal) modal.classList.add('hidden');
    });

    safeAddListener('close-subject-modal', 'click', () => {
        const modal = document.getElementById('subject-details-modal');
        if (modal) modal.classList.add('hidden');
    });

    safeAddListener('close-certs-modal', 'click', () => {
        const modal = document.getElementById('certs-modal');
        if (modal) modal.classList.add('hidden');
    });

    safeAddListener('cancel-delete-btn', 'click', () => {
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) modal.classList.add('hidden');
    });

    safeAddListener('close-locked-alert', 'click', () => {
        const modal = document.getElementById('locked-profile-alert');
        if (modal) modal.classList.add('hidden');
    });

    // START TOUR LOGIC
function diffRank(d) {
  const x = String(d || '').toLowerCase();
  if (x === 'easy') return 'easy';
  if (x === 'medium') return 'medium';
  if (x === 'hard') return 'hard';
  return 'other';
}

function getTourDifficultyMix(tourId) {
  const id = Number(tourId);
  const mixMap = {
    1: { easy: 6, medium: 7, hard: 2 },
    2: { easy: 6, medium: 7, hard: 2 },
    3: { easy: 5, medium: 7, hard: 3 },
    4: { easy: 5, medium: 7, hard: 3 },
    5: { easy: 4, medium: 8, hard: 3 },
    6: { easy: 3, medium: 8, hard: 4 },
    7: { easy: 2, medium: 8, hard: 5 }
  };
  return mixMap[id] || { easy: 6, medium: 7, hard: 2 };
}

function pickNWithRepeats(arr, n) {
  const list = Array.isArray(arr) ? arr.filter(Boolean) : [];
  const target = Math.max(0, Number(n) || 0);
  if (!list.length || target <= 0) return [];

  const result = [];
  while (result.length < target) {
    const shuffled = list.slice();
    shuffleArray(shuffled);
    const remaining = target - result.length;
    result.push(...shuffled.slice(0, Math.min(remaining, shuffled.length)));
    if (shuffled.length >= remaining) break;
  }
  return result;
}

function getAnswerType(q) {
  if (!q) return 'input';
  const optionsText = typeof q.options_text === 'string' ? q.options_text.trim() : '';
  const options = Array.isArray(q.options) ? q.options : [];
  if (optionsText.length > 0 || options.length > 0) return 'choice';
  return 'input';
}

function interleaveByAnswerType(list) {
  const items = Array.isArray(list) ? list.slice() : [];
  if (!items.length) return [];

  const choice = [];
  const input = [];
  items.forEach(q => {
    if (getAnswerType(q) === 'choice') choice.push(q);
    else input.push(q);
  });

  if (!choice.length || !input.length) {
    const shuffled = items.slice();
    shuffleArray(shuffled);
    return shuffled;
  }

  const choiceQueue = choice.slice();
  const inputQueue = input.slice();
  shuffleArray(choiceQueue);
  shuffleArray(inputQueue);

  const result = [];
  let pickChoice = choiceQueue.length >= inputQueue.length;
  while (choiceQueue.length || inputQueue.length) {
    if (pickChoice && choiceQueue.length) {
      result.push(choiceQueue.shift());
    } else if (!pickChoice && inputQueue.length) {
      result.push(inputQueue.shift());
    } else if (choiceQueue.length) {
      result.push(choiceQueue.shift());
    } else if (inputQueue.length) {
      result.push(inputQueue.shift());
    }
    pickChoice = !pickChoice;
  }

  return result;
}

function distributeRoundRobin(subjects, need) {
  const list = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
  const target = Math.max(0, Number(need) || 0);
  if (!list.length || target <= 0) return [];
  const counts = new Map(list.map(subject => [subject, 0]));
  for (let i = 0; i < target; i += 1) {
    const subject = list[i % list.length];
    counts.set(subject, (counts.get(subject) || 0) + 1);
  }
  return list.map(subject => ({ subject, count: counts.get(subject) || 0 }));
}

function buildDirectionDifficultyBlock(pool, subjects, need, difficulty) {
  const diffPool = (pool || []).filter(q => diffRank(q.difficulty) === difficulty);
  if (!diffPool.length || need <= 0) return [];

  const plan = distributeRoundRobin(subjects, need);
  let picked = [];

  plan.forEach(({ subject, count }) => {
    if (count <= 0) return;
    const subjectPool = diffPool.filter(q => normalizeSubjectKey(q.subject) === subject);
    picked = picked.concat(pickNWithRepeats(subjectPool, count));
  });

  if (picked.length < need) {
    const remaining = need - picked.length;
    const fallbackPool = diffPool.filter(q => subjects.includes(normalizeSubjectKey(q.subject)));
    picked = picked.concat(pickNWithRepeats(fallbackPool, remaining));
  }

  if (picked.length > need) picked = picked.slice(0, need);
  return interleaveByAnswerType(picked);
}

function buildDirectionTourQuestions(allQuestions, directionKey) {
  const subjects = getAllowedSubjectsByDirection(directionKey);
  const normalizedSubjects = subjects.map(s => normalizeSubjectKey(s)).filter(Boolean);
  if (!normalizedSubjects.length) {
    return buildTourQuestions(allQuestions);
  }

  const pool = (allQuestions || []).filter(q => normalizedSubjects.includes(normalizeSubjectKey(q.subject)));
  const mix = getTourDifficultyMix(currentTourId);

  const easyBlock = buildDirectionDifficultyBlock(pool, normalizedSubjects, mix.easy, 'easy');
  const mediumBlock = buildDirectionDifficultyBlock(pool, normalizedSubjects, mix.medium, 'medium');
  const hardBlock = buildDirectionDifficultyBlock(pool, normalizedSubjects, mix.hard, 'hard');

  const ordered = []
    .concat(easyBlock)
    .concat(mediumBlock)
    .concat(hardBlock);

  if (ordered.length !== 15) {
    console.warn('[buildDirectionTourQuestions] expected 15, got', ordered.length);
  }

  return ordered.slice(0, 15);
}

function buildTourQuestions(allQuestions) {
  let pool = (allQuestions || []).filter(q => q && q.id);

  // ✅ SUBJECT MODE: показываем вопросы только выбранного предмета
  // activeSubject у вас хранится как нормализованный ключ (bio, chem, sat, ielts и т.д.)
  const subjKey = String(activeSubject || '').trim();
  if (subjKey) {
    pool = pool.filter(q => normalizeSubjectKey(q.subject) === subjKey);
  }

  const mix = getTourDifficultyMix(currentTourId);

  const easyPool = pool.filter(q => diffRank(q.difficulty) === 'easy');
  const mediumPool = pool.filter(q => diffRank(q.difficulty) === 'medium');
  const hardPool = pool.filter(q => diffRank(q.difficulty) === 'hard');

  const easyPicked = pickNWithRepeats(easyPool, mix.easy);
  const mediumPicked = pickNWithRepeats(mediumPool, mix.medium);
  const hardPicked = pickNWithRepeats(hardPool, mix.hard);

  const easyBlock = interleaveByAnswerType(easyPicked);
  const mediumBlock = interleaveByAnswerType(mediumPicked);
  const hardBlock = interleaveByAnswerType(hardPicked);

  const ordered = []
    .concat(easyBlock)
    .concat(mediumBlock)
    .concat(hardBlock);

  if (ordered.length !== 15) {
    console.warn('[buildTourQuestions] expected 15, got', ordered.length);
  }

  return ordered.slice(0, 15);
}
  
  async function handleStartClick() {
        if (tourCompleted) {
            const modal = document.getElementById('tour-info-modal');
            if (modal) modal.classList.remove('hidden');
            return;
        }

        if (!currentTourId) {
            alert(t('no_active_tour'));
            return;
        }

        // Получаем вопросы на текущем языке пользователя
        const { data: qData, error: qErr } = await supabaseClient
            .from('questions')
            .select('id, subject, topic, question_text, options_text, type, tour_id, time_limit_seconds, language, difficulty, image_url')
            .eq('tour_id', currentTourId)
            .eq('language', currentLang)
            .order('id', { ascending: true })

        if (qErr || !qData || qData.length === 0) {
            alert(t('error') + ": Questions not found for language: " + currentLang);
            return;
        }

tourQuestionsAllCache = qData;              // сохраняем весь пул тура для статистики
const useDirectionMode = isDirectionTourMode();
tourQuestionsSelected = useDirectionMode
  ? buildDirectionTourQuestions(qData, selectedDirectionKey)
  : buildTourQuestions(qData);

questions = tourQuestionsSelected;          // тест идёт по 15


        const totalTime = questions.reduce((acc, q) => acc + (q.time_limit_seconds || 60), 0);
        const totalMinutes = Math.ceil(totalTime / 60);

        const warnModal = document.getElementById('warning-modal');
        const warnTime = document.getElementById('warn-time-val');
        const warnQCount = document.getElementById('warn-q-val');

        if (warnTime) warnTime.textContent = totalMinutes + ' ' + t('minutes');
        if (warnQCount) warnQCount.textContent = questions.length + ' ' + t('questions');

        if (warnModal) warnModal.classList.remove('hidden');
    }

    function openTourSubjectPickModal(subjects) {
        const modal = document.getElementById('tour-subject-pick-modal');
        const listEl = document.getElementById('tour-subject-pick-list');
        if (!modal || !listEl) return false;
        listEl.innerHTML = '';
        subjects.forEach(key => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tour-subject-pick-btn';
            btn.dataset.subject = key;
            btn.textContent = subjectDisplayName(key);
            listEl.appendChild(btn);
        });
        modal.classList.remove('hidden');
        return true;
    }

    function closeTourSubjectPickModal() {
        const modal = document.getElementById('tour-subject-pick-modal');
        if (modal) modal.classList.add('hidden');
    }

    function startTourWithSubjectPick() {
        if (tourCompleted) {
            handleStartClick();
            return;
        }
        const selected = getSelectedSubjects();
        if (selected.length >= 2) {
            openTourSubjectPickModal(selected);
            return;
        }
        if (selected.length === 1) setActiveSubject(selected[0]);
        handleStartClick();
    }

    function updateMainButton(state, title) {
        const activeBtn = document.getElementById('main-action-btn');
        const certCard = document.getElementById('home-cert-btn');
        if (!activeBtn) return;
const hintEl = document.getElementById('main-action-hint');
const setHint = (text) => {
  if (!hintEl) return;
  if (text) {
    hintEl.textContent = text;
    hintEl.classList.remove('hidden');
  } else {
    hintEl.textContent = '';
    hintEl.classList.add('hidden');
  }
};

// t() может вернуть ключ, если перевода нет — тогда используем fallback
const tSafe = (key, fallback) => {
  const v = typeof t === 'function' ? t(key) : '';
  return (v && v !== key) ? v : fallback;
};

        // Удаляем все слушатели событий
        const newBtn = activeBtn.cloneNode(true);
        activeBtn.parentNode.replaceChild(newBtn, activeBtn);

        if (state === 'inactive') {
  newBtn.innerHTML = `<i class="fa-solid fa-clock"></i> ${t('no_active_tour')}`;
  newBtn.className = 'btn-inactive';
  newBtn.disabled = true;
  if (certCard) certCard.classList.add('hidden');

  setHint(''); // подсказка не нужна

        } else if (state === 'completed') {
            newBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${t('tour_completed_btn')}`;
            newBtn.className = 'btn-success-clickable';
            newBtn.disabled = false;
            newBtn.style.background = "linear-gradient(135deg, #34C759 0%, #30D158 100%)"; 
            newBtn.style.color = "#fff";
            if (certCard) certCard.classList.remove('hidden'); 

          const nowTour = new Date();
          const end = currentTourEndDate ? new Date(currentTourEndDate) : null;
          const practiceAllowed = tourCompleted && (!end || nowTour >= end);

setHint(
  practiceAllowed
    ? tSafe('main_btn_completed_hint', 'Практика и разбор ошибок — в профиле')
    : tSafe('main_btn_completed_hint_locked', 'Практика откроется после окончания тура')
);

newBtn.addEventListener('click', () => {
  openTourInfoModal({ practiceAllowed });
});
           

} else if (state === 'ended_not_taken') {
  const displayTitle = formatTourTitle(title || "");
  newBtn.innerHTML = `<i class="fa-solid fa-dumbbell"></i> ${t('practice_btn')}${displayTitle ? ` • ${displayTitle}` : ''}`;
  newBtn.className = 'btn-primary';
  newBtn.disabled = false;
  newBtn.style.background = "";

  if (certCard) certCard.classList.add('hidden');

setHint(tSafe('main_btn_practice_hint', 'Практика доступна после завершения тура'));
          
  newBtn.addEventListener('click', () => {
    startPracticeMode();
  });

        } else {
            const displayTitle = formatTourTitle(title || t('start_tour_btn'));
            newBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${displayTitle}`;
            newBtn.className = 'btn-primary';
            newBtn.disabled = false;
            newBtn.style.background = "";
            if (certCard) certCard.classList.add('hidden'); 
            newBtn.addEventListener('click', startTourWithSubjectPick);

          setHint(tSafe('main_btn_start_hint', 'Нажмите, чтобы начать текущий тур'));
        }
    }

    safeAddListener('confirm-start', 'click', () => {
        const warningModal = document.getElementById('warning-modal');
        if (warningModal) warningModal.classList.add('hidden');
        
        try {
            localStorage.setItem('tour_start_time', Date.now().toString());
        } catch (e) {
            console.warn("LocalStorage error:", e);
        }
        
        currentQuestionIndex = 0;
        correctCount = 0;
        cheatWarningCount = 0; // Reset cheat counter
        tabSwitchThisQuestion = 0;
      
        // FIX #3: Активируем анти-чит только когда тест начинается
        isTestActive = true;
// === START TOTAL TIMER ===
totalTimeSec = 0;
perQuestionTimes = [];
tabSwitchCountTotal = 0;
tabSwitchCountPerQuestion = [];
visibilityLog = [];

if (totalTimerInterval) clearInterval(totalTimerInterval);
totalTimerInterval = setInterval(() => {
  totalTimeSec++;
}, 1000);
      
        showScreen('quiz-screen');
        
        const totalSeconds = questions.reduce((acc, q) => acc + (q.time_limit_seconds || 60), 0);
        startTimer(totalSeconds);
        showQuestion();
    });

    function startTimer(seconds) {
        let timeLeft = seconds;
        const timerEl = document.getElementById('timer');
        
        // FIX: Очищаем существующий таймер чтобы предотвратить утечки памяти
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        timerInterval = setInterval(() => {
            if (!timerEl) {
                clearInterval(timerInterval);
                return;
            }
            
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) { 
                clearInterval(timerInterval); 
                timerInterval = null;
                finishTour(); 
            }
            timeLeft--;
        }, 1000);
    }

let answerRequiredTimer = null;

 function showAnswerRequiredToast() {
        const toast = document.getElementById('answer-required-toast');
        if (!toast) return;
        toast.textContent = t('answer_required_short');
        toast.classList.remove('hidden');
        requestAnimationFrame(() => toast.classList.add('show'));
        if (answerRequiredTimer) clearTimeout(answerRequiredTimer);
        answerRequiredTimer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 200);
        }, 2500);
    }

    function hideAnswerRequiredToast() {
        const toast = document.getElementById('answer-required-toast');
        if (!toast) return;
        toast.classList.remove('show');
        if (answerRequiredTimer) {
            clearTimeout(answerRequiredTimer);
            answerRequiredTimer = null;
        }
        setTimeout(() => toast.classList.add('hidden'), 150);
    }    

    function showQuestion() {    
     // === QUESTION TIMER START ===
if (questionTimerInterval) clearInterval(questionTimerInterval);

questionTimeSec = 0;
tabSwitchThisQuestion = 0;

const qTimerEl = document.getElementById('q-timer');
if (qTimerEl) qTimerEl.textContent = `00:00`;

questionTimerInterval = setInterval(() => {
  questionTimeSec++;

  const mm = Math.floor(questionTimeSec / 60);
  const ss = questionTimeSec % 60;
  if (qTimerEl) qTimerEl.textContent = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}, 1000);

      const q = questions[currentQuestionIndex];
        if (!q) return;
        
        const questionNumber = document.getElementById('question-number');
        if (questionNumber) questionNumber.textContent = currentQuestionIndex + 1;
        
        const totalQCount = document.getElementById('total-q-count');
        if (totalQCount) totalQCount.textContent = questions.length;
        
        let diffBadge = '';
        if (q.difficulty === 'Easy') diffBadge = '🟢 Easy';
        if (q.difficulty === 'Medium') diffBadge = '🟡 Medium';
        if (q.difficulty === 'Hard') diffBadge = '🔴 Hard';

        const subjectTag = document.getElementById('subject-tag');
        if (subjectTag) subjectTag.innerHTML = (q.subject || 'Q') + ' <span style="opacity:0.6; margin-left:5px; font-size:10px;">' + diffBadge + '</span>';
        
        const imgCont = document.getElementById('q-img-cont');
        const img = document.getElementById('q-img');
        
        if (imgCont && img) {
            const loader = imgCont.querySelector('.img-loader');

            if (q.image_url) {
                imgCont.classList.remove('hidden');
                if (loader) loader.classList.remove('hidden'); 
                img.classList.add('hidden'); 
                
                img.onload = () => {
                    if (loader) loader.classList.add('hidden');
                    img.classList.remove('hidden');
                };
                img.onerror = () => {
                    imgCont.classList.add('hidden'); 
                };
                img.src = q.image_url;
            } else {
                imgCont.classList.add('hidden');
                img.src = '';
            }
        }

        const questionText = document.getElementById('question-text');
        if (questionText) questionText.innerHTML = q.question_text || '';
        
        const timeForQ = q.time_limit_seconds || 60;
        const qTimeHint = document.getElementById('q-time-hint');
        if (qTimeHint) qTimeHint.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ${timeForQ}s`;
        
        const progressFill = document.getElementById('quiz-progress-fill');
        if (progressFill) progressFill.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
        
        const container = document.getElementById('options-container');
        if (!container) return;
        
        container.innerHTML = '';
        
         const nextBtn = document.getElementById('next-button');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = `${t('btn_next')} <i class="fa-solid fa-arrow-right"></i>`;
        }
        hideAnswerRequiredToast();
        
        selectedAnswer = null;
        // PRACTICE: восстановим выбранный ответ, если уже отвечали
        if (practiceMode) {
         const qNow = questions[currentQuestionIndex];
         const saved = qNow ? practiceAnswers[String(qNow.id)] : null;
        if (saved && typeof saved === 'object' && saved.answer != null) {
           selectedAnswer = String(saved.answer);
          }
        }

        const optionsText = (q.options_text || '').trim();
        if (optionsText !== '') {
            const options = optionsText.split('\n');
            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            options.forEach((option, index) => {
                if (option.trim()) {
                    const letter = letters[index] || '';
                    const btn = document.createElement('div');
                    btn.className = 'option-card';
                    btn.innerHTML = `<div class="option-circle">${letter}</div><div class="option-text">${option.trim()}</div>`;
                    btn.onclick = () => {
                        document.querySelectorAll('.option-card').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        const optText = option.trim();
                        const isLetterOption = optText.match(/^[A-DА-Г][)\.\s]/i);
                        selectedAnswer = isLetterOption ? optText.charAt(0).toUpperCase() : optText;
                        if (!selectedAnswer && letter) selectedAnswer = letter;
                        if (!selectedAnswer) selectedAnswer = optText;
                        hideAnswerRequiredToast();
                    };
                    container.appendChild(btn);
                }
            });
        } else {
            const textarea = document.createElement('textarea');
            textarea.className = 'answer-input';
            textarea.placeholder = t('answer_placeholder');
            textarea.rows = 2;
            textarea.addEventListener('input', () => {
                selectedAnswer = textarea.value.trim();
                hideAnswerRequiredToast();
            });
            container.appendChild(textarea);
        }
        
        renderLaTeX();
    }
    
   safeAddListener('next-button', 'click', async () => {
  const nextBtn = document.getElementById('next-button');
  if (!nextBtn) return;

  // защита от клика без выбора
  if (selectedAnswer === null || selectedAnswer === undefined || String(selectedAnswer).trim() === '') {
    showAnswerRequiredToast();
    return;
  } 

  nextBtn.disabled = true;
  nextBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('saving_ans')}`;

  const q = questions[currentQuestionIndex];
  if (!q) {
    nextBtn.disabled = false;
    nextBtn.innerHTML = t('btn_next') + ' <i class="fa-solid fa-arrow-right"></i>';
    return;
  }

  // =========================
  // ✅ PRACTICE MODE (без БД)
  // =========================
  if (practiceMode) {
    let finalIsCorrect = false;

    try {
      const { data: rpcData, error: rpcError } = await supabaseClient.rpc('check_user_answer', {
        p_question_id: Number(q.id),
        p_user_answer: selectedAnswer
      });

      if (rpcError) {
        console.error("[PRACTICE] RPC Error:", rpcError);
        // если RPC упал — просто сохраняем ответ без isCorrect
        finalIsCorrect = false;
      } else {
        // у тебя раньше было: isCorrect === true
        finalIsCorrect = (rpcData === true);
      }
    } catch (e) {
      console.error("[PRACTICE] RPC Exception:", e);
      finalIsCorrect = false;
    }

    // сохраняем ответ в localStorage (без влияния на рейтинг)
    practiceAnswers[String(q.id)] = {
      answer: String(selectedAnswer),
      isCorrect: finalIsCorrect
    };

    // ✅ сохраняем practice-ответ в БД (чтобы "новые/пройденные" работало честно)
try {
  const subjKey = normalizeSubjectKey(q.subject);
  await supabaseClient.from('user_answers').upsert({
    user_id: internalDbId,
    mode: 'practice',
    tour_id: Number(getPracticeTourIdValue(practiceFilters.practiceTourId)),
    question_id: Number(q.id),
    answer: String(selectedAnswer),
    selected_option: String(selectedAnswer),
    is_correct: finalIsCorrect,
    language: currentLang,
    time_taken_ms: Math.max(0, Math.floor((questionTimeSec || 0) * 1000)),
    subject_key: subjKey || null
  }, { onConflict: 'user_id,mode,tour_id,question_id' });
} catch (e) {
  console.error('[PRACTICE] save to user_answers failed', e);
}

    
    // пересчёт correctCount по practiceAnswers
    correctCount = Object.values(practiceAnswers).filter(x => x && x.isCorrect === true).length;

    // сохранить сессию
    savePracticeSession();

    // шаг вперёд
    // save time spent on current question
perQuestionTimes[currentQuestionIndex] = questionTimeSec;

if (questionTimerInterval) {
  clearInterval(questionTimerInterval);
  questionTimerInterval = null;
}

    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
      nextBtn.disabled = false;
      nextBtn.innerHTML = `${t('btn_next')} <i class="fa-solid fa-arrow-right"></i>`;
      showQuestion();
      return;
    }

    // конец practice: показываем result-screen (НЕ пишем tour_progress)
    stopPracticeStopwatch?.();
    nextBtn.disabled = false;
    nextBtn.innerHTML = `${t('btn_next')} <i class="fa-solid fa-arrow-right"></i>`;

    // UI результата
    const total = questions.length;
    const corr = correctCount;
    const pct = total ? Math.round((corr / total) * 100) : 0;

    const resTourTitle = document.getElementById('res-tour-title');
    if (resTourTitle) resTourTitle.textContent = 'Practice';

    const resTotal = document.getElementById('res-total');
    if (resTotal) resTotal.textContent = total;

    const resCorrect = document.getElementById('res-correct');
    if (resCorrect) resCorrect.textContent = corr;

    const resultPercent = document.getElementById('result-percent');
    if (resultPercent) resultPercent.textContent = `${pct}%`;

    const circle = document.getElementById('result-circle');
    if (circle) circle.style.background = `conic-gradient(var(--primary) 0% ${pct}%, #E5E5EA ${pct}% 100%)`;

    // поясняющий текст (по твоему требованию: "берём максимум и объясняем")
    const resHint = document.getElementById('res-hint');
     if (resHint) {
      resHint.textContent = 'Практика. Прогресс сохранён. Баллы в рейтинге за завершённый тур не учитываются.';
      resHint.classList.remove('hidden');
    }

    const seenIds = loadPracticeSeenIds(practiceFilters.practiceTourId);
    (questions || []).forEach(item => {
      if (item && item.id != null) seenIds.add(String(item.id));
    });
    savePracticeSeenIds(practiceFilters.practiceTourId, seenIds);

    showScreen('result-screen');
    return;
  }

  // =========================
  // ✅ TOUR MODE (как было)
  // =========================
  if (!internalDbId || internalDbId === "null" || internalDbId === "undefined") {
    console.error("Critical error: internalDbId is invalid", internalDbId);
    alert("Xatolik: Seans muddati tugadi yoki ID topilmadi. Iltimos, botni qayta ishga tushiring.");
    nextBtn.disabled = false;
    nextBtn.innerHTML = t('repeat');
    return;
  }

  const { data: isCorrect, error: rpcError } = await supabaseClient.rpc('check_user_answer', {
    p_question_id: Number(q.id),
    p_user_answer: selectedAnswer
  });

  if (rpcError) {
    console.error("RPC Error:", rpcError);
    alert("Aloqa xatosi. Javob saqlanmadi. Qayta urinib ko'ring.");
    nextBtn.disabled = false;
    nextBtn.innerHTML = t('repeat');
    return;
  }

  const finalIsCorrect = (isCorrect === true);
  if (finalIsCorrect) correctCount++;

  try {
  const { error } = await supabaseClient.from('user_answers').upsert({
  user_id: internalDbId,
  mode: 'tour',
  tour_id: Number(currentTourId),
  question_id: Number(q.id),
  answer: selectedAnswer,
  selected_option: selectedAnswer,
  is_correct: finalIsCorrect,
  language: currentLang,
  time_taken_ms: Math.max(0, Math.floor((questionTimeSec || 0) * 1000))
}, { onConflict: 'user_id,mode,tour_id,question_id' });


    if (error) throw error;

    // === SAVE PER-QUESTION METRICS ===
perQuestionTimes[currentQuestionIndex] = questionTimeSec;
tabSwitchCountPerQuestion[currentQuestionIndex] = tabSwitchThisQuestion;
    
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      nextBtn.disabled = false;
      nextBtn.innerHTML = `${t('btn_next')} <i class="fa-solid fa-arrow-right"></i>`;
      showQuestion();
    } else {
      finishTour();
    }
  } catch (e) {
    alert('Error: ' + e.message);
    nextBtn.disabled = false;
    nextBtn.innerHTML = t('repeat');
  }
});

    async function finishTour() {
      // stop all timers
if (totalTimerInterval) {
  clearInterval(totalTimerInterval);
  totalTimerInterval = null;
}

if (questionTimerInterval) {
  clearInterval(questionTimerInterval);
  questionTimerInterval = null;
}

      if (totalTimerInterval) {
  clearInterval(totalTimerInterval);
  totalTimerInterval = null;
}
if (questionTimerInterval) {
  clearInterval(questionTimerInterval);
  questionTimerInterval = null;
}
     
      // FIX: Очищаем таймер чтобы предотвратить утечку памяти
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // FIX #3: Деактивируем анти-чит после завершения теста
        isTestActive = false;
        
        tourCompleted = true;
        
        let timeTaken = 0;
        try {
            const start = localStorage.getItem('tour_start_time');
            timeTaken = start ? Math.floor((Date.now() - Number(start)) / 1000) : 0;
        } catch (e) {
            console.warn(e);
        }
        
        try {
            // FIX: Правильный синтаксис onConflict (без пробела)
            await supabaseClient.from('tour_progress').upsert({
                user_id: internalDbId,
                tour_id: currentTourId,
                score: correctCount, 
                total_time_taken: timeTaken
            }, { onConflict: 'user_id,tour_id' }); 
        } catch (e) { 
            console.error("Progress save failed", e); 
        }

        const prevUnlocked = unlockedDirectionKeys.slice();
        await syncDirectionState();
        if (unlockedDirectionKeys.length > prevUnlocked.length || shouldOpenDirectionModal()) {
          pendingDirectionModal = true;
        }

        const percent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
// ✅ Сброс подсказки Practice (в обычном туре она не должна показываться)
const resHint = document.getElementById('res-hint');
if (resHint) {
  resHint.classList.add('hidden');
  resHint.textContent = '';
}     
        showScreen('result-screen');
        
        const resTourTitle = document.getElementById('res-tour-title');
        if (resTourTitle) resTourTitle.textContent = formatTourTitle(currentTourTitle || "1-Tur");
        
        const resTotal = document.getElementById('res-total');
        if (resTotal) resTotal.textContent = questions.length;
        
        const resCorrect = document.getElementById('res-correct');
        if (resCorrect) resCorrect.textContent = correctCount;
        
        const resultPercent = document.getElementById('result-percent');
        if (resultPercent) resultPercent.textContent = `${percent}%`;
        
        const circle = document.getElementById('result-circle');
        if (circle) circle.style.background = `conic-gradient(var(--primary) 0% ${percent}%, #E5E5EA ${percent}% 100%)`;
        
        updateMainButton('completed');
        
        const subjectsTitle = document.getElementById('subjects-title');
        if (subjectsTitle) subjectsTitle.textContent = t('curr_tour'); 
        
        fetchStatsData(); 
    }

 function startPracticeMode() {
  // В тренировке античит не нужен
  isTestActive = false;

  // можно ли продолжить?
  const saved = loadPracticeSession(practiceFilters.practiceTourId);
  const canContinue = !!saved;

  openPracticeConfigModal({ canContinue });
}

function showScreen(screenId) {
  // Находим наш индикатор загрузки и скрываем его
  const loader = document.getElementById('app-loader');
  if (loader) loader.style.display = 'none';

  // Остальной код переключения экранов
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
   const screen = document.getElementById(screenId);
  if (screen) screen.classList.remove('hidden');

  if (screenId === 'home-screen' && pendingDirectionModal) {
    pendingDirectionModal = false;
    openDirectionSelectModal({ force: true });
  }

  if (screenId === 'cabinet-screen') {
    refreshCabinetAccessUI();
  }

  window.scrollTo(0, 0);
}

window.openExternalLink = function(url) {
  const isTelegramLink = typeof url === 'string' && url.includes('t.me');
  if (window.Telegram && Telegram.WebApp) {
    if (isTelegramLink && typeof Telegram.WebApp.openTelegramLink === 'function') {
      Telegram.WebApp.openTelegramLink(url);
      return;
    }
    Telegram.WebApp.openLink(url);
    return;
  }
  window.open(url, '_blank');
};

function safeAddListener(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

const subjectSelectList = document.getElementById('subject-select-list');
if (subjectSelectList) {
  subjectSelectList.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
    const checked = getSelectedSubjectsFromModal();
    const warning = document.getElementById('subject-select-warning');
    if (checked.length > 3) {
      target.checked = false;
      if (warning) warning.classList.remove('is-hidden');
    } else if (warning) {
      warning.classList.add('is-hidden');
    }
    updateSubjectSelectState();
  });
}

safeAddListener('subject-select-next', 'click', () => {
  const selected = getSelectedSubjectsFromModal();
  if (!isSelectedSubjectsValid(selected)) {
    updateSubjectSelectState();
    return;
  }
  const modal = document.getElementById('subject-select-modal');
  if (modal) modal.classList.add('hidden');
  openSubjectConfirmModal(selected);
});

safeAddListener('subject-confirm-back', 'click', () => {
  const modal = document.getElementById('subject-confirm-modal');
  if (modal) modal.classList.add('hidden');
  openSubjectSelectModal({ preserve: true });
});

safeAddListener('subject-confirm-yes', 'click', () => {
  const selected = getSelectedSubjectsFromModal();
  if (!isSelectedSubjectsValid(selected)) {
    const modal = document.getElementById('subject-confirm-modal');
    if (modal) modal.classList.add('hidden');
    openSubjectSelectModal({ preserve: true });
    return;
  }
  try {
    localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(selected));
  } catch (e) {
    console.warn('[subjects] save failed', e);
  }
  setSubjectsLocked();
  ensureActiveSubjectValid(selected);
  applySelectedSubjectsToHomeUI(selected);
  const selectModal = document.getElementById('subject-select-modal');
  const confirmModal = document.getElementById('subject-confirm-modal');
   if (selectModal) selectModal.classList.add('hidden');
  if (confirmModal) confirmModal.classList.add('hidden');
});

safeAddListener('direction-save-btn', 'click', () => {
  saveSelectedDirectionFromModal();
});

safeAddListener('direction-close-btn', 'click', () => {
  const modal = document.getElementById('direction-select-modal');
  if (modal) modal.classList.add('hidden');
});

const directionList = document.getElementById('direction-list');
if (directionList) {
  directionList.addEventListener('change', () => {
    const saveBtn = document.getElementById('direction-save-btn');
    if (!saveBtn) return;
    const selectedInput = directionList.querySelector('input[name="direction-radio"]:checked');
    saveBtn.disabled = !selectedInput;
  });
}

const tourSubjectPickList = document.getElementById('tour-subject-pick-list');
if (tourSubjectPickList) {
  tourSubjectPickList.addEventListener('click', (event) => {
    const btn = event.target.closest('.tour-subject-pick-btn');
    if (!btn) return;
    const subject = btn.dataset.subject;
    if (subject) setActiveSubject(subject);
    closeTourSubjectPickModal();
    handleStartClick();
  });
}

safeAddListener('tour-subject-pick-cancel', 'click', () => {
  closeTourSubjectPickModal();
});

const subjectsGrid = document.querySelector('.subjects-grid');
if (subjectsGrid) {
  subjectsGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.subject-card[data-subject]');
    if (card) {
      const subject = normalizeSubjectKey(card.dataset.subject);
      if (!subject) return;
      setActiveSubject(subject);
      const shouldExpand = !card.classList.contains('is-expanded');
      document.querySelectorAll('.subject-card[data-subject].is-expanded').forEach(other => {
        if (other !== card) other.classList.remove('is-expanded');
      });
      if (shouldExpand) {
        card.classList.add('is-expanded');
        renderSubjectInlineStats(card, subject);
      } else {
        card.classList.remove('is-expanded');
      }
    }
  });
}

const resourcesAccordion = document.getElementById('resources-accordion');
const resourcesToggle = document.getElementById('resources-accordion-toggle');
const resourcesContent = document.getElementById('resources-accordion-content');
if (resourcesAccordion && resourcesToggle && resourcesContent) {
  resourcesToggle.addEventListener('click', () => {
    const isOpen = resourcesAccordion.classList.toggle('is-open');
    resourcesToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

function renderBooksList() {
  const listEl = document.getElementById('books-list');
  if (!listEl) return;
  const items = BOOKS.map((book, index) => {
    const safeTitle = escapeHTML(book.title);
    const safeSubtitle = escapeHTML(book.subtitle);
    const safeUrl = escapeHTML(book.url);
    return `
      <div class="resource-card book-resource" data-url="${safeUrl}" data-index="${index}">
        <div class="res-icon pdf"><i class="fa-solid fa-file-pdf"></i></div>
        <div class="res-info"><h4>${safeTitle}</h4><p>${safeSubtitle}</p></div>
        <i class="fa-solid fa-chevron-right arrow"></i>
      </div>
    `;
  }).join('');
  listEl.innerHTML = items;
}

function openBooksModal() {
  const modal = document.getElementById('books-modal');
  if (!modal) return;
  renderBooksList();
  modal.classList.remove('hidden');
}

function closeBooksModal() {
  const modal = document.getElementById('books-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

safeAddListener('books-resource-card', 'click', openBooksModal);
safeAddListener('books-modal-close', 'click', closeBooksModal);
safeAddListener('books-modal-back', 'click', closeBooksModal);

const booksList = document.getElementById('books-list');
if (booksList) {
  booksList.addEventListener('click', (event) => {
    const item = event.target.closest('.book-resource');
    if (!item) return;
    const url = item.dataset.url;
    if (url && url !== '#') {
      openExternalLink(url);
      return;
    }
    alert('Файл будет добавлен позже');
  });
}
safeAddListener('open-cabinet-btn', 'click', () => { 
  showScreen('cabinet-screen'); 
  loadLeaderboard(); 
});

safeAddListener('close-cabinet', 'click', () => showScreen('home-screen'));

safeAddListener('btn-edit-profile', 'click', () => {
  showScreen('reg-screen');
  if (isProfileLocked) lockProfileForm(true);
  else unlockProfileForm();

  const backBtn = document.getElementById('reg-back-btn');
  if (backBtn) backBtn.classList.remove('hidden');
});

safeAddListener('reg-back-btn', 'click', () => showScreen('cabinet-screen'));

safeAddListener('leaderboard-btn', 'click', () => {
  showScreen('leaderboard-screen');
  setLeaderboardFilter('republic');
});

safeAddListener('lb-back', 'click', () => showScreen('home-screen'));

safeAddListener('open-about-btn', 'click', () => {
  const modal = document.getElementById('about-modal');
  if (modal) modal.classList.remove('hidden');
});

safeAddListener('close-about', 'click', () => {
  const modal = document.getElementById('about-modal');
  if (modal) modal.classList.add('hidden');
});

safeAddListener('exit-app-btn', 'click', () => {
  // FIX: Очищаем таймер перед выходом
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // FIX: Деактивируем анти-чит при выходе
  isTestActive = false;

  if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) {
    Telegram.WebApp.close();
  } else {
    try { localStorage.clear(); } catch (e) { console.warn(e); }
    location.reload();
  }
});

safeAddListener('home-cert-btn', 'click', () => openCertificates());
safeAddListener('download-certificate-res-btn', 'click', () => openCertificates());
safeAddListener('btn-open-certs-cab', 'click', () => openCertificates());
safeAddListener('certs-back-btn', 'click', () => showScreen('cabinet-screen'));
safeAddListener('cert-download-btn', 'click', () => downloadCertificatePdf());
safeAddListener('cert-share-btn', 'click', () => shareCertificate());
safeAddListener('cancel-start', 'click', () => {
  const modal = document.getElementById('warning-modal');
  if (modal) modal.classList.add('hidden');
});

safeAddListener('back-home', 'click', () => showScreen('home-screen'));
safeAddListener('back-home-x', 'click', () => showScreen('home-screen'));

safeAddListener('practice-start-btn', 'click', async () => {
  closePracticeConfigModal();
  const cfg = getPracticeConfigFromUI();
  clearPracticeSession(cfg.practiceTourId);     // новый запуск = чистим старый прогресс
  await beginPracticeNew(cfg);
});

safeAddListener('practice-back-btn', 'click', () => {
  closePracticeConfigModal();
});

safeAddListener('practice-close-btn', 'click', () => {
  closePracticeConfigModal();
});

safeAddListener('practice-continue-btn', 'click', async () => {
  closePracticeConfigModal();
  await beginPracticeContinue();
});

safeAddListener('practice-exit-btn', 'click', () => {
  exitPracticeToReturnScreen();
});
  
safeAddListener('prev-button', 'click', () => {
  // Назад разрешаем только в Practice
  if (!practiceMode) return;

  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    savePracticeSession();
    showQuestion();
  }
});
  

function getCertificateDisplayName() {
  const tgName = [telegramData.firstName, telegramData.lastName].filter(Boolean).join(' ').trim();
  if (currentUserData && (currentUserData.full_name || currentUserData.name)) {
    return (currentUserData.full_name || currentUserData.name).trim();
  }
  return tgName || t('participant_label');
}

function getCertificateSubjects() {
  const subjectSet = new Set();
  (tourQuestionsAllCache || []).forEach(q => {
    const key = normalizeSubjectKey(q.subject);
    if (key) subjectSet.add(subjectDisplayName(key));
  });
  const list = Array.from(subjectSet).filter(Boolean);
  if (list.length > 0) return list.slice(0, 4);
  return [t('subj_math'), t('subj_chem')].filter(Boolean);
}

function renderCertificatePreview() {
  const nameEl = document.getElementById('cert-full-name');
  if (nameEl) nameEl.textContent = getCertificateDisplayName();

  const classVal = currentUserData?.class ? `${currentUserData.class} ${t('class_s')}` : '';
  const schoolVal = currentUserData?.school ? `${t('school_prefix')} №${currentUserData.school}` : '';
  const districtVal = currentUserData?.district || '';
  const regionVal = currentUserData?.region || '';
  const metaParts = [classVal, schoolVal, districtVal, regionVal].filter(Boolean);
  const metaEl = document.getElementById('cert-meta');
  if (metaEl) metaEl.textContent = metaParts.join(' • ') || t('no_data');

  const subjectsEl = document.getElementById('cert-subjects');
  if (subjectsEl) {
    subjectsEl.innerHTML = '';
    getCertificateSubjects().forEach(label => {
      const pill = document.createElement('div');
      pill.className = 'subject-pill';
      pill.textContent = label;
      subjectsEl.appendChild(pill);
    });
  }

  const rankEl = document.getElementById('cert-rank');
  if (rankEl) rankEl.textContent = t('cert_soon');

  const scoreEl = document.getElementById('cert-score');
  if (scoreEl) scoreEl.textContent = currentUserData?.score || '--';

  const dateEl = document.getElementById('cert-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString();

  const idEl = document.getElementById('cert-id');
  if (idEl) idEl.textContent = String(telegramUserId || '').slice(-6) || '000000';
}

function openCertificates() {
  renderCertificatePreview();
  showScreen('certificate-screen');
}

function downloadCertificatePdf() {
  renderCertificatePreview();
  window.print();
}

function shareCertificate() {
  const shareText = t('cert_share_text');
  const shareData = {
    title: t('cert_title'),
    text: shareText,
    url: location.href
  };

  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
    return;
  }

  if (window.Telegram && Telegram.WebApp && Telegram.WebApp.openLink) {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(shareText)}`;
    Telegram.WebApp.openLink(tgUrl);
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(location.href).then(() => alert(t('link_copied'))).catch(() => {
      alert(t('cert_share_unavailable'));
    });
    return;
  }

  alert(t('cert_share_unavailable'));
}
// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTestActive = false;
});

 // Запускаем нашу безопасную функцию после загрузки DOM и объявления всех функций
  startApp();
});

































