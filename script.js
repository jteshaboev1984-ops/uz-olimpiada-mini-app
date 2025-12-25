document.addEventListener('DOMContentLoaded', function() {
  console.log('Скрипт запущен');

  // Инициализация Telegram WebApp
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();

    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.first_name) {
      document.getElementById('user-name').textContent = user.first_name;
    }
  }

  // Подключение к Supabase (правильное имя — supabase с маленькой буквы!)
  const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

  const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

  console.log('Supabase клиент создан');

  let questions = [];
  let currentQuestionIndex = 0;
  let selectedAnswer = null;

  async function loadQuestions() {
    const btn = document.getElementById('start-tour');
    btn.textContent = 'Загрузка вопросов...';
    btn.disabled = true;

    console.log('Запрашиваем вопросы из базы...');

    const { data, error } = await supabaseClient
      .from('questions')
      .select('*')
      .limit(15);

    console.log('Ответ от Supabase:', { data, error });

    if (error) {
      alert('Ошибка: ' + error.message);
      btn.textContent = 'Начать тур';
      btn.disabled = false;
      return;
    }

    if (!data || data.length === 0) {
      alert('Вопросы не найдены в базе. Проверьте таблицу questions и RLS.');
      btn.textContent = 'Начать тур';
      btn.disabled = false;
      return;
    }

    questions = data;
    currentQuestionIndex = 0;
    selectedAnswer = null;

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

    if (q.options_text) {
      const options = q.options_text.split('\n');
      options.forEach(option => {
        if (option.trim()) {
          const button = document.createElement('button');
          button.className = 'option-button';
          button.textContent = option.trim();

          button.onclick = () => {
            // Снимаем выделение со всех
            document.querySelectorAll('.option-button').forEach(b => {
              b.style.background = '';
            });

            // Выделяем выбранный
            button.style.background = '#d0ebff';

            selectedAnswer = option.trim();
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
      input.style.textAlign = 'center';
      input.style.padding = '16px';
      input.style.fontSize = '18px';

      input.oninput = (e) => {
        selectedAnswer = e.target.value.trim();
        nextBtn.disabled = !selectedAnswer;
      };

      optionsContainer.appendChild(input);
    }
  }

  // Кнопка "Начать тур"
  document.getElementById('start-tour').addEventListener('click', loadQuestions);

  // Кнопка "Далее"
  document.getElementById('next-button').addEventListener('click', () => {
    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
      selectedAnswer = null;
      showQuestion();
    } else {
      alert('Тур завершён! Молодец!');
      location.reload();
    }
  });
});
