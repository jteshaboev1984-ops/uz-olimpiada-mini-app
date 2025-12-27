document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v70.0 (Multilang + Latin Regions + PDF Fix)');
  
    // === ПЕРЕМЕННЫЕ ===
    let telegramUserId; 
    let telegramData = { firstName: null, lastName: null, photoUrl: null };
    let internalDbId = null; 
    let currentTourId = null;
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

    // === НАСТРОЙКИ SUPABASE ===
    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // === СИСТЕМА ПЕРЕВОДОВ ===
    let currentLang = localStorage.getItem('app_lang') || 'uz'; // По умолчанию узбекский
    
    const translations = {
        ru: {
            profile_title: "Профиль",
            profile_subtitle: "Данные участника",
            label_fullname: "Фамилия и Имя",
            warn_real_name: "Внимание: Введите реальное имя для Сертификата.",
            label_class: "Класс",
            label_region: "Регион",
            label_district: "Район",
            label_school: "Школа",
            label_consent: "Согласие на обработку",
            label_consent_sub: "Для рейтинга",
            btn_save: "Сохранить",
            status_locked: "Профиль заполнен",
            desc_locked: "Редактирование отключено для корректного рейтинга.",
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
            btn_loading: "Загрузка...",
            btn_start: "Начать тур",
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
            warn_desc_1: "У вас будет",
            warn_desc_2: "на",
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
            about_desc: "Уникальная платформа для школьников Узбекистана, объединяющая стандарты Cambridge IGCSE, SAT и IELTS.",
            subj_math: "Математика", subj_eng: "Английский", subj_phys: "Физика", subj_chem: "Химия", 
            subj_bio: "Биология", subj_it: "Информатика", subj_eco: "Экономика",
            cert_modal_title: "Мои сертификаты",
            ph_name: "Например: Азизов Сардор",
            ph_school: "№ школы"
        },
        uz: {
            profile_title: "Profil",
            profile_subtitle: "Ishtirokchi ma'lumotlari",
            label_fullname: "Familiya va Ism",
            warn_real_name: "Diqqat: Sertifikat uchun haqiqiy ismingizni yozing.",
            label_class: "Sinf",
            label_region: "Viloyat",
            label_district: "Tuman",
            label_school: "Maktab",
            label_consent: "Qayta ishlashga rozilik",
            label_consent_sub: "Reyting uchun",
            btn_save: "Saqlash",
            status_locked: "Profil to'ldirilgan",
            desc_locked: "Reyting uchun tahrirlash o'chirildi.",
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
            btn_loading: "Yuklanmoqda...",
            btn_start: "Turni boshlash",
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
            warn_desc_1: "Sizda",
            warn_desc_2: "vaqt bor:",
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
            about_desc: "O'zbekiston o'quvchilari uchun Cambridge IGCSE, SAT va IELTS standartlarini birlashtirgan noyob platforma.",
            subj_math: "Matematika", subj_eng: "Ingliz tili", subj_phys: "Fizika", subj_chem: "Kimyo", 
            subj_bio: "Biologiya", subj_it: "Informatika", subj_eco: "Iqtisodiyot",
            cert_modal_title: "Mening sertifikatlarim",
            ph_name: "Masalan: Azizov Sardor",
            ph_school: "Maktab №"
        },
        en: {
            profile_title: "Profile",
            profile_subtitle: "Participant Data",
            label_fullname: "Full Name",
            warn_real_name: "Note: Enter real name for Certificate.",
            label_class: "Grade",
            label_region: "Region",
            label_district: "District",
            label_school: "School",
            label_consent: "Data Consent",
            label_consent_sub: "For leaderboard",
            btn_save: "Save",
            status_locked: "Profile Completed",
            desc_locked: "Editing disabled for leaderboard accuracy.",
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
            btn_loading: "Loading...",
            btn_start: "Start Tour",
            btn_completed: "Tour Completed",
            btn_no_tours: "No active tours",
            quiz_next: "Next",
            res_verdict: "Tour Result",
            res_completed: "Tour Completed!",
            res_saved: "Result saved",
            res_correct: "CORRECT",
            title_review: "Review",
            status_saved: "Data saved",
            desc_review: "Detailed review will be available later.",
            back_home: "Home",
            filter_rep: "Republic",
            filter_reg: "Region",
            filter_dist: "District",
            col_student: "STUDENT",
            col_score: "SCORE",
            me_label: "You",
            warn_title: "Warning",
            warn_desc_1: "You will have",
            warn_desc_2: "for",
            warn_cant_repeat: "Retake is not allowed.",
            btn_cancel: "Cancel",
            btn_close: "Close",
            res_video: "Video Lessons",
            res_video_sub: "Problem solving",
            res_channel: "Channel",
            res_channel_sub: "News",
            res_chat: "Chat",
            res_chat_sub: "Discussion",
            about_platform: "About Platform",
            about_desc: "Unique platform for Uzbekistan students integrating Cambridge IGCSE, SAT and IELTS standards.",
            subj_math: "Math", subj_eng: "English", subj_phys: "Physics", subj_chem: "Chemistry", 
            subj_bio: "Biology", subj_it: "IT", subj_eco: "Economics",
            cert_modal_title: "My Certificates",
            ph_name: "Ex: Azizov Sardor",
            ph_school: "School #"
        }
    };

    function t(key) {
        return translations[currentLang][key] || key;
    }

    function applyTranslations() {
        const elements = document.querySelectorAll('[data-lang]');
        elements.forEach(el => {
            const key = el.getAttribute('data-lang');
            if (translations[currentLang][key]) {
                el.textContent = translations[currentLang][key];
            }
        });
        
        const nameInput = document.getElementById('full-name-input');
        if(nameInput) nameInput.placeholder = t('ph_name');
        
        const schoolInput = document.getElementById('school-input');
        if(schoolInput) schoolInput.placeholder = t('ph_school');
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
  
    // === ДАННЫЕ РЕГИОНОВ (UZBEK LATIN - ONLY) ===
    const regions = {
        "Toshkent shahri": ["Olmazor", "Bektemir", "Mirobod", "Mirzo Ulug'bek", "Sergeli", "Uchtepa", "Chilonzor", "Shayxontohur", "Yunusobod", "Yakkasaroy", "Yashnobod", "Yangihayot"],
        "Andijon viloyati": ["Andijon shahri", "Andijon tumani", "Asaka", "Baliqchi", "Bo'z", "Buloqboshi", "Jalaquduq", "Izboskan", "Qo'rg'ontepa", "Marhamat", "Paxtaobod", "Ulug'nor", "Xo'jaobod", "Shahrixon"],
        "Buxoro viloyati": ["Buxoro shahri", "Olot", "Buxoro tumani", "Vobkent", "G'ijduvon", "Jondor", "Kogon", "Qorako'l", "Qorovulbozor", "Peshku", "Romitan", "Shofirkon"],
        "Jizzax viloyati": ["Jizzax shahri", "Arnasoy", "Baxmal", "G'allaorol", "Jizzax tumani", "Do'stlik", "Zomin", "Zarbdor", "Zafarobod", "Mirzacho'l", "Paxtakor", "Forish", "Yangiobod"],
        "Qashqadaryo viloyati": ["Qarshi shahri", "G'uzor", "Dehqonobod", "Qamashi", "Qarshi tumani", "Koson", "Kitob", "Mirishkor", "Muborak", "Nishon", "Chiroqchi", "Shahrisabz", "Yakkabog'"],
        "Navoiy viloyati": ["Navoiy shahri", "Konimex", "Karmana", "Qiziltepa", "Navbahor", "Nurota", "Tomdi", "Uchquduq", "Xatirchi"],
        "Namangan viloyati": ["Namangan shahri", "Kosonsoy", "Mingbuloq", "Namangan tumani", "Norin", "Pop", "To'raqo'rg'on", "Uychi", "Uchqo'rg'on", "Chortoq", "Chust", "Yangiqo'rg'on"],
        "Samarqand viloyati": ["Samarqand shahri", "Oqdaryo", "Bulung'ur", "Jomboy", "Ishtixon", "Kattaqo'rg'on", "Qo'shrabot", "Narpay", "Nurobod", "Pastdarg'om", "Paxtachi", "Payariq", "Samarqand tumani", "Toyloq", "Urgut"],
        "Surxondaryo viloyati": ["Termiz shahri", "Oltinsoy", "Angor", "Boysun", "Denov", "Jarqo'rg'on", "Qumqo'rg'on", "Qiziriq", "Muzrabot", "Sariosiyo", "Termiz tumani", "Uzun", "Sherobod", "Sho'rchi"],
        "Sirdaryo viloyati": ["Guliston shahri", "Oqoltin", "Boyovut", "Guliston tumani", "Mirzaobod", "Sayxunobod", "Sardoba", "Sirdaryo tumani", "Xovos"],
        "Toshkent viloyati": ["Oqqo'rg'on", "Ohangaron", "Bekobod", "Bo'stonliq", "Bo'ka", "Zangiota", "Qibray", "Quyichirchiq", "Parkent", "Piskent", "Toshkent tumani", "O'rtachirchiq", "Chinoz", "Yuqorichirchiq", "Yangiyo'l"],
        "Farg'ona viloyati": ["Farg'ona shahri", "Oltiariq", "Bag'dod", "Beshariq", "Buvayda", "Dang'ara", "Quva", "Rishton", "So'x", "Toshloq", "O'zbekiston", "Uchko'prik", "Farg'ona tumani", "Furqat", "Yozyovon"],
        "Xorazm viloyati": ["Urganch shahri", "Bog'ot", "Gurlan", "Qo'shko'pir", "Urganch tumani", "Hazorasp", "Xonqa", "Xiva", "Shovot", "Yangioriq", "Yangibozor"],
        "Qoraqalpog'iston Respublikasi": ["Nukus shahri", "Amudaryo", "Beruniy", "Qanliko'l", "Qorao'zak", "Kegeyli", "Qo'ng'irot", "Mo'ynoq", "Nukus tumani", "Taxtako'pir", "To'rtko'l", "Xo'jayli", "Chimboy", "Shumanay", "Ellikqal'a"]
    };
  
    // Настройка селектов
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.innerHTML = `<option value="" disabled selected>${t('filter_reg')}</option>`;
        Object.keys(regions).sort().forEach(region => {
          const option = document.createElement('option');
          option.value = region;
          option.textContent = region;
          regionSelect.appendChild(option);
        });
        
        regionSelect.addEventListener('change', () => {
          const districtSelect = document.getElementById('district-select');
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
    }
  
    const classSelect = document.getElementById('class-select');
    if (classSelect) {
        classSelect.innerHTML = `<option value="" disabled selected>${t('label_class')}</option>`;
        for (let i = 8; i <= 11; i++) {
          const option = document.createElement('option');
          option.value = i;
          option.textContent = i + '-sinf';
          classSelect.appendChild(option);
        }
    }
  
    // === ГЛАВНАЯ ЛОГИКА ===
    async function checkProfileAndTour() {
      // 1. Сначала находим пользователя в базе
      const { data: userData } = await supabaseClient.from('users').select('*').eq('telegram_id', telegramUserId).maybeSingle();
      
      if (userData) {
          internalDbId = userData.id;
          currentUserData = userData; 
          if (userData.name) {
             document.getElementById('home-user-name').textContent = userData.name.split(' ')[0];
          }
      } else {
          // Если юзера нет - создаем, берем имя из ТГ как временное
          let fullName = telegramData.firstName ? (telegramData.firstName + (telegramData.lastName ? ' ' + telegramData.lastName : '')).trim() : 'User';
          const { data: newUser } = await supabaseClient.from('users')
              .insert({ telegram_id: telegramUserId, name: fullName, avatar_url: telegramData.photoUrl })
              .select().single();
          if (newUser) {
              internalDbId = newUser.id;
              currentUserData = newUser;
          }
      }

      // 2. Проверяем Туры
      const now = new Date().toISOString();
      const { data: tourData } = await supabaseClient.from('tours').select('*').lte('start_date', now).gte('end_date', now).eq('is_active', true).maybeSingle();

      if (!tourData) {
          updateMainButton('inactive');
      } else {
          currentTourId = tourData.id;
          if (internalDbId && currentTourId) {
              await fetchStatsData(); 
              const { data: progress } = await supabaseClient.from('tour_progress').select('*').eq('user_id', internalDbId).eq('tour_id', currentTourId).maybeSingle();
              if (progress) {
                  tourCompleted = true;
                  updateMainButton('completed');
              } else {
                  tourCompleted = false;
                  updateMainButton('start', tourData.title);
              }
          }
      }
      
      const isProfileComplete = currentUserData && currentUserData.name && currentUserData.name.length > 2 && currentUserData.class && currentUserData.region && currentUserData.district && currentUserData.school;
      
      if (!currentUserData || !isProfileComplete) {
        showScreen('profile-screen');
        unlockProfileForm();
      } else {
        fillProfileForm(currentUserData);
        showScreen('home-screen');
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

    window.openSubjectStats = function(subject) {
        const modal = document.getElementById('subject-details-modal');
        const content = document.getElementById('sd-content');
        const title = document.getElementById('sd-title');
        if (modal && content) {
            // Перевод названия предмета
            let displaySubj = subject;
            if(subject === 'Математика') displaySubj = t('subj_math');
            if(subject === 'Английский') displaySubj = t('subj_eng');
            if(subject === 'Физика') displaySubj = t('subj_phys');
            if(subject === 'Химия') displaySubj = t('subj_chem');
            if(subject === 'Биология') displaySubj = t('subj_bio');
            if(subject === 'Информатика') displaySubj = t('subj_it');
            if(subject === 'Экономика') displaySubj = t('subj_eco');

            title.textContent = displaySubj;
            const stats = calculateSubjectStats(subject);
            const html = `
                <div class="stat-list-item">
                    <div class="stat-list-info"><h4>Tur bo'yicha</h4><p>${t('stat_total')}: ${stats.total}</p></div>
                    <div class="stat-list-value" style="color:${stats.correct > 0 ? 'var(--success)' : 'var(--text-sec)'}">
                        ${stats.correct} ${t('res_correct')}
                    </div>
                </div>`;
            content.innerHTML = stats.total === 0 ? `<p style="color:#8E8E93;text-align:center;padding:20px;">Ma'lumot yo'q</p>` : html;
            modal.classList.remove('hidden');
        }
    }

    // === ЛИДЕРБОРД ===
    window.setLeaderboardFilter = function(filter) {
        currentLbFilter = filter;
        document.querySelectorAll('.lb-segment').forEach(el => el.classList.remove('active'));
        document.getElementById(`filter-${filter}`).classList.add('active');
        loadLeaderboard();
    }

    async function loadLeaderboard() {
        const podium = document.getElementById('lb-podium');
        const listEl = document.getElementById('lb-list');
        const stickyBar = document.getElementById('lb-user-sticky');
        
        if(podium) podium.innerHTML = `<p style="text-align:center;width:100%;color:#999;margin-top:20px;"><i class="fa-solid fa-spinner fa-spin"></i> ${t('btn_loading')}</p>`;
        if(listEl) listEl.innerHTML = '';

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
                if(error) throw error;
                progressData = data;
            } else {
                if (!currentUserData) {
                    podium.innerHTML = '<p style="text-align:center;width:100%;color:#999;">Profilni to\'ldiring</p>';
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
                 podium.innerHTML = '<p style="text-align:center;width:100%;color:#999;margin-top:20px;">Natijalar yo\'q</p>';
                 return;
            }

            const userIdsToFetch = [...new Set(progressData.map(p => p.user_id))];
            let usersData = [];
            const { data, error } = await supabaseClient
                .from('users')
                .select('id, name, class, avatar_url, region, district, school') 
                .in('id', userIdsToFetch);
            if (error) throw error;
            usersData = data;

            let fullList = progressData.map(p => {
                const u = usersData.find(user => user.id === p.user_id);
                if (!u) return null;
                return {
                    id: u.id,
                    name: u.name || 'Anonim', 
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
            podium.innerHTML = '<p style="text-align:center;color:red;">Error</p>';
        }
    }

    function renderLeaderboardUI(list, podiumEl, listEl) {
        podiumEl.innerHTML = '';
        listEl.innerHTML = '';
        const top3 = [list[1], list[0], list[2]]; 
        const ranks = ['second', 'first', 'third'];
        const rkClasses = ['rk-2', 'rk-1', 'rk-3'];
        const realRanks = [2, 1, 3];

        const getSubHtml = (player) => {
            let parts = [];
            if (currentLbFilter === 'republic' && player.region) {
                parts.push(`<span class="meta-row"><i class="fa-solid fa-location-dot"></i> ${player.region}</span>`);
            }
            if ((currentLbFilter === 'republic' || currentLbFilter === 'region') && player.district) {
                parts.push(`<span class="meta-row"><i class="fa-solid fa-map-pin"></i> ${player.district}</span>`);
            }
            if(player.school) {
                parts.push(`<span class="meta-row"><i class="fa-solid fa-school"></i> ${player.school}</span>`);
            }
            parts.push(`<span class="meta-row"><i class="fa-solid fa-user-graduate"></i> ${player.classVal}-sinf</span>`);
            return parts.join(''); 
        };

        top3.forEach((player, i) => {
            if (player) {
                const avatarHtml = player.avatarUrl 
                    ? `<img src="${player.avatarUrl}" class="winner-img" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">`
                    : `<div class="winner-img" style="background:#E1E1E6; display:flex; align-items:center; justify-content:center; font-size:24px; color:#666;">${player.name[0]}</div>`;

                let html = `
                    <div class="winner ${ranks[i]}">
                        <div class="avatar-wrapper">
                            ${avatarHtml}
                            <div class="rank-circle ${rkClasses[i]}">${realRanks[i]}</div>
                        </div>
                        <div class="winner-name">${player.name}</div>
                        <div class="winner-class">
                            ${getSubHtml(player)}
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
            const fallbackAvatar = `<div class="no-img">${player.name[0]}</div>`;

            let cardStyle = player.isMe ? 'background:#F0F8FF; border:1px solid var(--primary);' : '';

            let html = `
                <div class="leader-card" style="${cardStyle}">
                    <div class="l-rank">${realRank}</div>
                    <div class="l-avatar">
                        ${avatarHtml}
                        ${player.avatarUrl ? fallbackAvatar.replace('class="no-img"', 'class="no-img" style="display:none"') : fallbackAvatar}
                    </div>
                    <div class="l-info">
                        <span class="l-name">${player.name}</span>
                        <div class="l-sub">${getSubHtml(player)}</div>
                    </div>
                    <div class="l-score">${player.score}</div>
                </div>
            `;
            listEl.insertAdjacentHTML('beforeend', html);
        });
    }

    async function updateMyStickyBar(currentList, stickyEl) {
        if (!internalDbId) return;
        let me = currentList.find(p => p.isMe);
        let myRank = currentList.findIndex(p => p.isMe) + 1;

        if (!me && currentTourId) {
             const { data } = await supabaseClient.from('tour_progress').select('score').eq('user_id', internalDbId).eq('tour_id', currentTourId).maybeSingle();
             if (data) {
                 me = { score: data.score };
                 myRank = "50+";
             }
        }
        if (me) {
            document.getElementById('my-rank-val').textContent = myRank === "50+" ? ">50" : `#${myRank}`;
            if(currentUserData) document.getElementById('my-class-val').textContent = `${currentUserData.class}-sinf`;
            document.getElementById('my-score-val').textContent = me.score;
            stickyEl.classList.remove('hidden');
        } else {
            stickyEl.classList.add('hidden');
        }
    }

    function fillProfileForm(data) {
        const nameInput = document.getElementById('full-name-input');
        if (nameInput) {
            nameInput.value = data.name || (telegramData.firstName + ' ' + (telegramData.lastName || '')).trim();
        }
        const avatarImg = document.getElementById('profile-avatar-img');
        if (avatarImg && data.avatar_url) {
            avatarImg.src = data.avatar_url;
        }

        document.getElementById('class-select').value = data.class;
        document.getElementById('region-select').value = data.region;
        const districtSelect = document.getElementById('district-select');
        districtSelect.innerHTML = `<option value="" disabled selected>${t('filter_dist')}</option>`;
        if (regions[data.region]) {
          regions[data.region].forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
          });
        }
        districtSelect.value = data.district;
        if(data.region) districtSelect.disabled = false;
        
        document.getElementById('school-input').value = data.school;
        document.getElementById('research-consent').checked = data.research_consent || false;
    }

    document.getElementById('save-profile').addEventListener('click', async () => {
      const fullNameInput = document.getElementById('full-name-input').value.trim();
      const classVal = document.getElementById('class-select').value;
      const region = document.getElementById('region-select').value;
      const district = document.getElementById('district-select').value;
      const school = document.getElementById('school-input').value.trim();
      const consent = document.getElementById('research-consent').checked;

      if (!fullNameInput || !classVal || !region || !district || !school) { 
          alert(t('alert_fill_all')); 
          return; 
      }
      if (fullNameInput.length < 3) {
          alert(t('alert_short_name'));
          return;
      }

      const btn = document.getElementById('save-profile');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('btn_loading')}`;
      try {
          const updateData = { 
              telegram_id: telegramUserId, 
              name: fullNameInput, 
              class: classVal, 
              region: region, 
              district: district, 
              school: school, 
              research_consent: consent 
          };
          if (telegramData.photoUrl) updateData.avatar_url = telegramData.photoUrl;
          
          const { data, error } = await supabaseClient.from('users').upsert(updateData, { onConflict: 'telegram_id' }).select().single(); 
          if(error) throw error;
          
          internalDbId = data.id;
          currentUserData = data;
          
          document.getElementById('home-user-name').textContent = data.name.split(' ')[0];
          
          lockProfileForm();
          showScreen('home-screen');
          checkProfileAndTour();
      } catch (e) {
          alert('Error: ' + e.message);
          btn.disabled = false;
          btn.innerHTML = originalText;
      } 
    });
  
    function lockProfileForm() {
        document.getElementById('save-profile').classList.add('hidden');
        document.getElementById('profile-back-btn').classList.remove('hidden');
        document.getElementById('profile-locked-btn').classList.remove('hidden');
        document.querySelectorAll('#profile-screen input, #profile-screen select').forEach(el => el.disabled = true);
    }
    function unlockProfileForm() {
        document.getElementById('save-profile').classList.remove('hidden');
        document.getElementById('profile-back-btn').classList.add('hidden');
        document.getElementById('profile-locked-btn').classList.add('hidden');
        document.querySelectorAll('#profile-screen input, #profile-screen select').forEach(el => el.disabled = false);
    }
    
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
        document.getElementById('warn-time-val').textContent = `${mins} min`;
        document.getElementById('warn-q-val').textContent = `${count} quest`;
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
            activeBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${t('btn_start')}`;
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
      nextBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('btn_loading')}`;
      
      if (!internalDbId) {
          const { data } = await supabaseClient.from('users').select('id').eq('telegram_id', telegramUserId).maybeSingle();
          if(data) internalDbId = data.id;
      }
      
      const q = questions[currentQuestionIndex];
      const questionIdNumber = Number(q.id);

      const { data: isCorrect, error: rpcError } = await supabaseClient.rpc('check_user_answer', {
          p_question_id: questionIdNumber,
          p_user_answer: selectedAnswer
      });
      
      const finalIsCorrect = (isCorrect === true);
      if (finalIsCorrect) correctCount++;
      
      try {
          const { error } = await supabaseClient.from('user_answers').upsert({
              user_id: internalDbId, question_id: q.id, answer: selectedAnswer, is_correct: finalIsCorrect
            }, { onConflict: 'user_id,question_id' });
          if (error) throw error;
          
          currentQuestionIndex++;
          if (currentQuestionIndex < questions.length) showQuestion();
          else finishTour();
      } catch (e) {
          alert('Error: ' + e.message);
          nextBtn.disabled = false;
          nextBtn.innerHTML = 'Retry';
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
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
        window.scrollTo(0, 0);
    }
    window.openExternalLink = function(url) {
        if(window.Telegram && Telegram.WebApp) Telegram.WebApp.openLink(url);
        else window.open(url, '_blank');
    }
    function safeAddListener(id, event, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    }
    safeAddListener('open-profile-btn', 'click', () => { showScreen('profile-screen'); lockProfileForm(); });
    safeAddListener('profile-back-btn', 'click', () => showScreen('home-screen'));
    safeAddListener('profile-locked-btn', 'click', () => document.getElementById('profile-info-modal').classList.remove('hidden'));
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
    
    // === ГЕНЕРАЦИЯ СЕРТИФИКАТА PDF (ОБНОВЛЕННАЯ ПОД ДИЗАЙН) ===
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
            // Рассчитываем итоговый балл (например, x10 или как задумано)
            // Здесь просто выводим количество правильных ответов
            const scoreText = `${scoreVal}`;

            const nameSize = 30;
            const nameWidth = customFont.widthOfTextAtSize(name, nameSize);
            
            // 1. ИМЯ (По центру)
            firstPage.drawText(name, {
                x: (width - nameWidth) / 2,
                y: 400, // <--- ПОДГОНИТЕ ПОД ШАБЛОН
                size: nameSize,
                font: customFont,
                color: rgb(0, 0, 0),
            });

            // 2. БАЛЛЫ (В круге слева)
            firstPage.drawText(scoreText, {
                x: 135, // <--- ПОДГОНИТЕ (Центр круга)
                y: 240, // <--- ПОДГОНИТЕ (Центр круга)
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

    // === ЛОГИКА СМЕНЫ ЯЗЫКА ===
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
        langSelect.value = currentLang;
        langSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('app_lang', currentLang);
            applyTranslations();
            checkProfileAndTour(); 
        });
    }
    applyTranslations();
    checkProfileAndTour();
    
    const requiredFields = document.querySelectorAll('#full-name-input, #class-select, #region-select, #district-select, #school-input');
    requiredFields.forEach(field => {
      field.addEventListener('input', () => {
        const allFilled = Array.from(requiredFields).every(f => f.value.trim() !== '');
        const nameValid = document.getElementById('full-name-input').value.trim().length >= 3;
        document.getElementById('save-profile').disabled = !(allFilled && nameValid);
      });
    });
});
