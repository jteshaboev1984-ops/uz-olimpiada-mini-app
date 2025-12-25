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
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

  const { createClient } = supabase;
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  let questions = [];
  let currentQuestionIndex = 0;
  let correctCount = 0;
  let selectedAnswer = null;
  let timerInterval = null;
  let tourCompleted = false;
  let questionStartTime = null;

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

  // Классы 8-11
  const classSelect = document.getElementById('class-select');
  classSelect.innerHTML = '<option value="" disabled selected>Выберите класс</option>';
  for (let i = 8; i <= 11; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i + ' класс';
    classSelect.appendChild(option);
  }

  document.getElementById('district-select').innerHTML = '<option value="" disabled selected>Выберите район</option>';
  document.getElementById('school-input').placeholder = "Введите номер школы";

  // Проверка профиля и состояния
  async function checkProfile() {
    const { data, error } = await supabaseClient
      .from('users')
      .select('class, region, district, school, tour_completed')
      .eq('telegram_id', telegramUserId)
      .single();

    if (error || !data || !data.class || !data.region || !data.district || !data.school) {
      // Первый вход — редактирование профиля
      document.getElementById('home-screen').classList.add('hidden');
      document.getElementById('profile-screen').classList.remove('hidden');
      enableProfileEdit();
    } else {
      // Профиль заполнен — показываем только для чтения
      document.getElementById('class-select').value = data.class;
      document.getElementById('region-select').value = data.region;
      document.getElementById('district-select').value = data.district;
      document.getElementById('school-input').value = data.school;

      disableProfileEdit();

      tourCompleted = data.tour_completed || false;
      if (tourCompleted) {
        document.getElementById('start-tour').disabled = true;
        document.getElementById('start-tour').textContent = 'Тур пройден';
      }
    }
  }

  function enableProfileEdit() {
    document.getElementById('class-select').disabled = false;
    document.getElementById('region-select').disabled = false;
    document.getElementById('district-select').disabled = false;
    document.getElementById('school-input').disabled = false;
    document.getElementById('research-consent').disabled = false;
    document.getElementById('save-profile').style.display = 'block';
  }

  function disableProfileEdit() {
    document.getElementById('class-select').disabled = true;
    document.getElementById('region-select').disabled = true;
    document.getElementById('district-select').disabled = true;
    document.getElementById('school-input').disabled = true;
    document.getElementById('research-consent').disabled = true;
    document.getElementById('save-profile').style.display = 'none';
  }

  // Попытка изменения данных после заполнения
  document.getElementById('profile-screen').addEventListener('click', (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
      if (e.target.disabled) {
        alert('Данные вводятся единоразово и не могут быть изменены, так как весь прогресс участника привязан к ним. По вопросам обращайтесь к организаторам.');
      }
    }
  });

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
        research_consent: consent
      }, { onConflict: 'telegram_id' });

    if (error) {
      alert('Ошибка сохранения профиля: ' + error.message);
      console.error(error);
    } else {
      alert('Профиль сохранён. Данные нельзя будет изменить.');
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

  // Кнопка "Назад" из профиля
  document.getElementById('back-from-profile').addEventListener('click', () => {
    if (confirm('Вы уверены? Если профиль не сохранён, вы не сможете участвовать в турах до конца олимпиады.')) {
      document.getElementById('profile-screen').classList.add('hidden');
      document.getElementById('home-screen').classList.remove('hidden');
    }
  });

  // Кнопка "Мой профиль"
  document.getElementById('profile-btn').addEventListener('click', () => {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('profile-screen').classList.remove('hidden');
    checkProfile();
  });

  // Модальное "О проекте"
  document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.remove('hidden');
  });

  document.getElementById('close-about').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });

  document.querySelector('#about-modal .modal-content > div > button').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });

  // Лидерборд
  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    alert('Лидерборд в разработке — скоро будет топ участников!');
  });

  // Начать тур
  document.getElementById('start-tour').addEventListener('click', () => {
    if (tourCompleted) {
      alert('Вы уже прошли тур. Результаты сохранены. Готовьтесь к следующим турам — ваши результаты доступны в профиле.');
      return;
    }
    document.getElementById('warning-modal').classList.remove('hidden');
  });

  document.getElementById('cancel-start').addEventListener('click', () => {
    document.getElementById('warning-modal').classList.add('hidden');
  });

  document.getElementById('confirm-start').addEventListener('click', () => {
    document.getElementById('warning-modal').classList.add('hidden');
    startTour();
  });

  async function startTour() {
    const { data, error } = await supabaseClient
      .from('questions')
      .select('*')
      .orderByRaw('random()')
      .limit(15);

    if (error || !data || data.length === 0) {
      alert('Ошибка загрузки вопросов: ' + (error?.message || 'Нет вопросов'));
      return;
    }

    questions = data;
    currentQuestionIndex = 0;
    correctCount = 0;

    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');

    startTimer(40 * 60);
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
    document.getElementById('question-text').innerHTML = q.question_text;

    const container = document.get
