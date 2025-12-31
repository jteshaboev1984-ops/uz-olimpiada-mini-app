document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v72.6 (Fixed ReferenceError & Accurate Time)');
  
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
                throwOnError : false
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
            warn_msg_3: "vaqt bor.",
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
            about_text: "O'zbekiston o'quvchilari uchun <b>Cambridge IGCSE</b>, <b>SAT</b> va <b>IELTS</b> standartlarini birlashtirgan noyоб platforma.",
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
        return translations[currentLang][key] || key;
    }

    function setLanguage(lang) {
        if (isLangLocked && lang !== currentLang) return; 
        if (!translations[lang]) lang = 'uz'; 
        currentLang = lang;
        const regLangSel = document.getElementById('reg-lang-select');
        if(regLangSel) regLangSel.value = lang;
        const cabLangSel = document.getElementById('lang-switcher-cab');
        if(cabLangSel) cabLangSel.value = lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) el.innerHTML = translations[lang][key]; 
        });
        updateSelectPlaceholders();
        if (tourCompleted) updateMainButton('completed');
        else if (currentTourId) updateMainButton('start', formatTourTitle(currentTourTitle)); 
        else updateMainButton('inactive');
        if(currentTourId) fetchStatsData();
    }

    function updateSelectPlaceholders() {
        const regionSel = document.getElementById('region-select');
        if (regionSel && regionSel.options.length > 0) regionSel.options[0].textContent = t('select_region');
        const districtSel = document.getElementById('district-select');
        if (districtSel && districtSel.options.length > 0) districtSel.options[0].textContent = t('select_district');
        const classSel = document.getElementById('class-select');
        if (classSel && classSel.options.length > 0) classSel.options[0].textContent = t('select_class');
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
        telegramData.languageCode = user.language_code;
        document.getElementById('reg-user-name').textContent = (telegramData.firstName || '') + ' ' + (telegramData.lastName || '');
        document.getElementById('home-user-name').textContent = telegramData.firstName || t('lb_participant');
        if(telegramData.photoUrl) document.getElementById('cab-avatar-img').src = telegramData.photoUrl;
      } else {
        if (!localStorage.getItem('test_user_id')) localStorage.setItem('test_user_id', Math.floor(Math.random() * 1000000000));
        telegramUserId = Number(localStorage.getItem('test_user_id'));
        document.getElementById('reg-user-name').textContent = 'Test User';
      }
    }

    const savedLang = localStorage.getItem('user_lang');
    if (savedLang) setLanguage(savedLang);
    else if (telegramData.languageCode) {
        if (telegramData.languageCode === 'ru') setLanguage('ru');
        else if (telegramData.languageCode === 'en') setLanguage('en');
        else setLanguage('uz');
    } else setLanguage('uz');
  
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
  
    // === ГЛАВНАЯ ЛОГИКА (checkProfileAndTour) ===
    async function checkProfileAndTour() {
      const { data: userData } = await supabaseClient.from('users').select('*').eq('telegram_id', telegramUserId).maybeSingle();
      if (userData) {
          internalDbId = userData.id; currentUserData = userData; 
          if (telegramData.firstName) {
              let tgName = (telegramData.firstName + (telegramData.lastName ? ' ' + telegramData.lastName : '')).trim();
              if (!userData.name || userData.name !== tgName) {
                  await supabaseClient.from('users').update({ name: tgName }).eq('id', userData.id);
                  currentUserData.name = tgName; 
              }
          }
          document.getElementById('cab-name').textContent = currentUserData.name;
          document.getElementById('cab-id').textContent = String(telegramUserId).slice(-6); 

          if (userData.fixed_language) {
              isLangLocked = true; currentLang = userData.fixed_language;
              setLanguage(userData.fixed_language); 
          } 
          const isOldUserReady = (userData.class && userData.region && userData.district && userData.school);
          if (userData.fixed_language || isOldUserReady) {
              isLangLocked = true;
              const cabLang = document.getElementById('lang-switcher-cab'); if(cabLang) cabLang.disabled = true;
              const cabMsg = document.getElementById('lang-lock-msg'); if(cabMsg) cabMsg.classList.remove('hidden');
              const regLang = document.getElementById('reg-lang-select'); if(regLang) regLang.disabled = true;
          }
          if (isOldUserReady) isProfileLocked = true;
      } else {
          let fullName = telegramData.firstName ? (telegramData.firstName + (telegramData.lastName ? ' ' + telegramData.lastName : '')).trim() : 'Foydalanuvchi';
          const { data: newUser } = await supabaseClient.from('users').insert({ telegram_id: telegramUserId, name: fullName, avatar_url: telegramData.photoUrl }).select().single();
          if (newUser) { internalDbId = newUser.id; currentUserData = newUser; }
      }

      const now = new Date().toISOString();
      const { data: tourData } = await supabaseClient.from('tours').select('*').lte('start_date', now).gte('end_date', now).eq('is_active', true).maybeSingle();
      if (!tourData) updateMainButton('inactive');
      else {
          currentTourId = tourData.id; currentTourTitle = tourData.title; currentTourEndDate = tourData.end_date; 
          if (internalDbId && currentTourId) {
              await fetchStatsData(); 
              const { data: progress } = await supabaseClient.from('tour_progress').select('*').eq('user_id', internalDbId).eq('tour_id', currentTourId).maybeSingle();
              if (progress) { tourCompleted = true; updateMainButton('completed'); document.getElementById('subjects-title').textContent = t('curr_tour'); }
              else { tourCompleted = false; updateMainButton('start', formatTourTitle(tourData.title)); document.getElementById('subjects-title').textContent = t('subjects_title'); }
          }
      }
      const isProfileComplete = currentUserData && currentUserData.class && currentUserData.region && currentUserData.district && currentUserData.school;
      if (!currentUserData || !isProfileComplete) { showScreen('reg-screen'); unlockProfileForm(); }
      else { fillProfileForm(currentUserData); showScreen('home-screen'); }
    }

    // === СТАТИСТИКА И ДАШБОРД (ВОССТАНОВЛЕНО) ===
    async function fetchStatsData() {
        if (!internalDbId || !currentTourId) return;
        const { data: qData } = await supabaseClient.from('questions').select('id, subject').eq('tour_id', currentTourId).eq('language', currentLang); 
        if (qData) tourQuestionsCache = qData;
        const { data: aData } = await supabaseClient.from('user_answers').select('question_id, is_correct').eq('user_id', internalDbId);
        if (aData) userAnswersCache = aData;
        updateDashboardStats();
    }

    function updateDashboardStats() {
        const subjectPrefixes = ['math', 'eng', 'phys', 'chem', 'bio', 'it', 'eco', 'sat', 'ielts'];
        let totalCorrect = 0;
        subjectPrefixes.forEach(prefix => {
            const stats = calculateSubjectStats(prefix);
            let percent = Math.round((stats.correct / 15) * 100); if (percent > 100) percent = 100; 
            const percentEl = document.getElementById(`${prefix}-percent`); if (percentEl) percentEl.textContent = `${percent}%`;
            const barEl = document.getElementById(`${prefix}-bar`); if (barEl) barEl.style.width = `${percent}%`;
            totalCorrect += stats.correct;
        });
        document.getElementById('cab-score').textContent = totalCorrect;
        document.getElementById('cab-tours').textContent = tourCompleted ? 1 : 0;
    }

    function calculateSubjectStats(prefix) {
        const keywords = {
            'math': ['matematika', 'математика', 'math'], 'eng': ['ingliz', 'английский', 'english'], 'phys': ['fizika', 'физика', 'physics'],
            'chem': ['kimyo', 'химия', 'chemistry'], 'bio': ['biologiya', 'биология', 'biology'], 'it': ['informatika', 'информатика', 'computer', 'it'],
            'eco': ['iqtisodiyot', 'экономика', 'economics'], 'sat': ['sat'], 'ielts': ['ielts']
        };
        const targetKeys = keywords[prefix] || [prefix];
        const subjectQuestions = tourQuestionsCache.filter(q => q.subject && targetKeys.some(k => q.subject.toLowerCase().includes(k)));
        let correct = 0;
        subjectQuestions.forEach(q => {
            const answer = userAnswersCache.find(a => a.question_id === q.id);
            if (answer && answer.is_correct) correct++;
        });
        return { total: subjectQuestions.length, correct };
    }

    // === ЛОГИКА ВЫБОРА (MATRIX SLIDING 1-1-1) ===
    async function handleStartClick() {
        const btn = document.getElementById('main-action-btn'); 
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('loading')}`;
        
        const { data: allQ } = await supabaseClient.from('questions').select('*').eq('tour_id', currentTourId).eq('language', currentLang);
        if (!allQ || allQ.length === 0) { alert("Savollar topilmadi."); updateMainButton('start', formatTourTitle(currentTourTitle)); return; }

        const pick = (subj, diff) => {
            const keywords = {
                'math': ['matematika', 'математика', 'math'], 'eng': ['ingliz', 'английский', 'english'], 'phys': ['fizika', 'физика', 'physics'],
                'chem': ['kimyo', 'химия', 'chemistry'], 'bio': ['biologiya', 'биология', 'biology'], 'it': ['informatika', 'информатика', 'computer', 'it'],
                'eco': ['iqtisodiyot', 'экономика', 'economics']
            };
            const keys = keywords[subj] || [subj];
            const pool = allQ.filter(q => keys.some(k => (q.subject || '').toLowerCase().includes(k)) && q.difficulty === diff);
            if (pool.length === 0) { 
                const subPool = allQ.filter(q => keys.some(k => (q.subject || '').toLowerCase().includes(k)));
                return subPool[Math.floor(Math.random() * subPool.length)];
            }
            return pool[Math.floor(Math.random() * pool.length)];
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

        questions = ticket.filter(q => q !== undefined);
        questions.sort(() => 0.5 - Math.random());

        const totalSeconds = questions.reduce((acc, q) => acc + (q.time_limit_seconds || 60), 0);
        const totalMinutes = Math.ceil(totalSeconds / 60);

        document.getElementById('warn-q-val').textContent = questions.length + ' ' + t('questions');
        document.getElementById('warn-time-val').textContent = totalMinutes + ' ' + t('minutes');
        document.getElementById('warning-modal').classList.remove('hidden');
        updateMainButton('start', formatTourTitle(currentTourTitle)); 
    }

    function updateMainButton(state, title = "") {
        const btn = document.getElementById('main-action-btn'); if (!btn) return;
        const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
        const activeBtn = document.getElementById('main-action-btn');
        if (state === 'inactive') { activeBtn.innerHTML = t('no_active_tour'); activeBtn.disabled = true; activeBtn.style.background = "#8E8E93"; }
        else if (state === 'completed') { activeBtn.innerHTML = `<i class="fa-solid fa-check"></i> ` + t('tour_completed_btn'); activeBtn.className = 'btn-success-clickable'; activeBtn.addEventListener('click', () => document.getElementById('tour-info-modal').classList.remove('hidden')); }
        else { activeBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${title || t('start_tour_btn')}`; activeBtn.addEventListener('click', handleStartClick); }
    }

    function showQuestion() {
      const q = questions[currentQuestionIndex];
      document.getElementById('question-number').textContent = currentQuestionIndex + 1;
      document.getElementById('total-q-count').textContent = questions.length;
      document.getElementById('subject-tag').textContent = q.subject || 'Q';
      document.getElementById('question-text').innerHTML = q.question_text;
      document.getElementById('q-time-hint').innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ${q.time_limit_seconds || 60}s`;
      document.getElementById('quiz-progress-fill').style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
      
      const container = document.getElementById('options-container'); container.innerHTML = '';
      const nextBtn = document.getElementById('next-button'); nextBtn.disabled = true;
      selectedAnswer = null;

      const opts = (q.options_text || '').split('\n').filter(o => o.trim());
      const letters = ['A', 'B', 'C', 'D'];
      opts.forEach((o, i) => {
          const btn = document.createElement('div'); btn.className = 'option-card';
          btn.innerHTML = `<div class="option-circle">${letters[i] || ''}</div><div class="option-text">${o.trim()}</div>`;
          btn.onclick = () => {
              document.querySelectorAll('.option-card').forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected'); selectedAnswer = o.trim(); nextBtn.disabled = false;
          };
          container.appendChild(btn);
      });
      renderLaTeX();
    }

    // === UI И СОБЫТИЯ ===
    function safeAddListener(id, ev, h) { const el = document.getElementById(id); if (el) el.addEventListener(ev, h); }
    safeAddListener('confirm-start', 'click', () => { document.getElementById('warning-modal').classList.add('hidden'); localStorage.setItem('tour_start_time', Date.now()); currentQuestionIndex = 0; correctCount = 0; showScreen('quiz-screen'); startTimer(questions.reduce((acc, q) => acc + (q.time_limit_seconds || 60), 0)); showQuestion(); });
    safeAddListener('next-button', 'click', async () => {
        const q = questions[currentQuestionIndex];
        const { data: isCorrect } = await supabaseClient.rpc('check_user_answer', { p_question_id: Number(q.id), p_user_answer: selectedAnswer });
        if (isCorrect === true) correctCount++;
        await supabaseClient.from('user_answers').upsert({ user_id: internalDbId, question_id: q.id, answer: selectedAnswer, is_correct: isCorrect === true }, { onConflict: 'user_id,question_id' });
        if (++currentQuestionIndex < questions.length) showQuestion(); else finishTour();
    });

    function startTimer(s) { if (timerInterval) clearInterval(timerInterval); timerInterval = setInterval(() => { document.getElementById('timer').textContent = `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; if (s-- <= 0) { clearInterval(timerInterval); finishTour(); } }, 1000); }
    async function finishTour() { clearInterval(timerInterval); tourCompleted = true; const time = Math.floor((Date.now() - Number(localStorage.getItem('tour_start_time'))) / 1000); await supabaseClient.from('tour_progress').upsert({ user_id: internalDbId, tour_id: currentTourId, score: correctCount, total_time_taken: time }, { onConflict: 'user_id, tour_id' }); showScreen('result-screen'); document.getElementById('res-total').textContent = questions.length; document.getElementById('res-correct').textContent = correctCount; document.getElementById('result-percent').textContent = Math.round((correctCount/questions.length)*100)+'%'; updateMainButton('completed'); checkProfileAndTour(); }
    function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); window.scrollTo(0,0); }
    function fillProfileForm(data) { document.getElementById('class-select').value = data.class; document.getElementById('region-select').value = data.region; document.getElementById('school-input').value = data.school; }
    function unlockProfileForm() { document.getElementById('save-profile').classList.remove('hidden'); document.querySelectorAll('#reg-screen input, #reg-screen select').forEach(el => el.disabled = false); }
    
    checkProfileAndTour();
    safeAddListener('open-cabinet-btn', 'click', () => showScreen('cabinet-screen'));
    safeAddListener('close-cabinet', 'click', () => showScreen('home-screen'));
    safeAddListener('back-home', 'click', () => showScreen('home-screen'));
});
