document.addEventListener('DOMContentLoaded', function() {
  console.log('Приложение запущено');

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

  const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co  ';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

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

  const dSelect = document.getElementById('district-select');
  if (dSelect) dSelect.innerHTML = '<option value="" disabled selected>Выберите район</option>';

  const sInput = document.getElementById('school-input');
  if (sInput) sInput.placeholder = "Введите номер школы";

  async function checkProfile() {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('telegram_id', telegramUserId)
      .maybeSingle();

    if (error) {
      console.error("Ошибка проверки профиля:", error);
      return;
    }

    const isProfileComplete = data && data.class && data.region && data.district && data.school;

    if (!isProfileComplete) {
      document.getElementById('home-screen').classList.add('hidden');
      document.getElementById('profile-screen').classList.remove('hidden');
      enableProfileEdit();
    } else {
      document.getElementById('class-select').value = data.class;
      document.getElementById('region-select').value = data.region;
      document.getElementById('district-select').value = data.district;
      document.getElementById('school-input').value = data.school;
      document.getElementById('research-consent').checked = data.research_consent || false;

      disableProfileEdit();

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
      console.error(error);
    } else {
      document.getElementById('profile-screen').classList.add('hidden');
      document.getElementById('home-screen').classList.remove('hidden');
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

  document.getElementById('back-from-profile').addEventListener('click', () => {
    document.getElementById('profile-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
  });

  document.getElementById('profile-btn').addEventListener('click', () => {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('profile-screen').classList.remove('hidden');
    checkProfile();
  });

  // НОВАЯ КНОПКА "Прогресс"
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

  // НОВАЯ КНОПКА "Выход"
  document.getElementById('exit-btn').addEventListener('click', () => {
    if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.close();
    } else {
      alert('Выход из приложения');
    }
  });

  document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.remove('hidden');
  });

  document.getElementById('close-about').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });

  const aboutCloseBtn = document.querySelector('#about-modal .modal-content > div > button');
  if (aboutCloseBtn) {
    aboutCloseBtn.addEventListener('click', () => {
      document.getElementById('about-modal').classList.add('hidden');
    });
  }

  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    alert('Лидерборд в разработке — скоро будет топ участников!');
  });

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
      .limit(50);

    if (error || !data || data.length === 0) {
      alert('Ошибка загрузки вопросов');
      console.error(error);
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

    const optionsText = (q.options_text || '').trim();

    if (optionsText !== '') {
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
            const isLetterOption = optText.match(/^[A-DА-Г][)\.\s]/i);
            selectedAnswer = isLetterOption ? optText.charAt(0).toUpperCase() : optText;
            nextBtn.disabled = false;
          };
          container.appendChild(btn);
        }
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Введите ответ';
      textarea.rows = 5;
      textarea.style.width = '100%';
      textarea.style.padding = '20px';
      textarea.style.borderRadius = '20px';
      textarea.style.border = '2px solid #e0e0e0';
      textarea.style.fontSize = '19px';
      textarea.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
      textarea.style.resize = 'none';

      textarea.addEventListener('input', () => {
        selectedAnswer = textarea.value.trim();
        nextBtn.disabled = selectedAnswer.length === 0;
      });

      container.appendChild(textarea);

      setTimeout(() => {
        textarea.focus();
        if (window.Telegram && Telegram.WebApp) {
          Telegram.WebApp.HapticFeedback.selectionChanged();
        }
      }, 200);
    }
  }

  document.getElementById('next-button').addEventListener('click', async () => {
    const q = questions[currentQuestionIndex];

    let isCorrect = false;
    const correctDB = (q.correct_answer || '').trim();

    if ((q.options_text || '').trim() !== '') {
      isCorrect = selectedAnswer.toLowerCase() === correctDB.toLowerCase();
    } else {
      const userAns = selectedAnswer?.toLowerCase();
      const correctOptions = correctDB.toLowerCase().split(',').map(s => s.trim());
      isCorrect = correctOptions.some(a => a === userAns);
    }

    if (isCorrect) correctCount++;

    const { error } = await supabaseClient
      .from('user_answers')
      .upsert({
        user_id: telegramUserId,
        question_id: q.id,
        answer: selectedAnswer,
        is_correct: isCorrect
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

  document.getElementById('download-certificate').addEventListener('click', () => {
    alert('Сертификат в разработке — скоро будет скачивание!');
  });

  checkProfile();
});
