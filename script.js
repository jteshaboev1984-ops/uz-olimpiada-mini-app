document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v7.0 (Design Update)');
  
    // Глобальные переменные (Логика v6)
    let telegramUserId; 
    let internalDbId = null; 
    
    // Данные Supabase
    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';
  
    // Инициализация Telegram
    if (window.Telegram && window.Telegram.WebApp) {
      Telegram.WebApp.ready();
      Telegram.WebApp.expand();
      const user = Telegram.WebApp.initDataUnsafe.user;
      if (user && user.id) {
        document.getElementById('profile-user-name').textContent = user.first_name + ' ' + (user.last_name || '');
        document.getElementById('home-user-name').textContent = user.first_name || 'Участник';
        telegramUserId = Number(user.id);
      }
    }
  
    // Тестовый режим
    if (!telegramUserId) {
      let storedId = localStorage.getItem('test_user_id');
      if (!storedId) {
        storedId = Math.floor(Math.random() * 1000000000);
        localStorage.setItem('test_user_id', storedId);
      }
      telegramUserId = Number(storedId);
      document.getElementById('profile-user-name').textContent = 'Тестовый Участник';
      console.warn('Тестовый режим. Telegram ID:', telegramUserId);
    }
  
    // Проверка Supabase
    if (typeof supabase === 'undefined') {
      alert('Критическая ошибка: Supabase не подключен!');
      return;
    }
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  
    // Переменные викторины
    let questions = [];
    let currentQuestionIndex = 0;
    let correctCount = 0;
    let selectedAnswer = null;
    let timerInterval = null;
    let tourCompleted = false;
  
    // --- ДАННЫЕ РЕГИОНОВ ---
    const regions = {
      "Ташкент": ["Алмазарский", "Бектемирский", "Мирабадский", "Мирзо-Улугбекский", "Сергелийский", "Учтепинский", "Чиланзарский", "Шайхантахурский", "Юнусабадский", "Яккасарайский", "Яшнабадский"],
      "Андижанская область": ["Андижанский", "Асакинский", "Балыкчинский", "Бозский", "Булакбашинский", "Джалакудукский", "Избасканский", "Кургантепинский", "Мархаматский", "Пахтаабадский", "Ходжаабадский", "Шахриханский"],
      "Бухарская область": ["Бухарский", "Вабкентский", "Гиждуванский", "Жондорский", "Каганский", "Каракульский", "Караулбазарский", "Пешкунский", "Рометанский", "Шафирканский"],
      "Джизакская область": ["Арнасайский", "Бахмальский", "Галляаральский", "Дустликский", "Зафарабадский", "Зарбдарский", "Мирзачульский", "Пахтакорский", "Фаришский", "Шараф-Рашидовский"],
      "Кашкадарьинская область": ["Чиракчинский", "Дехканабадский", "Гузарский", "Камашинский", "Каршинский", "Касанский", "Китабский", "Кукдалинский", "Миришкорский", "Мубарекский", "Нишанский", "Шахрисабзский", "Яккабагский"],
      "Навоийская область": ["Канимехский", "Кызылтепинский", "Навбахорский", "Навоийский", "Нуратинский", "Тамдынский", "Учкудукский", "Хатырчинский"],
      "Наманганская область": ["Касансайский", "Наманганский", "Папский", "Туракурганский", "Уйчинский", "Учкурганский", "Чартакский", "Чустский", "Янгикурганский"],
      "Самаркандская область": ["Булунгурский", "Иштиханский", "Каттакурганский", "Кошрабадский", "Нарпайский", "Пайарыкский", "Пастдаргомский", "Самаркандский", "Тайлакский", "Ургутский"],
      "Сурхандарьинская область": ["Алтынсайский", "Ангорский", "Байсунский", "Денауский", "Джаркурганский", "Кумкурганский", "Музрабадский", "Сариасийский", "Термезский", "Узунский", "Шерабадский", "Шурчинский"],
      "Сырдарьинская область": ["Акалтынский", "Баяутский", "Гулистанский", "Мирзаабадский", "Сайхунабадский", "Сардобский", "Сырдарьинский", "Хавастский"],
      "Ферганская область": ["Алтыарыкский", "Багдадский", "Бешарыкский", "Дангаринский", "Ферганский", "Фуркатский", "Кувинский", "Кушкупырский", "Риштанский", "Ташлакский", "Учкуприкский", "Узбекистанский", "Язъяванский"],
      "Хорезмская область": ["Багатский", "Гурленский", "Ханкинский", "Хазараспский", "Ургенчский", "Шаватский", "Янгиарыкский", "Янгибазарский"],
      "Каракалпакстан": ["Амударьинский", "Берунийский", "Бозатауский", "Кегейлийский", "Канлыкульский", "Караузякский", "Кунградский", "Муйнакский", "Нукусский", "Тахтакупырский", "Турткульский", "Ходжейлийский", "Чимбайский", "Шуманайский", "Элликкалинский"]
    };
  
    // --- ИНИЦИАЛИЗАЦИЯ СЕЛЕКТОВ ---
    const regionSelect = document.getElementById('region-select');
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
  
    const classSelect = document.getElementById('class-select');
    classSelect.innerHTML = '<option value="" disabled selected>Выберите класс</option>';
    for (let i = 8; i <= 11; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i + ' класс';
      classSelect.appendChild(option);
    }
  
    // --- ЛОГИКА ПРОФИЛЯ ---
    async function checkProfile() {
      console.log("Проверяем профиль...");
      
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('telegram_id', telegramUserId)
        .maybeSingle();
  
      if (error) { console.error("API Error:", error); return; }
  
      if (data) {
          internalDbId = data.id; 
          console.log("Внутренний ID:", internalDbId);
      }
  
      const isProfileComplete = data && data.class && data.region && data.district && data.school;
  
      if (!data || !isProfileComplete) {
        showScreen('profile-screen');
      } else {
        // Заполняем поля (если нужно редактировать)
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
        
        showScreen('home-screen');
  
        tourCompleted = data.tour_completed === true;
        updateStartButtonState();
      }
    }

    function updateStartButtonState() {
        const btn = document.getElementById('start-tour');
        if (tourCompleted) {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Тур пройден';
            btn.disabled = true;
            btn.style.background = "#34C759";
        }
    }
  
    document.getElementById('save-profile').addEventListener('click', async () => {
      const classVal = document.getElementById('class-select').value;
      const region = document.getElementById('region-select').value;
      const district = document.getElementById('district-select').value;
      const school = document.getElementById('school-input').value.trim();
      const consent = document.getElementById('research-consent').checked;
  
      if (!classVal || !region || !district || !school) {
        alert('Пожалуйста, заполните все поля!');
        return;
      }
  
      const btn = document.getElementById('save-profile');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Сохранение...';
  
      const { data, error } = await supabaseClient
        .from('users')
        .upsert({
          telegram_id: telegramUserId,
          class: classVal,
          region: region,
          district: district,
          school: school,
          research_consent: consent
        }, { onConflict: 'telegram_id' })
        .select(); 
  
      if (error) {
        alert('Ошибка: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
      } else {
        if (data && data.length > 0) internalDbId = data[0].id;
        checkProfile();
      }
    });
  
    // Валидация кнопки сохранения
    const requiredFields = document.querySelectorAll('#class-select, #region-select, #district-select, #school-input');
    requiredFields.forEach(field => {
      field.addEventListener('input', () => {
        const allFilled = Array.from(requiredFields).every(f => f.value.trim() !== '');
        document.getElementById('save-profile').disabled = !allFilled;
      });
    });
  
    // --- НАВИГАЦИЯ И УТИЛИТЫ ---
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // Кнопка профиля на главном
    document.getElementById('open-profile-btn').addEventListener('click', () => {
        showScreen('profile-screen');
        // Включаем кнопку сохранения, чтобы можно было поменять данные
        document.getElementById('save-profile').disabled = false;
    });

    document.getElementById('leaderboard-btn').addEventListener('click', () => {
        showScreen('leaderboard-screen');
    });

    document.getElementById('lb-back').addEventListener('click', () => {
        showScreen('home-screen');
    });

    document.getElementById('about-btn').addEventListener('click', () => {
        document.getElementById('about-modal').classList.remove('hidden');
    });
    
    document.getElementById('close-about').addEventListener('click', () => {
        document.getElementById('about-modal').classList.add('hidden');
    });
  
    // --- ЛОГИКА ТУРА ---
  
    document.getElementById('start-tour').addEventListener('click', () => {
      if (tourCompleted) return;
      document.getElementById('warning-modal').classList.remove('hidden');
    });
  
    document.getElementById('cancel-start').addEventListener('click', () => {
      document.getElementById('warning-modal').classList.add('hidden');
    });
  
    document.getElementById('confirm-start').addEventListener('click', async () => {
      document.getElementById('warning-modal').classList.add('hidden');
      await prepareTour();
    });

    async function fetchInternalId() {
        const { data } = await supabaseClient
              .from('users')
              .select('id')
              .eq('telegram_id', telegramUserId)
              .maybeSingle();
        if (data) internalDbId = data.id;
    }
  
    async function prepareTour() {
      const btn = document.getElementById('start-tour');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Загрузка...';
      
      if (!internalDbId) await fetchInternalId();
      
      // Страховка: если юзера нет, создаем
      if (!internalDbId) {
           const { data } = await supabaseClient
              .from('users')
              .upsert({
                  telegram_id: telegramUserId,
                  class: document.getElementById('class-select').value || '9',
                  region: 'Не указан', district: 'Не указан', school: '0'
              }, { onConflict: 'telegram_id' })
              .select();
           if (data && data.length > 0) internalDbId = data[0].id;
      }
      
      startTour();
    }
  
    async function startTour() {
      const { data, error } = await supabaseClient
        .from('questions')
        .select('*')
        .limit(50);
  
      if (error || !data || data.length === 0) {
        alert('Ошибка загрузки вопросов.');
        updateStartButtonState(); // Возвращаем кнопку
        return;
      }
  
      questions = data.sort(() => Math.random() - 0.5).slice(0, 15);
      currentQuestionIndex = 0;
      correctCount = 0;
  
      showScreen('quiz-screen');
      startTimer(40 * 60);
      showQuestion();
    }
  
    function startTimer(seconds) {
      let timeLeft = seconds;
      const timerEl = document.getElementById('timer');
      if (timerInterval) clearInterval(timerInterval);
  
      timerInterval = setInterval(() => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          finishTour();
        }
        timeLeft--;
      }, 1000);
    }
  
    function showQuestion() {
      const q = questions[currentQuestionIndex];
      document.getElementById('question-number').textContent = currentQuestionIndex + 1;
      document.getElementById('subject-tag').textContent = q.subject || 'ВОПРОС';
      document.getElementById('question-text').innerHTML = q.question_text;
      
      // Прогресс бар вопроса (7% за шаг при 15 вопросах)
      const progressPercent = ((currentQuestionIndex + 1) / 15) * 100;
      document.getElementById('quiz-progress-fill').style.width = `${progressPercent}%`;
  
      const container = document.getElementById('options-container');
      container.innerHTML = '';
  
      const nextBtn = document.getElementById('next-button');
      nextBtn.disabled = true;
      nextBtn.innerHTML = 'Далее <i class="fa-solid fa-arrow-right"></i>';
      selectedAnswer = null;
  
      const optionsText = (q.options_text || '').trim();
  
      if (optionsText !== '') {
        const options = optionsText.split('\n');
        // Буквы для вариантов
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

        options.forEach((option, index) => {
          if (option.trim()) {
            const letter = letters[index] || '';
            const btn = document.createElement('div');
            btn.className = 'option-card';
            
            // Красивая структура карточки
            btn.innerHTML = `
                <div class="option-circle">${letter}</div>
                <div class="option-text">${option.trim()}</div>
            `;
            
            btn.onclick = () => {
              document.querySelectorAll('.option-card').forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected');
              
              const optText = option.trim();
              const isLetterOption = optText.match(/^[A-DА-Г][)\.\s]/i);
              selectedAnswer = isLetterOption ? optText.charAt(0).toUpperCase() : optText;
              
              // Если в тексте нет букв, берем букву по индексу
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
        textarea.placeholder = 'Введите ваш ответ здесь...';
        textarea.rows = 2;
        textarea.addEventListener('input', () => {
          selectedAnswer = textarea.value.trim();
          nextBtn.disabled = selectedAnswer.length === 0;
        });
        container.appendChild(textarea);
        setTimeout(() => textarea.focus(), 300);
      }
    }
  
    document.getElementById('next-button').addEventListener('click', async () => {
      const nextBtn = document.getElementById('next-button');
      nextBtn.disabled = true;
      nextBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Сохранение...';
  
      if (!internalDbId) await fetchInternalId();
      
      const q = questions[currentQuestionIndex];
      let isCorrect = false;
      const correctDB = (q.correct_answer || '').trim();
  
      if ((q.options_text || '').trim() !== '') {
        isCorrect = selectedAnswer.toLowerCase() === correctDB.toLowerCase();
      } else {
        const userAns = selectedAnswer.toLowerCase().replace(',', '.');
        const correctOptions = correctDB.toLowerCase().split(',').map(s => s.trim().replace(',', '.'));
        isCorrect = correctOptions.some(a => a === userAns);
      }
  
      if (isCorrect) correctCount++;
  
      const { error } = await supabaseClient
        .from('user_answers')
        .upsert({
          user_id: internalDbId,
          question_id: q.id,
          answer: selectedAnswer,
          is_correct: isCorrect
        }, { onConflict: 'user_id,question_id' });
  
      if (error) {
        console.error('Save error:', error);
        alert('Ошибка сети! Ответ не сохранен.');
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Повторить';
        return;
      }
  
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        showQuestion();
      } else {
        finishTour();
      }
    });
  
    async function finishTour() {
      clearInterval(timerInterval);
      if (internalDbId) {
          await supabaseClient
            .from('users')
            .update({ tour_completed: true })
            .eq('id', internalDbId);
      }
  
      tourCompleted = true;
      const percent = Math.round((correctCount / questions.length) * 100);
  
      showScreen('result-screen');
      
      // Обновляем результаты
      document.getElementById('correct-count').textContent = correctCount;
      document.getElementById('stat-correct').textContent = `${correctCount}/15`;
      document.getElementById('result-percent').textContent = `${percent}%`;
      
      // Анимация круговой диаграммы (CSS conic-gradient)
      // Цвет: Синий до процента, Серый остальное
      const circle = document.getElementById('result-circle');
      circle.style.background = `conic-gradient(var(--primary) 0% ${percent}%, #E5E5EA ${percent}% 100%)`;
    }
  
    document.getElementById('back-home').addEventListener('click', () => {
      showScreen('home-screen');
      checkProfile();
    });
    document.getElementById('back-home-x').addEventListener('click', () => {
        showScreen('home-screen');
        checkProfile();
      });
  
    checkProfile();
  });
