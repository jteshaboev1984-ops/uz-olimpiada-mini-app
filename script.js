document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v92.0 (Fixed: showScreen + All Logic)');
  
    // === ПЕРЕМЕННЫЕ ===
    let telegramUserId; 
    let telegramData = { firstName: null, lastName: null, photoUrl: null };
    let internalDbId = null; 
    let currentTourId = null;
    let tourEndDate = null; 
    let currentUserData = null;
    let tourQuestionsCache = [];
    let userAnswersCache = [];
    let currentLbFilter = 'republic'; 
    let questions = [];
    let currentQuestionIndex = 0;
    let correctCount = 0;
    let timerInterval = null;
    let tourCompleted = false;
    let selectedAnswer = null;
    let questionStartTime = 0;

    // === НАСТРОЙКИ SUPABASE ===
    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // === ФУНКЦИИ-ПОМОЩНИКИ (UI) ===
    
    // Функция переключения экранов (которую я забыл в прошлый раз)
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else {
            console.error(`Screen not found: ${screenId}`);
        }
    }

    function safeAddListener(id, event, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, handler);
        }
    }

    window.openExternalLink = function(url) {
        if(window.Telegram && Telegram.WebApp) Telegram.WebApp.openLink(url);
        else window.open(url, '_blank');
    }

    // === СИСТЕМА ПЕРЕВОДОВ ===
    let currentLang = localStorage.getItem('app_lang') || 'uz';
    
    const translations = {
        ru: {
            reg_welcome: "Добро пожаловать",
            greeting_prefix: "Здравствуйте",
            profile_title: "Профиль",
            profile_subtitle: "Данные участника",
            label_lang: "Язык / Til",
            label_fullname: "Фамилия и Имя",
            warn_real_name: "Внимание: Введите реальное имя для Сертификата.",
            label_class: "Класс",
            label_region: "Регион",
            label_district: "Район / Город",
            label_school: "Школа",
            agree_main: "Участвую в рейтинге и научном исследовании",
            agree_sub: "Принимаю правила и получение результатов",
            btn_start: "Начать",
            btn_save: "Сохранить",
            status_locked: "Профиль заполнен",
            desc_locked: "Редактирование отключено.",
            btn_home: "На главную",
            home_subtitle: "Добро пожаловать на олимпиаду.",
            btn_leaderboard: "Лидерборд",
            btn_about: "О проекте",
            title_subjects: "Предметы",
            title_resources: "Ресурсы",
            cert_title: "Сертификат",
            cert_desc: "Скачать PDF",
            alert_fill_all: "Пожалуйста, заполните все поля!",
            alert_short_name: "Имя слишком короткое.",
            alert_agree: "Необходимо согласие.",
            alert_soon: "Скоро будет доступно",
            alert_review_locked: "Разбор ошибок откроется после завершения тура.",
            btn_loading: "Загрузка...",
            btn_start_tour: "Начать тур",
            btn_completed: "Тур завершён",
            btn_no_tours: "Нет активных туров",
            quiz_next: "Далее",
            res_verdict: "Результат тура",
            res_completed: "Тур завершён!",
            res_saved: "Результат сохранен",
            res_correct: "ВЕРНО",
            title_review: "Работа над ошибками",
            status_saved: "Данные сохранены",
            desc_review: "Детальный разбор будет доступен после подведения итогов.",
            back_home: "На главную",
            filter_rep: "Республика",
            filter_reg: "Регион",
            filter_dist: "Район",
            col_student: "УЧАСТНИК",
            col_score: "БАЛЛЫ",
            me_label: "Вы",
            warn_title: "Предупреждение",
            warn_full: "На выполнение заданий отводится <b>{time}</b>. Всего вопросов: <b>{count}</b>.",
            warn_cant_repeat: "Повтор тура невозможен.",
            btn_cancel: "Отмена",
            btn_close: "Закрыть",
            res_video: "Видеоуроки",
            res_video_sub: "Разборы задач",
            res_channel: "Канал",
            res_channel_sub: "Новости",
            res_chat: "Чат",
            res_chat_sub: "Обсуждение",
            about_platform: "О платформе",
            about_desc: "Уникальная платформа для школьников Узбекистана.",
            subj_math: "Математика", subj_eng: "Английский", subj_phys: "Физика", subj_chem: "Химия", 
            subj_bio: "Биология", subj_it: "Информатика", subj_eco: "Экономика",
            cert_modal_title: "Мои сертификаты",
            ph_name: "Например: Азизов Сардор",
            ph_school: "№ школы",
            btn_exit: "Выход",
            cabinet_title: "Личный кабинет",
            menu_data: "Мои данные",
            menu_lang: "Язык / Til",
            menu_errors: "Работа над ошибками",
            menu_errors_sub: "Посмотреть ответы",
            menu_notif: "Уведомления",
            menu_notif_sub: "Подключить бота",
            stat_tour: "ТУР",
            stat_total: "ВСЕГО",
            stat_correct: "ВЕРНО"
        },
        uz: {
            reg_welcome: "Xush kelibsiz",
            greeting_prefix: "Assalomu alaykum",
            profile_title: "Profil",
            profile_subtitle: "Ishtirokchi ma'lumotlari",
            label_lang: "Til / Язык",
            label_fullname: "Familiya va Ism",
            warn_real_name: "Diqqat: Sertifikat uchun haqiqiy ismingizni yozing.",
            label_class: "Sinf",
            label_region: "Viloyat",
            label_district: "Tuman / Shahar",
            label_school: "Maktab",
            agree_main: "Reyting va tadqiqotda qatnashaman",
            agree_sub: "Qoidalar va natijalarni olishga roziman",
            btn_start: "Boshlash",
            btn_save: "Saqlash",
            status_locked: "Profil to'ldirilgan",
            desc_locked: "Tahrirlash o'chirildi.",
            btn_home: "Bosh sahifa",
            home_subtitle: "Olimpiadaga xush kelibsiz.",
            btn_leaderboard: "Reyting",
            btn_about: "Loyiha haqida",
            title_subjects: "Fanlar",
            title_resources: "Resurslar",
            cert_title: "Sertifikat",
            cert_desc: "PDF yuklab olish",
            alert_fill_all: "Iltimos, barcha maydonlarni to'ldiring!",
            alert_short_name: "Ism juda qisqa.",
            alert_agree: "Rozilik bildirish kerak.",
            alert_soon: "Tez orada",
            alert_review_locked: "Xatolar tahlili tur yakunlanganidan so'ng ochiladi.",
            btn_loading: "Yuklanmoqda...",
            btn_start_tour: "Turni boshlash",
            btn_completed: "Tur yakunlandi",
            btn_no_tours: "Faol turlar yo'q",
            quiz_next: "Keyingisi",
            res_verdict: "Tur natijasi",
            res_completed: "Tur yakunlandi!",
            res_saved: "Natija saqlandi",
            res_correct: "TO'G'RI",
            title_review: "Xatolar ustida ishlash",
            status_saved: "Ma'lumot saqlandi",
            desc_review: "Batafsil tahlil natijalar e'lon qilingandan so'ng ochiladi.",
            back_home: "Bosh sahifa",
            filter_rep: "Respublika",
            filter_reg: "Viloyat",
            filter_dist: "Tuman",
            col_student: "ISHTIROKCHI",
            col_score: "BALL",
            me_label: "Siz",
            warn_title: "Diqqat",
            warn_full: "Imtihon uchun ajratilgan vaqt: <b>{time}</b>. Jami savollar soni: <b>{count}</b>.",
            warn_cant_repeat: "Turni qayta ishlash mumkin emas.",
            btn_cancel: "Bekor qilish",
            btn_close: "Yopish",
            res_video: "Videodarslar",
            res_video_sub: "Masalalar tahlili",
            res_channel: "Kanal",
            res_channel_sub: "Yangiliklar",
            res_chat: "Chat",
            res_chat_sub: "Muhokama",
            about_platform: "Platforma haqida",
            about_desc: "O'zbekiston o'quvchilari uchun maxsus.",
            subj_math: "Matematika", subj_eng: "Ingliz tili", subj_phys: "Fizika", subj_chem: "Kimyo", 
            subj_bio: "Biologiya", subj_it: "Informatika", subj_eco: "Iqtisodiyot",
            cert_modal_title: "Mening sertifikatlarim",
            ph_name: "Masalan: Azizov Sardor",
            ph_school: "Maktab №",
            btn_exit: "Chiqish",
            cabinet_title: "Shaxsiy kabinet",
            menu_data: "Mening ma'lumotlarim",
            menu_lang: "Til / Язык",
            menu_errors: "Xatolar tahlili",
            menu_errors_sub: "Javoblarni ko'rish",
            menu_notif: "Xabarlar",
            menu_notif_sub: "Botni ulash",
            stat_tour: "TUR",
            stat_total: "JAMI",
            stat_correct: "TO'G'RI"
        },
        en: {
            reg_welcome: "Welcome",
            greeting_prefix: "Hello",
            profile_title: "Profile",
            profile_subtitle: "Data",
            label_lang: "Language",
            label_fullname: "Full Name",
            warn_real_name: "Note: Enter real name for Certificate.",
            label_class: "Grade",
            label_region: "Region",
            label_district: "District / City",
            label_school: "School",
            agree_main: "Join Ranking & Research Program",
            agree_sub: "Agree to rules and notifications",
            btn_start: "Start",
            btn_save: "Save",
            status_locked: "Completed",
            desc_locked: "Editing disabled.",
            btn_home: "Home",
            home_subtitle: "Welcome to the Olympiad.",
            btn_leaderboard: "Leaderboard",
            btn_about: "About",
            title_subjects: "Subjects",
            title_resources: "Resources",
            cert_title: "Certificate",
            cert_desc: "Download PDF",
            alert_fill_all: "Please fill in all fields!",
            alert_short_name: "Name is too short.",
            alert_agree: "Agreement required.",
            alert_soon: "Coming soon",
            alert_review_locked: "Error review will be available after the tour ends.",
            btn_loading: "Loading...",
            btn_start_tour: "Start Tour",
            btn_completed: "Tour Completed",
            btn_no_tours: "No active tours",
            quiz_next: "Next",
            res_verdict: "Result",
            res_completed: "Completed!",
            res_saved: "Saved",
            res_correct: "CORRECT",
            title_review: "Review",
            status_saved: "Data saved",
            desc_review: "Detailed review available later.",
            back_home: "Home",
            filter_rep: "Republic",
            filter_reg: "Region",
            filter_dist: "District",
            col_student: "STUDENT",
            col_score: "SCORE",
            me_label: "You",
            warn_title: "Warning",
            warn_full: "You will have <b>{time}</b> for <b>{count}</b> questions.",
            warn_cant_repeat: "No retakes.",
            btn_cancel: "Cancel",
            btn_close: "Close",
            res_video: "Video Lessons",
            res_video_sub: "Analysis",
            res_channel: "Channel",
            res_channel_sub: "News",
            res_chat: "Chat",
            res_chat_sub: "Discussion",
            about_platform: "About",
            about_desc: "Unique platform for Uzbekistan.",
            subj_math: "Math", subj_eng: "English", subj_phys: "Physics", subj_chem: "Chemistry", 
            subj_bio: "Biology", subj_it: "IT", subj_eco: "Economics",
            cert_modal_title: "My Certificates",
            ph_name: "Ex: Azizov Sardor",
            ph_school: "School #",
            btn_exit: "Exit",
            cabinet_title: "Personal Cabinet",
            menu_data: "My Data",
            menu_lang: "Language",
            menu_errors: "Error Review",
            menu_errors_sub: "View answers",
            menu_notif: "Notifications",
            menu_notif_sub: "Connect Bot",
            stat_tour: "TOUR",
            stat_total: "TOTAL",
            stat_correct: "CORRECT"
        }
    };

    function t(key) {
        return translations[currentLang][key] || key;
    }

    function applyTranslations() {
        document.querySelectorAll('[data-lang]').forEach(el => {
            const key = el.getAttribute('data-lang');
            if (translations[currentLang][key]) {
                el.textContent = translations[currentLang][key];
            }
        });
        const phs = ['#full-name-input', '#reg-full-name', '#edit-full-name'];
        phs.forEach(id => {
            const el = document.querySelector(id);
            if(el) el.placeholder = t('ph_name');
        });
        const schs = ['#school-input', '#reg-school-input', '#edit-school-input'];
        schs.forEach(id => {
            const el = document.querySelector(id);
            if(el) el.placeholder = t('ph_school');
        });
        const displayLang = currentLang === 'uz' ? "O'zbekcha" : currentLang === 'ru' ? "Русский" : "English";
        const langDisplayEl = document.getElementById('current-lang-display');
        if(langDisplayEl) langDisplayEl.textContent = displayLang;
    }

    window.setRegLang = function(lang, el) {
        currentLang = lang;
        localStorage.setItem('app_lang', lang);
        document.querySelectorAll('.lang-opt').forEach(d => d.classList.remove('active'));
        el.classList.add('active');
        applyTranslations();
    }

    window.changeAppLang = function(lang) {
        currentLang = lang;
        localStorage.setItem('app_lang', lang);
        applyTranslations();
        document.querySelectorAll('.lang-item i').forEach(i => i.classList.add('hidden'));
        document.querySelector(`.check-${lang}`).classList.remove('hidden');
        document.getElementById('lang-screen').classList.add('hidden'); 
    }
  
    // === ИНИЦИАЛИЗАЦИЯ TELEGRAM ===
    if (window.Telegram && window.Telegram.WebApp) {
      Telegram.WebApp.ready();
      Telegram.WebApp.expand();
      const user = Telegram.WebApp.initDataUnsafe.user;
      if (user && user.id) {
        telegramUserId = Number(user.id);
        telegramData.firstName = user.first_name;
        telegramData.lastName = user.last_name;
        if (user.photo_url) telegramData.photoUrl = user.photo_url;
        document.getElementById('home-user-name').textContent = telegramData.firstName || 'User';
      } else {
        console.warn("No Telegram user found. Running in Test Mode.");
        if (!localStorage.getItem('test_user_id')) {
             localStorage.setItem('test_user_id', Math.floor(Math.random() * 1000000000));
        }
        telegramUserId = Number(localStorage.getItem('test_user_id'));
      }
    }
  
    // === ДАННЫЕ РЕГИОНОВ ===
    const regions = {
        "Toshkent shahri": ["Olmazor", "Bektemir", "Mirobod", "Mirzo Ulug'bek", "Sergeli", "Uchtepa", "Chilonzor", "Shayxontohur", "Yunusobod", "Yakkasaroy", "Yashnobod", "Yangihayot"],
        "Andijon viloyati": ["Andijon shahri", "Xonobod shahri", "Andijon tumani", "Asaka", "Baliqchi", "Bo'ston (Bo'z)", "Buloqboshi", "Jalaquduq", "Izboskan", "Qo'rg'ontepa", "Marhamat", "Paxtaobod", "Ulug'nor", "Xo'jaobod", "Shahrixon"],
        "Buxoro viloyati": ["Buxoro shahri", "Kogon shahri", "Olot", "Buxoro tumani", "Vobkent", "G'ijduvon", "Jondor", "Kogon tumani", "Qorako'l", "Qorovulbozor", "Peshku", "Romitan", "Shofirkon"],
        "Jizzax viloyati": ["Jizzax shahri", "Arnasoy", "Baxmal", "G'allaorol", "Jizzax tumani", "Do'stlik", "Zomin", "Zarbdor", "Zafarobod", "Mirzacho'l", "Paxtakor", "Forish", "Yangiobod"],
        "Qashqadaryo viloyati": ["Qarshi shahri", "Shahrisabz shahri", "G'uzor", "Dehqonobod", "Qamashi", "Qarshi tumani", "Koson", "Kitob", "Mirishkor", "Muborak", "Nishon", "Chiroqchi", "Shahrisabz tumani", "Yakkabog'", "Ko'kdala"],
        "Navoiy viloyati": ["Navoiy shahri", "Zarafshon shahri", "G'ozg'on shahri", "Konimex", "Karmana", "Qiziltepa", "Navbahor", "Nurota", "Tomdi", "Uchquduq", "Xatirchi"],
        "Namangan viloyati": ["Namangan shahri", "Kosonsoy", "Mingbuloq", "Namangan tumani", "Norin", "Pop", "To'raqo'rg'on", "Uychi", "Uchqo'rg'on", "Chortoq", "Chust", "Yangiqo'rg'on", "Davlatobod", "Yangi Namangan"],
        "Samarqand viloyati": ["Samarqand shahri", "Kattaqo'rg'on shahri", "Oqdaryo", "Bulung'ur", "Jomboy", "Ishtixon", "Kattaqo'rg'on tumani", "Qo'shrabot", "Narpay", "Nurobod", "Pastdarg'om", "Paxtachi", "Payariq", "Samarqand tumani", "Toyloq", "Urgut"],
        "Surxondaryo viloyati": ["Termiz shahri", "Oltinsoy", "Angor", "Boysun", "Denov", "Jarqo'rg'on", "Qumqo'rg'on", "Qiziriq", "Muzrabot", "Sariosiyo", "Termiz tumani", "Uzun", "Sherobod", "Sho'rchi", "Bandixon"],
        "Sirdaryo viloyati": ["Guliston shahri", "Shirin shahri", "Yangiyer shahri", "Oqoltin", "Boyovut", "Guliston tumani", "Mirzaobod", "Sayxunobod", "Sardoba", "Sirdaryo tumani", "Xovos"],
        "Toshkent viloyati": ["Angren shahri", "Bekobod shahri", "Olmaliq shahri", "Ohangaron shahri", "Chirchiq shahri", "Yangiyo'l shahri", "Nurafshon shahri", "Oqqo'rg'on", "Ohangaron tumani", "Bekobod tumani", "Bo'stonliq", "Bo'ka", "Zangiota", "Qibray", "Quyichirchiq", "Parkent", "Piskent", "Toshkent tumani", "O'rtachirchiq", "Chinoz", "Yuqorichirchiq", "Yangiyo'l tumani"],
        "Farg'ona viloyati": ["Farg'ona shahri", "Marg'ilon shahri", "Qo'qon shahri", "Quvasoy shahri", "Oltiariq", "Bag'dod", "Beshariq", "Buvayda", "Dang'ara", "Quva", "Rishton", "So'x", "Toshloq", "O'zbekiston", "Uchko'prik", "Farg'ona tumani", "Furqat", "Yozyovon"],
        "Xorazm viloyati": ["Urganch shahri", "Xiva shahri", "Bog'ot", "Gurlan", "Qo'shko'pir", "Urganch tumani", "Hazorasp", "Xonqa", "Xiva tumani", "Shovot", "Yangioriq", "Yangibozor", "Tuproqqal'a"],
        "Qoraqalpog'iston Respublikasi": ["Nukus shahri", "Amudaryo", "Beruniy", "Qanliko'l", "Qorao'zak", "Kegeyli", "Qo'ng'irot", "Mo'ynoq", "Nukus tumani", "Taxtako'pir", "To'rtko'l", "Xo'jayli", "Chimboy", "Shumanay", "Ellikqal'a", "Taxiatosh", "Bo'zatov"]
    };
  
    function setupRegionSelects(prefix) {
        const regionSelect = document.getElementById(`${prefix}-region-select`);
        const districtSelect = document.getElementById(`${prefix}-district-select`);
        if(!regionSelect) return;
        regionSelect.innerHTML = `<option value="" disabled selected>${t('filter_reg')}</option>`;
        Object.keys(regions).sort().forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });
        regionSelect.addEventListener('change', () => {
            districtSelect.innerHTML = `<option value="" disabled selected>${t('filter_dist')}</option>`;
            districtSelect.disabled = false;
            const selected = regionSelect.value;
            if (selected && regions[selected]) {
                regions[selected].forEach(district => {
                    const option = document.createElement('option');
                    option.value = district;
                    option.textContent = district;
                    districtSelect.appendChild(option);
                });
            }
        });
        const classSelect = document.getElementById(`${prefix}-class-select`);
        if(classSelect) {
            classSelect.innerHTML = `<option value="" disabled selected>${t('label_class')}</option>`;
            for (let i = 8; i <= 11; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i + '-sinf';
                classSelect.appendChild(option);
            }
        }
    }
    setupRegionSelects('reg');
    setupRegionSelects('edit');
    setupRegionSelects(''); 

    // === ГЛАВНАЯ ЛОГИКА ===
    async function checkProfileAndTour() {
      // 1. Проверяем пользователя
      const { data: userData } = await supabaseClient.from('users').select('*').eq('telegram_id', telegramUserId).maybeSingle();
      
      if (userData) {
          internalDbId = userData.id;
          currentUserData = userData; 
          if (userData.name) {
             document.getElementById('home-user-name').textContent = userData.name.split(' ')[0];
             document.getElementById('cabinet-user-name').textContent = userData.name;
             document.getElementById('user-db-id').textContent = userData.id;
          }
          if (userData.avatar_url) document.getElementById('header-avatar').src = userData.avatar_url;
          showScreen('home-screen'); // Сразу на главную
      } else {
          // Если нет - на регистрацию
          showScreen('register-screen');
      }

      // 2. Проверяем Туры
      const now = new Date().toISOString();
      const { data: tourData } = await supabaseClient.from('tours').select('*').lte('start_date', now).gte('end_date', now).eq('is_active', true).maybeSingle();

      if (!tourData) {
          updateMainButton('inactive');
      } else {
          currentTourId = tourData.id;
          tourEndDate = new Date(tourData.end_date);
          
          if (internalDbId && currentTourId) {
              await fetchStatsData(); 
              const { data: progress } = await supabaseClient.from('tour_progress').select('*').eq('user_id', internalDbId).eq('tour_id', currentTourId).maybeSingle();
              if (progress) {
                  tourCompleted = true;
                  updateMainButton('completed');
                  document.getElementById('error-lock-icon').style.display = "none";
              } else {
                  tourCompleted = false;
                  updateMainButton('start', tourData.title);
              }
          }
      }
      
      const isProfileComplete = currentUserData && currentUserData.name && currentUserData.name.length > 2;
      if (internalDbId && !isProfileComplete) {
        showScreen('register-screen');
      }
    }

    async function fetchStatsData() {
        if (!internalDbId || !currentTourId) return;
        const { data: qData } = await supabaseClient.from('questions').select('id, subject').eq('tour_id', currentTourId);
        if (qData) tourQuestionsCache = qData;
        const { data: aData } = await supabaseClient.from('user_answers').select('question_id, is_correct').eq('user_id', internalDbId);
        if (aData) userAnswersCache = aData;
        updateDashboardStats();
    }

    function updateDashboardStats() {
        const subjectMap = {
            'Математика': 'math', 'Английский': 'eng', 'Физика': 'phys',
            'Химия': 'chem', 'Биология': 'bio', 'Информатика': 'it',
            'Экономика': 'eco', 'SAT': 'sat', 'IELTS': 'ielts'
        };
        for (const [subjName, prefix] of Object.entries(subjectMap)) {
            const stats = calculateSubjectStats(subjName);
            let percent = 0;
            if (stats.total > 0) percent = Math.round((stats.correct / stats.total) * 100);
            const percentEl = document.getElementById(`${prefix}-percent`);
            if (percentEl) percentEl.textContent = `${percent}%`;
            const barEl = document.getElementById(`${prefix}-bar`);
            if (barEl) barEl.style.width = `${percent}%`;
        }
    }

    function calculateSubjectStats(subjectName) {
        const subjectQuestions = tourQuestionsCache.filter(q => q.subject && q.subject.toLowerCase().includes(subjectName.toLowerCase()));
        if (subjectQuestions.length === 0) return { total: 0, correct: 0 };
        let correct = 0;
        let total = 0;
        subjectQuestions.forEach(q => {
            total++; 
            const answer = userAnswersCache.find(a => a.question_id === q.id);
            if (answer && answer.is_correct) correct++;
        });
        return { total, correct };
    }

    // === РЕГИСТРАЦИЯ ===
    const regAgreementBox = document.getElementById('reg-agreement-box');
    let isRegAgreed = false;
    if(regAgreementBox){
        regAgreementBox.addEventListener('click', () => {
            isRegAgreed = !isRegAgreed;
            regAgreementBox.classList.toggle('checked', isRegAgreed);
            validateRegForm();
        });
    }

    const regInputs = document.querySelectorAll('#reg-full-name, #reg-class-select, #reg-region-select, #reg-district-select, #reg-school-input');
    regInputs.forEach(el => el.addEventListener('input', validateRegForm));

    function validateRegForm() {
        const allFilled = Array.from(regInputs).every(el => el.value.trim() !== '');
        const nameValid = document.getElementById('reg-full-name').value.trim().length >= 3;
        const btn = document.getElementById('finish-reg-btn');
        if(btn) btn.disabled = !(allFilled && nameValid && isRegAgreed);
    }

    const finishRegBtn = document.getElementById('finish-reg-btn');
    if(finishRegBtn){
        finishRegBtn.addEventListener('click', async () => {
            const btn = document.getElementById('finish-reg-btn');
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ...`;
            
            try {
                const updateData = { 
                  telegram_id: telegramUserId, 
                  name: document.getElementById('reg-full-name').value.trim(),
                  class: document.getElementById('reg-class-select').value,
                  region: document.getElementById('reg-region-select').value,
                  district: document.getElementById('reg-district-select').value,
                  school: document.getElementById('reg-school-input').value.trim(),
                  research_consent: true 
                };
                if (telegramData.photoUrl) updateData.avatar_url = telegramData.photoUrl;

                const { data, error } = await supabaseClient.from('users').upsert(updateData, { onConflict: 'telegram_id' }).select().single(); 
                if(error) throw error;
                
                internalDbId = data.id;
                currentUserData = data;
                
                document.getElementById('home-user-name').textContent = data.name.split(' ')[0];
                showScreen('home-screen');
                checkProfileAndTour();
            } catch (e) {
                alert('Error: ' + e.message);
                btn.disabled = false;
                btn.innerHTML = t('btn_start');
            }
        });
    }

    // === ЛИЧНЫЙ КАБИНЕТ И МЕНЮ ===
    safeAddListener('open-cabinet-btn', 'click', () => document.getElementById('cabinet-modal').classList.remove('hidden'));
    
    safeAddListener('btn-edit-profile', 'click', () => {
        if(!currentUserData) return;
        document.getElementById('edit-full-name').value = currentUserData.name;
        document.getElementById('edit-class-select').value = currentUserData.class;
        document.getElementById('edit-region-select').value = currentUserData.region;
        const event = new Event('change');
        document.getElementById('edit-region-select').dispatchEvent(event);
        setTimeout(() => {
             document.getElementById('edit-district-select').value = currentUserData.district;
        }, 100);
        document.getElementById('edit-school-input').value = currentUserData.school;
        
        document.getElementById('cabinet-modal').classList.add('hidden');
        showScreen('edit-profile-screen');
    });

    const saveEditBtn = document.getElementById('save-edit-profile');
    if(saveEditBtn){
        saveEditBtn.addEventListener('click', async () => {
            const btn = document.getElementById('save-edit-profile');
            btn.disabled = true;
            btn.innerHTML = '...';
            try {
                const updateData = { 
                    name: document.getElementById('edit-full-name').value.trim(),
                    class: document.getElementById('edit-class-select').value,
                    region: document.getElementById('edit-region-select').value,
                    district: document.getElementById('edit-district-select').value,
                    school: document.getElementById('edit-school-input').value.trim()
                };
                const { error } = await supabaseClient.from('users').update(updateData).eq('id', internalDbId);
                if(error) throw error;
                
                currentUserData = { ...currentUserData, ...updateData };
                document.getElementById('home-user-name').textContent = currentUserData.name.split(' ')[0];
                document.getElementById('cabinet-user-name').textContent = currentUserData.name;
                
                showScreen('home-screen');
            } catch (e) {
                alert(e.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = t('btn_save');
            }
        });
    }

    safeAddListener('btn-lang-switch', 'click', () => {
        document.getElementById('cabinet-modal').classList.add('hidden');
        showScreen('lang-screen');
        document.querySelectorAll('.lang-item i').forEach(i => i.classList.add('hidden'));
        document.querySelector(`.check-${currentLang}`).classList.remove('hidden');
    });

    // Работа над ошибками
    safeAddListener('btn-error-review', 'click', async () => {
        if(!tourCompleted) {
            alert(t('alert_soon')); 
            return;
        }
        const now = new Date();
        if(tourEndDate && now < tourEndDate) {
            alert(t('alert_review_locked') + ` (${tourEndDate.toLocaleString()})`);
            return;
        }

        document.getElementById('cabinet-modal').classList.add('hidden');
        showScreen('error-review-full-screen');
        const container = document.getElementById('error-list-container');
        container.innerHTML = `<p style="text-align:center; margin-top:20px;">${t('btn_loading')}</p>`;

        const { data: answers } = await supabaseClient.from('user_answers').select('question_id, answer, is_correct').eq('user_id', internalDbId);
        const { data: questionsFull } = await supabaseClient.from('questions').select('id, question_text, correct_answer').eq('tour_id', currentTourId);

        if(!answers || !questionsFull) {
            container.innerHTML = "Error loading data"; return;
        }

        container.innerHTML = "";
        let wrongCount = 0;

        questionsFull.forEach((q, index) => {
            const userAns = answers.find(a => a.question_id === q.id);
            if(userAns && !userAns.is_correct) {
                wrongCount++;
                const div = document.createElement('div');
                div.className = 'error-card';
                div.innerHTML = `
                    <div class="error-q">${index + 1}. ${q.question_text}</div>
                    <div class="error-ans wrong">
                        <span class="error-label">Sizning javobingiz:</span>
                        ${userAns.answer}
                    </div>
                    <div class="error-ans correct">
                        <span class="error-label">To'g'ri javob:</span>
                        ${q.correct_answer || '...'}
                    </div>
                `;
                container.appendChild(div);
            }
        });

        if(wrongCount === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px;"><h3>100% ${t('stat_correct')}!</h3></div>`;
        }
    });

    // === ТУР ===
    async function handleStartClick() {
        const btn = document.getElementById('main-action-btn');
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('btn_loading')}`;
        const { data } = await supabaseClient.from('questions').select('time_limit_seconds').eq('tour_id', currentTourId).limit(50);
        let totalSeconds = 0;
        let count = 0;
        if(data) {
            data.forEach(q => totalSeconds += (q.time_limit_seconds || 60));
            count = Math.min(data.length, 15);
        }
        const mins = Math.ceil(totalSeconds / 60);
        
        const rawText = t('warn_full');
        const finalText = rawText.replace('{time}', `${mins} min`).replace('{count}', count);
        document.getElementById('warning-text-dynamic').innerHTML = finalText;
        
        updateMainButton('start');
        document.getElementById('warning-modal').classList.remove('hidden');
    }

    function updateMainButton(state, title = "") {
        const btn = document.getElementById('main-action-btn');
        const certCard = document.getElementById('home-cert-btn'); 
        if (!btn) return;
        
        updateMainButton.lastState = state;

        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        const activeBtn = document.getElementById('main-action-btn');
        
        if (state === 'inactive') {
            activeBtn.innerHTML = `<i class="fa-solid fa-calendar-xmark"></i> ${t('btn_no_tours')}`;
            activeBtn.disabled = true;
            activeBtn.className = 'btn-primary'; 
            activeBtn.style.background = "#8E8E93";
            if (certCard) certCard.classList.add('hidden'); 
        } else if (state === 'completed') {
            activeBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${t('btn_completed')}`;
            activeBtn.className = 'btn-success-clickable';
            activeBtn.disabled = false;
            activeBtn.style.background = ""; 
            if (certCard) certCard.classList.remove('hidden'); 
            activeBtn.addEventListener('click', () => document.getElementById('tour-info-modal').classList.remove('hidden'));
        } else {
            activeBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${t('btn_start_tour')}`;
            activeBtn.className = 'btn-primary';
            activeBtn.disabled = false;
            activeBtn.style.background = "";
            if (certCard) certCard.classList.add('hidden'); 
            activeBtn.addEventListener('click', handleStartClick);
        }
    }

    safeAddListener('confirm-start', 'click', async () => {
      document.getElementById('warning-modal').classList.add('hidden');
      await startTour();
    });

    async function startTour() {
      if (!currentTourId) return;
      const { data, error } = await supabaseClient
          .from('questions')
          .select('id, subject, question_text, options_text, time_limit_seconds')
          .eq('tour_id', currentTourId)
          .limit(50);

      if (error || !data || data.length === 0) { alert('Error questions'); return; }
      questions = data.sort(() => Math.random() - 0.5).slice(0, 15);
      let totalSeconds = 0;
      questions.forEach(q => totalSeconds += (q.time_limit_seconds || 60));
      currentQuestionIndex = 0;
      correctCount = 0;
      showScreen('quiz-screen');
      startTimer(totalSeconds);
      showQuestion();
    }

    function startTimer(seconds) {
      let timeLeft = seconds;
      const timerEl = document.getElementById('timer');
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) { clearInterval(timerInterval); finishTour(); }
        timeLeft--;
      }, 1000);
    }

    function showQuestion() {
      questionStartTime = Date.now();
      const q = questions[currentQuestionIndex];
      document.getElementById('question-number').textContent = currentQuestionIndex + 1;
      document.getElementById('total-q-count').textContent = questions.length;
      document.getElementById('subject-tag').textContent = q.subject || 'Q';
      document.getElementById('question-text').innerHTML = q.question_text;
      const timeForQ = q.time_limit_seconds || 60;
      document.getElementById('q-time-hint').innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ~${Math.round(timeForQ/60*10)/10} min`;
      document.getElementById('quiz-progress-fill').style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
      const container = document.getElementById('options-container');
      container.innerHTML = '';
      const nextBtn = document.getElementById('next-button');
      nextBtn.disabled = true;
      nextBtn.innerHTML = `${t('quiz_next')} <i class="fa-solid fa-arrow-right"></i>`;
      selectedAnswer = null;
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
              nextBtn.disabled = false;
            };
            container.appendChild(btn);
          }
        });
      } else {
        const textarea = document.createElement('textarea');
        textarea.className = 'answer-input';
        textarea.placeholder = '...';
        textarea.rows = 2;
        textarea.addEventListener('input', () => {
          selectedAnswer = textarea.value.trim();
          nextBtn.disabled = selectedAnswer.length === 0;
        });
        container.appendChild(textarea);
      }
    }
    
    safeAddListener('next-button', 'click', async () => {
      const nextBtn = document.getElementById('next-button');
      nextBtn.disabled = true;
      
      // Аналитика: считаем время ответа (в секундах)
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000); 
      
      const q = questions[currentQuestionIndex];
      const questionIdNumber = Number(q.id);

      const { data: isCorrect } = await supabaseClient.rpc('check_user_answer', {
          p_question_id: questionIdNumber,
          p_user_answer: selectedAnswer
      });
      
      const finalIsCorrect = (isCorrect === true);
      if (finalIsCorrect) correctCount++;
      
      try {
          // Отправляем ответ в базу. 
          // Если бы было поле metadata, отправили бы { time_spent: timeSpent }
          const { error } = await supabaseClient.from('user_answers').upsert({
              user_id: internalDbId, 
              question_id: q.id, 
              answer: selectedAnswer, 
              is_correct: finalIsCorrect
            }, { onConflict: 'user_id,question_id' });
          
          if (error) throw error;
          
          currentQuestionIndex++;
          if (currentQuestionIndex < questions.length) showQuestion();
          else finishTour();
      } catch (e) {
          alert('Error: ' + e.message);
          nextBtn.disabled = false;
      }
    });

    async function finishTour() {
      clearInterval(timerInterval);
      tourCompleted = true;
      const percent = Math.round((correctCount / questions.length) * 100);
      showScreen('result-screen');
      document.getElementById('res-tour-title').textContent = "1";
      document.getElementById('res-total').textContent = questions.length;
      document.getElementById('res-correct').textContent = correctCount;
      document.getElementById('result-percent').textContent = `${percent}%`;
      const circle = document.getElementById('result-circle');
      if (circle) circle.style.background = `conic-gradient(var(--primary) 0% ${percent}%, #E5E5EA ${percent}% 100%)`;
      updateMainButton('completed');
      fetchStatsData(); 
    }

    // === PDF GENERATION ===
    // Замените на ваши ссылки!
    const CERT_TEMPLATE_URL = 'https://fgwnqxumukkgtzentlxr.supabase.co/storage/v1/object/public/assets/certificate_template.pdf'; 
    const FONT_URL = 'https://fgwnqxumukkgtzentlxr.supabase.co/storage/v1/object/public/assets/Roboto-Bold.ttf';

    async function generateAndDownloadPDF() {
        const btn = document.getElementById('download-cert-action-btn') || document.getElementById('download-certificate-res-btn');
        if(!btn) return;
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ...`;
            btn.disabled = true;

            const [templateBytes, fontBytes] = await Promise.all([
                fetch(CERT_TEMPLATE_URL).then(res => { if(!res.ok) throw new Error('Шаблон не найден'); return res.arrayBuffer() }),
                fetch(FONT_URL).then(res => { if(!res.ok) throw new Error('Шрифт не найден'); return res.arrayBuffer() })
            ]);

            const { PDFDocument, rgb } = PDFLib;
            const pdfDoc = await PDFDocument.load(templateBytes);
            pdfDoc.registerFontkit(fontkit);
            const customFont = await pdfDoc.embedFont(fontBytes);

            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();

            const name = currentUserData?.name || 'Участник';
            const scoreVal = (typeof correctCount !== 'undefined') ? correctCount : 0;
            const scoreText = `${scoreVal}`;

            const nameSize = 30;
            const nameWidth = customFont.widthOfTextAtSize(name, nameSize);
            
            // Настройка координат для вашего дизайна
            firstPage.drawText(name, {
                x: (width - nameWidth) / 2,
                y: 400, 
                size: nameSize,
                font: customFont,
                color: rgb(0, 0, 0),
            });

            firstPage.drawText(scoreText, {
                x: 135,
                y: 240, 
                size: 36,
                font: customFont,
                color: rgb(0, 0, 0), 
            });

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Certificate_${name}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            btn.innerHTML = `<i class="fa-solid fa-check"></i> OK`;

        } catch (e) {
            console.error(e);
            alert('Ошибка создания PDF: ' + e.message);
            btn.innerHTML = 'Error';
        } finally {
            setTimeout(() => {
                if(btn) { btn.disabled = false; btn.innerHTML = originalText; }
            }, 3000);
        }
    }

    window.showCertsModal = function() {
        const container = document.getElementById('certs-list-container');
        const isCompleted = tourCompleted || (currentUserData && updateMainButton.lastState === 'completed');
        
        if (isCompleted) {
            container.innerHTML = `
                <div class="cert-card">
                    <div class="cert-icon" style="background:#E8F5E9; color:#34C759"><i class="fa-solid fa-file-pdf"></i></div>
                    <div class="cert-info">
                        <h4>${t('cert_title')}</h4>
                        <p>Tur №1 • ${new Date().toLocaleDateString()}</p>
                    </div>
                    <button id="download-cert-action-btn" class="btn-primary" style="width:auto; padding: 8px 12px; font-size:12px;">
                        <i class="fa-solid fa-download"></i> PDF
                    </button>
                </div>
            `;
            setTimeout(() => {
                const dlBtn = document.getElementById('download-cert-action-btn');
                if(dlBtn) dlBtn.onclick = generateAndDownloadPDF;
            }, 100);
        } else {
             container.innerHTML = `
                <div style="text-align:center; padding: 20px;">
                    <i class="fa-solid fa-lock" style="font-size:30px; color:#ccc; margin-bottom:10px;"></i>
                    <p style="color:#666;">${t('warn_cant_repeat')}</p>
                </div>`;
        }
        document.getElementById('certs-modal').classList.remove('hidden');
    }

    // === LISTENERS ===
    safeAddListener('leaderboard-btn', 'click', () => {
        showScreen('leaderboard-screen');
        setLeaderboardFilter('republic');
    });
    safeAddListener('lb-back', 'click', () => showScreen('home-screen'));
    safeAddListener('about-btn', 'click', () => document.getElementById('about-modal').classList.remove('hidden'));
    safeAddListener('close-about', 'click', () => document.getElementById('about-modal').classList.add('hidden'));
    safeAddListener('exit-app-btn', 'click', () => window.Telegram && Telegram.WebApp ? Telegram.WebApp.close() : alert("Только в Telegram"));
    safeAddListener('home-cert-btn', 'click', () => showCertsModal());
    safeAddListener('download-certificate-res-btn', 'click', () => {
        if(tourCompleted) generateAndDownloadPDF();
        else alert('Finish tour first');
    });
    safeAddListener('cancel-start', 'click', () => document.getElementById('warning-modal').classList.add('hidden'));
    safeAddListener('back-home', 'click', () => showScreen('home-screen'));
    safeAddListener('back-home-x', 'click', () => showScreen('home-screen'));
    safeAddListener('profile-locked-btn', 'click', () => document.getElementById('profile-info-modal').classList.remove('hidden'));
    safeAddListener('profile-back-btn', 'click', () => showScreen('home-screen'));

    applyTranslations();
    checkProfileAndTour();
});
