document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v74.0 (Final Balanced Logic)');
  
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

    // === СЛОВАРЬ ПЕРЕВОДОВ ===
    const translations = {
        uz: {
            reg_title: "Ro'yxatdan o'tish", reg_subtitle: "Ma'lumotlaringizni kiriting", participant_label: "Ishtirokchi", label_class: "Sinf", label_region: "Viloyat", label_district: "Tuman / Shahar", label_school: "Maktab", consent_title: "Ma'lumotlarni qayta ishlashga rozilik", consent_desc: "Reyting uchun.", btn_save: "Saqlash va Tasdiqlash", profile_locked_msg: "Ma'lumotlar tasdiqlangan", profile_locked_hint: "Xatolik bo'lsa 'Yordam' bo'limiga yozing. (Til o'zgartirilmaydi!)", btn_to_main: "Bosh sahifaga", btn_cancel: "Bekor qilish", greeting_hi: "Salom", greeting_sub: "Olimpiadaga xush kelibsiz.", btn_leaderboard: "Reyting", btn_about: "Loyiha haqida", subjects_title: "Fanlar", subj_math: "Matematika", subj_eng: "Ingliz tili", subj_phys: "Fizika", subj_chem: "Kimyo", subj_bio: "Biologiya", subj_it: "Informatika", subj_eco: "Iqtisodiyot", cert_title: "Sertifikat", cert_desc: "PDF yuklab olish", res_title: "Resurslar", res_vid_title: "Video darslar", res_vid_desc: "Masalalar yechimi", res_ch_title: "Kanal", res_ch_desc: "Yangiliklar", res_grp_title: "Ishtirokchilar chati", res_grp_desc: "Muhokama", loading: "Yuklanmoqda...", btn_exit: "Chiqish", btn_next: "Keyingi", res_screen_title: "Tur natijasi", res_finished: "Tur yakunlandi!", res_saved: "Natijangiz saqlandi", stat_tour: "TUR", stat_total: "JAMI", stat_correct: "TO'G'RI", review_title: "Xatolar ustida ishlash", data_saved: "Ma'lumotlar saqlandi", review_desc: "Batafsil tahlil natijalar e'lon qilingandan so'ng mavjud bo'ladi.", btn_download_cert: "Sertifikatni yuklash", lb_title: "Reyting", lb_republic: "Respublika", lb_region: "Viloyat", lb_district: "Tuman", lb_participant: "ISHTIROKCHI", lb_score: "BALL", you: "Siz", lb_points: "BALL", lb_rank: "O'rin", stat_tours: "Turlar", warn_title: "Diqqat", warn_msg_1: "Sizda", warn_msg_2: "ta savol uchun", warn_msg_3: "daqiqa vaqt bor.", warn_hint: "Savollar oddiydan qiyinga qarab boradi.", warn_hint_2: "Orqaga qaytish imkonsiz!", btn_start: "Boshlash", btn_close: "Yopish", my_certs: "Mening sertifikatlarim", tour_passed_title: "Tur yakunlangan!", tour_passed_msg: "Siz ushbu bosqich javoblarini topshirgansiz. Natijalar Reyting bo'limida.", btn_channel: "Kanalga o'tish", locked_alert_title: "O'zgartirish imkonsiz", locked_alert_desc: "Olimpiada yakunlanguncha tahrirlash o'chirilgan.", btn_understood: "Tushunarli", about_platform: "Platforma haqida", about_text: "O'zbekiston o'quvchilari uchun <b>Cambridge IGCSE</b>, <b>SAT</b> va <b>IELTS</b> standartlarini birlashtirgan noyob platforma.", about_features: "Xususiyatlar", feat_1: "Xalqaro standartlar", feat_2: "Tezkor natijalar", feat_3: "Hududlar bo'yicha reyting", feat_4: "Ishtirok sertifikatlari", select_region: "Viloyatni tanlang", select_district: "Tumanni tanlang", select_class: "Sinfni tanlang", class_s: "sinf", save_saving: "Saqlash...", alert_fill: "Barcha maydonlarni to'ldiring!", no_active_tour: "Faol turlar yo'q", tour_completed_btn: "Tur yakunlangan", start_tour_btn: "Turni boshlash", minutes: "daqiqa", questions: "savol", correct_txt: "to'g'ri", no_data: "Ma'lumot yo'q", curr_tour: "Joriy tur", total_q: "Jami savollar", school_prefix: "Maktab", anonymous: "Anonim", city_tashkent: "Toshkent sh.", saving_ans: "Saqlash...", repeat: "Qayta urinish", error: "Xatolik", answer_placeholder: "Javobni kiriting...", menu_my_data: "Ma'lumotlarim", menu_my_data_desc: "Sinf, maktab, hudud", menu_lang: "Til", menu_certs: "Sertifikatlar", menu_certs_desc: "Yutuqlar arxivi", menu_support: "Yordam", menu_support_desc: "Admin bilan aloqa", btn_delete_account: "Hisobni o'chirish", del_title: "Hisobni o'chirish?", del_msg: "Barcha natijalaringiz va reytingdagi o'rningiz o'chib ketadi. Qayta tiklab bo'lmaydi.", btn_delete_confirm: "O'chirish", del_error_active_tour: "Joriy tur topshirilganligi sababli hisobni o'chirish mumkin emas. Iltimos, tur yakunlanishini kuting.", btn_back: "Orqaga", menu_mistakes: "Xatolar tahlili", menu_mistakes_desc: "Javoblarni ko'rish", lock_review_title: "Tahlil yopiq", lock_review_msg: "Adolatli raqobat uchun xatolar tahlili olimpiada yakunlangandan so'ng ochiladi.", lang_warning_reg: "Diqqat: Til va ma'lumotlar saqlangandan so'ng o'zgartirib bo'lmaydi!", lang_locked_reason: "Adolatli raqobat uchun tilni o'zgartirish imkoniyati o'chirilgan.", cheat_title: "DIQQAT! QOIDABUZARLIK!", cheat_msg: "Ilovadan chiqish yoki oynani almashtirish taqiqlanadi. Yana takrorlansa, test avtomatik ravishda yakunlanadi!"
        },
        ru: {
            reg_title: "Регистрация", reg_subtitle: "Введите данные", participant_label: "Участник", label_class: "Класс", label_region: "Регион", label_district: "Район / Город", label_school: "Школа", consent_title: "Согласие на обработку", consent_desc: "Для рейтинга.", btn_save: "Сохранить и Подтвердить", profile_locked_msg: "Данные подтверждены", profile_locked_hint: "Ошибка? Пишите в 'Помощь'. (Смена языка запрещена!)", btn_to_main: "На главную", btn_cancel: "Отмена", greeting_hi: "Привет", greeting_sub: "Добро пожаловать на олимпиаду.", btn_leaderboard: "Рейтинг", btn_about: "О проекте", subjects_title: "Предметы", subj_math: "Математика", subj_eng: "Английский", subj_phys: "Физика", subj_chem: "Химия", subj_bio: "Биология", subj_it: "Информатика", subj_eco: "Экономика", cert_title: "Сертификат", cert_desc: "Скачать PDF", res_title: "Ресурсы", res_vid_title: "Видеоуроки", res_vid_desc: "Разборы задач", res_ch_title: "Канал", res_ch_desc: "Новости", res_grp_title: "Чат участников", res_grp_desc: "Обсуждение", loading: "Загрузка...", btn_exit: "Выход", btn_next: "Далее", res_screen_title: "Результат тура", res_finished: "Тур завершён!", res_saved: "Ваш результат сохранен", stat_tour: "ТУР", stat_total: "ВСЕГО", stat_correct: "ВЕРНО", review_title: "Работа над ошибками", data_saved: "Данные сохранены", review_desc: "Детальный разбор будет доступен после подведения итогов.", btn_download_cert: "Скачать сертификат", lb_title: "Лидерборд", lb_republic: "Республика", lb_region: "Регион", lb_district: "Район", lb_participant: "УЧАСТНИК", lb_score: "БАЛЛЫ", you: "Вы", lb_points: "БАЛЛЫ", lb_rank: "Место", stat_tours: "Туров", warn_title: "Предупреждение", warn_msg_1: "У вас будет", warn_msg_2: "на", warn_msg_3: "вопросов.", warn_hint: "Вопросы идут от простых к сложным.", warn_hint_2: "Вернуться назад нельзя!", btn_start: "Начать", btn_close: "Закрыть", my_certs: "Мои сертификаты", tour_passed_title: "Тур уже пройден!", tour_passed_msg: "Вы уже сдали ответы на текущий этап. Результаты доступны в Лидерборде.", btn_channel: "Перейти в канал", locked_alert_title: "Изменение невозможно", locked_alert_desc: "До окончания олимпиады редактирование данных отключено.", btn_understood: "Понятно", about_platform: "О платформе", about_text: "Уникальная платформа для школьников Узбекистана, объединяющая стандарты <b>Cambridge IGCSE</b>, <b>SAT</b> и <b>IELTS</b>.", about_features: "Особенности", feat_1: "Международные стандарты", feat_2: "Мгновенные результаты", feat_3: "Рейтинг по регионам", feat_4: "Сертификаты участия", select_region: "Выберите регион", select_district: "Выберите район", select_class: "Выберите класс", class_s: "класс", save_saving: "Сохранение...", alert_fill: "Заполните все поля!", no_active_tour: "Нет активных туров", tour_completed_btn: "Текущий тур пройден", start_tour_btn: "Начать тур", minutes: "минут", questions: "вопросов", correct_txt: "верно", no_data: "Нет данных", curr_tour: "Текущий тур", total_q: "Всего вопросов", school_prefix: "Школа", anonymous: "Аноним", city_tashkent: "г. Ташкент", saving_ans: "Сохранение...", repeat: "Повторить", error: "Ошибка", answer_placeholder: "Введите ответ...", menu_my_data: "Мои данные", menu_my_data_desc: "Класс, школа, регион", menu_lang: "Язык", menu_certs: "Сертификаты", menu_certs_desc: "Архив достижений", menu_support: "Помощь", menu_support_desc: "Связь с админом", btn_delete_account: "Удалить аккаунт", del_title: "Удалить аккаунт?", del_msg: "Все ваши результаты и место в рейтинге будут удалены безвозвратно.", btn_delete_confirm: "Удалить", del_error_active_tour: "Удаление невозможно, так как вы уже сдали текущий тур. Дождитесь его завершения.", btn_back: "Назад", menu_mistakes: "Работа над ошибками", menu_mistakes_desc: "Посмотреть ответы", lock_review_title: "Разбор закрыт", lock_review_msg: "В целях честной игры разбор ошибок станет доступен после окончания олимпиады.", lang_warning_reg: "Внимание: Язык и данные профиля нельзя будет изменить после сохранения!", lang_locked_reason: "Смена языка отключена для обеспечения честной конкуренции.", cheat_title: "НАРУШЕНИЕ!", cheat_msg: "Покидать приложение во время теста запрещено! При повторном нарушении тест будет завершен принудительно."
        },
        en: {
            reg_title: "Registration", reg_subtitle: "Enter your details", participant_label: "Participant", label_class: "Grade", label_region: "Region", label_district: "District / City", label_school: "School", consent_title: "Data Processing Consent", consent_desc: "For leaderboard ranking.", btn_save: "Save & Confirm", profile_locked_msg: "Data Locked", profile_locked_hint: "Mistake? Contact Support. (Language cannot be changed!)", btn_to_main: "Go to Home", btn_cancel: "Cancel", greeting_hi: "Hi", greeting_sub: "Welcome to the Olympiad.", btn_leaderboard: "Leaderboard", btn_about: "About", subjects_title: "Subjects", subj_math: "Math", subj_eng: "English", subj_phys: "Physics", subj_chem: "Chemistry", subj_bio: "Biology", subj_it: "Computer Science", subj_eco: "Economics", cert_title: "Certificate", cert_desc: "Download PDF", res_title: "Resources", res_vid_title: "Video Lessons", res_vid_desc: "Problem solving", res_ch_title: "Channel", res_ch_desc: "News", res_grp_title: "Chat Group", res_grp_desc: "Discussion", loading: "Loading...", btn_exit: "Exit", btn_next: "Next", res_screen_title: "Tour Result", res_finished: "Tour Finished!", res_saved: "Your result is saved", stat_tour: "TOUR", stat_total: "TOTAL", stat_correct: "CORRECT", review_title: "Mistake Review", data_saved: "Data Saved", review_desc: "Detailed review will be available after results.", btn_download_cert: "Download Certificate", lb_title: "Leaderboard", lb_republic: "Republic", lb_region: "Region", lb_district: "District", lb_participant: "PARTICIPANT", lb_score: "SCORE", you: "You", lb_points: "POINTS", lb_rank: "Rank", stat_tours: "Tours", warn_title: "Warning", warn_msg_1: "You have", warn_msg_2: "for", warn_msg_3: "questions.", warn_hint: "Questions go from Easy to Hard.", warn_hint_2: "You cannot go back!", btn_start: "Start", btn_close: "Close", my_certs: "My Certificates", tour_passed_title: "Tour Completed!", tour_passed_msg: "You have already submitted answers. Check the Leaderboard.", btn_channel: "Go to Channel", locked_alert_title: "Editing Disabled", locked_alert_desc: "Changes are not allowed until Olympiad ends.", btn_understood: "Understood", about_platform: "About Platform", about_text: "Unique platform for Uzbekistan students combining <b>Cambridge IGCSE</b>, <b>SAT</b>, and <b>IELTS</b> standards.", about_features: "Features", feat_1: "International Standards", feat_2: "Instant Results", feat_3: "Regional Ranking", feat_4: "Participation Certificates", select_region: "Select Region", select_district: "Select District", select_class: "Select Grade", class_s: "grade", save_saving: "Saving...", alert_fill: "Fill in all fields!", no_active_tour: "No Active Tours", tour_completed_btn: "Tour Completed", start_tour_btn: "Start Tour", minutes: "minutes", questions: "questions", correct_txt: "correct", no_data: "No data", curr_tour: "Current Tour", total_q: "Total Questions", school_prefix: "School", anonymous: "Anonymous", city_tashkent: "Tashkent City", saving_ans: "Saving...", repeat: "Retry", error: "Error", answer_placeholder: "Enter answer...", menu_my_data: "My Details", menu_my_data_desc: "Grade, school, region", menu_lang: "Language", menu_certs: "Certificates", menu_certs_desc: "Archive", menu_support: "Support", menu_support_desc: "Contact Admin", btn_delete_account: "Delete Account", del_title: "Delete Account?", del_msg: "All your results and ranking will be lost permanently.", btn_delete_confirm: "Delete", del_error_active_tour: "Cannot delete account while you have submitted the current tour. Please wait.", btn_back: "Back", menu_mistakes: "Mistake Review", menu_mistakes_desc: "Check answers", lock_review_title: "Review Locked", lock_review_msg: "To ensure fair play, mistake review will be available after the Olympiad ends.", lang_warning_reg: "Attention: Language and profile data cannot be changed after saving!", lang_locked_reason: "Language changing is disabled to ensure fair competition.", cheat_title: "VIOLATION!", cheat_msg: "Leaving the app is prohibited! Next time the test will be terminated automatically."
        }
    };

    function t(key) { return translations[currentLang][key] || key; }

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
        else if (currentTourId) updateMainButton('start', currentTourTitle); 
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

    // === ИНИЦИАЛИЗАЦИЯ TG & LANG ===
    if (window.Telegram && window.Telegram.WebApp) {
      Telegram.WebApp.ready(); Telegram.WebApp.expand();
      const user = Telegram.WebApp.initDataUnsafe.user;
      if (user && user.id) {
        telegramUserId = Number(user.id);
        telegramData.firstName = user.first_name; telegramData.lastName = user.last_name;
        if (user.photo_url) telegramData.photoUrl = user.photo_url;
        telegramData.languageCode = user.language_code;
        document.getElementById('reg-user-name').textContent = telegramData.firstName + ' ' + (telegramData.lastName || '');
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
    else if (telegramData.languageCode) setLanguage(telegramData.languageCode === 'ru' ? 'ru' : (telegramData.languageCode === 'en' ? 'en' : 'uz'));
    else setLanguage('uz');

    // === ДАННЫЕ РЕГИОНОВ ===
    const regions = { "Toshkent shahri": ["Bektemir tumani", "Chilonzor tumani", "Mirobod tumani", "Mirzo Ulug'bek tumani", "Olmazor tumani", "Sergeli tumani", "Shayxontohur tumani", "Uchtepa tumani", "Yakkasaroy tumani", "Yangihayot tumani", "Yashnobod tumani", "Yunusobod tumani"], "Andijon viloyati": ["Andijon shahri", "Xonobod shahri", "Andijon tumani", "Asaka tumani", "Baliqchi tumani", "Bo'z tumani", "Buloqboshi tumani", "Izboskan tumani", "Jalaquduq tumani", "Marhamat tumani", "Oltinko'l tumani", "Paxtaobod tumani", "Qo'rg'ontepa tumani", "Shahrixon tumani", "Ulug'nor tumani", "Xo'jaobod tumani"], "Buxoro viloyati": ["Buxoro shahri", "Kogon shahri", "Buxoro tumani", "G'ijduvon tumani", "Jondor tumani", "Kogon tumani", "Olot tumani", "Peshku tumani", "Qorako'l tumani", "Qorovulbozor tumani", "Romitan tumani", "Shofirkon tumani", "Vobkent tumani"], "Farg'ona viloyati": ["Farg'ona shahri", "Marg'ilon shahri", "Qo'qon shahri", "Quvasoy shahri", "Bag'dod tumani", "Beshariq tumani", "Buvayda tumani", "Dang'ara tumani", "Farg'ona tumani", "Furqat tumani", "Oltiariq tumani", "Qo'shtepa tumani", "Quva tumani", "Rishton tumani", "So'x tumani", "Toshloq tumani", "Uchko'prik tumani", "O'zbekiston tumani", "Yozyovon tumani"], "Jizzax viloyati": ["Jizzax shahri", "Arnasoy tumani", "Baxmal tumani", "Do'stlik tumani", "Forish tumani", "G'allaorol tumani", "Jizzax tumani", "Mirzacho'l tumani", "Paxtakor tumani", "Sharof Rashidov tumani", "Yangiobod tumani", "Zomin tumani", "Zarbdor tumani", "Zafarobod tumani"], "Xorazm viloyati": ["Urganch shahri", "Xiva shahri", "Bog'ot tumani", "Gurlan tumani", "Xiva tumani", "Hazorasp tumani", "Xonqa tumani", "Q'shko'pir tumani", "Shovot tumani", "Urganch tumani", "Yangiariq tumani", "Yangibozor tumani"], "Namangan viloyati": ["Namangan shahri", "Chortoq tumani", "Chust tumani", "Kosonsoy tumani", "Mingbuloq tumani", "Namangan tumani", "Norin tumani", "Pop tumani", "To'raqo'rg'on tumani", "Uchqo'rg'on tumani", "Uychi tumani", "Yangiqo'rg'on tumani"], "Navoiy viloyati": ["Navoiy shahri", "Zarafshon shahri", "G'ozg'on shahri", "Konimex tumani", "Karmana tumani", "Qiziltepa tumani", "Xatirchi tumani", "Navbahor tumani", "Nurota tumani", "Tomdi tumani", "Uchquduq tumani"], "Qashqadaryo viloyati": ["Qarshi shahri", "Shahrisabz shahri", "Chiroqchi tumani", "Dehqonobod tumani", "G'uzor tumani", "Qamashi tumani", "Qarshi tumani", "Kasbi tumani", "Kitob tumani", "Koson tumani", "Mirishkor tumani", "Muborak tumani", "Nishon tumani", "Shahrisabz tumani", "Yakkabog' tumani", "Ko'kdala tumani"], "Qoraqalpog'iston Respublikasi": ["Nukus shahri", "Amudaryo tumani", "Beruniy tumani", "Chimboy tumani", "Ellikqal'a tumani", "Kegeyli tumani", "Mo'ynoq tumani", "Nukus tumani", "Qanliko'l tumani", "Qo'ng'irot tumani", "Qorao'zak tumani", "Shumanay tumani", "Taxtako'pir tumani", "To'rtko'l tumani", "Xo'jayli tumani", "Taxiatosh tumani", "Bo'zatov tumani"], "Samarqand viloyati": ["Samarqand shahri", "Kattaqo'rg'on shahri", "Bulung'ur tumani", "Ishtixon tumani", "Jomboy tumani", "Kattaqo'rg'on tumani", "Qo'shrabot tumani", "Narpay tumani", "Nurabod tumani", "Oqdaryo tumani", "Paxtachi tumani", "Payariq tumani", "Pastdarg'om tumani", "Samarqand tumani", "Toyloq tumani", "Urgut tumani"], "Sirdaryo viloyati": ["Guliston shahri", "Yangiyer shahri", "Shirin shahri", "Oqoltin tumani", "Boyovut tumani", "Guliston tumani", "Xovos tumani", "Mirzaobod tumani", "Sayxunobod tumani", "Sardoba tumani", "Sirdaryo tumani"], "Surxondaryo viloyati": ["Termiz shahri", "Angor tumani", "Bandixon tumani", "Boysun tumani", "Denov tumani", "Jarqo'rg'on tumani", "Qiziriq tumani", "Qumqo'rg'on tumani", "Muzrabot tumani", "Oltinsoy tumani", "Sariosiyo tumani", "Sherobod tumani", "Sho'rchi tumani", "Termiz tumani", "Uzun tumani"], "Toshkent viloyati": ["Nurafshon shahri", "Olmaliq shahri", "Angren shahri", "Bekobod shahri", "Ohangaron shahri", "Chirchiq shahri", "Yangiyo'l shahri", "Bekobod tumani", "Bo'stonliq tumani", "Bo'ka tumani", "Chinoz tumani", "Qibray tumani", "Ohangaron tumani", "Oqqo'rg'on tumani", "Parkent tumani", "Piskent tumani", "Quyi Chirchiq tumani", "O'rta Chirchiq tumani", "Yangiyo'l tumani", "Yuqori Chirchiq tumani", "Zangiota tumani"] };

    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.innerHTML = `<option value="" disabled selected>${t('select_region')}</option>`;
        Object.keys(regions).sort().forEach(region => {
          const option = document.createElement('option'); option.value = region; option.textContent = region; regionSelect.appendChild(option);
        });
        regionSelect.addEventListener('change', () => {
          const districtSelect = document.getElementById('district-select');
          districtSelect.innerHTML = `<option value="" disabled selected>${t('select_district')}</option>`; districtSelect.disabled = false;
          const selected = regionSelect.value;
          if (selected && regions[selected]) {
            regions[selected].sort().forEach(district => {
              const option = document.createElement('option'); option.value = district; option.textContent = district; districtSelect.appendChild(option);
            });
          }
        });
    }

    const classSelect = document.getElementById('class-select');
    if (classSelect) {
        classSelect.innerHTML = `<option value="" disabled selected>${t('select_class')}</option>`;
        for (let i = 8; i <= 11; i++) {
          const option = document.createElement('option'); option.value = i; option.textContent = i + ' ' + t('class_s'); classSelect.appendChild(option);
        }
    }

    // === ПРОФИЛЬ И ЯЗЫК (v72.2 Logic) ===
    async function checkProfileAndTour() {
      const { data: userData } = await supabaseClient.from('users').select('*').eq('telegram_id', telegramUserId).maybeSingle();
      if (userData) {
          internalDbId = userData.id; currentUserData = userData; 
          if (telegramData.firstName) {
              let tgName = (telegramData.firstName + (telegramData.lastName ? ' ' + telegramData.lastName : '')).trim();
              if (!userData.name || userData.name !== tgName) {
                  await supabaseClient.from('users').update({ name: tgName }).eq('id', userData.id); currentUserData.name = tgName; 
              }
          }
          document.getElementById('cab-name').textContent = currentUserData.name;
          document.getElementById('cab-id').textContent = String(telegramUserId).slice(-6); 
          if(currentUserData.avatar_url) document.getElementById('cab-avatar-img').src = currentUserData.avatar_url;

          if (userData.fixed_language) {
              isLangLocked = true; currentLang = userData.fixed_language; setLanguage(userData.fixed_language); localStorage.setItem('user_lang', userData.fixed_language);
          } 
          const isOldUserReady = (userData.class && userData.region && userData.district && userData.school);
          if (userData.fixed_language || isOldUserReady) {
              isLangLocked = true;
              if(document.getElementById('lang-switcher-cab')) document.getElementById('lang-switcher-cab').disabled = true;
              if(document.getElementById('lang-lock-msg')) document.getElementById('lang-lock-msg').classList.remove('hidden');
              if(document.getElementById('reg-lang-select')) document.getElementById('reg-lang-select').disabled = true;
          }
          if (isOldUserReady) isProfileLocked = true;
      } else {
          let fullName = (telegramData.firstName ? (telegramData.firstName + (telegramData.lastName ? ' ' + telegramData.lastName : '')).trim() : 'Foydalanuvchi');
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
              if (progress) {
                  tourCompleted = true; updateMainButton('completed');
                  document.getElementById('subjects-title').textContent = t('curr_tour'); 
              } else {
                  tourCompleted = false; updateMainButton('start', tourData.title);
                  document.getElementById('subjects-title').textContent = t('subjects_title');
              }
          }
      }
      const isProfileComplete = currentUserData && currentUserData.class && currentUserData.region && currentUserData.district && currentUserData.school;
      if (!currentUserData || !isProfileComplete) {
        showScreen('reg-screen'); unlockProfileForm();
      } else {
        fillProfileForm(currentUserData); showScreen('home-screen');
      }
    }

    function fillProfileForm(data) {
        document.getElementById('class-select').value = data.class;
        document.getElementById('region-select').value = data.region;
        const districtSelect = document.getElementById('district-select');
        districtSelect.innerHTML = `<option value="" disabled selected>${t('select_district')}</option>`;
        if (regions[data.region]) {
          regions[data.region].sort().forEach(district => {
            const option = document.createElement('option'); option.value = district; option.textContent = district; districtSelect.appendChild(option);
          });
        }
        districtSelect.value = data.district;
        document.getElementById('school-input').value = data.school;
        document.getElementById('research-consent').checked = data.research_consent || false;
        const langSelect = document.getElementById('reg-lang-select');
        if(langSelect && data.fixed_language) { langSelect.value = data.fixed_language; langSelect.disabled = true; }
    }

    function lockProfileForm(permanent = false) {
        const saveBtn = document.getElementById('save-profile');
        const lockMsg = document.getElementById('reg-locked-msg');
        saveBtn.classList.add('hidden'); lockMsg.classList.remove('hidden');
        if(permanent) {
            lockMsg.innerHTML = `<i class="fa-solid fa-lock"></i><div style="text-align:left; margin-left:8px;"><div style="font-weight:700;">${t('profile_locked_msg')}</div><div style="font-size:10px; font-weight:400; opacity:0.8;">${t('profile_locked_hint')}</div></div>`;
            lockMsg.style.background = "#E8F5E9"; lockMsg.style.color = "#2E7D32"; lockMsg.style.border = "1px solid #C8E6C9";
        }
        document.querySelectorAll('#reg-screen input, #reg-screen select').forEach(el => el.disabled = true);
    }

    function unlockProfileForm() {
        document.getElementById('save-profile').classList.remove('hidden');
        document.getElementById('reg-locked-msg').classList.add('hidden');
        document.querySelectorAll('#reg-screen input, #reg-screen select').forEach(el => el.disabled = false);
    }

    // === АНТИ-ЧИТ ===
    document.addEventListener("visibilitychange", () => {
        const quizScreen = document.getElementById('quiz-screen');
        if (document.hidden && !quizScreen.classList.contains('hidden') && !tourCompleted) {
            cheatWarningCount++;
            if (cheatWarningCount === 1) document.getElementById('cheat-warning-modal').classList.remove('hidden');
            else if (cheatWarningCount >= 2) { finishTour(); alert(t('cheat_msg')); }
        }
    });

    // === ЛОГИКА ТЕСТА (БАЛАНСИРОВЩИК БИЛЕТА) ===

    async function startTourLadder() {
        if (!currentTourId) return;

        // 1. Загружаем ВСЕ вопросы этого тура (на выбранном языке)
        const { data: allQ, error } = await supabaseClient
            .from('questions')
            .select('id, subject, question_text, options_text, time_limit_seconds, difficulty, image_url') 
            .eq('tour_id', currentTourId)
            .eq('language', currentLang);

        if (error || !allQ || allQ.length === 0) {
            alert('Error: No questions found for current tour/language.');
            return;
        }

        // 2. Раскладываем по корзинам (7 предметов)
        const buckets = { math: [], biology: [], chemistry: [], physics: [], economics: [], it: [], english: [] };
        
        const mapping = {
            math: ['math', 'алгебр', 'геометр', 'матем'],
            biology: ['biol', 'биол'],
            chemistry: ['chem', 'хим'],
            physics: ['phys', 'физ'],
            economics: ['econ', 'эконом'],
            it: ['computer', 'informat', 'it', 'информ'],
            english: ['eng', 'read', 'англ']
        };

        allQ.forEach(q => {
            const s = (q.subject || "").toLowerCase();
            let matched = false;
            for (const [key, keywords] of Object.entries(mapping)) {
                if (keywords.some(k => s.includes(k))) { buckets[key].push(q); matched = true; break; }
            }
            if(!matched) buckets.math.push(q); // Если не распознали предмет, в математику
        });

        // Перемешиваем вопросы внутри каждой корзины
        for(let k in buckets) buckets[k].sort(() => 0.5 - Math.random());

        // 3. Конфигурация 15 слотов (Subject + Preferred Difficulty)
        const slotConfig = [
            { b: 'math', d: 'Hard' },      { b: 'physics', d: 'Hard' },   // 2 Hard
            { b: 'math', d: 'Medium' },    { b: 'biology', d: 'Medium' }, 
            { b: 'chemistry', d: 'Medium' }, { b: 'it', d: 'Medium' }, 
            { b: 'english', d: 'Medium' },                                // 5 Medium
            { b: 'math', d: 'Easy' },      { b: 'biology', d: 'Easy' }, 
            { b: 'chemistry', d: 'Easy' }, { b: 'physics', d: 'Easy' }, 
            { b: 'economics', d: 'Easy' }, { b: 'economics', d: 'Easy' }, 
            { b: 'it', d: 'Easy' },        { b: 'english', d: 'Easy' }    // 8 Easy
        ];

        let selected = [];
        let usedIds = new Set();

        // 4. Наполняем билет по слотам (Скользящая логика)
        slotConfig.forEach(slot => {
            const bucket = buckets[slot.b];
            if (!bucket || bucket.length === 0) return;

            // Сначала ищем идеальную сложность
            let match = bucket.find(q => q.difficulty === slot.d && !usedIds.has(q.id));
            
            // Если такой сложности нет в этом предмете, берем любой другой вопрос из этого же предмета
            if (!match) match = bucket.find(q => !usedIds.has(q.id));
            
            if (match) {
                selected.push(match);
                usedIds.add(match.id);
            }
        });

        // Если вдруг вопросов по какому-то предмету не хватило, добираем из общего списка
        if (selected.length < 15) {
            const remaining = allQ.filter(q => !usedIds.has(q.id)).sort(() => 0.5 - Math.random());
            while (selected.length < 15 && remaining.length > 0) {
                let q = remaining.pop();
                selected.push(q);
                usedIds.add(q.id);
            }
        }

        // 5. Финальная сортировка билета: Лестница (Easy -> Medium -> Hard)
        const diffRank = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        selected.sort((a, b) => diffRank[a.difficulty] - diffRank[b.difficulty]);

        // Установка данных теста
        questions = selected;
        currentQuestionIndex = 0;
        correctCount = 0;
        
        let totalSeconds = 0;
        questions.forEach(q => totalSeconds += (q.time_limit_seconds || 60));

        showScreen('quiz-screen');
        startTimer(totalSeconds);
        showQuestion();
    }

    // === ТАЙМЕР И ЭКРАН ВОПРОСА ===

    function startTimer(seconds) {
        let timeLeft = seconds;
        const timerEl = document.getElementById('timer');
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const mins = Math.floor(timeLeft / 60); const secs = timeLeft % 60;
            timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            if (timeLeft <= 0) { clearInterval(timerInterval); finishTour(); }
            timeLeft--;
        }, 1000);
    }

    function showQuestion() {
        const q = questions[currentQuestionIndex];
        document.getElementById('question-number').textContent = currentQuestionIndex + 1;
        document.getElementById('total-q-count').textContent = questions.length;
        
        let badge = q.difficulty === 'Easy' ? '🟢 Easy' : (q.difficulty === 'Medium' ? '🟡 Medium' : '🔴 Hard');
        document.getElementById('subject-tag').innerHTML = (q.subject || 'Q') + ' <span style="opacity:0.6; margin-left:5px; font-size:10px;">' + badge + '</span>';
        
        const imgCont = document.getElementById('q-img-cont');
        const img = document.getElementById('q-img');
        if (q.image_url) { imgCont.classList.remove('hidden'); img.src = q.image_url; } else { imgCont.classList.add('hidden'); img.src = ''; }

        document.getElementById('question-text').innerHTML = q.question_text;
        document.getElementById('quiz-progress-fill').style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
        const container = document.getElementById('options-container');
        container.innerHTML = '';
        const nextBtn = document.getElementById('next-button');
        nextBtn.disabled = true;
        selectedAnswer = null;

        const optionsText = (q.options_text || '').trim();
        if (optionsText !== '') {
            const options = optionsText.split('\n');
            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            options.forEach((option, index) => {
                const btn = document.createElement('div');
                btn.className = 'option-card';
                btn.innerHTML = `<div class="option-circle">${letters[index]}</div><div class="option-text">${option.trim()}</div>`;
                btn.onclick = () => {
                    document.querySelectorAll('.option-card').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedAnswer = letters[index];
                    nextBtn.disabled = false;
                };
                container.appendChild(btn);
            });
        } else {
            const textarea = document.createElement('textarea');
            textarea.className = 'answer-input'; textarea.placeholder = t('answer_placeholder');
            textarea.addEventListener('input', () => { selectedAnswer = textarea.value.trim(); nextBtn.disabled = selectedAnswer.length === 0; });
            container.appendChild(textarea);
        }
    }

    safeAddListener('next-button', 'click', async () => {
        const nextBtn = document.getElementById('next-button');
        nextBtn.disabled = true;
        const q = questions[currentQuestionIndex];
        const { data: isCorrect } = await supabaseClient.rpc('check_user_answer', { p_question_id: q.id, p_user_answer: selectedAnswer });
        if (isCorrect) correctCount++;
        await supabaseClient.from('user_answers').upsert({ user_id: internalDbId, question_id: q.id, answer: selectedAnswer, is_correct: isCorrect }, { onConflict: 'user_id,question_id' });
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) showQuestion(); else finishTour();
    });

    async function finishTour() {
        clearInterval(timerInterval); tourCompleted = true;
        const start = localStorage.getItem('tour_start_time');
        const timeTaken = start ? Math.floor((Date.now() - Number(start)) / 1000) : 0;
        await supabaseClient.from('tour_progress').upsert({ user_id: internalDbId, tour_id: currentTourId, score: correctCount, total_time_taken: timeTaken }, { onConflict: 'user_id, tour_id' }); 
        
        showScreen('result-screen');
        document.getElementById('res-tour-title').textContent = currentTourTitle;
        document.getElementById('res-total').textContent = questions.length;
        document.getElementById('res-correct').textContent = correctCount;
        const percent = Math.round((correctCount / questions.length) * 100);
        document.getElementById('result-percent').textContent = `${percent}%`;
        const circle = document.getElementById('result-circle');
        if (circle) circle.style.background = `conic-gradient(var(--primary) 0% ${percent}%, #E5E5EA ${percent}% 100%)`;
        updateMainButton('completed');
        fetchStatsData(); 
    }

    // === СИСТЕМНЫЕ ФУНКЦИИ (STATS & UI) ===

    async function fetchStatsData() {
        if (!internalDbId || !currentTourId) return;
        const { data: qData } = await supabaseClient.from('questions').select('id, subject').eq('tour_id', currentTourId).eq('language', currentLang); 
        if (qData) tourQuestionsCache = qData;
        const { data: aData } = await supabaseClient.from('user_answers').select('question_id, is_correct').eq('user_id', internalDbId);
        if (aData) userAnswersCache = aData;
        updateDashboardStats();
    }

    function updateDashboardStats() {
        const prefixes = ['math', 'eng', 'phys', 'chem', 'bio', 'it', 'eco'];
        let totalCorrect = 0;
        prefixes.forEach(prefix => {
            const stats = calculateSubjectStats(prefix);
            const baseCount = (prefix === 'math') ? 3 : 2; // Математика база 3 вопроса, остальные 2
            let percent = Math.min(100, Math.round((stats.correct / baseCount) * 100));
            const bar = document.getElementById(`${prefix}-bar`);
            const text = document.getElementById(`${prefix}-percent`);
            if (bar) bar.style.width = `${percent}%`;
            if (text) text.textContent = `${percent}%`;
            totalCorrect += stats.correct;
        });
        document.getElementById('cab-score').textContent = totalCorrect;
        if(tourCompleted) document.getElementById('cab-tours').textContent = "1";
    }

    function calculateSubjectStats(prefix) {
        const mapping = {
            math: ['math', 'алгебр', 'геометр', 'матем'], eng: ['eng', 'read', 'англ'],
            phys: ['phys', 'физ'], chem: ['chem', 'хим'], bio: ['biol', 'биол'],
            it: ['computer', 'informat', 'it', 'информ'], eco: ['econ', 'эконом']
        };
        const keywords = mapping[prefix] || [];
        const subjectQuestions = tourQuestionsCache.filter(q => keywords.some(k => (q.subject || "").toLowerCase().includes(k)));
        let correct = 0;
        subjectQuestions.forEach(q => {
            const answer = userAnswersCache.find(a => a.question_id === q.id);
            if (answer && answer.is_correct) correct++;
        });
        return { correct };
    }

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden'); window.scrollTo(0, 0);
    }

    function safeAddListener(id, event, handler) { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); }

    function updateMainButton(state, title = "") {
        if(!title) title = t('start_tour_btn');
        const btn = document.getElementById('main-action-btn');
        if (!btn) return;
        if (state === 'inactive') {
            btn.innerHTML = `<i class="fa-solid fa-calendar-xmark"></i> ${t('no_active_tour')}`;
            btn.disabled = true; btn.style.background = "#8E8E93";
        } else if (state === 'completed') {
            btn.innerHTML = `<i class="fa-solid fa-check"></i> ${t('tour_completed_btn')}`;
            btn.className = 'btn-success-clickable'; btn.disabled = false;
        } else {
            btn.innerHTML = `<i class="fa-solid fa-play"></i> ${title}`;
            btn.disabled = false; btn.style.background = "";
            btn.onclick = handleStartClick;
        }
    }

    async function handleStartClick() {
        document.getElementById('warn-q-val').textContent = '15 ' + t('questions');
        document.getElementById('warn-time-val').textContent = '~15 ' + t('minutes');
        document.getElementById('warning-modal').classList.remove('hidden');
    }

    // Инициализация кнопок
    safeAddListener('confirm-start', 'click', () => { document.getElementById('warning-modal').classList.add('hidden'); localStorage.setItem('tour_start_time', Date.now()); startTourLadder(); });
    safeAddListener('cancel-start', 'click', () => document.getElementById('warning-modal').classList.add('hidden'));
    safeAddListener('open-cabinet-btn', 'click', () => { showScreen('cabinet-screen'); loadLeaderboard(); });
    safeAddListener('close-cabinet', 'click', () => showScreen('home-screen'));
    safeAddListener('leaderboard-btn', 'click', () => { showScreen('leaderboard-screen'); setLeaderboardFilter('republic'); });
    safeAddListener('lb-back', 'click', () => showScreen('home-screen'));

    async function loadLeaderboard() {
        const listEl = document.getElementById('lb-list');
        if(listEl) listEl.innerHTML = `<p style="text-align:center; padding:20px;">${t('loading')}</p>`;
        const { data } = await supabaseClient.from('tour_progress').select('user_id, score').order('score', { ascending: false }).limit(20);
        if (data && listEl) {
            listEl.innerHTML = '';
            data.forEach((p, i) => {
                const item = document.createElement('div'); item.className = 'leader-card';
                item.innerHTML = `<div class="l-rank">${i+1}</div><div class="l-info"><span class="l-name">User ${String(p.user_id).slice(-5)}</span></div><div class="l-score">${p.score}</div>`;
                listEl.appendChild(item);
            });
        }
    }

    checkProfileAndTour();
});
