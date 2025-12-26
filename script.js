// --- КОНФИГУРАЦИЯ ---
const SUPABASE_URL = 'https://fgwnqxumukkgtzentlxr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

// Инициализация Supabase и Telegram
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const tg = window.Telegram.WebApp;

let currentUser = null; 

// --- ЗАПУСК ---
tg.expand();
initApp();

async function initApp() {
    // Получаем ID пользователя
    const tgId = tg.initDataUnsafe?.user?.id;
    // const tgId = 139035406; // Раскомментировать ТОЛЬКО для тестов в браузере

    if (!tgId) {
        console.log("Приложение открыто не в Telegram. Функции ограничены.");
        return;
    }

    // 1. Ищем пользователя в базе
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgId)
        .single();

    if (error || !user) {
        // 2. Если нет — создаем нового
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{ telegram_id: tgId }])
            .select()
            .single();
        
        if (newUser) {
            currentUser = newUser;
            showRegistration(); // Сразу просим заполнить данные
        }
    } else {
        currentUser = user;
        // 3. Проверяем, заполнены ли обязательные поля
        if (!user.name || !user.region || !user.district || !user.school) {
            showRegistration(); 
        } else {
            // Если всё ок — скрываем регистрацию, показываем меню
            document.getElementById('registration-modal').classList.add('hidden');
        }
    }
}

// --- ФУНКЦИИ РЕГИСТРАЦИИ ---

function showRegistration() {
    document.getElementById('registration-modal').classList.remove('hidden');
    // Скрываем нижнее меню, чтобы нельзя было уйти
    document.getElementById('main-tabbar').style.display = 'none';
}

async function submitRegistration() {
    const name = document.getElementById('reg-name').value;
    const region = document.getElementById('reg-region').value;
    const district = document.getElementById('reg-district').value;
    const school = document.getElementById('reg-school').value;
    const userClass = document.getElementById('reg-class').value;

    // Простая валидация
    if (!name || !region || !district || !school || !userClass) {
        document.getElementById('reg-error').style.display = 'block';
        return;
    }

    // Сохраняем в базу
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
        alert('Ошибка при сохранении: ' + error.message);
    } else {
        // Успех
        document.getElementById('registration-modal').classList.add('hidden');
        document.getElementById('main-tabbar').style.display = 'flex';
        
        // Обновляем данные в памяти
        currentUser.name = name;
        currentUser.region = region;
        currentUser.district = district;
        currentUser.school = school;
        currentUser.class = userClass;
        
        openTab('home');
    }
}

// --- НАВИГАЦИЯ ---

function openTab(tabName) {
    // Скрыть всё
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));

    // Показать нужное
    if (tabName === 'home') {
        document.getElementById('home-screen').classList.add('active');
        document.querySelectorAll('.tab-item')[0].classList.add('active');
    } else if (tabName === 'leaderboard') {
        document.getElementById('leaderboard-screen').classList.add('active');
        document.querySelectorAll('.tab-item')[1].classList.add('active');
        loadLeaderboard(); 
    }
}

// --- ЛИДЕРБОРД ---

async function loadLeaderboard() {
    const listContainer = document.getElementById('leaderboard-list');
    const rankDisplay = document.getElementById('user-rank-display');
    
    listContainer.innerHTML = '<div class="loading">Загрузка рейтинга...</div>';

    // Запрос: берем баллы из tour_progress и данные юзера из users
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
        listContainer.innerHTML = '<p style="text-align:center; color:red">Не удалось загрузить данные</p>';
        console.error(error);
        return;
    }

    let html = '';
    let myRank = '-';
    let totalParticipants = data.length;

    // Перебираем всех участников
    data.forEach((item, index) => {
        const user = item.users;
        
        // Защита от удаленных пользователей
        if (!user) return;

        const rank = index + 1;
        const score = item.score;

        // Формируем красивый вывод данных
        const displayName = user.name || 'Аноним';
        const displaySchool = (user.school && user.class) ? `Школа ${user.school}, ${user.class} кл.` : 'Школа не указана';
        const displayGeo = (user.region && user.district) ? `${user.region}, ${user.district}` : '';

        // Проверяем, это ли я
        const isMe = (user.telegram_id === currentUser?.telegram_id);
        if (isMe) myRank = rank;

        // Иконки для топ-3
        let rankIcon = rank;
        if (rank === 1) rankIcon = '🥇';
        if (rank === 2) rankIcon = '🥈';
        if (rank === 3) rankIcon = '🥉';

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
    
    // Обновляем текст с местом
    if (myRank !== '-') {
        rankDisplay.innerHTML = `Твое место: ${myRank} из ${totalParticipants}`;
    } else {
        rankDisplay.innerHTML = `Вы еще не проходили тур`;
    }
}
// КОНЕЦ КОДА
