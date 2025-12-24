(function() {
  // Ждём загрузки Supabase
  function waitForSupabase(callback) {
    if (typeof Supabase !== 'undefined' && Supabase.createClient) {
      callback();
    } else {
      setTimeout(() => waitForSupabase(callback), 100);
    }
  }

  waitForSupabase(() => {
    console.log('Supabase загружен');

    Telegram.WebApp.ready();
    Telegram.WebApp.expand();

    // Имя пользователя
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.first_name) {
      document.getElementById('user-name').textContent = user.first_name;
    }

    // Подключение к Supabase
    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'sb_publishable_yvzU8kY8Y5eCM1_gfhN7nw_XVod-unn';

    const supabaseClient = Supabase.createClient(supabaseUrl, supabaseAnonKey);

    console.log('Supabase клиент создан');

    let questions = [];
    let currentQuestionIndex = 0;
    let selectedAnswer = null;

    // Загрузка вопросов
    async function loadQuestions() {
      alert('Начинаем загрузку вопросов...');

      const { data, error } = await supabaseClient
        .from('questions')
        .select('*')
        .limit(15);

      if (error) {
        alert('ОШИБКА: ' + error.message + '\nДетали: ' + JSON.stringify(error));
        console.error('Supabase error:', error);
        return;
      }

      if (data.length === 0) {
        alert('Вопросы не найдены в базе (data пустой).');
        return;
      }

      alert('Успешно загружено ' + data.length + ' вопросов!');

      questions = data;
      currentQuestionIndex = 0;
      showQuestion();
      document.getElementById('main-screen').style.display = 'none';
      document.getElementById('quiz-screen').style.display = 'block';
    }

    // Показ вопроса
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

    // Кнопка "Начать тур"
    document.getElementById('start-tour').addEventListener('click', loadQuestions);

    // Кнопка "Далее"
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
