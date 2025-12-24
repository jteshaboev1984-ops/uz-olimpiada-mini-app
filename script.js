(function() {
  function waitForSupabase(callback) {
    if (typeof Supabase !== 'undefined' && Supabase.createClient) {
      callback();
    } else {
      setTimeout(() => waitForSupabase(callback), 100);
    }
  }

  waitForSupabase(() => {
    console.log('Supabase библиотека загружена');

    Telegram.WebApp.ready();
    Telegram.WebApp.expand();

    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.first_name) {
      document.getElementById('user-name').textContent = user.first_name;
    }

    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

    const supabaseClient = Supabase.createClient(supabaseUrl, supabaseAnonKey);

    console.log('Supabase клиент создан');

    let questions = [];
    let currentQuestionIndex = 0;
    let selectedAnswer = null;

    async function loadQuestions() {
      console.log('Запуск запроса к таблице questions...');

      const { data, error, status } = await supabaseClient
        .from('questions')
        .select('*')
        .limit(15);

      console.log('Ответ от Supabase:', { data, error, status });

      if (error) {
        alert('ОШИБКА Supabase: ' + error.message + ' (status: ' + status + ')');
        return;
      }

      if (!data || data.length === 0) {
        alert('Данные пустые! Проверь таблицу questions — там должно быть 15 строк.');
        return;
      }

      alert('УСПЕШНО! Загружено ' + data.length + ' вопросов. Показываю первый.');

      questions = data;
      currentQuestionIndex = 0;
      showQuestion();
      document.getElementById('main-screen').style.display = 'none';
      document.getElementById('quiz-screen').style.display = 'block';
    }

    function showQuestion() {
      const q = questions[currentQuestionIndex];
      document.getElementById('question-number').textContent = currentQuestionIndex + 1;
      document.getElementById('total-questions').textContent = questions.length;
      document.getElementById('subject-tag').textContent = q.subject || 'Предмет';
      document.getElementById('question-text').innerHTML = q.question_text || 'Вопрос не загружен';

      const optionsContainer = document.getElementById('options-container');
      optionsContainer.innerHTML = '';

      document.getElementById('next-button').disabled = true;

      if (q.options_text) {
        const options = q.options_text.split('\n');
        options.forEach(option => {
          if (option.trim()) {
            const button = document.createElement('button');
            button.className = 'option-button';
            button.textContent = option.trim();
            button.onclick = () => {
              document.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected'));
              button.classList.add('selected');
              selectedAnswer = option.trim().charAt(0);
              document.getElementById('next-button').disabled = false;
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
        input.oninput = () => {
          selectedAnswer = input.value.trim();
          document.getElementById('next-button').disabled = selectedAnswer === '';
        };
        optionsContainer.appendChild(input);
      }
    }

    document.getElementById('start-tour').addEventListener('click', loadQuestions);

    document.getElementById('next-button').addEventListener('click', () => {
      alert('Ответ принят: ' + (selectedAnswer || 'пусто'));

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
})();
