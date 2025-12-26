// --- КОНФИГУРАЦИЯ ---
const SUPABASE_URL = 'https://fgwnqxumukkgtzentlxr.supabase.co'; // Вставьте свою
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';        // Вставьте свой

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const tg = window.Telegram.WebApp;

let currentUser = null; // Здесь будем хранить данные вошедшего юзера

// --- ИНИЦИАЛИЗАЦИЯ ---
tg.expand();
initApp();

async function initApp() {
    // 1. Получаем ID пользователя из Telegram
    // Если тестируете в браузере, раскомментируйте строчку ниже для теста:
    // const tgId = 139035406; 
    const tgId = tg.initDataUnsafe?.user?.id;

    if (!tgId) {
        alert("Запустите приложение через Telegram");
        return;
    }

    // 2. Ищем пользователя в базе
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgId)
        .single();

    if (error || !user) {
        // Если пользователя нет вообще — создаем "заготовку"
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{ telegram_id: tgId }])
            .select()
            .single();
        
        if (newUser) {
            currentUser = newUser;
            showRegistration(); // Новый юзер -> сразу на регистрацию
        }
    } else {
        currentUser = user;
        // 3. Проверяем, заполнены ли обязательные поля
        if (!user.name || !user.region || !user.district || !user.school) {
            showRegistration(); // Есть в базе, но нет данных -> на регистрацию
        } else {
            // Все ок, скрываем регистрацию, показываем меню
            document.getElementById('registration-modal').classList.add('hidden');
        }
    }
}

// --- ФУНКЦИИ РЕГИСТРАЦИИ ---

function showRegistration() {
    document.getElementById('registration-modal').classList.remove('hidden');
    // Скрываем таббар, чтобы не ушли
    document.getElementById('main-tabbar').style.display = 'none';
}

async function submitRegistration() {
    const name = document.getElementById('reg-name').value;
    const region = document.getElementById('reg-region').value;
    const district = document.getElementById('reg-district').value;
    const school = document.getElementById('reg-school').value;
    const userClass = document.getElementById('reg-class').value;

    if (!name || !region || !district || !school || !userClass) {
        document.getElementById('reg-error').style.display = 'block';
        return;
    }

    // Сохраняем в Supabase
    const { error } = await supabase
        .from('users')
        .update({
            name: name,
            region: region,
            district: district,
            school: school,
            class: userClass
        })
        .eq('id', currentUser.id);

    if (error) {
        alert('Ошибка сохранения: ' + error.message);
    } else {
        // Успех
        document.getElementById('registration-modal').classList.add('hidden');
        document.getElementById('main-tabbar').style.display = 'flex';
        // Обновляем локальные данные
        currentUser.name = name;
        currentUser.region = region; 
        // и так далее...
    }
}

// --- НАВИГАЦИЯ ---

function openTab(tabName) {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));

    // Показываем нужный
    if (tabName === 'home') {
        document.getElementById('home-screen').classList.add('active');
        document.querySelectorAll('.tab-item')[0].classList.add('active');
    } else if (tabName === 'leaderboard') {
        document.getElementById('leaderboard-screen').classList.add('active');
        document.querySelectorAll('.tab-item')[1].classList.add('active');
        loadLeaderboard(); // Загружаем данные при открытии вкладки
    }
}

// --- ЛИДЕРБОРД ---

async function loadLeaderboard() {
    const listContainer = document.getElementById('leaderboard-list');
    const rankDisplay = document.getElementById('user-rank-display');
    
    listContainer.innerHTML = '<div class="loading">Обновление рейтинга...</div>';

    // 1. Загружаем прогресс с данными пользователей
    // Обратите внимание на синтаксис join: users(name, school, ...)
    const { data, error } = await supabase
        .from('tour_progress')
        .select(`
            score,
            users (
                telegram_id,
                name,
                school,
                class,
                region,
                district
            )
        `)
        .order('score', { ascending: false });

    if (error) {
        listContainer.innerHTML = '<p style="text-align:center; color:red">Ошибка загрузки</p>';
        console.error(error);
        return;
    }

    // 2. Рендерим список
    let html = '';
    let myRank = '-';
    let totalParticipants = data.length;

    data.forEach((item, index) => {
        const rank = index + 1;
        const user = item.users; // Данные из связанной таблицы
        const score = item.score;
        
        // Если имя пустое (старый аккаунт), пишем заглушку
        const displayName = user?.name || 'Участник';
        const displaySchool = (user?.school && user?.class) ? `Школа ${user.school}, ${user.class} кл.` : 'Нет данных о школе';
        const displayGeo = (user?.region && user?.district) ? `${user.region}, ${user.district}` : '';

        // Проверяем, это ли текущий пользователь
        const isMe = (user?.telegram_id === currentUser?.telegram_id);
        if (isMe) {
            myRank = rank;
        }

        // Медали
        let rankIcon = rank;
        if (rank === 1) rankIcon = '🥇';
        if (rank === 2) rankIcon = '🥈';
        if (rank === 3) rankIcon = '🥉';

        // Собираем карточку HTML
        html += `
            <div class="leader-card" style="${isMe ? 'background-color: #f0f8ff;' : ''}">
                <div class="rank-num">${rankIcon}</div>
                <div class="leader-info">
                    <div class="leader-name">${displayName} ${isMe ? '(Вы)' : ''}</div>
                    <div class="leader-school">${displaySchool}</div>
                    <div class="leader-region">${displayGeo}</div>
                </div>
                <div class="leader-score">${score}</div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // 3. Обновляем плашку с вашим местом
    if (myRank !== '-') {
        rankDisplay.innerHTML = `Твое место: ${myRank} из ${totalParticipants}`;
    } else {
        rankDisplay.innerHTML = `Вы еще не участвовали`;
    }
}

