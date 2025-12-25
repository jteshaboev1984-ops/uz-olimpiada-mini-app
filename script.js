document.addEventListener('DOMContentLoaded', function() {
  console.log('Приложение запущено');

  // Telegram WebApp
  let telegramUserId;
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();

    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.id) {
      document.getElementById('user-name').textContent = user.first_name || 'Участник';
      telegramUserId = Number(user.id); // bigint
    }
  }

  // Fallback для браузера (тест)
  if (!telegramUserId) {
    telegramUserId = 999999999; // тестовый ID
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

  // Регионы и районы (как раньше)
  const regions = {
    "Ташкент": ["Алмазарский", "Бектемирский", "Мирабадский", "Мирзо-Улугбекский", "Сергелийский", "Учтепинский", "Чиланзарский", "Шайхантахурский", "Юнусабадский", "Яккасарайский", "Яшнабадский"],
    // ... (все остальные регионы как в предыдущем коде)
  };

  // Заполнение регионов (как раньше)
  const regionSelect = document.getElementById('region-select');
  Object.keys(regions).forEach(region => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    regionSelect.appendChild(option);
  });

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

  // Классы 8–11
  document.getElementById('class-select').innerHTML = `
    <option value="">Выберите класс</option>
    <option value="8">8 класс</option>
    <option value="9">9 класс</option>
    <option value="10">10 класс</option>
    <option value="11">11 класс</option>
  `;

  // Изменение placeholder школы
  document.getElementById('school-input').placeholder = "Номер школы";

  // Проверка профиля
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

  // Сохранение профиля
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
        research_consent: consent,
        tour_completed: false
      });

    if (error) {
      alert('Ошибка сохранения профиля: ' + error.message);
      console.error(error);
    } else {
      document.getElementById('profile-screen').classList.add('hidden');
      document.getElementById('home-screen').classList.remove('hidden');
      checkProfile(); // обновляем состояние
    }
  });

  // Активация кнопки сохранения
  const requiredFields = ['class-select', 'region-select', 'district-select', 'school-input'];
  requiredFields.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      const allFilled = requiredFields.every(fid => document.getElementById(fid).value.trim() !== '');
      document.getElementById('save-profile').disabled = !allFilled;
    });
  });

  // Кнопки на главном экране
  document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.remove('hidden');
  });

  document.getElementById('close-about').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });

  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    alert('Лидерборд в разработке — скоро будет топ участников!');
  });

  // Предупреждение и запуск тура (заготовка — полный код тура в следующем сообщении)
  document.getElementById('start-tour').addEventListener('click', () => {
    if (tourCompleted) return;
    document.getElementById('warning-modal').classList.remove('hidden');
  });

  document.getElementById('cancel-start').addEventListener('click', () => {
    document.getElementById('warning-modal').classList.add('hidden');
  });

  document.getElementById('confirm-start').addEventListener('click', () => {
    document.getElementById('warning-modal').classList.add('hidden');
    alert('Тур запускается — полный код викторины в следующем обновлении!');
  });

  // Запуск
  checkProfile();
});
