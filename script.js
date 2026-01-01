document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v75 (All Bugs Fixed)');
  
    // === ПЕРЕМЕННЫЕ ===
    let telegramUserId; 
    let telegramData = { firstName: null, lastName: null, photoUrl: null, languageCode: null };
    let internalDbId = null; 
    let currentTourId = null;
    let currentTourTitle = ""; 
    let currentTourEndDate = null; 
    let currentUserData = null;
    let tourQuestionsCache = [];
    let userAnswersCache = [];
    let currentLbFilter = 'republic'; 
    let currentLang = 'uz'; 
    let tourCompleted = false;
    let isLangLocked = false; 
    let isProfileLocked = false; 

    // === ПЕРЕМЕННЫЕ ТЕСТА И АНТИ-ЧИТА ===
    let questions = [];
    let currentQuestionIndex = 0;
    let correctCount = 0;
    let timerInterval = null;
    let selectedAnswer = null;
    let cheatWarningCount = 0; 

    // === НАСТРОЙКИ SUPABASE ===
    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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
            cert_title: "Sertifikat",
            cert_desc: "PDF yuklab olish",
            res_title: "Resurslar",
            res_vid_title: "Video darslar",
            res_vid_desc: "Masalalar yechimi",
            res_ch_title: "Kanal",
            res_ch_desc: "Yangiliklar",
            res_grp_title: "Ishtirokchilar chati",
            res_grp_desc: "Muhokama",
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
            minutes: "daqiqa",
            questions: "savol",
            correct_txt: "to'g'ri",
            no_data: "Ma'lumot yo'q",
            curr_tour: "Joriy tur",
            total_q: "Jami savollar",
            school_prefix: "Maktab",
            anonymous: "Anonim",
            city_tashkent: "Toshkent sh.",
            saving_ans: "Saqlash...",
            repeat: "Qayta urinish",
            error: "Xatolik",
            answer_placeholder: "Javobni kiriting...",
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
            menu_mistakes: "Xatolar tahlili",
            menu_mistakes_desc: "Javoblarni ko'rish",
            lock_review_title: "Tahlil yopiq",
            lock_review_msg: "Adolatli raqobat uchun xatolar tahlili olimpiada yakunlangandan so'ng ochiladi.",
            lang_warning_reg: "Diqqat: Til va ma'lumotlar saqlangandan so'ng o'zgartirib bo'lmaydi!",
            lang_locked_reason: "Adolatli raqobat uchun tilni o'zgartirish imkoniyati o'chirilgan.",
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
            cert_title: "Сертификат",
            cert_desc: "Скачать PDF",
            res_title: "Ресурсы",
            res_vid_title: "Видеоуроки",
            res_vid_desc: "Разборы задач",
            res_ch_title: "Канал",
            res_ch_desc: "Новости",
            res_grp_title: "Чат участников",
            res_grp_desc: "Обсуждение",
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
            minutes: "минут",
            questions: "вопросов",
            correct_txt: "верно",
            no_data: "Нет данных",
            curr_tour: "Текущий тур",
            total_q: "Всего вопросов",
            school_prefix: "Школа",
            anonymous: "Аноним",
            city_tashkent: "г. Ташкент",
            saving_ans: "Сохранение...",
            repeat: "Повторить",
            error: "Ошибка",
            answer_placeholder: "Введите ответ...",
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
            menu_mistakes: "Работа над ошибками",
            menu_mistakes_desc: "Посмотреть ответы",
            lock_review_title: "Разбор закрыт",
            lock_review_msg: "В целях честной игры разбор ошибок станет доступен после окончания олимпиады.",
            lang_warning_reg: "Внимание: Язык и данные профиля нельзя будет изменить после сохранения!",
            lang_locked_reason: "Смена языка отключена для обеспечения честной конкуренции.",
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
            cert_title: "Certificate",
            cert_desc: "Download PDF",
            res_title: "Resources",
            res_vid_title: "Video Lessons",
            res_vid_desc: "Problem solving",
            res_ch_title: "Channel",
            res_ch_desc: "News",
            res_grp_title: "Chat Group",
            res_grp_desc: "Discussion",
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
            minutes: "minutes",
            questions: "questions",
            correct_txt: "correct",
            no_data: "No data",
            curr_tour: "Current Tour",
            total_q: "Total Questions",
            school_prefix: "School",
            anonymous: "Anonymous",
            city_tashkent: "Tashkent City",
            saving_ans: "Saving...",
            repeat: "Retry",
            error: "Error",
            answer_placeholder: "Enter answer...",
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
            menu_mistakes: "Mistake Review",
            menu_mistakes_desc: "Check answers",
            lock_review_title: "Review Locked",
            lock_review_msg: "To ensure fair play, mistake review will be available after the Olympiad ends.",
            lang_warning_reg: "Attention: Language and profile data cannot be changed after saving!",
            lang_locked_reason: "Language changing is disabled to ensure fair competition.",
            cheat_title: "VIOLATION!",
            cheat_msg: "Leaving the app is prohibited! Next time the test will be terminated automatically."
        }
    };

    function t(key) {
        return (translations[currentLang] && translations[currentLang][key]) || key;
    }

    function setLanguage(lang) {
        if (isLangLocked && lang !== currentLang) {
            return; 
        }
        
        if (!translations[lang]) lang = 'uz'; 
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
        
        if (tourCompleted) {
            updateMainButton('completed');
        } else if (currentTourId) {
            updateMainButton('start', currentTourTitle); 
        } else {
            updateMainButton('inactive');
        }
        
        if (currentTourId) fetchStatsData();
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
    let tgInitData = ""; 
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        
        tgInitData = Telegram.WebApp.initData; 
        
        const user = Telegram.WebApp.initDataUnsafe.user;
        if (user) {
            telegramUserId = String(user.id); 
            telegramData.firstName = user.first_name;
            telegramData.lastName = user.last_name;
            telegramData.photoUrl = user.photo_url;
            telegramData.languageCode = user.language_code;

            const elRN = document.getElementById('reg-user-name'); 
            if (elRN) elRN.textContent = user.first_name + ' ' + (user.last_name || '');
            const elHN = document.getElementById('home-user-name'); 
            if (elHN) elHN.textContent = user.first_name;
            const elCI = document.getElementById('cab-avatar-img'); 
            if (elCI && user.photo_url) elCI.src = user.photo_url;
        }
    } else {
        console.error("Ilova faqat Telegram ichida ishlaydi.");
    }

    // FIX: Language priority - DB language takes precedence over localStorage
    function initializeLanguage(dbLang) {
        // Priority: 1. DB fixed_language, 2. localStorage, 3. Telegram language, 4. default 'uz'
        if (dbLang) {
            setLanguage(dbLang);
            return;
        }
        
        let savedLang = null;
        try {
            savedLang = localStorage.getItem('user_lang');
        } catch (e) {
            console.warn("LocalStorage access denied");
        }
        
        if (savedLang && translations[savedLang]) {
            setLanguage(savedLang);
        } else if (telegramData.languageCode) {
            if (telegramData.languageCode === 'ru') setLanguage('ru');
            else if (telegramData.languageCode === 'en') setLanguage('en');
            else setLanguage('uz');
        } else {
            setLanguage('uz');
        }
    }

    // Initial language setup (will be overridden by DB if user exists)
    initializeLanguage(null);
    
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

    async function checkProfileAndTour() {
        if (!tgInitData || tgInitData === "") return;

        const { data: authData, error: authError } = await supabaseClient.rpc('telegram_login', {
            p_init_data: tgInitData
        }).single();

        if (authError || !authData) {
            console.error("Auth failed:", authError);
            return;
        }

        internalDbId = authData.id;
        currentUserData = authData;
        
        if (authData.telegram_id) {
            telegramUserId = String(authData.telegram_id);
        }

        const elCN = document.getElementById('cab-name'); 
        if (elCN) elCN.textContent = authData.full_name || authData.name;
        const elID = document.getElementById('cab-id'); 
        if (elID) elID.textContent = String(telegramUserId).slice(-6);

        // FIX: Set language from DB FIRST (priority over localStorage)
        if (authData.fixed_language) {
            isLangLocked = true;
            currentLang = authData.fixed_language;
            setLanguage(currentLang);
            
            // Also update localStorage to match DB
            try {
                localStorage.setItem('user_lang', authData.fixed_language);
            } catch (e) { console.warn(e); }
            
            const cabLang = document.getElementById('lang-switcher-cab');
            if (cabLang) cabLang.disabled = true;
        }

        const isComplete = authData.full_name && authData.full_name.length > 2 &&
                           authData.class && authData.region && authData.district;
        
        if (!isComplete) {
            showScreen('reg-screen');
            unlockProfileForm();
            const backBtn = document.getElementById('reg-back-btn'); 
            if (backBtn) backBtn.classList.add('hidden');
        } else {
            isProfileLocked = true;
            isLangLocked = true;
            
            const cabLang = document.getElementById('lang-switcher-cab');
            if (cabLang) cabLang.disabled = true;
            
            const regLang = document.getElementById('reg-lang-select');
            if (regLang) regLang.disabled = true;

            fillProfileForm(authData);
            showScreen('home-screen');
            await fetchStatsData(); 
        }

        // TUR TEKSHIRUVI
        const { data: tourData, error: tourErr } = await supabaseClient
            .from('tours')
            .select('*')
            .eq('is_active', true)
            .maybeSingle();

        if (tourErr) console.error("Tour fetch error:", tourErr);

        if (tourData) {
            currentTourId = tourData.id;
            currentTourTitle = tourData.title;
            currentTourEndDate = tourData.end_date;
            
            const { data: progress } = await supabaseClient
                .from('tour_progress')
                .select('*')
                .eq('user_id', internalDbId)
                .eq('tour_id', currentTourId)
                .maybeSingle();

            if (progress) {
                tourCompleted = true;
                updateMainButton('completed');
            } else {
                updateMainButton('start', currentTourTitle);
            }
            await fetchStatsData();
        } else {
            updateMainButton('inactive');
        }
    }
    
    function fillProfileForm(data) {
        const nameInput = document.getElementById('full-name-input');
        if (nameInput) nameInput.value = data.full_name || '';
        
        const classSelectEl = document.getElementById('class-select');
        if (classSelectEl) classSelectEl.value = data.class;
        
        const regionSelectEl = document.getElementById('region-select');
        if (regionSelectEl) regionSelectEl.value = data.region;
        
        const districtSelect = document.getElementById('district-select');
        if (districtSelect) {
            districtSelect.innerHTML = `<option value="" disabled selected>${t('select_district')}</option>`;
            if (regions[data.region]) {
                regions[data.region].sort().forEach(district => {
                    const option = document.createElement('option');
                    option.value = district;
                    option.textContent = district;
                    districtSelect.appendChild(option);
                });
            }
            districtSelect.value = data.district;
        }
        
        const schoolInput = document.getElementById('school-input');
        if (schoolInput) schoolInput.value = data.school;
        
        const researchConsent = document.getElementById('research-consent');
        if (researchConsent) researchConsent.checked = data.research_consent || false;
        
        const langSelect = document.getElementById('reg-lang-select');
        if (langSelect && data.fixed_language) {
            langSelect.value = data.fixed_language;
            langSelect.disabled = true;
        }
    }

    function lockProfileForm(permanent = false) {
        const saveBtn = document.getElementById('save-profile');
        const lockMsg = document.getElementById('reg-locked-msg');
        const backBtn = document.getElementById('reg-back-btn');
        
        if (saveBtn) saveBtn.classList.add('hidden');
        if (lockMsg) {
            lockMsg.classList.remove('hidden');
            
            if (permanent) {
                lockMsg.innerHTML = `<i class="fa-solid fa-lock"></i> 
                                     <div style="text-align:left; margin-left:8px;">
                                        <div style="font-weight:700;">${t('profile_locked_msg')}</div>
                                        <div style="font-size:10px; font-weight:400; opacity:0.8;">${t('profile_locked_hint')}</div>
                                     </div>`;
                lockMsg.style.background = "#E8F5E9"; 
                lockMsg.style.color = "#2E7D32";
                lockMsg.style.border = "1px solid #C8E6C9";
            } else {
                lockMsg.innerHTML = `<i class="fa-solid fa-lock"></i> <span>${t('profile_locked_msg')}</span>`;
            }
        }

        if (backBtn) backBtn.classList.remove('hidden');
        
        document.querySelectorAll('#reg-screen input, #reg-screen select').forEach(el => el.disabled = true);
    }

    function unlockProfileForm() {
        const saveBtn = document.getElementById('save-profile');
        const backBtn = document.getElementById('reg-back-btn');
        const lockMsg = document.getElementById('reg-locked-msg');
        
        if (saveBtn) saveBtn.classList.remove('hidden');
        if (backBtn) backBtn.classList.add('hidden');
        if (lockMsg) lockMsg.classList.add('hidden');
        
        document.querySelectorAll('#reg-screen input, #reg-screen select').forEach(el => el.disabled = false);
    }

    // === АНТИ-ЧИТ: ДЕТЕКТОР СВОРАЧИВАНИЯ ===
    function handleVisibilityChange() {
        const quizScreen = document.getElementById('quiz-screen');
        if (!quizScreen) return;
        
        if (document.hidden && !quizScreen.classList.contains('hidden') && !tourCompleted) {
            cheatWarningCount++;
            
            if (cheatWarningCount === 1) {
                const cheatModal = document.getElementById('cheat-warning-modal');
                if (cheatModal) cheatModal.classList.remove('hidden');
            } else if (cheatWarningCount >= 2) {
                finishTour(); 
                alert(t('cheat_msg')); 
            }
        }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // === ЛОГИКА ТЕСТА, СТАТИСТИКИ И ЛИДЕРБОРДА ===
    
    async function fetchStatsData() {
        if (!internalDbId || !currentTourId) return;
        
        const { data: qData } = await supabaseClient
            .from('questions')
            .select('id, subject')
            .eq('tour_id', currentTourId)
            .eq('language', currentLang); 

        if (qData) tourQuestionsCache = qData;
        
        const { data: aData } = await supabaseClient
            .from('user_answers')
            .select('question_id, is_correct')
            .eq('user_id', internalDbId);
        
        if (aData) userAnswersCache = aData;
        updateDashboardStats();
    }

    function updateDashboardStats() {
        const subjectPrefixes = ['math', 'eng', 'phys', 'chem', 'bio', 'it', 'eco', 'sat', 'ielts'];
        let totalCorrect = 0;
        let totalTours = 0; 
        
        subjectPrefixes.forEach(prefix => {
            const stats = calculateSubjectStats(prefix);
            // FIX: Properly declare percent variable
            let percent = 0;
            if (stats.total > 0) {
                percent = Math.round((stats.correct / stats.total) * 100); 
            }
            if (percent > 100) percent = 100; 

            const percentEl = document.getElementById(`${prefix}-percent`);
            if (percentEl) percentEl.textContent = `${percent}%`;
            const barEl = document.getElementById(`${prefix}-bar`);
            if (barEl) barEl.style.width = `${percent}%`;
            
            totalCorrect += stats.correct;
        });
        
        const cabScore = document.getElementById('cab-score');
        if (cabScore) cabScore.textContent = totalCorrect;
        
        if (tourCompleted) totalTours = 1;
        const cabTours = document.getElementById('cab-tours');
        if (cabTours) cabTours.textContent = totalTours;
    }

    function calculateSubjectStats(prefix) {
        const keywords = {
            'math': ['matematika', 'математика', 'math'],
            'eng': ['ingliz', 'английский', 'english'],
            'phys': ['fizika', 'физика', 'physics'],
            'chem': ['kimyo', 'химия', 'chemistry'],
            'bio': ['biologiya', 'биология', 'biology'],
            'it': ['informatika', 'информатика', 'computer', 'it'],
            'eco': ['iqtisodiyot', 'экономика', 'economics'],
            'sat': ['sat'],
            'ielts': ['ielts']
        };

        const targetKeywords = keywords[prefix] || [prefix];

        const subjectQuestions = tourQuestionsCache.filter(q => {
            if (!q.subject) return false;
            const s = q.subject.toLowerCase();
            return targetKeywords.some(k => s.includes(k));
        });

        let correct = 0;
        subjectQuestions.forEach(q => {
            const answer = userAnswersCache.find(a => a.question_id === q.id);
            if (answer && answer.is_correct) correct++;
        });
        return { total: subjectQuestions.length, correct };
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
            const { data } = await supabaseClient.from('users').select('*').eq('id', internalDbId).single();
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
                return {
                    id: u.id,
                    name: u.full_name || u.name || t('anonymous'),
                    classVal: u.class || '?',
                    region: u.region,
                    district: u.district,
                    school: u.school,
                    avatarUrl: u.avatar_url || null,
                    score: p.score,
                    isMe: String(u.id) === String(internalDbId) 
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
                const avatarHtml = player.avatarUrl 
                    ? `<img src="${player.avatarUrl}" class="winner-img" onerror="this.src='${defaultAvatar}'">`
                    : `<div class="winner-img" style="background:#E1E1E6; display:flex; align-items:center; justify-content:center; font-size:24px; color:#666;">${player.name[0] || '?'}</div>`;

                const shortLoc = (player.region || "").split(' ')[0] + ", " + (player.district || "").replace(' tumani', '').replace(' района', '');

                const html = `
                    <div class="winner ${ranks[i]}">
                        <div class="avatar-wrapper">
                            ${avatarHtml}
                            <div class="rank-circle ${rkClasses[i]}">${realRanks[i]}</div>
                        </div>
                        <div class="winner-name">${player.name.split(' ').slice(0, 2).join(' ')}</div>
                        <div class="winner-class" style="font-size:10px; opacity:0.8; line-height:1.2; margin-top:3px;">
                            📍 ${shortLoc}<br>🏫 №${player.school || '?'}
                        </div>
                        <div class="winner-score">${player.score}</div>
                    </div>
                `;
                podiumEl.insertAdjacentHTML('beforeend', html);
            } else {
                podiumEl.insertAdjacentHTML('beforeend', `<div class="winner ${ranks[i]}" style="opacity:0"></div>`);
            }
        });

        list.slice(3).forEach((player, index) => {
            const realRank = index + 4;
            const avatarHtml = player.avatarUrl 
                ? `<img src="${player.avatarUrl}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : '';
            const fallbackAvatar = `<div class="no-img">${player.name[0] || '?'}</div>`;

            const displayName = player.name.split(' ').slice(0, 2).join(' ');
            
            const reg = (player.region || "").replace(" viloyati", "").replace(" shahri", "").replace(" vil", "");
            const dist = (player.district || "").replace(" tumani", "").replace(" района", "");
            const metaInfo = `📍 ${reg}, ${dist} • 🏫 №${player.school || '?'}`;

            const cardStyle = player.isMe ? 'background:#F0F8FF; border:1px solid var(--primary);' : '';

            const html = `
                <div class="leader-card" style="${cardStyle}">
                    <div class="l-rank">${realRank}</div>
                    <div class="l-avatar">
                        ${avatarHtml}
                        ${player.avatarUrl ? fallbackAvatar.replace('class="no-img"', 'class="no-img" style="display:none"') : fallbackAvatar}
                    </div>
                    <div class="l-info">
                        <span class="l-name" style="font-weight:700; display:block; color:#000; font-size:14px;">${displayName}</span>
                        <div class="l-sub" style="font-size:11px; color:#8E8E93; margin-top:2px;">${metaInfo}</div>
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
                    telegram_id: Number(telegramUserId), 
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
                    .upsert({ 
                        telegram_id: Number(telegramUserId), 
                        ...updateData 
                    }, { onConflict: 'telegram_id' })
                    .select()
                    .maybeSingle();
                
                if (error) throw error;
                
                if (data) {
                    currentUserData = data;
                    internalDbId = data.id; 
                    isProfileLocked = true;
                    isLangLocked = true;
                    
                    // Update localStorage to match saved language
                    try {
                        localStorage.setItem('user_lang', currentLang);
                    } catch (e) { console.warn(e); }
                    
                    showScreen('home-screen');
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

    // === ЛОГИКА РАЗБОРА ОШИБОК ===
    safeAddListener('btn-mistakes', 'click', () => {
        const now = new Date();
        const end = currentTourEndDate ? new Date(currentTourEndDate) : null;
        
        if (end && now < end) {
            const unlockDate = document.getElementById('review-unlock-date');
            if (unlockDate) unlockDate.textContent = end.toLocaleDateString() + ' ' + end.toLocaleTimeString().slice(0, 5);
            
            const modal = document.getElementById('review-lock-modal');
            if (modal) modal.classList.remove('hidden');
        } else {
            alert("Tahlil uchun ruxsat ochiq (Keyingi yangilanishda bu yerda to'liq tahlil oynasi bo'ladi).");
        }
    });

    // === QUIZ LOGIC ===
    async function handleStartClick() {
        const btn = document.getElementById('main-action-btn');
        if (!btn) return;
        
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('loading')}`;
        
        const { data: allQ, error } = await supabaseClient
            .from('questions')
            .select('*')
            .eq('tour_id', currentTourId)
            .eq('language', currentLang);

        if (error || !allQ || allQ.length === 0) {
            alert("Savollar topilmadi / Вопросы не найдены.");
            updateMainButton('start', formatTourTitle(currentTourTitle)); 
            return; 
        }

        // FIX: Handle empty fallback arrays safely
        const pick = (subj, diff) => {
            const keywords = {
                'math': ['matematika', 'математика', 'math'],
                'eng': ['ingliz', 'английский', 'english'],
                'phys': ['fizika', 'физика', 'physics'],
                'chem': ['kimyo', 'химия', 'chemistry'],
                'bio': ['biologiya', 'биология', 'biology'],
                'it': ['informatika', 'информатика', 'computer', 'it'],
                'eco': ['iqtisodiyot', 'экономика', 'economics']
            };
            const keys = keywords[subj] || [subj];
            const pool = allQ.filter(q => 
                q.subject && 
                keys.some(k => q.subject.toLowerCase().includes(k)) && 
                q.difficulty === diff
            );
            
            if (pool.length > 0) {
                return pool[Math.floor(Math.random() * pool.length)];
            }
            
            // Fallback: any question from this subject
            const fallback = allQ.filter(q => q.subject && keys.some(k => q.subject.toLowerCase().includes(k)));
            if (fallback.length > 0) {
                return fallback[Math.floor(Math.random() * fallback.length)];
            }
            
            return undefined; // FIX: Return undefined instead of undefined array access
        };

        const ticket = [pick('math', 'Easy'), pick('math', 'Medium'), pick('math', 'Hard')];
        
        const others = ['eng', 'phys', 'chem', 'bio', 'it', 'eco'];
        let diffPool = ['Hard', 'Medium', 'Medium', 'Medium', 'Medium', 'Easy', 'Easy', 'Easy', 'Easy', 'Easy', 'Easy', 'Easy'];
        diffPool.sort(() => 0.5 - Math.random());

        let poolIdx = 0;
        others.forEach(subj => {
            ticket.push(pick(subj, diffPool[poolIdx++]));
            ticket.push(pick(subj, diffPool[poolIdx++]));
        });

        const diffWeights = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };

        questions = ticket.filter(q => q !== undefined).sort((a, b) => {
            return (diffWeights[a.difficulty] || 0) - (diffWeights[b.difficulty] || 0);
        });

        if (questions.length === 0) {
            alert("Savollar topilmadi / Вопросы не найдены.");
            updateMainButton('start', formatTourTitle(currentTourTitle)); 
            return;
        }

        const totalSeconds = questions.reduce((acc, q) => acc + (q.time_limit_seconds || 60), 0);
        const totalMinutes = Math.ceil(totalSeconds / 60);

        const warnQVal = document.getElementById('warn-q-val');
        if (warnQVal) warnQVal.textContent = questions.length + ' ' + t('questions');
        
        const warnTimeVal = document.getElementById('warn-time-val');
        if (warnTimeVal) warnTimeVal.textContent = totalMinutes + ' ' + t('minutes');
        
        const warningModal = document.getElementById('warning-modal');
        if (warningModal) warningModal.classList.remove('hidden');
        
        updateMainButton('start', formatTourTitle(currentTourTitle)); 
    }

    function updateMainButton(state, title = "") {
        const btn = document.getElementById('main-action-btn');
        const certCard = document.getElementById('home-cert-btn'); 
        if (!btn) return;
        
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        const activeBtn = document.getElementById('main-action-btn');
        
        if (state === 'inactive') {
            activeBtn.innerHTML = `<i class="fa-solid fa-calendar-xmark"></i> ${t('no_active_tour')}`;
            activeBtn.disabled = true;
            activeBtn.className = 'btn-primary'; 
            activeBtn.style.background = "#8E8E93";
            if (certCard) certCard.classList.add('hidden'); 
        } else if (state === 'completed') {
            activeBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${t('tour_completed_btn')}`;
            activeBtn.className = 'btn-success-clickable';
            activeBtn.disabled = false;
            activeBtn.style.background = ""; 
            if (certCard) certCard.classList.remove('hidden'); 
            activeBtn.addEventListener('click', () => {
                const modal = document.getElementById('tour-info-modal');
                if (modal) modal.classList.remove('hidden');
            });
        } else {
            const displayTitle = formatTourTitle(title || t('start_tour_btn'));
            activeBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${displayTitle}`;
            activeBtn.className = 'btn-primary';
            activeBtn.disabled = false;
            activeBtn.style.background = "";
            if (certCard) certCard.classList.add('hidden'); 
            activeBtn.addEventListener('click', handleStartClick);
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
        
        showScreen('quiz-screen');
        
        const totalSeconds = questions.reduce((acc, q) => acc + (q.time_limit_seconds || 60), 0);
        startTimer(totalSeconds);
        showQuestion();
    });

    function startTimer(seconds) {
        let timeLeft = seconds;
        const timerEl = document.getElementById('timer');
        
        // FIX: Clear existing timer to prevent memory leaks
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

    function showQuestion() {
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
            nextBtn.disabled = true;
            nextBtn.innerHTML = `${t('btn_next')} <i class="fa-solid fa-arrow-right"></i>`;
        }
        
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
                        if (nextBtn) nextBtn.disabled = false;
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
                if (nextBtn) nextBtn.disabled = selectedAnswer.length === 0;
            });
            container.appendChild(textarea);
        }
        
        renderLaTeX();
    }
    
    safeAddListener('next-button', 'click', async () => {
        const nextBtn = document.getElementById('next-button');
        if (!nextBtn) return;
        
        nextBtn.disabled = true;
        nextBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('saving_ans')}`;
        
        if (!internalDbId) {
            const { data } = await supabaseClient
                .from('users')
                .select('id')
                .eq('telegram_id', telegramUserId)
                .maybeSingle();
            if (data) internalDbId = data.id;
        }
        
        const q = questions[currentQuestionIndex];
        if (!q) return;

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
            // FIX: Correct onConflict syntax (no space)
            const { error } = await supabaseClient.from('user_answers').upsert({
                user_id: internalDbId, 
                question_id: q.id, 
                answer: selectedAnswer, 
                is_correct: finalIsCorrect
            }, { onConflict: 'user_id,question_id' });
            
            if (error) throw error;
            
            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
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
        // FIX: Clear timer to prevent memory leak
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        tourCompleted = true;
        
        let timeTaken = 0;
        try {
            const start = localStorage.getItem('tour_start_time');
            timeTaken = start ? Math.floor((Date.now() - Number(start)) / 1000) : 0;
        } catch (e) {
            console.warn(e);
        }
        
        try {
            // FIX: Correct onConflict syntax (no space)
            await supabaseClient.from('tour_progress').upsert({
                user_id: internalDbId,
                tour_id: currentTourId,
                score: correctCount, 
                total_time_taken: timeTaken
            }, { onConflict: 'user_id,tour_id' }); 
        } catch (e) { 
            console.error("Progress save failed", e); 
        }

        const percent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
        
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

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    window.openExternalLink = function(url) {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    };

    function safeAddListener(id, event, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    }

    safeAddListener('open-cabinet-btn', 'click', () => { 
        showScreen('cabinet-screen'); 
        loadLeaderboard(); 
    });
    
    safeAddListener('close-cabinet', 'click', () => showScreen('home-screen'));
    
    safeAddListener('btn-edit-profile', 'click', () => {
        showScreen('reg-screen');
        if (isProfileLocked) {
            lockProfileForm(true); 
        } else {
            unlockProfileForm();
        }
        const backBtn = document.getElementById('reg-back-btn');
        if (backBtn) backBtn.classList.remove('hidden'); 
    });
    
    safeAddListener('reg-back-btn', 'click', () => showScreen('cabinet-screen'));

    safeAddListener('leaderboard-btn', 'click', () => {
        showScreen('leaderboard-screen');
        setLeaderboardFilter('republic');
    });
    
    safeAddListener('lb-back', 'click', () => showScreen('home-screen'));
    safeAddListener('about-btn', 'click', () => {
        const modal = document.getElementById('about-modal');
        if (modal) modal.classList.remove('hidden');
    });
    
    safeAddListener('close-about', 'click', () => {
        const modal = document.getElementById('about-modal');
        if (modal) modal.classList.add('hidden');
    });
    
    safeAddListener('exit-app-btn', 'click', () => {
        // FIX: Clear timer before exit
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) {
            Telegram.WebApp.close();
        } else {
            try {
                localStorage.clear();
            } catch (e) { console.warn(e); }
            location.reload();
        }
    });

    safeAddListener('home-cert-btn', 'click', () => showCertsModal());
    safeAddListener('download-certificate-res-btn', 'click', () => showCertsModal());
    safeAddListener('btn-open-certs-cab', 'click', () => showCertsModal()); 
    safeAddListener('cancel-start', 'click', () => {
        const modal = document.getElementById('warning-modal');
        if (modal) modal.classList.add('hidden');
    });
    safeAddListener('back-home', 'click', () => showScreen('home-screen'));
    safeAddListener('back-home-x', 'click', () => showScreen('home-screen'));

    function showCertsModal() {
        const container = document.getElementById('certs-list-container');
        if (container) {
            container.innerHTML = `
                <div class="cert-card">
                    <div class="cert-icon"><i class="fa-solid fa-file-pdf"></i></div>
                    <div class="cert-info"><h4>${t('cert_title')}</h4><p>${new Date().toLocaleDateString()}</p></div>
                    <div class="cert-action"><span class="badge-soon">Soon</span></div>
                </div>`;
        }
        const modal = document.getElementById('certs-modal');
        if (modal) modal.classList.remove('hidden');
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    });

    // Initialize app after Telegram data is ready
    setTimeout(() => {
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe.user) {
            tgInitData = Telegram.WebApp.initData;
            
            const user = Telegram.WebApp.initDataUnsafe.user;
            if (user && user.id) {
                telegramUserId = String(user.id);
            }
            
            checkProfileAndTour();
        } else {
            console.warn("Telegram WebApp not available or no user data");
            // For testing outside Telegram
            checkProfileAndTour();
        }
    }, 100);
});
