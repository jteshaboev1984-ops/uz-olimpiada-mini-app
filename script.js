document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v73.1 (No Errors & UI Fixed)');
  
    // === ПЕРЕМЕННЫЕ ===
    let telegramUserId; 
    let telegramData = { firstName: null, lastName: null, photoUrl: null, languageCode: null };
    let internalDbId = null; 
    let currentTourId = null;
    let currentTourTitle = ""; 
    let currentUserData = null;
    let tourQuestionsCache = [];
    let userAnswersCache = [];
    let currentLbFilter = 'republic'; 
    let currentLang = 'uz'; 
    let tourCompleted = false;
    let isLangLocked = false; 
    let isProfileLocked = false; 

    let questions = [];
    let currentQuestionIndex = 0;
    let correctCount = 0;
    let timerInterval = null;
    let selectedAnswer = null;

    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // === ПЕРЕВОДЫ ===
    const translations = {
        uz: {
            reg_title: "Ro'yxatdan o'tish", reg_subtitle: "Ma'lumotlaringizni kiriting", label_full_name: "F.I.O. (Sertifikat uchun)", label_class: "Sinf", label_region: "Viloyat", label_district: "Tuman / Shahar", label_school: "Maktab", btn_save: "Saqlash va Tasdiqlash", btn_back: "Orqaga", profile_locked_msg: "Ma'lumotlar tasdiqlangan", profile_locked_hint: "O'zgartirish imkonsiz (Faqat Admin orqali)", greeting_hi: "Salom", btn_leaderboard: "Reyting", btn_about: "Loyiha haqida", subjects_title: "Fanlar", subj_math: "Matematika", subj_eng: "Ingliz tili", loading: "Yuklanmoqda...", btn_exit: "Chiqish", btn_next: "Keyingi", stat_tour: "TUR", stat_total: "JAMI", stat_correct: "TO'G'RI", lb_title: "Reyting", lb_republic: "Respublika", lb_region: "Viloyat", lb_district: "Tuman", lb_points: "BALL", lb_rank: "O'rin", stat_tours: "Turlar", warn_title: "Diqqat", warn_msg_1: "Sizda", warn_msg_2: "ta savol uchun", warn_msg_3: "vaqt bor.", btn_start: "Boshlash", btn_cancel: "Bekor qilish", select_region: "Viloyatni tanlang", select_district: "Tumanni tanlang", select_class: "Sinfni tanlang", class_s: "sinf", tour_completed_btn: "Tur yakunlangan", start_tour_btn: "Turni boshlash", minutes: "daqiqa", questions: "savol", btn_understood: "Tushunarli", cheat_title: "Diqqat!", cheat_msg: "Ilovadan chiqish taqiqlanadi!", btn_to_main: "Bosh sahifaga", menu_lang: "Til", menu_my_data: "Ma'lumotlarim", menu_my_data_desc: "Ism, sinf, maktab", menu_certs: "Sertifikatlar", menu_certs_desc: "Yutuqlar arxivi", menu_mistakes: "Xatolar tahlili", btn_delete_account: "Hisobni o'chirish", alert_fill: "Barcha maydonlarni to'ldiring!"
        },
        ru: {
            reg_title: "Регистрация", reg_subtitle: "Введите данные", label_full_name: "Ф.И.О. (Для сертификата)", label_class: "Класс", label_region: "Регион", label_district: "Район / Город", label_school: "Школа", btn_save: "Сохранить и Подтвердить", btn_back: "Назад", profile_locked_msg: "Данные подтверждены", profile_locked_hint: "Изменение невозможно (Через админа)", greeting_hi: "Привет", btn_leaderboard: "Рейтинг", btn_about: "О проекте", subjects_title: "Предметы", subj_math: "Математика", subj_eng: "Английский", loading: "Загрузка...", btn_exit: "Выход", btn_next: "Далее", stat_tour: "ТУР", stat_total: "ВСЕГО", stat_correct: "ВЕРНО", lb_title: "Рейтинг", lb_republic: "Республика", lb_region: "Регион", lb_district: "Район", lb_points: "БАЛЛЫ", lb_rank: "Место", stat_tours: "Туров", warn_title: "Внимание", warn_msg_1: "У вас будет", warn_msg_2: "на", warn_msg_3: "вопросов.", btn_start: "Начать", btn_cancel: "Отмена", select_region: "Выберите регион", select_district: "Выберите район", select_class: "Выберите класс", class_s: "класс", tour_completed_btn: "Тур завершен", start_tour_btn: "Начать тур", minutes: "минут", questions: "вопросов", btn_understood: "Понятно", cheat_title: "Внимание!", cheat_msg: "Выходить из приложения запрещено!", btn_to_main: "На главную", menu_lang: "Язык", menu_my_data: "Мои данные", menu_my_data_desc: "Имя, класс, школа", menu_certs: "Сертификаты", menu_certs_desc: "Архив достижений", menu_mistakes: "Разбор ошибок", btn_delete_account: "Удалить аккаунт", alert_fill: "Заполните все поля!"
        },
        en: {
            reg_title: "Registration", reg_subtitle: "Enter details", label_full_name: "Full Name (For Certificate)", label_class: "Grade", label_region: "Region", label_district: "District / City", label_school: "School", btn_save: "Save & Confirm", btn_back: "Back", profile_locked_msg: "Data Confirmed", profile_locked_hint: "Cannot be changed (Contact Admin)", greeting_hi: "Hi", btn_leaderboard: "Leaderboard", btn_about: "About", subjects_title: "Subjects", subj_math: "Math", subj_eng: "English", loading: "Loading...", btn_exit: "Exit", btn_next: "Next", stat_tour: "TOUR", stat_total: "TOTAL", stat_correct: "CORRECT", lb_title: "Leaderboard", lb_republic: "Republic", lb_region: "Region", lb_district: "District", lb_points: "POINTS", lb_rank: "Rank", stat_tours: "Tours", warn_title: "Warning", warn_msg_1: "You have", warn_msg_2: "for", warn_msg_3: "questions.", btn_start: "Start", btn_cancel: "Cancel", select_region: "Select Region", select_district: "Select District", select_class: "Select Grade", class_s: "grade", tour_completed_btn: "Tour Finished", start_tour_btn: "Start Tour", minutes: "minutes", questions: "questions", btn_understood: "Understood", cheat_title: "Warning!", cheat_msg: "Leaving the app is prohibited!", btn_to_main: "Home", menu_lang: "Language", menu_my_data: "My Data", menu_my_data_desc: "Name, grade, school", menu_certs: "Certificates", menu_certs_desc: "Achievement Archive", menu_mistakes: "Error Review", btn_delete_account: "Delete Account", alert_fill: "Fill in all fields!"
        }
    };

    function t(key) { return translations[currentLang][key] || key; }

    function formatTourTitle(raw) {
        if (!raw) return t('start_tour_btn');
        return raw.replace(/Tur|Тур|Tour/i, t('stat_tour'));
    }

    // === ФУНКЦИИ СТАТИСТИКИ (ПЕРЕНЕСЕНЫ ВВЕРХ) ===
    async function fetchStatsData() {
        if (!internalDbId || !currentTourId) return;
        const { data: qData } = await supabaseClient.from('questions').select('id, subject').eq('tour_id', currentTourId).eq('language', currentLang);
        tourQuestionsCache = qData || [];
        const { data: aData } = await supabaseClient.from('user_answers').select('question_id, is_correct').eq('user_id', internalDbId);
        userAnswersCache = aData || [];
        updateDashboardStats();
    }

    function updateDashboardStats() {
        ['math', 'eng'].forEach(p => {
            const keys = p === 'math' ? ['matematika', 'math'] : ['ingliz', 'english'];
            const subQ = tourQuestionsCache.filter(q => q.subject && keys.some(k => q.subject.toLowerCase().includes(k)));
            const corr = subQ.filter(q => userAnswersCache.find(a => a.question_id === q.id && a.is_correct)).length;
            const pct = subQ.length > 0 ? Math.round((corr / 15) * 100) : 0;
            const pEl = document.getElementById(`${p}-percent`); if (pEl) pEl.textContent = pct + '%';
            const bEl = document.getElementById(`${p}-bar`); if (bEl) bEl.style.width = pct + '%';
        });
        const sEl = document.getElementById('cab-score'); if (sEl) sEl.textContent = userAnswersCache.filter(a => a.is_correct).length;
        const tEl = document.getElementById('cab-tours'); if (tEl) tEl.textContent = tourCompleted ? 1 : 0;
    }

    // === ДАННЫЕ РЕГИОНОВ ===
    const regions = {
        "Toshkent shahri": ["Bektemir tumani", "Chilonzor tumani", "Mirobod tumani", "Mirzo Ulug'bek tumani", "Olmazor tumani", "Sergeli tumani", "Shayxontohur tumani", "Uchtepa tumani", "Yakkasaroy tumani", "Yangihayot tumani", "Yashnobod tumani", "Yunusobod tumani"],
        "Andijon viloyati": ["Andijon shahri", "Asaka tumani", "Baliqchi tumani", "Buloqboshi tumani", "Izboskan tumani", "Marhamat tumani", "Oltinko'l tumani", "Paxtaobod tumani", "Shahrixon tumani", "Xo'jaobod tumani"],
        "Buxoro viloyati": ["Buxoro shahri", "G'ijduvon tumani", "Jondor tumani", "Kogon tumani", "Olot tumani", "Peshku tumani", "Qorako'l tumani", "Romitan tumani", "Shofirkon tumani", "Vobkent tumani"],
        "Farg'ona viloyati": ["Farg'ona shahri", "Marg'ilon shahri", "Qo'qon shahri", "Bag'dod tumani", "Buvayda tumani", "Dang'ara tumani", "Rishton tumani", "Toshloq tumani", "O'zbekiston tumani", "Yozyovon tumani"],
        "Jizzax viloyati": ["Jizzax shahri", "Arnasoy tumani", "Baxmal tumani", "Do'stlik tumani", "Forish tumani", "G'allaorol tumani", "Mirzacho'l tumani", "Paxtakor tumani", "Zomin tumani"],
        "Xorazm viloyati": ["Urganch shahri", "Xiva shahri", "Bog'ot tumani", "Gurlan tumani", "Hazorasp tumani", "Xonqa tumani", "Shovot tumani", "Yangiariq tumani"],
        "Namangan viloyati": ["Namangan shahri", "Chortoq tumani", "Chust tumani", "Kosonsoy tumani", "Mingbuloq tumani", "Norin tumani", "Pop tumani", "Uychi tumani", "Yangiqo'rg'on tumani"],
        "Navoiy viloyati": ["Navoiy shahri", "Zarafshon shahri", "Karmana tumani", "Qiziltepa tumani", "Xatirchi tumani", "Nurota tumani", "Uchquduq tumani"],
        "Qashqadaryo viloyati": ["Qarshi shahri", "Shahrisabz shahri", "Chiroqchi tumani", "Dehqonobod tumani", "G'uzor tumani", "Qamashi tumani", "Kitob tumani", "Koson tumani", "Muborak tumani", "Nishon tumani"],
        "Qoraqalpog'iston": ["Nukus shahri", "Amudaryo tumani", "Beruniy tumani", "Chimboy tumani", "Ellikqal'a tumani", "Qo'ng'irot tumani", "To'rtko'l tumani", "Xo'jayli tumani"],
        "Samarqand viloyati": ["Samarqand shahri", "Kattaqo'rg'on shahri", "Bulung'ur tumani", "Ishtixon tumani", "Jomboy tumani", "Narpay tumani", "Payariq tumani", "Pastdarg'om tumani", "Urgut tumani"],
        "Sirdaryo viloyati": ["Guliston shahri", "Yangiyer shahri", "Boyovut tumani", "Xovos tumani", "Sayxunobod tumani", "Sirdaryo tumani"],
        "Surxondaryo viloyati": ["Termiz shahri", "Angor tumani", "Boysun tumani", "Denov tumani", "Jarqo'rg'on tumani", "Sariosiyo tumani", "Sherobod tumani", "Sho'rchi tumani", "Uzun tumani"],
        "Toshkent viloyati": ["Nurafshon shahri", "Olmaliq shahri", "Angren shahri", "Bekobod shahri", "Ohangaron shahri", "Chirchiq shahri", "Bo'stonliq tumani", "Chinoz tumani", "Parkent tumani", "Zangiota tumani", "Qibray tumani"]
    };

    function initSelectors() {
        const rs = document.getElementById('region-select');
        const cs = document.getElementById('class-select');
        if (rs) {
            rs.innerHTML = `<option value="" disabled selected>${t('select_region')}</option>`;
            Object.keys(regions).sort().forEach(r => {
                const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
                rs.appendChild(opt);
            });
            rs.onchange = () => {
                const ds = document.getElementById('district-select');
                ds.innerHTML = `<option value="" disabled selected>${t('select_district')}</option>`;
                ds.disabled = false;
                if (regions[rs.value]) regions[rs.value].sort().forEach(d => {
                    const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
                    ds.appendChild(opt);
                });
            };
        }
        if (cs) {
            cs.innerHTML = `<option value="" disabled selected>${t('select_class')}</option>`;
            [8,9,10,11].forEach(v => {
                const opt = document.createElement('option'); opt.value = v; opt.textContent = v + ' ' + t('class_s');
                cs.appendChild(opt);
            });
        }
    }

    function setLanguage(lang) {
        if (isLangLocked && lang !== currentLang) return;
        currentLang = lang || 'uz';
        localStorage.setItem('user_lang', currentLang);
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const k = el.getAttribute('data-i18n');
            if (translations[currentLang][k]) el.innerHTML = translations[currentLang][k];
        });
        initSelectors();
        if (tourCompleted) updateMainButton('completed');
        else if (currentTourId) updateMainButton('start', formatTourTitle(currentTourTitle));
        else updateMainButton('inactive');
    }

    async function checkProfileAndTour() {
        const { data: user } = await supabaseClient.from('users').select('*').eq('telegram_id', telegramUserId).maybeSingle();
        if (user) {
            internalDbId = user.id; currentUserData = user;
            if (user.fixed_language) { isLangLocked = true; setLanguage(user.fixed_language); }
            if (user.full_name && user.class) isProfileLocked = true;
            const cName = document.getElementById('cab-name'); if(cName) cName.textContent = user.full_name || user.name;
            const cId = document.getElementById('cab-id'); if(cId) cId.textContent = String(telegramUserId).slice(-6);
        } else {
            const { data: newUser } = await supabaseClient.from('users').insert({ telegram_id: telegramUserId, name: telegramData.firstName }).select().single();
            internalDbId = newUser.id; currentUserData = newUser;
        }

        const now = new Date().toISOString();
        const { data: tour } = await supabaseClient.from('tours').select('*').lte('start_date', now).gte('end_date', now).eq('is_active', true).maybeSingle();
        if (tour) {
            currentTourId = tour.id; currentTourTitle = tour.title;
            const { data: prog } = await supabaseClient.from('tour_progress').select('*').eq('user_id', internalDbId).eq('tour_id', tour.id).maybeSingle();
            tourCompleted = !!prog;
            setLanguage(currentLang);
            fetchStatsData();
        } else updateMainButton('inactive');

        if (!currentUserData.full_name || !currentUserData.class) showScreen('reg-screen');
        else { fillProfileForm(currentUserData); showScreen('home-screen'); }
    }

    function fillProfileForm(d) {
        document.getElementById('full-name-input').value = d.full_name || "";
        document.getElementById('class-select').value = d.class || "";
        document.getElementById('region-select').value = d.region || "";
        if (d.region) {
            const ds = document.getElementById('district-select');
            ds.innerHTML = ""; ds.disabled = false;
            regions[d.region].forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; ds.appendChild(o); });
            ds.value = d.district || "";
        }
        document.getElementById('school-input').value = d.school || "";
        if (isProfileLocked) lockProfileForm();
    }

    function lockProfileForm() {
        const sBtn = document.getElementById('save-profile'); if(sBtn) sBtn.classList.add('hidden');
        const lMsg = document.getElementById('reg-locked-msg'); if(lMsg) lMsg.classList.remove('hidden');
        const bBtn = document.getElementById('reg-back-btn'); if(bBtn) bBtn.classList.remove('hidden');
        document.querySelectorAll('#reg-screen input, #reg-screen select').forEach(el => el.disabled = true);
    }

    function unlockProfileForm() {
        const sBtn = document.getElementById('save-profile'); if(sBtn) sBtn.classList.remove('hidden');
        document.querySelectorAll('#reg-screen input, #reg-screen select').forEach(el => el.disabled = false);
    }

    // === МАТРИЧНЫЙ АЛГОРИТМ 15 ВОПРОСОВ ===
    async function handleStartClick() {
        const btn = document.getElementById('main-action-btn'); btn.innerHTML = t('loading');
        const { data: allQ } = await supabaseClient.from('questions').select('*').eq('tour_id', currentTourId).eq('language', currentLang);
        if (!allQ || allQ.length === 0) { alert("Savollar topilmadi."); updateMainButton('start', formatTourTitle(currentTourTitle)); return; }

        const pick = (s, d) => {
            const pool = allQ.filter(q => (q.subject || '').toLowerCase().includes(s) && q.difficulty === d);
            return pool.length ? pool[Math.floor(Math.random()*pool.length)] : allQ.find(q => (q.subject||'').toLowerCase().includes(s));
        };

        const ticket = [pick('math', 'Easy'), pick('math', 'Medium'), pick('math', 'Hard')];
        const subs = ['eng', 'phys', 'chem', 'bio', 'it', 'eco'];
        let diffs = ['Hard', 'Medium', 'Medium', 'Medium', 'Medium', 'Easy', 'Easy', 'Easy', 'Easy', 'Easy', 'Easy', 'Easy'];
        diffs.sort(() => 0.5 - Math.random());
        
        let idx = 0;
        subs.forEach(s => { ticket.push(pick(s, diffs[idx++])); ticket.push(pick(s, diffs[idx++])); });
        
        questions = ticket.filter(q => q).sort(() => 0.5 - Math.random());
        const totalSecs = questions.reduce((a, q) => a + (q.time_limit_seconds || 60), 0);
        
        document.getElementById('warn-q-val').textContent = questions.length + ' ' + t('questions');
        document.getElementById('warn-time-val').textContent = Math.ceil(totalSecs/60) + ' ' + t('minutes');
        document.getElementById('warning-modal').classList.remove('hidden');
        updateMainButton('start', formatTourTitle(currentTourTitle));
    }

    function updateMainButton(st, title = "") {
        const btn = document.getElementById('main-action-btn'); if (!btn) return;
        const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
        const b = document.getElementById('main-action-btn');
        if (st === 'inactive') { b.innerHTML = t('no_active_tour'); b.disabled = true; b.style.background = "#8E8E93"; }
        else if (st === 'completed') { b.innerHTML = `<i class="fa-solid fa-check"></i> ` + t('tour_completed_btn'); b.onclick = () => document.getElementById('tour-info-modal').classList.remove('hidden'); }
        else { b.innerHTML = `<i class="fa-solid fa-play"></i> ${title || t('start_tour_btn')}`; b.onclick = handleStartClick; }
    }

    async function loadLeaderboard() {
        const listEl = document.getElementById('lb-list');
        listEl.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">${t('loading')}</p>`;
        const { data: scores } = await supabaseClient.from('tour_progress').select('user_id, score').eq('tour_id', currentTourId).order('score', { ascending: false }).limit(100);
        if (!scores) return;
        const { data: users } = await supabaseClient.from('users').select('id, full_name, region, district, school, class').in('id', scores.map(s => s.user_id));
        listEl.innerHTML = "";
        scores.forEach((s, idx) => {
            const u = users.find(x => x.id === s.user_id); if (!u) return;
            const displayName = (u.full_name || "Ishtirokchi").split(' ').slice(0, 2).join(' ');
            const meta = `📍 ${(u.region||'').replace(' viloyati','')}, ${(u.district||'').replace(' tumani','')} • 🏫 №${u.school}`;
            listEl.insertAdjacentHTML('beforeend', `
                <div class="leader-card" style="${u.id === internalDbId ? 'border:1px solid var(--primary); background:#F0F8FF' : ''}">
                    <div class="l-rank">${idx+1}</div>
                    <div class="l-info"><span class="l-name" style="font-weight:700; display:block;">${displayName}</span><span class="l-sub" style="font-size:11px; color:#8E8E93;">${meta}</span></div>
                    <div class="l-score" style="font-weight:800; color:var(--primary);">${s.score}</div>
                </div>
            `);
        });
    }

    // === ИНИЦИАЛИЗАЦИЯ TELEGRAM ===
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.ready(); Telegram.WebApp.expand();
        const u = Telegram.WebApp.initDataUnsafe.user;
        if (u) { 
            telegramUserId = u.id; telegramData.firstName = u.first_name; 
            const rUn = document.getElementById('reg-user-name'); if(rUn) rUn.textContent = u.first_name + ' ' + (u.last_name || '');
            const hUn = document.getElementById('home-user-name'); if(hUn) hUn.textContent = u.first_name;
        }
    }

    checkProfileAndTour();

    // === СОБЫТИЯ ===
    document.getElementById('save-profile').onclick = async () => {
        const fn = document.getElementById('full-name-input').value.trim();
        const cl = document.getElementById('class-select').value;
        const rg = document.getElementById('region-select').value;
        const ds = document.getElementById('district-select').value;
        const sc = document.getElementById('school-input').value.trim();
        if (!fn || !cl || !rg || !ds || !sc) { alert(t('alert_fill')); return; }
        const { error } = await supabaseClient.from('users').update({ full_name: fn, class: cl, region: rg, district: ds, school: sc, fixed_language: currentLang }).eq('id', internalDbId);
        if (!error) { isProfileLocked = true; checkProfileAndTour(); }
    };

    function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); window.scrollTo(0,0); }
    document.getElementById('open-cabinet-btn').onclick = () => { showScreen('cabinet-screen'); loadLeaderboard(); };
    document.getElementById('close-cabinet').onclick = () => showScreen('home-screen');
    document.getElementById('leaderboard-btn').onclick = () => { showScreen('leaderboard-screen'); setLeaderboardFilter('republic'); };
    document.getElementById('lb-back').onclick = () => showScreen('home-screen');
    document.getElementById('confirm-start').onclick = () => { document.getElementById('warning-modal').classList.add('hidden'); showScreen('quiz-screen'); currentQuestionIndex = 0; correctCount = 0; startTimer(questions.reduce((a,q)=>a+(q.time_limit_seconds||60),0)); showQuestion(); };
    
    function startTimer(s) { if (timerInterval) clearInterval(timerInterval); timerInterval = setInterval(() => { const timer = document.getElementById('timer'); if(timer) timer.textContent = `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; if (s-- <= 0) { clearInterval(timerInterval); finishTour(); } }, 1000); }
    
    function showQuestion() {
        const q = questions[currentQuestionIndex];
        const qn = document.getElementById('question-number'); if(qn) qn.textContent = currentQuestionIndex + 1;
        const tq = document.getElementById('total-q-count'); if(tq) tq.textContent = questions.length;
        const st = document.getElementById('subject-tag'); if(st) st.textContent = q.subject || 'Q';
        const qt = document.getElementById('question-text'); if(qt) qt.innerHTML = q.question_text;
        const cont = document.getElementById('options-container'); cont.innerHTML = "";
        const next = document.getElementById('next-button'); next.disabled = true;
        const opts = (q.options_text || "").split('\n').filter(o => o.trim());
        opts.forEach(o => {
            const b = document.createElement('div'); b.className = "option-card";
            b.innerHTML = `<div class="option-text">${o.trim()}</div>`;
            b.onclick = () => { document.querySelectorAll('.option-card').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); selectedAnswer = o.trim(); next.disabled = false; };
            cont.appendChild(b);
        });
        if(typeof renderMathInElement === 'function') renderMathInElement(document.body);
    }

    document.getElementById('next-button').onclick = async () => {
        const q = questions[currentQuestionIndex];
        const { data: ok } = await supabaseClient.rpc('check_user_answer', { p_question_id: Number(q.id), p_user_answer: selectedAnswer });
        if (ok === true) correctCount++;
        await supabaseClient.from('user_answers').upsert({ user_id: internalDbId, question_id: q.id, answer: selectedAnswer, is_correct: ok===true }, { onConflict: 'user_id,question_id' });
        if (++currentQuestionIndex < questions.length) showQuestion(); else finishTour();
    };

    async function finishTour() {
        clearInterval(timerInterval);
        await supabaseClient.from('tour_progress').upsert({ user_id: internalDbId, tour_id: currentTourId, score: correctCount }, { onConflict: 'user_id, tour_id' });
        showScreen('result-screen');
        const rc = document.getElementById('res-correct'); if(rc) rc.textContent = correctCount;
        const rp = document.getElementById('result-percent'); if(rp) rp.textContent = Math.round((correctCount/15)*100) + '%';
        checkProfileAndTour();
    }
    
    document.getElementById('back-home').onclick = () => showScreen('home-screen');
    document.getElementById('back-home-x').onclick = () => showScreen('home-screen');
});
