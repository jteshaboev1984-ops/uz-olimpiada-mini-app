document.addEventListener('DOMContentLoaded', function() {
  console.log('Приложение запущено v4.0');

  let telegramUserId;
  if (window.Telegram && window.Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();

    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.id) {
      document.getElementById('user-name').textContent = user.first_name || 'Участник';
      telegramUserId = Number(user.id);
    }
  }

  // Генерация ID для тестов в браузере
  if (!telegramUserId) {
    let storedId = localStorage.getItem('test_user_id');
    if (!storedId) {
      storedId = Math.floor(Math.random() * 1000000000);
      localStorage.setItem('test_user_id', storedId);
    }
    telegramUserId = Number(storedId);
    document.getElementById('user-name').textContent = 'Тестовый участник';
    console.warn('Тестовый режим. ID:', telegramUserId);
  }

  const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co'; //
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI'; //

  if (typeof supabase === 'undefined') {
    alert('Ошибка: Библиотека Supabase не загружена');
    return;
  }

  const { createClient } = supabase;
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  let questions = [];
  let currentQuestionIndex = 0;
  let correctCount = 0;
  let selectedAnswer = null;
  let timerInterval = null;
  let tourCompleted = false;

  // Данные регионов
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

  // Инициализация списков
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
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('telegram_id', telegramUserId)
      .maybeSingle();

    if (error) {
      console.error("Ошибка проверки профиля:", error);
      // Если ошибка связи, не блокируем, но предупреждаем
    }

    // Если пользователя нет в базе ИЛИ профиль неполный
    const isProfileComplete = data && data.class && data.region && data.district && data.school;

    if (!data || !isProfileComplete) {
      // Пользователя нет или профиль пуст - показываем экран профиля
      console.log("Профиль не найден или неполный. Открываем форму.");
      document.getElementById('home-screen').classList.add('hidden');
      document.getElementById('profile-screen').classList.remove('hidden');
      enableProfileEdit();
    } else {
      // Пользователь есть и профиль заполнен - показываем Главную
      console.log("Профиль загружен:", data);
      document.getElementById('class-select').value = data.class;
      document.getElementById('region-select').value = data.region;
      
      // Подгружаем районы для выбранного региона
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
      districtSelect.disabled = true;

      document.getElementById('school-input').value = data.school;
      document.getElementById('research-consent').checked = data.research_consent || false;

      disableProfileEdit();
      
      document.getElementById('profile-screen').classList.add('hidden');
      document.getElementById('home-screen').classList.remove('hidden');

      tourCompleted = data.tour_completed === true;
      if (tourCompleted) {
        const startBtn = document.getElementById('start-tour');
        if (startBtn) {
          startBtn.disabled = true;
          startBtn.textContent = 'Тур пройден';
        }
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

    document.getElementById('save-profile').disabled = true;
    document.getElementById('save-profile').textContent = 'Сохранение...';

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
      alert('Ошибка сохранения: ' + error.message);
      document.getElementById('save-profile').disabled = false;
      document.getElementById('save-profile').textContent = 'Сохранить и продолжить';
      console.error(error);
    } else {
      document.getElementById('profile-screen').classList.add('hidden');
      document.getElementById('home-screen').classList.remove('hidden');
      // Повторная проверка, чтобы убедиться что все ок
      checkProfile(); 
    }
  });

  const requiredFields = document.querySelectorAll('#class-select, #region-select, #district-select, #school-input');
  requiredFields.forEach(field => {
    field.addEventListener('input', () => {
      const allFilled = Array.from(requiredFields).every(f => f.value.trim() !== '');
      document.getElementById('save-profile').disabled = !allFilled;
    });
  });

  // --- КНОПКИ МЕНЮ ---

  document.getElementById('back-from-profile').addEventListener('click', () => {
    document.getElementById('profile-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
  });

  document.getElementById('profile-btn').addEventListener('click', () => {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('profile-screen').classList.remove('hidden');
    // При ручном открытии профиля разрешаем редактирование, если нужно
    // Но лучше просто показать данные. Если хотите разрешить ред., раскомментируйте:
    // enableProfileEdit(); 
  });

  document.getElementById('progress-btn').addEventListener('click', async () => {
    const { data, error } = await supabaseClient
      .from('user_answers')
      .select('is_correct')
      .eq('user_id', telegramUserId);

    if (error) {
      alert('Ошибка загрузки прогресса');
      return;
    }
    const total = data.length;
    const correct = data.filter(a => a.is_correct).length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    alert(`Ваш прогресс:\nПравильных ответов: ${correct} из ${total}\nПроцент: ${percent}%`);
  });

  document.getElementById('exit-btn').addEventListener('click', () => {
    if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.close();
    }
  });

  document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.remove('hidden');
  });
  document.getElementById('close-about').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });
  document.getElementById('close-about-x').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });
  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    alert('Лидерборд в разработке!');
  });
  document.getElementById('download-certificate').addEventListener('click', () => {
    alert('Сертификат в разработке!');
  });

  // --- ЛОГИКА ТУРА ---

  document.getElementById('start-tour').addEventListener('click', () => {
    if (tourCompleted) {
      alert('Вы уже прошли тур.');
      return;
    }
    document.getElementById('warning-modal').classList.remove('hidden');
  });

  document.getElementById('cancel-start').addEventListener('click', () => {
    document.getElementById('warning-modal').classList.add('hidden');
  });

  document.getElementById('confirm-start').addEventListener('click', async () => {
    document.getElementById('warning-modal').classList.add('hidden');
    await ensureUserExistsAndStart();
  });

  // ГЛАВНОЕ ИСПРАВЛЕНИЕ: Гарантируем, что пользователь есть в базе перед стартом
  async function ensureUserExistsAndStart() {
    const startBtn = document.getElementById('start-tour');
    startBtn.disabled = true;
    startBtn.textContent = 'Загрузка...';

    // 1. Проверяем, существует ли юзер реально
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .eq('telegram_id', telegramUserId)
      .maybeSingle();

    if (!data) {
      // Юзера нет! Пытаемся создать "пустышку" или используем данные из формы, если они сохранились в памяти
      console.warn("Пользователь не найден в базе перед стартом. Пытаюсь создать...");
      
      const { error: insertError } = await supabaseClient
        .from('users')
        .upsert({
            telegram_id: telegramUserId,
            // Если профиль пустой, ставим прочерки, чтобы не упала ошибка NOT NULL
            class: document.getElementById('class-select').value || 9, 
            region: document.getElementById('region-select').value || 'Не указан',
            district: document.getElementById('district-select').value || 'Не указан',
            school: document.getElementById('school-input').value || '0',
            research_consent: false
        }, { onConflict: 'telegram_id' });

      if (insertError) {
        alert("Критическая ошибка: Не удалось создать пользователя. Пройдите регистрацию в профиле заново.");
        console.error(insertError);
        document.getElementById('profile-btn').click(); // Отправляем в профиль
        startBtn.disabled = false;
        startBtn.textContent = 'Начать тур';
        return;
      }
    }

    // Если всё ок, запускаем тур
    startTour();
  }

  async function startTour() {
    const { data, error } = await supabaseClient
      .from('questions')
      .select('*')
      .limit(50);

    if (error || !data || data.length === 0) {
      alert('Ошибка загрузки вопросов. Проверьте интернет.');
      console.error(error);
      document.getElementById('start-tour').disabled = false;
      document.getElementById('start-tour').textContent = 'Начать тур';
      return;
    }

    questions = data.sort(() => Math.random() - 0.5).slice(0, 15);
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
    document.getElementById('subject-tag').textContent = q.subject || 'Предмет';
    document.getElementById('question-text').innerHTML = q.question_text;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    const nextBtn = document.getElementById('next-button');
    nextBtn.disabled = true;
    selectedAnswer = null;

    // ВАЖНО: Если options_text пустой или null -> показываем поле ввода
    // Если там есть хоть что-то (даже пробел или текст вопроса) -> показываем кнопки
    const optionsText = (q.options_text || '').trim();

    if (optionsText !== '') {
      // РЕЖИМ КНОПОК
      const options = optionsText.split('\n');
      options.forEach(option => {
        if (option.trim()) {
          const btn = document.createElement('button');
          btn.className = 'option-button';
          btn.textContent = option.trim();
          btn.onclick = () => {
            document.querySelectorAll('.option-button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            const optText = option.trim();
            // Если ответ начинается с буквы (A. Ответ), берем только букву. Иначе весь текст.
            const isLetterOption = optText.match(/^[A-DА-Г][)\.\s]/i);
            selectedAnswer = isLetterOption ? optText.charAt(0).toUpperCase() : optText;
            
            nextBtn.disabled = false;
          };
          container.appendChild(btn);
        }
      });
    } else {
      // РЕЖИМ ВВОДА ТЕКСТА (ЕСЛИ options_text ПУСТОЙ)
      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Введите число или ответ...';
      textarea.rows = 3;
      textarea.className = 'answer-input'; // Класс для стилизации

      textarea.addEventListener('input', () => {
        selectedAnswer = textarea.value.trim();
        nextBtn.disabled = selectedAnswer.length === 0;
      });

      container.appendChild(textarea);
      
      // Фокус с небольшой задержкой для мобильных
      setTimeout(() => { 
          textarea.focus(); 
      }, 300);
    }
  }

  document.getElementById('next-button').addEventListener('click', async () => {
    const nextBtn = document.getElementById('next-button');
    nextBtn.disabled = true;
    nextBtn.textContent = 'Сохранение...';

    const q = questions[currentQuestionIndex];

    let isCorrect = false;
    const correctDB = (q.correct_answer || '').trim();

    // Логика проверки
    if ((q.options_text || '').trim() !== '') {
      // Для кнопок - точное совпадение (или по букве)
      isCorrect = selectedAnswer.toLowerCase() === correctDB.toLowerCase();
    } else {
      // Для текста - ищем вхождение или точное совпадение
      const userAns = selectedAnswer.toLowerCase().replace(',', '.'); // заменяем запятую на точку для чисел
      const correctOptions = correctDB.toLowerCase().split(',').map(s => s.trim().replace(',', '.'));
      isCorrect = correctOptions.some(a => a === userAns);
    }

    if (isCorrect) correctCount++;

    // Сохранение в базу
    const { error } = await supabaseClient
      .from('user_answers')
      .upsert({
        user_id: telegramUserId,
        question_id: q.id,
        answer: selectedAnswer,
        is_correct: isCorrect
      }, { onConflict: 'user_id,question_id' });

    if (error) {
      console.error('Ошибка сохранения ответа:', error);
      // Если ошибка критическая (например, нет юзера), пробуем спасти ситуацию или выводим алерт
      if (error.code === '23503') {
         alert('Ошибка: Ваш профиль не найден. Пожалуйста, перезапустите приложение и заполните профиль.');
         location.reload();
         return;
      }
      alert('Сбой сохранения. Попробуйте еще раз.');
      nextBtn.disabled = false;
      nextBtn.textContent = 'Далее';
      return;
    }

    // Переход к следующему
    currentQuestionIndex++;
    nextBtn.textContent = 'Далее';

    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      finishTour();
    }
  });

  async function finishTour() {
    clearInterval(timerInterval);

    const { error } = await supabaseClient
      .from('users')
      .update({ tour_completed: true })
      .eq('telegram_id', telegramUserId);

    if (error) console.error('Ошибка обновления tour_completed:', error);

    tourCompleted = true;
    const percent = Math.round((correctCount / questions.length) * 100);

    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');

    document.getElementById('correct-count').textContent = `${correctCount} из ${questions.length}`;
    document.getElementById('result-percent').textContent = `${percent}%`;
  }

  document.getElementById('back-home').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
    checkProfile();
  });

  // Запуск проверки при старте
  checkProfile();
});
