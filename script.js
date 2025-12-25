document.addEventListener('DOMContentLoaded', function() {
  console.log('Скрипт запущен');

  // Telegram WebApp
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();

    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.first_name) {
      document.getElementById('user-name').textContent = user.first_name;
    }
  }

  // Supabase
  const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

  const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

  let questions = [];
  let currentQuestionIndex = 0;
  let correctCount = 0;
  let selectedAnswer = null;

  const telegramId = Telegram.WebApp.initDataUnsafe.user?.id || 'test_user';

  async function loadQuestions() {
    const btn = document.getElementById('start-tour');
    btn.textContent = 'Загрузка...';
    btn.disabled = true;

    const { data, error } = await supabaseClient
      .from('questions')
      .select('*')
      .limit(15);

    if (error || !data || data.length === 0) {
      alert('Ошибка загрузки вопросов. Проверьте интернет и базу.');
      btn.textContent = 'Начать тур';
      btn.disabled = false;
      return;
    }

    questions = data;
    currentQuestionIndex = 0;
    correctCount = 0;

    document.getElementById('main-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'block';

    showQuestion();
  }

  function showQuestion() {
    const q = questions[currentQuestionIndex];

    document.getElementById('question-number').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = questions.length;
    document.getElementById('subject-tag').textContent = q.subject || 'Предмет';
    document.getElementById('question-text').innerHTML = q.question_text || 'Вопрос не загружен';

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    const nextBtn = document.getElementById('next-button');
    nextBtn.disabled = true;
    nextBtn.textContent = 'Далее';

    if (q.options_text) {
      const options = q.options_text.split('\n');
      options.forEach(option => {
        if (option.trim()) {
          const button = document.createElement('button');
          button.className = 'option-button';
          button.textContent = option.trim();

          button.onclick = () => {
            document.querySelectorAll('.option-button').forEach(b => b.classList.remove('selected'));
            button.classList.add('selected');
            selectedAnswer = option.trim().charAt(0); // A, B, C, D
            nextBtn.disabled = false;
          };

          optionsContainer.appendChild(button);
        }
      });
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Введите ответ';
      input.className = 'option-button';
      input.oninput = (e) => {
        selectedAnswer = e.target.value.trim();
        nextBtn.disabled = !selectedAnswer;
      };
      optionsContainer.appendChild(input);
    }
  }

  document.getElementById('start-tour').addEventListener('click', loadQuestions);

  document.getElementById('next-button').addEventListener('click', async () => {
    const q = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === q.correct_answer;

    if (isCorrect) correctCount++;

    // Сохраняем ответ в базу
    const { error } = await supabaseClient
      .from('user_answers')
      .insert({
        telegram_id: telegramId,
        question_id: q.id,
        answer: selectedAnswer,
        is_correct: isCorrect
      });

    if (error) console.error('Ошибка сохранения ответа:', error);

    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
      selectedAnswer = null;
      showQuestion();
    } else {
      // Экран результата
      const percent = Math.round((correctCount / questions.length) * 100);
      document.getElementById('quiz-screen').innerHTML = `
        <h2 style="font-size: 28px; margin-bottom: 20px;">Тур завершён!</h2>
        <p style="font-size: 24px;">Правильных ответов: <strong>${correctCount}</strong> из ${questions.length}</p>
        <p style="font-size: 32px; color: #007aff; margin: 30px 0;">${percent}%</p>
        <button class="big-button" onclick="location.reload()">На главную</button>
      `;
    }
  });
});
