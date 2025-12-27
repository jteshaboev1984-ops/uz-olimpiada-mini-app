document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v43.0 (Leaderboard Pro)');
  
    // === ПЕРЕМЕННЫЕ ===
    let telegramUserId; 
    let telegramPhotoUrl = null; // Фото профиля
    let internalDbId = null; 
    let currentTourId = null;
    let currentUserData = null; // Данные пользователя (регион, класс)
    
    // Кэши
    let userAnswersCache = []; 
    let tourQuestionsCache = [];
    
    // Лидерборд фильтр
    let currentLbFilter = 'republic'; 

    // === НАСТРОЙКИ SUPABASE ===
    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  
    // === ИНИЦИАЛИЗАЦИЯ TELEGRAM ===
    if (window.Telegram && window.Telegram.WebApp) {
      Telegram.WebApp.ready();
      Telegram.WebApp.expand();
      const user = Telegram.WebApp.initDataUnsafe.user;
      if (user && user.id) {
        document.getElementById('profile-user-name').textContent = user.first_name + ' ' + (user.last_name || '');
        document.getElementById('home-user-name').textContent = user.first_name || 'Участник';
        telegramUserId = Number(user.id);
        // Сохраняем фото
        if (user.photo_url) telegramPhotoUrl = user.photo_url;
      }
    }
  
    // ТЕСТОВЫЙ РЕЖИМ (ЕСЛИ НЕ В ТГ)
    if (!telegramUserId) {
      let storedId = localStorage.getItem('test_user_id');
      if (!storedId) {
        storedId = Math.floor(Math.random() * 1000000000);
        localStorage.setItem('test_user_id', storedId);
      }
      telegramUserId = Number(storedId);
      document.getElementById('profile-user-name').textContent = 'Тестовый Участник';
    }
  
    // === ПЕРЕМЕННЫЕ ТЕСТА ===
    let questions = [];
    let currentQuestionIndex = 0;
    let correctCount = 0;
    let selectedAnswer = null;
    let timerInterval = null;
    let tourCompleted = false;
  
    // === ДАННЫЕ РЕГИОНОВ ===
    const regions = {
        "Город Ташкент": ["Алмазарский", "Бектемирский", "Мирабадский", "Мирзо-Улугбекский", "Сергелийский", "Учтепинский", "Чиланзарский", "Шайхантахурский", "Юнусабадский", "Яккасарайский", "Яшнабадский", "Янгихаётский"],
        "Андижанская область": ["город Андижан", "Андижанский район", "Асакинский", "Балыкчинский", "Бозский", "Булакбашинский", "Джалакудукский", "Избасканский", "Кургантепинский", "Мархаматский", "Пахтаабадский", "Улугнарский", "Ходжаабадский", "Шахриханский"],
        "Бухарская область": ["город Бухара", "Алатский", "Бухарский", "Вабкентский", "Гиждуванский", "Жондорский", "Каганский", "Каракульский", "Караулбазарский", "Пешкунский", "Ромитанский", "Шафирканский"],
        "Джизакская область": ["город Джизак", "Арнасайский", "Бахмальский", "Галляаральский", "Джизакский", "Дустликский", "Зааминский", "Зарбдарский", "Зафарбадский", "Мирзачульский", "Пахтакорский", "Фаришский", "Янгиабадский"],
        "Кашкадарьинская область": ["город Карши", "Гузарский", "Дехканабадский", "Камашинский", "Каршинский", "Касанский", "Китабский", "Миришкорский", "Мубарекский", "Нишанский", "Чиракчинский", "Шахрисабзский", "Яккабагский"],
        "Навоийская область": ["город Навои", "Канимехский", "Карманинский", "Кызылтепинский", "Навбахорский", "Нуратинский", "Тамдынский", "Учкудукский", "Хатырчинский"],
        "Наманганская область": ["город Наманган", "Касансайский", "Мингбулакский", "Наманганский", "Нарынский", "Папский", "Туракурганский", "Уйчинский", "Учкурганский", "Чартакский", "Чустский", "Янгикурганский"],
        "Самаркандская область": ["город Самарканд", "Акдарьинский", "Булунгурский", "Джамбайский", "Иштыханский", "Каттакурганский", "Кошрабадский", "Нарпайский", "Нурабадский", "Пастдаргомский", "Пахтачийский", "Пайарыкский", "Самаркандский", "Тайлакский", "Ургутский"],
        "Сурхандарьинская область": ["город Термез", "Алтынсайский", "Ангорский", "Байсунский", "Денауский", "Джаркурганский", "Кумкурганский", "Кизирикский", "Музрабатский", "Сариасийский", "Термезский", "Узунский", "Шерабадский", "Шурчинский"],
        "Сырдарьинская область": ["город Гулистан", "Акалтынский", "Баяутский", "Гулистанский", "Мирзаабадский", "Сайхунабадский", "Сардобинский", "Сырдарьинский", "Хавастский"],
        "Ташкентская область": ["Аккурганский", "Ахангаранский", "Бекабадский", "Бостанлыкский", "Букинский", "Зангиатинский", "Кибрайский", "Куйичирчикский", "Паркентский", "Пскентский", "Ташкентский", "Уртачирчикский", "Чинозский", "Юкоричирчикский", "Янгиюльский"],
        "Ферганская область": ["город Фергана", "Алтыарыкский", "Багдадский", "Бешарыкский", "Бувайдинский", "Дангаринский", "Кувинский", "Риштанский", "Сохский", "Ташлакский", "Узбекистанский", "Учкуприкский", "Ферганский", "Фуркатский", "Язъяванский"],
        "Хорезмская область": ["город Ургенч", "Багатский", "Гурленский", "Кошкупырский", "Ургенчский", "Хазараспский", "Ханкинский", "Хивинский", "Шаватский", "Янгиарыкский", "Янгибазарский"],
        "Республика Каракалпакстан": ["город Нукус", "Амударьинский", "Берунийский", "Канлыкульский", "Караузякский", "Кегейлийский", "Кунградский", "Муйнакский", "Нукусский", "Тахтакупырский", "Терткульский", "Ходжейлийский", "Чимбайский", "Шуманайский", "Элликкалинский"]
    };
  
    // Настройка селектов
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.innerHTML = '<option value="" disabled selected>Выберите регион</option>';
        Object.keys(regions).sort().forEach(region => {
          const option = document.createElement('option');
          option.value = region;
          option.textContent = region;
          regionSelect.appendChild(option);
        });
        
        regionSelect.addEventListener('change', () => {
          const districtSelect = document.getElementById('district-select');
          districtSelect.innerHTML = '<option value="" disabled selected>Выберите район</option>';
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
        classSelect.innerHTML = '<option value="" disabled selected>Выберите класс</option>';
        for (let i = 8; i <= 11; i++) {
          const option = document.createElement('option');
          option.value = i;
          option.textContent = i + ' класс';
          classSelect.appendChild(option);
        }
    }
  
    // === ГЛАВНАЯ ЛОГИКА ЗАГРУЗКИ ===
    async function checkProfileAndTour() {
      const { data: userData } = await supabaseClient
        .from('users')
        .select('*')
        .eq('telegram_id', telegramUserId)
        .maybeSingle();
  
      if (userData) {
          internalDbId = userData.id;
          currentUserData = userData; // Сохраняем данные для фильтрации лидерборда
      }
  
      const now = new Date().toISOString();
      const { data: tourData } = await supabaseClient
        .from('tours')
        .select('*')
        .lte('start_date', now)
        .gte('end_date', now)
        .eq('is_active', true)
        .maybeSingle();

      if (!tourData) {
          updateMainButton('inactive');
      } else {
          currentTourId = tourData.id;
          await fetchStatsData();

          if (internalDbId) {
              const { data: progress } = await supabaseClient
                  .from('tour_progress')
                  .select('*')
                  .eq('user_id', internalDbId)
                  .eq('tour_id', currentTourId)
                  .maybeSingle();
              
              if (progress) {
                  tourCompleted = true;
                  updateMainButton('completed');
                  document.getElementById('subjects-title').textContent = "Ваши результаты";
              } else {
                  tourCompleted = false;
                  updateMainButton('start', tourData.title);
                  document.getElementById('subjects-title').textContent = "Предметы";
              }
          }
      }

      const isProfileComplete = userData && userData.class && userData.region && userData.district && userData.school;
  
      if (!userData || !isProfileComplete) {
        showScreen('profile-screen');
        unlockProfileForm();
      } else {
        fillProfileForm(userData);
        showScreen('home-screen');
      }
    }

    // === СТАТИСТИКА ===
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
            title.textContent = subject;
            const stats = calculateSubjectStats(subject);
            const html = `
                <div class="stat-list-item">
                    <div class="stat-list-info"><h4>Текущий тур</h4><p>Всего вопросов: ${stats.total}</p></div>
                    <div class="stat-list-value" style="color:${stats.correct > 0 ? 'var(--success)' : 'var(--text-sec)'}">
                        ${stats.correct} верно
                    </div>
                </div>
            `;
            content.innerHTML = stats.total === 0 ? `<p style="color:#8E8E93;text-align:center;padding:20px;">Нет данных</p>` : html;
            modal.classList.remove('hidden');
        }
    }

    // === ЛИДЕРБОРД (НОВАЯ ЛОГИКА) ===
    window.setLeaderboardFilter = function(filter) {
        currentLbFilter = filter;
        document.querySelectorAll('.lb-segment').forEach(el => el.classList.remove('active'));
        document.getElementById(`filter-${filter}`).classList.add('active');
        loadLeaderboard();
    }

    async function loadLeaderboard() {
        const podium = document.getElementById('lb-podium');
        const list = document.getElementById('lb-list');
        const stickyBar = document.getElementById('lb-user-sticky');
        
        if(podium) podium.innerHTML = '<p style="text-align:center;width:100%;color:#999;margin-top:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Загрузка...</p>';
        if(list) list.innerHTML = '';

        if (!currentUserData && internalDbId) {
             const { data } = await supabaseClient.from('users').select('*').eq('id', internalDbId).single();
             currentUserData = data;
        }

        let progressData = [];

        try {
            if (currentLbFilter === 'republic') {
                // Топ 50 по стране
                let query = supabaseClient.from('tour_progress')
                    .select('user_id, score')
                    .order('score', { ascending: false })
                    .limit(50);
                if (currentTourId) query = query.eq('tour_id', currentTourId);
                const { data, error } = await query;
                if(error) throw error;
                progressData = data;
            } else {
                // Регион/Район: умная фильтрация
                if (!currentUserData) {
                    podium.innerHTML = '<p style="text-align:center;width:100%;color:#999;">Заполните профиль</p>';
                    return;
                }
                
                let userQuery = supabaseClient.from('users').select('id');
                if (currentLbFilter === 'region') userQuery = userQuery.eq('region', currentUserData.region);
                else if (currentLbFilter === 'district') userQuery = userQuery.eq('district', currentUserData.district);

                // Берем топ 300 и фильтруем на клиенте (компромисс для скорости)
                let pQuery = supabaseClient.from('tour_progress')
                    .select('user_id, score')
                    .order('score', { ascending: false })
                    .limit(300);
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
                 podium.innerHTML = '<p style="text-align:center;width:100%;color:#999;margin-top:20px;">Нет результатов</p>';
                 return;
            }

            const userIdsToFetch = [...new Set(progressData.map(p => p.user_id))];
            const { data: usersData } = await supabaseClient
                .from('users')
                .select('id, first_name, last_name, class, avatar_url')
                .in('id', userIdsToFetch);
                
            let fullList = progressData.map(p => {
                const u = usersData.find(user => user.id === p.user_id);
                if (!u) return null;
                return {
                    id: u.id,
                    name: (u.first_name || 'Аноним') + ' ' + (u.last_name ? u.last_name[0] + '.' : ''),
                    classVal: u.class,
                    avatarUrl: u.avatar_url,
                    score: p.score,
                    isMe: u.id === internalDbId
                };
            }).filter(item => item !== null);

            fullList.sort((a, b) => b.score - a.score); // Финальная сортировка

            renderLeaderboardUI(fullList, podium, list);
            updateMyStickyBar(fullList, stickyBar);

        } catch (e) {
            console.error(e);
            podium.innerHTML = '<p style="text-align:center;color:red;">Ошибка</p>';
        }
    }

    function renderLeaderboardUI(list, podiumEl, listEl) {
        podiumEl.innerHTML = '';
        listEl.innerHTML = '';
        const top3 = [list[1], list[0], list[2]]; 
        const ranks = ['second', 'first', 'third'];
        const rkClasses = ['rk-2', 'rk-1', 'rk-3'];
        const realRanks = [2, 1, 3];

        // Подиум
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
                        <div class="winner-class">${player.classVal} класс</div>
                        <div class="winner-score">${player.score}</div>
                    </div>
                `;
                podiumEl.insertAdjacentHTML('beforeend', html);
            } else {
                 podiumEl.insertAdjacentHTML('beforeend', `<div class="winner ${ranks[i]}" style="opacity:0"></div>`);
            }
        });

        // Список
        list.slice(3).forEach((player, index) => {
            const realRank = index + 4;
            const avatarHtml = player.avatarUrl 
                ? `<img src="${player.avatarUrl}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : '';
            const fallbackAvatar = `<div class="no-img">${player.name[0]}</div>`;

            let html = `
                <div class="leader-card" style="${player.isMe ? 'background:#F0F8FF; border:1px solid var(--primary);' : ''}">
                    <div class="l-rank">${realRank}</div>
                    <div class="l-avatar">
                        ${avatarHtml}
                        ${player.avatarUrl ? fallbackAvatar.replace('class="no-img"', 'class="no-img" style="display:none"') : fallbackAvatar}
                    </div>
                    <div class="l-info">
                        <span class="l-name">${player.name}</span>
                        <span class="l-sub">${player.classVal} класс</span>
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
            document.getElementById('my-rank-val').textContent = myRank === "50+" ? ">50" : `#${myRank}`;
            if(currentUserData) document.getElementById('my-class-val').textContent = `${currentUserData.class} класс`;
            document.getElementById('my-score-val').textContent = me.score;
            stickyEl.classList.remove('hidden');
        } else {
            stickyEl.classList.add('hidden');
        }
    }

    // === СОХРАНЕНИЕ ПРОФИЛЯ ===
    function fillProfileForm(data) {
        document.getElementById('class-select').value = data.class;
        document.getElementById('region-select').value = data.region;
        const districtSelect = document.getElementById('district-select');
        districtSelect.innerHTML = '<option value="" disabled selected>Выберите район</option>';
        if (regions[data.region]) {
          regions[data.region].forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
          });
        }
        districtSelect.value = data.district;
        document.getElementById('school-input').value = data.school;
        document.getElementById('research-consent').checked = data.research_consent || false;
    }

    function lockProfileForm() {
        document.getElementById('save-profile').classList.add('hidden');
        document.getElementById('profile-back-btn').classList.remove('hidden');
        document.getElementById('profile-locked-btn').classList.remove('hidden');
        const inputs = document.querySelectorAll('#profile-screen input, #profile-screen select');
        inputs.forEach(el => el.disabled = true);
    }

    function unlockProfileForm() {
        document.getElementById('save-profile').classList.remove('hidden');
        document.getElementById('profile-back-btn').classList.add('hidden');
        document.getElementById('profile-locked-btn').classList.add('hidden');
        const inputs = document.querySelectorAll('#profile-screen input, #profile-screen select');
        inputs.forEach(el => el.disabled = false);
    }
  
    document.getElementById('save-profile').addEventListener('click', async () => {
      const classVal = document.getElementById('class-select').value;
      const region = document.getElementById('region-select').value;
      const district = document.getElementById('district-select').value;
      const school = document.getElementById('school-input').value.trim();
      const consent = document.getElementById('research-consent').checked;

      if (!classVal || !region || !district || !school) { alert('Заполните все поля!'); return; }
      const btn = document.getElementById('save-profile');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Сохранение...';
      
      try {
          const updateData = { 
              telegram_id: telegramUserId, 
              class: classVal, region: region, district: district, 
              school: school, research_consent: consent 
          };
          if (telegramPhotoUrl) updateData.avatar_url = telegramPhotoUrl;

          const { data, error } = await supabaseClient.from('users').upsert(updateData, { onConflict: 'telegram_id' }).select(); 
          if (error) throw error;
          if (data && data.length > 0) {
              internalDbId = data[0].id;
              currentUserData = data[0];
          }
          lockProfileForm();
          showScreen('home-screen');
          checkProfileAndTour();
      } catch (e) {
          alert('Ошибка: ' + e.message);
          btn.disabled = false;
          btn.innerHTML = originalText;
      } 
    });
  
    // === ВАЛИДАЦИЯ ФОРМЫ ===
    const requiredFields = document.querySelectorAll('#class-select, #region-select, #district-select, #school-input');
    requiredFields.forEach(field => {
      field.addEventListener('input', () => {
        const allFilled = Array.from(requiredFields).every(f => f.value.trim() !== '');
        document.getElementById('save-profile').disabled = !allFilled;
      });
    });

    // === ТУР И ТЕСТЫ ===
    async function handleStartClick() {
        const btn = document.getElementById('main-action-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Загрузка...';
        const { data } = await supabaseClient.from('questions').select('time_limit_seconds').eq('tour_id', currentTourId).limit(50);
        let totalSeconds = 0;
        let count = 0;
        if(data) {
            data.forEach(q => totalSeconds += (q.time_limit_seconds || 60));
            count = Math.min(data.length, 15);
        }
        const mins = Math.ceil(totalSeconds / 60);
        document.getElementById('warn-time-val').textContent = `${mins} минут`;
        document.getElementById('warn-q-val').textContent = `${count} вопросов`;
        updateMainButton('start');
        document.getElementById('warning-modal').classList.remove('hidden');
    }

    function updateMainButton(state, title = "Начать тур") {
        const btn = document.getElementById('main-action-btn');
        const certCard = document.getElementById('home-cert-btn'); 
        if (!btn) return;
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        const activeBtn = document.getElementById('main-action-btn');

        if (state === 'inactive') {
            activeBtn.innerHTML = '<i class="fa-solid fa-calendar-xmark"></i> Нет активных туров';
            activeBtn.disabled = true;
            activeBtn.className = 'btn-primary'; 
            activeBtn.style.background = "#8E8E93";
            if (certCard) certCard.classList.add('hidden'); 
        } else if (state === 'completed') {
            activeBtn.innerHTML = '<i class="fa-solid fa-check"></i> Текущий тур пройден';
            activeBtn.className = 'btn-success-clickable';
            activeBtn.disabled = false;
            activeBtn.style.background = ""; 
            if (certCard) certCard.classList.remove('hidden'); 
            activeBtn.addEventListener('click', () => document.getElementById('tour-info-modal').classList.remove('hidden'));
        } else {
            activeBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${title}`;
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
      const { data, error } = await supabaseClient.from('questions').select('*').eq('tour_id', currentTourId).limit(50);
      if (error || !data || data.length === 0) { alert('Ошибка вопросов'); return; }
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
      document.getElementById('subject-tag').textContent = q.subject || 'ВОПРОС';
      document.getElementById('question-text').innerHTML = q.question_text;
      const timeForQ = q.time_limit_seconds || 60;
      document.getElementById('q-time-hint').innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ~${Math.round(timeForQ/60*10)/10} мин`;
      document.getElementById('quiz-progress-fill').style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
      const container = document.getElementById('options-container');
      container.innerHTML = '';
      const nextBtn = document.getElementById('next-button');
      nextBtn.disabled = true;
      nextBtn.innerHTML = 'Далее <i class="fa-solid fa-arrow-right"></i>';
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
        textarea.placeholder = 'Введите ответ...';
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
      nextBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Сохранение...';
      if (!internalDbId) {
          const { data } = await supabaseClient.from('users').select('id').eq('telegram_id', telegramUserId).maybeSingle();
          if(data) internalDbId = data.id;
      }
      const q = questions[currentQuestionIndex];
      let isCorrect = false;
      const correctDB = (q.correct_answer || '').trim();
      if ((q.options_text || '').trim() !== '') isCorrect = selectedAnswer.toLowerCase() === correctDB.toLowerCase();
      else {
        const userAns = selectedAnswer.toLowerCase().replace(',', '.');
        const correctOptions = correctDB.toLowerCase().split(',').map(s => s.trim().replace(',', '.'));
        isCorrect = correctOptions.some(a => a === userAns);
      }
      if (isCorrect) correctCount++;
      try {
          const { error } = await supabaseClient.from('user_answers').upsert({
              user_id: internalDbId, question_id: q.id, answer: selectedAnswer, is_correct: isCorrect
            }, { onConflict: 'user_id,question_id' });
          if (error) throw error;
          currentQuestionIndex++;
          if (currentQuestionIndex < questions.length) showQuestion();
          else finishTour();
      } catch (e) {
          alert('Ошибка: ' + e.message);
          nextBtn.disabled = false;
          nextBtn.innerHTML = 'Повторить';
      }
    });
  
    async function finishTour() {
      clearInterval(timerInterval);
      if (internalDbId && currentTourId) {
          await supabaseClient.from('tour_progress').upsert({ 
                user_id: internalDbId, tour_id: currentTourId, score: correctCount
            }, { onConflict: 'user_id,tour_id' });
      }
      tourCompleted = true;
      const percent = Math.round((correctCount / questions.length) * 100);
      showScreen('result-screen');
      document.getElementById('res-tour-title').textContent = "Тур №1";
      document.getElementById('res-total').textContent = questions.length;
      document.getElementById('res-correct').textContent = correctCount;
      document.getElementById('result-percent').textContent = `${percent}%`;
      const circle = document.getElementById('result-circle');
      if (circle) circle.style.background = `conic-gradient(var(--primary) 0% ${percent}%, #E5E5EA ${percent}% 100%)`;
      updateMainButton('completed');
      document.getElementById('subjects-title').textContent = "Ваши результаты";
      fetchStatsData(); 
    }

    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
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
    
    // === СЛУШАТЕЛИ ===
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
    safeAddListener('download-certificate-res-btn', 'click', () => showCertsModal());
    safeAddListener('cancel-start', 'click', () => document.getElementById('warning-modal').classList.add('hidden'));
    safeAddListener('back-home', 'click', () => showScreen('home-screen'));
    safeAddListener('back-home-x', 'click', () => showScreen('home-screen'));

    function showCertsModal() {
        const container = document.getElementById('certs-list-container');
        container.innerHTML = `
            <div class="cert-card">
                <div class="cert-icon"><i class="fa-solid fa-file-pdf"></i></div>
                <div class="cert-info"><h4>Сертификат: Тур №1</h4><p>${new Date().toLocaleDateString()}</p></div>
                <div class="cert-action"><span class="badge-soon">Скоро</span></div>
            </div>`;
        document.getElementById('certs-modal').classList.remove('hidden');
    }

    checkProfileAndTour();
});
