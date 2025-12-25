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

  // Регионы и районы Узбекистана
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

  // Классы только 8-11
  const classSelect = document.getElementById('class-select');
  classSelect.innerHTML = `
    <option value="">Выберите класс</option>
    <option value="8">8 класс</option>
    <option value="9">9 класс</option>
    <option value="10">10 класс</option>
    <option value="11">11 класс</option>
  `;

  // Проверка профиля при загрузке
  async function checkProfile() {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('telegram_id', window.telegramUserId)
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

  // Сохранение профиля (согласие опционально)
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

  // Активация кнопки сохранения (согласие не обязательно)
  const profileRequiredInputs = document.querySelectorAll('#class-select, #region-select, #district-select, #school-input');
  profileRequiredInputs.forEach(input => {
    input.addEventListener('input', () => {
      const allFilled = Array.from(profileRequiredInputs).every(i => i.value.trim() !== '');
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

  // Загрузка при старте
  checkProfile();
});
