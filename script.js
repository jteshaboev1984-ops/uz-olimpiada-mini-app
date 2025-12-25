document.addEventListener('DOMContentLoaded', function() {
  console.log('Приложение запущено');

  // Telegram WebApp
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();

    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user) {
      document.getElementById('user-name').textContent = user.first_name || 'Участник';
      window.telegramUserId = user.id;
    } else {
      window.telegramUserId = 'test_user_' + Math.random().toString(36).substr(2, 9);
    }
  } else {
    window.telegramUserId = 'test_user';
  }

  const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

  const { createClient } = supabase;
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  let questions = [];
  let currentQuestionIndex = 0;
  let correctCount = 0;
  let selectedAnswer = null;
  let tourStartTime = null;
  let timerInterval = null;
  let tourCompleted = false;

  // Регионы и районы Узбекистана (полный список)
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
  Object.keys(regions).forEach(region => {
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

  // Проверка профиля при загрузке
  async function checkProfile() {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('telegram_id', window.telegramUserId)
      .single();

    if (error || !data || !data.class || !data.region) {
      document.getElementById('home-screen').classList.add('hidden');
      document.getElementById('profile-screen').classList.remove('hidden');
    } else {
      // Профиль заполнен — проверяем, пройден ли тур
      if (data.tour_completed) {
        tourCompleted = true;
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

    if (!classVal || !region || !district || !school || !consent) {
      alert('Заполните все поля и дайте согласие');
      return;
    }

    const { error } = await supabaseClient
      .from('users')
      .upsert({
        telegram_id: window.telegramUserId,
        class: classVal,
        region: region,
        district: district,
        school: school,
        research_consent: consent
      });

    if (error) {
      alert('Ошибка сохранения профиля');
      console.error(error);
    } else {
      document.getElementById('profile-screen').classList.add('hidden');
      document.getElementById('home-screen').classList.remove('hidden');
    }
  });

  // Активация кнопки сохранения профиля
  const profileInputs = document.querySelectorAll('#profile-screen input, #profile-screen select');
  profileInputs.forEach(input => {
    input.addEventListener('input', () => {
      const allFilled = Array.from(profileInputs).every(i => {
        if (i.type === 'checkbox') return i.checked;
        return i.value.trim() !== '';
      });
      document.getElementById('save-profile').disabled = !allFilled;
    });
  });

  // Модальное "О проекте"
  document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.remove('hidden');
  });
  document.getElementById('close-about').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });

  // Предупреждение перед туром
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
    tourStartTime = Date.now();
    startTimer(40 * 60); // 40 минут

    const { data, error } = await supabaseClient
      .from('questions')
      .select('*')
      .order('id') // потом заменим на random()
      .limit(15);

    if (error || !data || data.length === 0) {
      alert('Ошибка загрузки вопросов');
      return;
    }

    questions = data;
    currentQuestionIndex = 0;
    correctCount = 0;

    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');

    showQuestion();
  }

  // Таймер
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

  // Отображение вопроса
  function showQuestion() {
    const q = questions[currentQuestionIndex];

    document.getElementById('question-number').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = questions.length;
    document.getElementById('subject-tag').textContent = q.subject || 'Предмет';
    document.getElementById('question-text').innerHTML = q.question_text;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    const nextBtn = document.getElementById('next-button');
    nextBtn.disabled = true;

    if (q.options_text && q.options_text.trim()) {
      const options = q.options_text.split('\n');
      options.forEach(opt => {
        if (opt.trim()) {
          const btn = document.createElement('button');
          btn.className = 'option-button';
          btn.textContent = opt.trim();
          btn.onclick = () => {
            document.querySelectorAll('.option-button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAnswer = opt.trim().charAt(0).toUpperCase();
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

  // Следующий вопрос
  document.getElementById('next-button').addEventListener('click', async () => {
    const q = questions[currentQuestionIndex];

    let isCorrect = false;
    if (q.options_text && q.options_text.trim()) {
      isCorrect = selectedAnswer === q.correct_answer?.trim().toUpperCase();
    } else {
      const userAns = selectedAnswer?.toLowerCase().trim();
      const correctAns = (q.correct_answer || '').toLowerCase().trim().split(',');
      isCorrect = correctAns.some(a => a.trim() === userAns);
    }

    if (isCorrect) correctCount++;

    // Сохранение ответа
    await supabaseClient.from('user_answers').insert({
      user_id: window.telegramUserId,
      question_id: q.id,
      answer: selectedAnswer,
      is_correct: isCorrect
    });

    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      finishTour();
    }
  });

  // Завершение тура
  async function finishTour() {
    clearInterval(timerInterval);

    await supabaseClient
      .from('users')
      .update({ tour_completed: true })
      .eq('telegram_id', window.telegramUserId);

    const percent = Math.round((correctCount / questions.length) * 100);

    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');

    document.getElementById('correct-count').textContent = `${correctCount} из ${questions.length}`;
    document.getElementById('result-percent').textContent = `${percent}%`;
  }

  // Кнопки на результате
  document.getElementById('back-home').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
    document.getElementById('start-tour').disabled = true;
    document.getElementById('start-tour').textContent = 'Тур пройден';
  });

  // Загрузка при старте
  checkProfile();
});
