// 1. Инициализация Telegram
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрываем на весь экран

// Настройка цветов под тему
tg.setHeaderColor('bg_color'); 
tg.setBackgroundColor('bg_color');

// 2. Инициализация Supabase
// ВНИМАНИЕ: Вставьте сюда свои данные. 
// Я изменил имя переменной на 'sb', чтобы исправить ошибку.
const SUPABASE_URL = 'https://fgwnqxumukkgtzentlxr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnd25xeHVtdWtrZ3R6ZW50bHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODM2MTQsImV4cCI6MjA4MjA1OTYxNH0.vaZipv7a7-H_IyhRORUilvAfzFILWq8YAANQ_o95exI';

// Создаем подключение (используем имя sb вместо supabase, чтобы избежать конфликта)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 3. Логика переключения вкладок
function switchTab(tabName, element) {
    // Скрываем все экраны
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('rating-view').style.display = 'none';

    // Убираем подсветку со всех кнопок
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

    // Показываем нужный экран и меняем заголовок
    const title = document.getElementById('page-title');
    
    if (tabName === 'main') {
        document.getElementById('main-view').style.display = 'block';
        title.innerText = 'Тесты';
    } else if (tabName === 'rating') {
        document.getElementById('rating-view').style.display = 'block';
        title.innerText = 'Рейтинг';
    }

    // Подсвечиваем нажатую кнопку
    if (element) {
        element.classList.add('active');
    }
}

// Пример функции для получения данных (на будущее)
async function getTours() {
    // Используем sb вместо supabase
    const { data, error } = await sb
        .from('tours') // Замените на имя вашей таблицы
        .select('*');
        
    if (error) {
        console.error('Ошибка:', error);
    } else {
        console.log('Туры:', data);
    }
}

console.log("Приложение запущено без ошибок");
