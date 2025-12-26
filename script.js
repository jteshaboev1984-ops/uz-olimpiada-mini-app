// --- КОНФИГУРАЦИЯ ---
const SUPABASE_URL = 'https://fgwnqxumukkgtzentlxr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

// Инициализация
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const tg = window.Telegram.WebApp;

let currentUser = null; 

// --- ЗАПУСК ---
tg.expand();
initApp();

async function initApp() {
    // === ВАЖНО: ТЕСТОВЫЙ РЕЖИМ ВКЛЮЧЕН ===
    // Скрипт сначала ищет Телеграм, а если не находит — использует ID 139035406
    const tgId = tg.initDataUnsafe?.user?.id || 139035406; 

    if (!tgId) {
        console.log("Ошибка: ID не найден.");
        return;
    }

    console.log("Ваш ID:", tgId); // Покажет в консоли, под кем мы зашли

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
            showRegistration(); 
        }
    } else {
        currentUser = user;
        // 3. Проверяем регистрацию
        if (!user.name || !user.region || !user.district || !user.school) {
            showRegistration(); 
        } else {
            document.getElementById('registration-modal').classList.add('hidden');
        }
    }
}

// --- РЕГИСТРАЦИЯ ---
function showRegistration() {
    document.getElementById('registration-modal').classList.remove('hidden');
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
        alert('Ошибка: ' + error.message);
    } else {
        document.getElementById('registration-modal').classList.add('hidden');
        document.getElementById('main-tabbar').style.display = 'flex';
        
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
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));

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
        console.error(error);
        listContainer.innerHTML = '<p style="text-align:center; color:red">Ошибка загрузки</p>';
        return;
    }

    let html = '';
    let myRank = '-';
    let totalParticipants = data.length;

    data.forEach((item, index) => {
        const user = item.users;
        if (!user) return;

        const rank = index + 1;
        const score = item.score;
        const displayName = user.name || 'Аноним';
        const displaySchool = (user.school && user.class) ? `Школа ${user.school}, ${user.class} кл.` : 'Школа не указана';
        const displayGeo = (user.region && user.district) ? `${user.region}, ${user.district}` : '';

        const isMe = (user.telegram_id === currentUser?.telegram_id);
        if (isMe) myRank = rank;

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
    
    if (myRank !== '-') {
        rankDisplay.innerHTML = `Твое место: ${myRank} из ${totalParticipants}`;
    } else {
        rankDisplay.innerHTML = `Вы еще не проходили тур`;
    }
}
