document.addEventListener('DOMContentLoaded', function() {
  // Проверяем, загружен ли Supabase
  if (typeof Supabase === 'undefined') {
    alert('Ошибка: Библиотека Supabase не загружена. Проверьте подключение скрипта в HTML.');
    return;
  }

  console.log('Supabase библиотека найдена');
  
  // Инициализация Telegram
  if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.ready();
      Telegram.WebApp.expand();
      const user = Telegram.WebApp.initDataUnsafe.user;
      if (user && user.first_name) {
        document.getElementById('user-name').textContent = user.first_name;
      }
  }

  // ВАШИ ДАННЫЕ (Проверьте, что ключ верный)
  const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

  const supabaseClient = Supabase.createClient(supabaseUrl, supabaseAnonKey);

  let questions = [];
  let currentQuestionIndex = 0;
  let selectedAnswer = null;

  async function loadQuestions() {
    const btn = document.getElementById('start-tour');
    btn.textContent = 'Загрузка...';
    btn.disabled = true;

    // Запрос к базе
    const { data, error } = await supabaseClient
      .from('questions')
      .select('*')
      .limit(15);

    if (error) {
      alert('Ошибка базы данных: ' + error.message);
      btn.textContent = 'Начать тур';
      btn.disabled = false;
      return;
    }

    if (!data || data.length === 0) {
      alert('База данных вернула пустой список. Проверьте RLS политики в Supabase!');
      btn.textContent = 'Начать тур';
      btn.disabled = false;
      return;
    }

    questions = data;
    currentQuestionIndex = 0;
    
    // Переключение экранов
    document.getElementById('main-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'block';
    
    showQuestion();
  }

  function showQuestion() {
    const q = questions[currentQuestionIndex];
    
    // Заполняем элементы
    document.getElementById('question-number').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = questions.length;
    document.getElementById('subject-tag').textContent = q.subject || 'Вопрос';
    document.getElementById('question-text').innerHTML = q.question_text || 'Текст вопроса отсутствует';

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    const nextBtn = document.getElementById('next-button');
    nextBtn.disabled = true;

    // Логика отображения вариантов
    if (q.options_text) {
      // Разбиваем строку по символу новой строки
      const options = q.options_text.split('\n');
      
      options.forEach(option => {
        if (option.trim()) {
          const button = document.createElement('button');
          button.className = 'option-button'; // Убедитесь, что этот класс есть в CSS
          button.textContent = option.trim();
          button.style.display = 'block';     // На всякий случай
          button.style.width = '100%';
          button.style.marginBottom = '10px';
          
          button.onclick = () => {
            // Сброс выделения у всех кнопок
            const allBtns = optionsContainer.querySelectorAll('.option-button');
            allBtns.forEach(b => b.style.background = ''); 
            
            // Выделение текущей
            button.style.background = '#d0ebff'; 
            
            selectedAnswer = option.trim(); // Сохраняем полный ответ или первую букву
            nextBtn.disabled = false;
          };
          optionsContainer.appendChild(button);
        }
      });
    } else {
      // Если вариантов нет, показываем поле ввода
      const input = document.createElement('input');
      input.placeholder = 'Введите ответ';
      input.className = 'option-button';
      input.oninput = (e) => {
        selectedAnswer = e.target.value;
        nextBtn.disabled = !selectedAnswer;
      };
      optionsContainer.appendChild(input);
    }
  }

  // Привязка событий
  const startBtn = document.getElementById('start-tour');
  if(startBtn) startBtn.addEventListener('click', loadQuestions);

  const nextBtn = document.getElementById('next-button');
  if(nextBtn) nextBtn.addEventListener('click', () => {
    // Тут можно добавить проверку ответа, если в базе есть колонка correct_answer
    // if (selectedAnswer === questions[currentQuestionIndex].correct_answer) { ... }
    
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      selectedAnswer = null;
      showQuestion();
    } else {
      alert('Тур завершён!');
      location.reload();
    }
  });

});
