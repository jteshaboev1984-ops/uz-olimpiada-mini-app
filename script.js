document.addEventListener('DOMContentLoaded', function() {
    console.log('App Started: v15.0 (Clean Subjects & Stats)');
  
    let telegramUserId; 
    let internalDbId = null; 
    let currentTourId = null;
    // Кэш для ответов пользователя, чтобы считать статистику
    let userAnswersCache = []; 
    // Кэш вопросов текущего тура для сопоставления ID -> Предмет
    let tourQuestionsCache = [];
    
    const supabaseUrl = 'https://fgwnqxumukkgtzentlxr.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';
  
    if (window.Telegram && window.Telegram.WebApp) {
      Telegram.WebApp.ready();
      Telegram.WebApp.expand();
      const user = Telegram.WebApp.initDataUnsafe.user;
      if (user && user.id) {
        document.getElementById('profile-user-name').textContent = user.first_name + ' ' + (user.last_name || '');
        document.getElementById('home-user-name').textContent = user.first_name || 'Участник';
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
      document.getElementById('profile-user-name').textContent = 'Тестовый Участник';
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
      // ... (остальные регионы, как были)
    };
    // Заглушка для теста, если регионы сокращены в коде
    if(Object.keys(regions).length < 2) regions["Ташкент"] = ["Чиланзарский", "Юнусабадский"];
  
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
  
    // --- MAIN LOGIC ---

    async function checkProfileAndTour() {
      // 1. Get User
      const { data: userData } = await supabaseClient
        .from('users')
        .select('*')
        .eq('telegram_id', telegramUserId)
        .maybeSingle();
  
      if (userData) internalDbId = userData.id;
  
      // 2. Find Active Tour
      const now = new Date().toISOString();
      const { data: tourData } = await supabaseClient
        .from('tours')
        .select('*')
        .lte('start_date', now)
        .gte('end_date', now)
        .eq('is_active', true)
        .maybeSingle();

      if (!tourData) {
          const btn = document.getElementById('start-tour');
          btn.innerHTML = '<i class="fa-solid fa-calendar-xmark"></i> Нет активных туров';
          btn.disabled = true;
          btn.style.background = "#8E8E93";
      } else {
          currentTourId = tourData.id;
          
          // ЗАГРУЖАЕМ ОТВЕТЫ И ВОПРОСЫ ДЛЯ СТАТИСТИКИ
          await fetchStatsData();

          if (internalDbId) {
              const { data: progress } = await supabaseClient
                  .from('tour_progress')
                  .select('*')
                  .eq('user_id', internalDbId)
                  .eq('tour_id', currentTourId)
                  .maybeSingle();
              
              if (progress) {
                  tourCompleted = true;
                  updateStartButtonState(true);
              } else {
                  tourCompleted = false;
                  updateStartButtonState(false, tourData.title);
              }
          }
      }

      // 3. UI Decision
      const isProfileComplete = userData && userData.class && userData.region && userData.district && userData.school;
  
      if (!userData || !isProfileComplete) {
        showScreen('profile-screen');
        unlockProfileForm();
      } else {
        fillProfileForm(userData);
        showScreen('home-screen');
      }
    }

    // Загрузка данных для подсчета статистики по предметам
    async function fetchStatsData() {
        if (!internalDbId || !currentTourId) return;

        // 1. Берем все вопросы тура (чтобы знать их subject)
        const { data: qData } = await supabaseClient
            .from('questions')
            .select('id, subject')
            .eq('tour_id', currentTourId);
        
        if (qData) tourQuestionsCache = qData;

        // 2. Берем ответы юзера
        const { data: aData } = await supabaseClient
            .from('user_answers')
            .select('question_id, is_correct')
            .eq('user_id', internalDbId);
            
        if (aData) userAnswersCache = aData;
    }

    function calculateSubjectStats(subjectName) {
        // Фильтруем вопросы по предмету
        const subjectQuestions = tourQuestionsCache.filter(q => 
            q.subject && q.subject.toLowerCase().includes(subjectName.toLowerCase())
        );
        
        if (subjectQuestions.length === 0) return { total: 0, correct: 0 };

        let correct = 0;
        let total = 0;

        // Смотрим, ответил ли юзер на эти вопросы
        subjectQuestions.forEach(q => {
            const answer = userAnswersCache.find(a => a.question_id === q.id);
            if (answer) {
                total++; // Юзер отвечал на этот вопрос
                if (answer.is_correct) correct++;
            }
        });

        return { total, correct };
    }

    // Открытие модалки с реальной статистикой
    window.openSubjectStats = function(subject) {
        const modal = document.getElementById('subject-modal');
        document.getElementById('sm-title').textContent = subject;
        
        const stats = calculateSubjectStats(subject);
        
        document.getElementById('sm-correct').textContent = stats.correct;
        document.getElementById('sm-total').textContent = stats.total; // Сколько он решал
        
        modal.classList.remove('hidden');
    }

    function fillProfileForm(data) {
        document.getElementById('class-select').value = data.class;
        document.getElementById('region-select').value = data.region;
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
        document.getElementById('school-input').value = data.school;
        document.getElementById('research-consent').checked = data.research_consent || false;
    }

    // Кнопка старта с проверкой
    async function handleStartClick() {
        const btn = document.getElementById('start-tour');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Загрузка...';
        
        const { data } = await supabaseClient
            .from('questions')
            .select('time_limit_seconds')
            .eq('tour_id', currentTourId)
            .limit(50);
            
        let totalSeconds = 0;
        let count = 0;
        if(data) {
            data.forEach(q => totalSeconds += (q.time_limit_seconds || 60));
            count = Math.min(data.length, 15);
        }
        
        const mins = Math.ceil(totalSeconds / 60);
        document.getElementById('warn-time-val').textContent = `${mins} минут`;
        document.getElementById('warn-q-val').textContent = `${count} вопросов`;
        
        updateStartButtonState(false);
        document.getElementById('warning-modal').classList.remove('hidden');
    }

    function updateStartButtonState(isCompleted, tourTitle = "Начать тур") {
        const btn = document.getElementById('start-tour');
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        if (isCompleted) {
            newBtn.innerHTML = '<i class="fa-solid fa-check"></i> Тур пройден';
            newBtn.classList.remove('btn-primary');
            newBtn.classList.add('btn-success');
            newBtn.addEventListener('click', () => {
                document.getElementById('tour-completed-modal').classList.remove('hidden');
            });
        } else {
            newBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${tourTitle}`;
            newBtn.classList.remove('btn-success');
            newBtn.classList.add('btn-primary');
            newBtn.disabled = false;
            newBtn.addEventListener('click', handleStartClick);
        }
    }

    function lockProfileForm() {
        document.getElementById('save-profile').classList.add('hidden');
        document.getElementById('profile-back-btn').classList.remove('hidden');
        document.getElementById('profile-locked-msg').classList.remove('hidden');
        const inputs = document.querySelectorAll('#profile-screen input, #profile-screen select');
        inputs.forEach(el => el.disabled = true);
    }

    function unlockProfileForm() {
        document.getElementById('save-profile').classList.remove('hidden');
        document.getElementById('profile-back-btn').classList.add('hidden');
        document.getElementById('profile-locked-msg').classList.add('hidden');
        const inputs = document.querySelectorAll('#profile-screen input, #profile-screen select');
        inputs.forEach(el => el.disabled = false);
    }
  
    document.getElementById('save-profile').addEventListener('click', async () => {
      const classVal = document.getElementById('class-select').value;
      const region = document.getElementById('region-select').value;
      const district = document.getElementById('district-select').value;
      const school = document.getElementById('school-input').value.trim();
      const consent = document.getElementById('research-consent').checked;
  
      if (!classVal || !region || !district || !school) {
        alert('Пожалуйста, заполните все поля!');
        return;
      }
  
      const btn = document.getElementById('save-profile');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Сохранение...';
  
      try {
          const { data, error } = await supabaseClient
            .from('users')
            .upsert({
              telegram_id: telegramUserId,
              class: classVal,
              region: region,
              district: district,
              school: school,
              research_consent: consent
            }, { onConflict: 'telegram_id' })
            .select(); 
      
          if (error) throw error;

          if (data && data.length > 0) internalDbId = data[0].id;
          
          lockProfileForm();
          showScreen('home-screen');
          checkProfileAndTour();

      } catch (e) {
          alert('Ошибка сохранения: ' + e.message);
          btn.disabled = false;
          btn.innerHTML = originalText;
      } 
    });
  
    const requiredFields = document.querySelectorAll('#class-select, #region-select, #district-select, #school-input');
    requiredFields.forEach(field => {
      field.addEventListener('input', () => {
        const allFilled = Array.from(requiredFields).every(f => f.value.trim() !== '');
        document.getElementById('save-profile').disabled = !allFilled;
      });
    });
  
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    window.openExternalLink = function(url) {
        if(window.Telegram && Telegram.WebApp) Telegram.WebApp.openLink(url);
        else window.open(url, '_blank');
    }

    document.getElementById('open-profile-btn').addEventListener('click', () => {
        showScreen('profile-screen');
        lockProfileForm();
    });
    document.getElementById('profile-back-btn').addEventListener('click', () => showScreen('home-screen'));
    
    document.getElementById('leaderboard-btn').addEventListener('click', () => {
        showScreen('leaderboard-screen');
        loadLeaderboard(); // Загружаем при клике
    });
    
    document.getElementById('lb-back').addEventListener('click', () => showScreen('home-screen'));
    document.getElementById('about-btn').addEventListener('click', () => document.getElementById('about-modal').classList.remove('hidden'));
    document.getElementById('close-about').addEventListener('click', () => document.getElementById('about-modal').classList.add('hidden'));
    
    document.getElementById('exit-app-btn').addEventListener('click', () => {
        if(window.Telegram && Telegram.WebApp) Telegram.WebApp.close();
        else alert("Работает только в Telegram");
    });
    document.getElementById('download-certificate-btn').addEventListener('click', () => alert("Сертификаты будут доступны после завершения олимпиады!"));
  
    // --- LEADERBOARD LOGIC ---
    async function loadLeaderboard() {
        if (!currentTourId) return;
        
        const podium = document.getElementById('lb-podium');
        const list = document.getElementById('lb-list');
        podium.innerHTML = '<p style="text-align:center;width:100%;color:#8E8E93;margin-top:20px;">Загрузка...</p>';
        list.innerHTML = '';

        const { data: progressData, error } = await supabaseClient
            .from('tour_progress')
            .select('user_id, score')
            .eq('tour_id', currentTourId)
            .order('score', { ascending: false })
            .limit(20);

        if (error || !progressData || progressData.length === 0) {
            podium.innerHTML = '<p style="text-align:center;width:100%;color:#8E8E93;margin-top:20px;">Пока нет результатов</p>';
            return;
        }

        const userIds = progressData.map(p => p.user_id);
        const { data: usersData } = await supabaseClient
            .from('users')
            .select('id, first_name, last_name, class')
            .in('id', userIds);

        if (!usersData) return;

        const leaderboard = progressData.map((entry, index) => {
            const user = usersData.find(u => u.id === entry.user_id);
            return {
                rank: index + 1,
                name: user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Аноним',
                classVal: user ? user.class : '',
                score: entry.score,
                avatarChar: user && user.first_name ? user.first_name[0].toUpperCase() : 'A'
            };
        });

        // PODIUM (Top 3)
        podium.innerHTML = '';
        const top3 = [leaderboard[1], leaderboard[0], leaderboard[2]]; 
        const ranks = ['second', 'first', 'third'];
        const medals = ['silver', 'gold', 'bronze'];

        top3.forEach((player, i) => {
            if (player) {
                let html = `
                    <div class="winner ${ranks[i]}">
                        ${ranks[i] === 'first' ? '<div class="icon-crown"><i class="fa-solid fa-crown"></i></div>' : ''}
                        <div class="avatar-ring ${medals[i]}">
                            <div class="usr-av" style="width:100%;height:100%;font-size:20px;background:#eee;color:#999;">${player.avatarChar}</div>
                        </div>
                        <div class="rank-badge">#${player.rank}</div>
                        <div class="name">${player.name}</div>
                        <div class="score">${player.score}</div>
                    </div>
                `;
                podium.insertAdjacentHTML('beforeend', html);
            }
        });

        // LIST (Rest)
        leaderboard.slice(3).forEach(player => {
             let html = `
                <div class="leader-row">
                    <span class="pos">${player.rank}</span>
                    <div class="usr-av gray">${player.avatarChar}</div>
                    <div class="usr-info"><span class="u-name">${player.name}</span><span class="u-meta">${player.classVal} класс</span></div>
                    <span class="u-score">${player.score}</span>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', html);
        });
    }

    // --- TOUR LOGIC ---
    document.getElementById('cancel-start').addEventListener('click', () => {
      document.getElementById('warning-modal').classList.add('hidden');
    });
  
    document.getElementById('confirm-start').addEventListener('click', async () => {
      document.getElementById('warning-modal').classList.add('hidden');
      await startTour();
    });
  
    async function startTour() {
      if (!currentTourId) return;

      const { data, error } = await supabaseClient
        .from('questions')
        .select('*')
        .eq('tour_id', currentTourId)
        .limit(50);
  
      if (error || !data || data.length === 0) {
        alert('Ошибка: Вопросы для этого тура не найдены.');
        return;
      }
  
      questions = data.sort(() => Math.random() - 0.5).slice(0, 15);
      
      let totalSeconds = 0;
      questions.forEach(q => totalSeconds += (q.time_limit_seconds || 60));

      currentQuestionIndex = 0;
      correctCount = 0;
  
      showScreen('quiz-screen');
      startTimer(totalSeconds);
      showQuestion();
    }
  
    function startTimer(seconds) {
      let timeLeft = seconds;
      const timerEl = document.getElementById('timer');
      if (timerInterval) clearInterval(timerInterval);
  
      timerInterval = setInterval(() => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      document.getElementById('total-q-count').textContent = questions.length;
      document.getElementById('subject-tag').textContent = q.subject || 'ВОПРОС';
      document.getElementById('question-text').innerHTML = q.question_text;
      
      const timeForQ = q.time_limit_seconds || 60;
      const minsHint = Math.round(timeForQ / 60 * 10) / 10;
      document.getElementById('q-time-hint').innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ~${minsHint} мин`;

      const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
      document.getElementById('quiz-progress-fill').style.width = `${progressPercent}%`;
  
      const container = document.getElementById('options-container');
      container.innerHTML = '';
  
      const nextBtn = document.getElementById('next-button');
      nextBtn.disabled = true;
      nextBtn.innerHTML = 'Далее <i class="fa-solid fa-arrow-right"></i>';
      selectedAnswer = null;
  
      const optionsText = (q.options_text || '').trim();
  
      if (optionsText !== '') {
        const options = optionsText.split('\n');
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        options.forEach((option, index) => {
          if (option.trim()) {
            const letter = letters[index] || '';
            const btn = document.createElement('div');
            btn.className = 'option-card';
            btn.innerHTML = `<div class="option-circle">${letter}</div><div class="option-text">${option.trim()}</div>`;
            btn.onclick = () => {
              document.querySelectorAll('.option-card').forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected');
              const optText = option.trim();
              const isLetterOption = optText.match(/^[A-DА-Г][)\.\s]/i);
              selectedAnswer = isLetterOption ? optText.charAt(0).toUpperCase() : optText;
              if (!selectedAnswer && letter) selectedAnswer = letter;
              if (!selectedAnswer) selectedAnswer = optText;
              nextBtn.disabled = false;
            };
            container.appendChild(btn);
          }
        });
      } else {
        const textarea = document.createElement('textarea');
        textarea.className = 'answer-input';
        textarea.placeholder = 'Введите ответ...';
        textarea.rows = 2;
        textarea.addEventListener('input', () => {
          selectedAnswer = textarea.value.trim();
          nextBtn.disabled = selectedAnswer.length === 0;
        });
        container.appendChild(textarea);
        setTimeout(() => textarea.focus(), 300);
      }
    }
  
    document.getElementById('next-button').addEventListener('click', async () => {
      const nextBtn = document.getElementById('next-button');
      nextBtn.disabled = true;
      nextBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Сохранение...';
  
      if (!internalDbId) {
          const { data } = await supabaseClient.from('users').select('id').eq('telegram_id', telegramUserId).maybeSingle();
          if(data) internalDbId = data.id;
      }
      
      const q = questions[currentQuestionIndex];
      let isCorrect = false;
      const correctDB = (q.correct_answer || '').trim();
  
      if ((q.options_text || '').trim() !== '') {
        isCorrect = selectedAnswer.toLowerCase() === correctDB.toLowerCase();
      } else {
        const userAns = selectedAnswer.toLowerCase().replace(',', '.');
        const correctOptions = correctDB.toLowerCase().split(',').map(s => s.trim().replace(',', '.'));
        isCorrect = correctOptions.some(a => a === userAns);
      }
  
      if (isCorrect) correctCount++;
  
      try {
          const { error } = await supabaseClient
            .from('user_answers')
            .upsert({
              user_id: internalDbId,
              question_id: q.id,
              answer: selectedAnswer,
              is_correct: isCorrect
            }, { onConflict: 'user_id,question_id' });
      
          if (error) throw error;

          currentQuestionIndex++;
          if (currentQuestionIndex < questions.length) {
            showQuestion();
          } else {
            finishTour();
          }
      } catch (e) {
          alert('Ошибка сохранения: ' + e.message);
          nextBtn.disabled = false;
          nextBtn.innerHTML = 'Повторить';
      }
    });
  
    async function finishTour() {
      clearInterval(timerInterval);
      
      if (internalDbId && currentTourId) {
          await supabaseClient
            .from('tour_progress')
            .upsert({ 
                user_id: internalDbId, 
                tour_id: currentTourId,
                score: correctCount
            }, { onConflict: 'user_id,tour_id' });
      }
  
      tourCompleted = true;
      const percent = Math.round((correctCount / questions.length) * 100);
  
      showScreen('result-screen');
      document.getElementById('correct-count').textContent = correctCount;
      document.getElementById('stat-correct').textContent = `${correctCount}/${questions.length}`;
      document.getElementById('result-percent').textContent = `${percent}%`;
      
      const circle = document.getElementById('result-circle');
      circle.style.background = `conic-gradient(var(--primary) 0% ${percent}%, #E5E5EA ${percent}% 100%)`;
      
      updateStartButtonState(true);
      fetchStatsData(); // Обновить статистику после тура
    }
  
    document.getElementById('back-home').addEventListener('click', () => {
      showScreen('home-screen');
    });
    document.getElementById('back-home-x').addEventListener('click', () => {
        showScreen('home-screen');
    });
  
    checkProfileAndTour();
  });
