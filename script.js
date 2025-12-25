document.addEventListener('DOMContentLoaded', function() {
  console.log('Приложение запущено');

  let telegramUserId;
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();

    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.id) {
      document.getElementById('user-name').textContent = user.first_name || 'Участник';
      telegramUserId = Number(user.id);
    }
  }

  if (!telegramUserId) {
    telegramUserId = 999999999;
    document.getElementById('user-name').textContent = 'Тестовый участник';
  }

  const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInRlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

  const { createClient } = supabase;
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  let questions = [];
  let currentQuestionIndex = 0;
  let correctCount = 0;
  let selectedAnswer = null;
  let timerInterval = null;
  let tourCompleted = false;
  let questionStartTime = null;

  // Полный список регионов Узбекистана
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

  // Заполнение регионов
  const regionSelect = document.getElementById('region-select');
  Object.keys(regions).sort().forEach(region => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    regionSelect.appendChild(option);
  });

  // Зависимый район
  regionSelect.addEventListener('change', () => {
    const districtSelect = document.getElementById('district-select');
    districtSelect.innerHTML = '<option value="">Выберите район</option>';
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

  // Классы только 8-11
  const classSelect = document.getElementById('class-select');
  classSelect.innerHTML = `
    <option value="">Выберите класс</option>
    <option value="8">8 класс</option>
    <option value="9">9 класс</option>
    <option value="10">10 класс</option>
    <option value="11">11 класс</option>
  `;

  document.getElementById('school-input').placeholder = "Номер школы";

  // Проверка профиля
  async function checkProfile() {
    const { data, error } = await supabaseClient
      .from('users')
      .select('class, region, district, school, tour_completed')
      .eq('telegram_id', telegramUserId)
      .single();

    if (error || !data || !data.class || !data.region || !data.district || !data.school) {
      document.getElementById('home-screen').classList.add('hidden');
      document.getElementById('profile-screen').classList.remove('hidden');
    } else {
      tourCompleted = data.tour_completed || false;
      if (tourCompleted) {
        document.getElementById('start-tour').disabled = true;
        document.getElementById('start-tour').textContent = 'Тур пройден';
      }
    }
  }

  // Сохранение профиля
  document.getElementById('save-profile').addEventListener('click', async () => {
    const classVal = document.getElementById('class-select').value;
    const region = document.getElementById('region-select').value;
    const district = document.getElementById('district-select').value;
    const school = document.getElementById('school-input').value.trim();
    const consent = document.getElementById('research-consent').checked;

    if (!classVal || !region || !district || !school) {
      alert('Заполните все обязательные поля');
      return;
    }

    const { error } = await supabaseClient
      .from('users')
      .upsert({
        telegram_id: telegramUserId,
        class: classVal,
        region: region,
        district: district,
        school: school,
        research_consent: consent,
        tour_completed: false
      });

    if (error) {
      alert('Ошибка сохранения: ' + error.message);
      console.error(error);
    } else {
      document.getElementById('profile-screen').classList.add('hidden');
      document.getElementById('home-screen').classList.remove('hidden');
      checkProfile();
    }
  });

  // Активация кнопки сохранения
  const requiredFields = document.querySelectorAll('#class-select, #region-select, #district-select, #school-input');
  requiredFields.forEach(field => {
    field.addEventListener('input', () => {
      const allFilled = Array.from(requiredFields).every(f => f.value.trim() !== '');
      document.getElementById('save-profile').disabled = !allFilled;
    });
  });

  // Кнопки главного экрана
  document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.remove('hidden');
  });

  document.getElementById('close-about').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });

  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    alert('Лидерборд в разработке — скоро топ участников!');
  });

  document.getElementById('profile-btn').addEventListener('click', () => {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('profile-screen').classList.remove('hidden');
  });

  // Предупреждение и запуск тура
  document.getElementById('start-tour').addEventListener('click', () => {
    if (tourCompleted) return;
    document.getElementById('warning-modal').classList.remove('hidden');
  });

  document.getElementById('cancel-start').addEventListener('click', () => {
    document.getElementById('warning-modal').classList.add('hidden');
  });

  document.getElementById('confirm-start').addEventListener('click', () => {
    document.getElementById('warning-modal').classList.add('hidden');
    startTour();
  });

  // Запуск тура
  async function startTour() {
    const { data, error } = await supabaseClient
      .from('questions')
      .select('*')
      .orderByRaw('random()') // рандомизация!
      .limit(15);

    if (error || !data || data.length === 0) {
      alert('Ошибка загрузки вопросов: ' + (error?.message || 'Нет данных'));
      return;
    }

    questions = data;
    currentQuestionIndex = 0;
    correctCount = 0;

    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');

    startTimer(40 * 60); // 40 минут
    showQuestion();
  }

  function startTimer(seconds) {
    let timeLeft = seconds;
    const timerEl = document.getElementById('timer');
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
    questionStartTime = Date.now();

    document.getElementById('question-number').textContent = currentQuestionIndex + 1;
    document.getElementById('subject-tag').textContent = q.subject || 'Предмет';
    document.getElementById('question-text').innerHTML = q.question_text || 'Вопрос не загружен';

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    const nextBtn = document.getElementById('next-button');
    nextBtn.disabled = true;

    if (q.options_text && q.options_text.trim() !== '') {
      const options = q.options_text.split('\n');
      options.forEach(option => {
        if (option.trim()) {
          const btn = document.createElement('button');
          btn.className = 'option-button';
          btn.textContent = option.trim();
          btn.onclick = () => {
            document.querySelectorAll('.option-button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAnswer = option.trim().charAt(0).toUpperCase();
            nextBtn.disabled = false;
          };
          container.appendChild(btn);
        }
      });
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Введите ответ';
      input.oninput = (e) => {
        selectedAnswer = e.target.value.trim();
        nextBtn.disabled = !selectedAnswer;
      };
      container.appendChild(input);
      input.focus();
    }
  }

  document.getElementById('next-button').addEventListener('click', async () => {
    const q = questions[currentQuestionIndex];

    // Время на вопрос
    const timeSpent = (Date.now() - questionStartTime) / 1000;

    let isCorrect = false;
    if (q.options_text && q.options_text.trim() !== '') {
      isCorrect = selectedAnswer === q.correct_answer?.trim().toUpperCase();
    } else {
      const userAns = selectedAnswer?.toLowerCase().trim();
      const correctAns = (q.correct_answer || '').toLowerCase().trim().split(',');
      isCorrect = correctAns.some(a => a.trim() === userAns);
    }

    if (isCorrect) correctCount++;

    // Сохранение ответа (upsert)
    const { error } = await supabaseClient
      .from('user_answers')
      .upsert({
        user_id: telegramUserId,
        question_id: q.id,
        answer: selectedAnswer,
        is_correct: isCorrect,
        time_spent: timeSpent
      }, { onConflict: 'user_id,question_id' });

    if (error) console.error('Ошибка сохранения ответа:', error);

    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      finishTour();
    }
  });

  async function finishTour() {
    clearInterval(timerInterval);

    await supabaseClient
      .from('users')
      .update({ tour_completed: true })
      .eq('telegram_id', telegramUserId);

    const percent = Math.round((correctCount / questions.length) * 100);

    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');

    document.getElementById('correct-count').textContent = `${correctCount} из ${questions.length}`;
    document.getElementById('result-percent').textContent = `${percent}%`;
  }

  document.getElementById('back-home').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
  });

  // Кнопка сертификата (заготовка)
  document.getElementById('download-certificate').addEventListener('click', () => {
    alert('Сертификат в разработке — скоро будет скачивание!');
  });

  checkProfile();
});
