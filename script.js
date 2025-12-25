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
  let answerTimes = [];

  const regions = {
    "Ташкент": ["Алмазарский", "Бектемирский", "Мирабадский", "Мирзо-Улугбекский", "Сергелийский", "Учтепинский", "Чиланзарский", "Шайхантахурский", "Юнусабадский", "Яккасарайский", "Яшнабадский"],
    // ... (все регионы как раньше)
  };

  // Заполнение регионов (как раньше)
  // ... (код заполнения регионов и классов 8-11)

  document.getElementById('school-input').placeholder = "Номер школы";

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

  // Сохранение профиля (как раньше, с опциональным consent)

  // Кнопки
  document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.remove('hidden');
  });

  document.getElementById('close-about').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });

  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    alert('Лидерборд скоро будет доступен!');
  });

  document.getElementById('start-tour').addEventListener('click', () => {
    if (tourCompleted) return;
    document.getElementById('warning-modal').classList.remove('hidden');
  });

  document.getElementById('cancel-start').addEventListener('click', () => {
    document.getElementById('warning-modal').classList.add('hidden');
  });

  document.getElementById('confirm-start').addEventListener('click', async () => {
    document.getElementById('warning-modal').classList.add('hidden');
    startTour();
  });

  async function startTour() {
    const startTime = Date.now();

    const { data, error } = await supabaseClient
      .from('questions')
      .select('*')
      .limit(15);

    if (error || !data) {
      alert('Ошибка загрузки вопросов');
      return;
    }

    questions = data;
    currentQuestionIndex = 0;
    correctCount = 0;
    answerTimes = [];

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
    const questionStartTime = Date.now();

    document.getElementById('question-number').textContent = currentQuestionIndex + 1;
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
            const timeSpent = (Date.now() - questionStartTime) / 1000;
            answerTimes.push(timeSpent);
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
        const timeSpent = (Date.now() - questionStartTime) / 1000;
        answerTimes.push(timeSpent);
      };
      container.appendChild(input);
      input.focus();
    }
  }

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

    await supabaseClient.from('user_answers').insert({
      user_id: telegramUserId,
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

  async function finishTour() {
    clearInterval(timerInterval);

    await supabaseClient.from('users').update({ tour_completed: true }).eq('telegram_id', telegramUserId);

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

  checkProfile();
});
