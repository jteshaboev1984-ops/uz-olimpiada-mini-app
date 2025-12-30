document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v74.2 (Final Check & Verified Buttons)');
  
    // === ПЕРЕМЕННЫЕ ===
    let telegramUserId; 
    let telegramData = { firstName: null, lastName: null, photoUrl: null, languageCode: null };
    let internalDbId = null; 
    let currentTourId = null;
    let currentTourTitle = ""; 
    let currentUserData = null;
    let tourQuestionsCache = [];
    let userAnswersCache = [];
    let currentLang = 'uz'; 
    let tourCompleted = false;
    let isLangLocked = false; 
    let isProfileLocked = false; 

    // === ТЕСТ И АНТИ-ЧИТ ===
    let questions = [];
    let currentQuestionIndex = 0;
    let correctCount = 0;
    let timerInterval = null;
    let selectedAnswer = null;
    let cheatWarningCount = 0; 

    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const translations = {
        uz: {
            reg_title: "Ro'yxatdan o'tish", reg_subtitle: "Ma'lumotlaringizni kiriting", btn_save: "Saqlash va Tasdiqlash", greeting_hi: "Salom", btn_leaderboard: "Reyting", btn_about: "Loyiha haqida", subjects_title: "Fanlar", loading: "Yuklanmoqda...", btn_next: "Keyingi", res_screen_title: "Tur natijasi", res_finished: "Tur yakunlandi!", stat_correct: "TO'G'RI", btn_start: "Boshlash", btn_close: "Yopish", tour_passed_title: "Tur yakunlangan!", locked_alert_title: "O'zgartirish imkonsiz", alert_fill: "Barcha maydonlarni to'ldiring!", start_tour_btn: "Turni boshlash", answer_placeholder: "Javobni kiriting...", profile_locked_msg: "Ma'lumotlar tasdiqlangan", cheat_title: "DIQQAT! QOIDABUZARLIK!", cheat_msg: "Ilovadan chiqish taqiqlanadi!", select_region: "Viloyatni tanlang", select_district: "Tumanni tanlang", select_class: "Sinfni tanlang"
        },
        ru: {
            reg_title: "Регистрация", reg_subtitle: "Введите данные", btn_save: "Сохранить и Подтвердить", greeting_hi: "Привет", btn_leaderboard: "Рейтинг", btn_about: "О проекте", subjects_title: "Предметы", loading: "Загрузка...", btn_next: "Далее", res_screen_title: "Результат тура", res_finished: "Тур завершён!", stat_correct: "ВЕРНО", btn_start: "Начать", btn_close: "Закрыть", tour_passed_title: "Тур пройден!", locked_alert_title: "Изменение невозможно", alert_fill: "Заполните все поля!", start_tour_btn: "Начать тур", answer_placeholder: "Введите ответ...", profile_locked_msg: "Данные подтверждены", cheat_title: "НАРУШЕНИЕ!", cheat_msg: "Покидать приложение нельзя!", select_region: "Выберите регион", select_district: "Выберите район", select_class: "Выберите класс"
        }
    };

    function t(key) { return translations[currentLang][key] || key; }

    function setLanguage(lang) {
        if (isLangLocked && lang !== currentLang) return;
        currentLang = lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) el.innerHTML = translations[lang][key]; 
        });
        updateSelectPlaceholders();
    }

    function updateSelectPlaceholders() {
        const rS = document.getElementById('region-select'); if(rS) rS.options[0].text = t('select_region');
        const dS = document.getElementById('district-select'); if(dS) dS.options[0].text = t('select_district');
        const cS = document.getElementById('class-select'); if(cS) cS.options[0].text = t('select_class');
    }

    // === ИНИЦИАЛИЗАЦИЯ TG ===
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        const user = Telegram.WebApp.initDataUnsafe.user;
        if (user) {
            telegramUserId = Number(user.id);
            telegramData.firstName = user.first_name;
            telegramData.lastName = user.last_name;
            document.getElementById('home-user-name').textContent = user.first_name;
        } else {
            telegramUserId = 12345; // Test
        }
    }

    // === ЛОГИКА ПРОФИЛЯ ===
    async function checkProfile() {
        const { data: user } = await supabaseClient.from('users').select('*').eq('telegram_id', telegramUserId).maybeSingle();
        if (user) {
            internalDbId = user.id; currentUserData = user;
            if (user.fixed_language) { currentLang = user.fixed_language; setLanguage(user.fixed_language); isLangLocked = true; }
            if (user.class && user.region && user.district) {
                isProfileLocked = true; fillProfileForm(user); showScreen('home-screen');
            } else { showScreen('reg-screen'); }
        } else {
            const { data: newUser } = await supabaseClient.from('users').insert({ telegram_id: telegramUserId, name: telegramData.firstName || 'User' }).select().single();
            internalDbId = newUser.id; showScreen('reg-screen');
        }
        checkTour();
    }

    async function checkTour() {
        const now = new Date().toISOString();
        const { data: tour } = await supabaseClient.from('tours').select('*').lte('start_date', now).gte('end_date', now).eq('is_active', true).maybeSingle();
        if (tour) {
            currentTourId = tour.id;
            const { data: prog } = await supabaseClient.from('tour_progress').select('*').eq('user_id', internalDbId).eq('tour_id', tour.id).maybeSingle();
            tourCompleted = !!prog;
            updateMainButton(tourCompleted ? 'completed' : 'start', tour.title);
        } else { updateMainButton('inactive'); }
    }

    function fillProfileForm(d) {
        document.getElementById('class-select').value = d.class;
        document.getElementById('region-select').value = d.region;
        document.getElementById('school-input').value = d.school;
    }

    // === ОБРАБОТЧИКИ КНОПОК ===
    safeAddListener('save-profile', 'click', async () => {
        const c = document.getElementById('class-select').value;
        const r = document.getElementById('region-select').value;
        const d = document.getElementById('district-select').value;
        const s = document.getElementById('school-input').value;
        const l = document.getElementById('reg-lang-select').value;

        if (!c || !r || !d || !s) return alert(t('alert_fill'));

        document.getElementById('save-profile').disabled = true;
        const { error } = await supabaseClient.from('users').update({
            class: c, region: r, district: d, school: s, fixed_language: l
        }).eq('id', internalDbId);

        if (!error) {
            isLangLocked = true; isProfileLocked = true; currentLang = l; setLanguage(l);
            showScreen('home-screen');
        } else { document.getElementById('save-profile').disabled = false; }
    });

    safeAddListener('main-action-btn', 'click', () => {
        if (!tourCompleted && currentTourId) document.getElementById('warning-modal').classList.remove('hidden');
    });

    safeAddListener('confirm-start', 'click', () => {
        document.getElementById('warning-modal').classList.add('hidden');
        startTourLadder();
    });

    safeAddListener('cancel-start', 'click', () => document.getElementById('warning-modal').classList.add('hidden'));
    safeAddListener('open-cabinet-btn', 'click', () => showScreen('cabinet-screen'));
    safeAddListener('close-cabinet', 'click', () => showScreen('home-screen'));
    safeAddListener('leaderboard-btn', 'click', () => { showScreen('leaderboard-screen'); loadLeaderboard(); });
    safeAddListener('lb-back', 'click', () => showScreen('home-screen'));

    // === БАЛАНСИРОВЩИК (3 Math + 12 others) ===
    async function startTourLadder() {
        const { data: allQ } = await supabaseClient.from('questions').select('*').eq('tour_id', currentTourId).eq('language', currentLang);
        if (!allQ || allQ.length < 15) return alert("Not enough questions in DB");

        const buckets = { math: [], bio: [], chem: [], phys: [], eco: [], it: [], eng: [] };
        allQ.forEach(q => {
            const subj = (q.subject || '').toLowerCase();
            if (subj.includes('math')) buckets.math.push(q);
            else if (subj.includes('biol')) buckets.bio.push(q);
            else if (subj.includes('chem')) buckets.chem.push(q);
            else if (subj.includes('phys')) buckets.phys.push(q);
            else if (subj.includes('econ')) buckets.eco.push(q);
            else if (subj.includes('computer') || subj.includes('it')) buckets.it.push(q);
            else buckets.eng.push(q);
        });

        // Берем 3 математики и по 2 из остальных (всего 15)
        let ticket = [];
        ticket.push(...pickRandom(buckets.math, 3));
        ticket.push(...pickRandom(buckets.bio, 2));
        ticket.push(...pickRandom(buckets.chem, 2));
        ticket.push(...pickRandom(buckets.phys, 2));
        ticket.push(...pickRandom(buckets.it, 2));
        ticket.push(...pickRandom(buckets.eco, 2));
        ticket.push(...pickRandom(buckets.eng, 2));

        // Сортировка по сложности (Лестница)
        const rank = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        questions = ticket.sort((a,b) => rank[a.difficulty] - rank[b.difficulty]);
        
        currentQuestionIndex = 0; correctCount = 0;
        showScreen('quiz-screen');
        showQuestion();
    }

    function pickRandom(arr, n) {
        return arr.sort(() => 0.5 - Math.random()).slice(0, n);
    }

    function showQuestion() {
        const q = questions[currentQuestionIndex];
        document.getElementById('question-text').innerHTML = q.question_text;
        document.getElementById('subject-tag').textContent = q.subject;
        const container = document.getElementById('options-container');
        container.innerHTML = '';
        
        const opts = (q.options_text || '').split('\n');
        if (opts.length > 1) {
            opts.forEach((o, i) => {
                const btn = document.createElement('div'); btn.className = 'option-card';
                btn.innerHTML = `<div class="option-text">${o}</div>`;
                btn.onclick = () => {
                    document.querySelectorAll('.option-card').forEach(x => x.classList.remove('selected'));
                    btn.classList.add('selected'); selectedAnswer = ['A','B','C','D'][i];
                    document.getElementById('next-button').disabled = false;
                };
                container.appendChild(btn);
            });
        } else {
            const inp = document.createElement('input'); inp.className = 'answer-input';
            inp.oninput = (e) => { selectedAnswer = e.target.value; document.getElementById('next-button').disabled = !selectedAnswer; };
            container.appendChild(inp);
        }
        document.getElementById('next-button').disabled = true;
    }

    safeAddListener('next-button', 'click', async () => {
        const q = questions[currentQuestionIndex];
        const { data: isCorrect } = await supabaseClient.rpc('check_user_answer', { p_question_id: q.id, p_user_answer: selectedAnswer });
        if (isCorrect) correctCount++;
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) showQuestion(); else finishTour();
    });

    async function finishTour() {
        await supabaseClient.from('tour_progress').insert({ user_id: internalDbId, tour_id: currentTourId, score: correctCount });
        showScreen('result-screen');
        document.getElementById('res-correct').textContent = correctCount;
        tourCompleted = true; updateMainButton('completed');
    }

    // === UI HELPERS ===
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    }

    function safeAddListener(id, ev, fn) { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); }

    function updateMainButton(state, title = "") {
        const btn = document.getElementById('main-action-btn');
        if (!btn) return;
        if (state === 'completed') { btn.innerHTML = t('tour_completed_btn'); btn.disabled = true; }
        else { btn.innerHTML = title || t('start_tour_btn'); btn.disabled = false; }
    }

    checkProfile();
});
