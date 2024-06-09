import './style.css';
import logoImage from './assets/header.png';

// Подключение клиентской библиотеки Socket.IO
import io from 'socket.io-client';

// Установка соединения WebSocket
const socket = io('https://localhost:8765');

window.onload = function() {
    // Проверяем статус авторизации и устанавливаем UI
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; // Преобразуем строку в boolean
    initializeHeader(isLoggedIn);
    setupEventHandlers();
    restoreUIState(isLoggedIn);
    setupWebSocket(); // Установка WebSocket соединения и обработчиков событий
};

function initializeHeader(isLoggedIn) {
    // Получаем элемент шапки
    const headerElement = document.getElementById('header');

    // Создаем изображение логотипа
    const headerLogo = document.createElement('img');
    headerLogo.src = logoImage; // Путь к изображению логотипа
    headerLogo.alt = 'logo';
    headerLogo.classList.add('logo');

    // Создаем контейнер для логотипа и добавляем его в шапку
    const logoContainer = document.createElement('div');
    logoContainer.classList.add('logo-container');
    logoContainer.appendChild(headerLogo);

    // Создаем контейнер для кнопок
    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'buttons-container';
    buttonsContainer.classList.add('buttons-container');

    // Создаем кнопки входа и регистрации
    const signInButton = createButton('header-sign-in-button', 'Sign in');
    const signUpButton = createButton('header-sign-up-button', 'Sign up');
    const logoutButton = createButton('logout-button', 'Logout');

    // Создаем контейнеры для кнопок входа/регистрации и выхода
    const signButtonsContainer = document.createElement('div');
    signButtonsContainer.id = 'sign-buttons-container';
    signButtonsContainer.classList.add('sign-buttons-container');
    signButtonsContainer.appendChild(signInButton);
    signButtonsContainer.appendChild(signUpButton);

    const logoutButtonContainer = document.createElement('div');
    logoutButtonContainer.id = 'logout-button-container';
    logoutButtonContainer.classList.add('logout-button-container');

    // Создаем контейнер для информации о пользователе
    const userInfo = document.createElement('div');
    userInfo.id = 'user-info';
    userInfo.classList.add('user-info');

    // Создаем элемент для аватара пользователя
    const userAvatar = document.createElement('div');
    userAvatar.classList.add('user-avatar');

    // Создаем элемент span для отображения логина пользователя
    const userLogin = document.createElement('span');
    userLogin.id = 'user-login';
    userLogin.textContent = 'Username'; // Значение по умолчанию, можно обновить позже

    // Добавляем аватар и логин в контейнер userInfo
    userInfo.appendChild(userAvatar);
    userInfo.appendChild(userLogin);

    // Добавляем userInfo и logoutButton в logoutButtonContainer
    logoutButtonContainer.appendChild(userInfo);
    logoutButtonContainer.appendChild(logoutButton);

    // Добавляем контейнеры кнопок в контейнер кнопок
    buttonsContainer.appendChild(signButtonsContainer);
    buttonsContainer.appendChild(logoutButtonContainer);

    // Добавляем контейнеры в шапку
    headerElement.appendChild(logoContainer);
    headerElement.appendChild(buttonsContainer);

    updateHeader(isLoggedIn);
}

function updateHeader(isLoggedIn) {
    const signButtonsContainer = document.getElementById('sign-buttons-container');
    const logoutButtonContainer = document.getElementById('logout-button-container');

    if (isLoggedIn) {
        signButtonsContainer.style.display = 'none';
        logoutButtonContainer.style.display = 'flex'; // Изначально скрыт
    } else {
        signButtonsContainer.style.display = 'flex';
        logoutButtonContainer.style.display = 'none'; // Изначально скрыт
    }
}

function createButton(id, text) {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    return button;
}

function restoreUIState(isLoggedIn) {
    if (isLoggedIn) {
        const userId = localStorage.getItem('userId');
        // Пользователь авторизован, показываем интерфейс для авторизованных пользователей
        showGameInterface(userId);
    } else {
        // Пользователь не авторизован, показываем интерфейс для неавторизованных пользователей
        showAuthButtons();
    }
}

function showGameInterface(userId) {
    // Скрываем формы регистрации и авторизации
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';

    // Здесь должен быть код для получения логина пользователя, например, из API или localStorage
    const userLogin = "KarapetMayBenotGenius"; // Замените на актуальное получение логина пользователя
    document.getElementById('user-login').textContent = userLogin;

    // Обновляем шапку
    updateHeader(true);

    // Показываем игровой интерфейс и боковую панель игроков
    document.getElementById('game-interface').style.display = 'block';
    document.getElementById('online-players-panel').style.display = 'block';

    // Обновляем статус пользователя на онлайн
    setUserOnline(userId);
}

function showAuthButtons() {
    // Скрываем игровой интерфейс и боковую панель игроков
    document.getElementById('game-interface').style.display = 'none';
    document.getElementById('online-players-panel').style.display = 'none';

    // Обновляем шапку
    updateHeader(false);

    // Скрываем формы авторизации и регистрации, если они были открыты
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
}

function setupEventHandlers() {
    const signInButton = document.getElementById('header-sign-in-button');
    const signUpButton = document.getElementById('header-sign-up-button');
    const logoutButton = document.getElementById('logout-button');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const registerLink = document.getElementById('register-link');
    const cancelButton = document.getElementById('cancel-button');
    const regCancelButton = document.getElementById('reg-cancel-button');
    const authForm = document.getElementById('auth-form');
    const registerForm = document.getElementById('register-form');
    const singButtonsContainer = document.getElementById('sign-buttons-container');

    // Обработчик для кнопки "Вход"
    signInButton.addEventListener('click', () => {
        singButtonsContainer.style.display = 'none';
        authForm.style.display = 'block';
    });

    // Обработчик для кнопки "Регистрация"
    signUpButton.addEventListener('click', () => {
        singButtonsContainer.style.display = 'none';
        registerForm.style.display = 'block';
    });

    // Обработчик для кнопки "Выход"
    logoutButton.addEventListener('click', () => {
        logout();
    });

    // Обработчик для кнопки "Войти" на форме авторизации
    loginButton.addEventListener('click', async () => {
        const loginInput = document.getElementById('login');
        const passwordInput = document.getElementById('password');
        const login = loginInput.value;
        const password = passwordInput.value;
    
        // Проверка на заполненность полей
        if (!login || !password) {
            alert('Please fill in both login and password fields');
            return;
        }
    
        try {
            const response = await fetch('https://localhost:8765/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ login, password }),
            });
    
            if (response.ok) {
                const data = await response.json();
                // Сохраняем токен и другие данные в localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userId', data.userId);
    
                // Обновляем интерфейс для отображения авторизованного пользователя
                showGameInterface(data.userId);
            } else {
                // Если авторизация не удалась, отобразите сообщение об ошибке
                alert('Invalid login or password');
            }
        } catch (error) {
            console.error('Login failed:', error);
            alert('An error occurred during login. Please try again later.');
        }
    });

    // Обработчик для кнопки "Зарегистрироваться" на форме регистрации
    registerButton.addEventListener('click', async () => {
        const loginInput = document.getElementById('reg-login');
        const passwordInput = document.getElementById('reg-password');
        const passwordConfirmInput = document.getElementById('reg-password-confirm');
        const emailInput = document.getElementById('reg-email');
        const errorMessageDiv = document.getElementById('register-error-message');
    
        const login = loginInput.value.trim();
        const password = passwordInput.value.trim();
        const passwordConfirm = passwordConfirmInput.value.trim();
        const email = emailInput.value.trim();
    
        // Очистка предыдущих сообщений об ошибках
        errorMessageDiv.textContent = '';
    
        // Проверка на заполненность полей
        if (!login || !password || !passwordConfirm || !email) {
            errorMessageDiv.textContent = 'All fields are required.';
            return;
        }

        // Проверка длины логина
        if (login.length > 20) {
            errorMessageDiv.textContent = 'Login must be 20 characters or fewer.';
            return;
        }
    
        // Проверка на совпадение паролей
        if (password !== passwordConfirm) {
            errorMessageDiv.textContent = 'Passwords do not match.';
            return;
        }
    
        try {
            const response = await fetch('https://localhost:8765/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ login, password, email }),
            });
    
            if (response.ok) {
                const data = await response.json();
                // Сохраняем данные пользователя и токен авторизации в localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userId', data.userId);
    
                // Обновляем интерфейс для отображения авторизованного пользователя
                showGameInterface(data.userId);
            } else {
                // Если регистрация не удалась, отобразите сообщение об ошибке
                const errorData = await response.json();
                errorMessageDiv.textContent = errorData.message || 'Registration failed. Please try again.';
            }
        } catch (error) {
            console.error('Registration failed:', error);
            errorMessageDiv.textContent = 'An error occurred during registration. Please try again later.';
        }
    });
    
    // Обработчик для ссылки "Регистрация" на форме авторизации
    registerLink.addEventListener('click', () => {
        authForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    // Обработчик для кнопки "Отмена" на форме авторизации
    cancelButton.addEventListener('click', () => {
        authForm.style.display = 'none';
        singButtonsContainer.style.display = 'flex';
    });

    // Обработчик для кнопки "Отмена" на форме регистрации
    regCancelButton.addEventListener('click', () => {
        registerForm.style.display = 'none';
        authForm.style.display = 'block';
    });
}

function setupWebSocket() {
    // Установка соединения WebSocket
    const socket = io('https://localhost:8765');

    // Обработка события 'onlinePlayers', которое обновляет список онлайн-игроков
    socket.on('onlinePlayers', (onlinePlayers) => {
        console.log('Online players:', onlinePlayers);
        updateOnlinePlayers(onlinePlayers);
    });

    // Обработка других событий WebSocket, если требуется
    // Например, обработка сообщений чата, уведомлений о начале игры и т.д.

    // Обработка события закрытия страницы/вкладки для корректного отключения от WebSocket сервера
    window.addEventListener('beforeunload', () => {
        socket.disconnect();
    });
}

function updateOnlinePlayers(players) {
    // Получаем элемент панели онлайн-игроков
    const panel = document.getElementById('online-players-panel');
    // Очищаем текущий список
    panel.innerHTML = '';

    // Проверяем, что полученный список игроков является массивом
    if (Array.isArray(players)) {
        // Проходим по массиву игроков и создаем для каждого элемент списка
        players.forEach(player => {
            // Создаем элемент списка
            const playerItem = document.createElement('div');
            playerItem.classList.add('player-item');
            // Устанавливаем текст элемента, используя логин игрока
            playerItem.textContent = player.login;
            // Добавляем элемент списка в панель онлайн-игроков
            panel.appendChild(playerItem);
        });
    } else {
        console.error('Expected players to be an array, but got:', players);
    }
}

function setUserOnline(userId) {
    // Отправляем событие 'userOnline' на сервер через WebSocket
    // с идентификатором пользователя в качестве данных
    socket.emit('login', userId);
}

function logout() {
    // Если используется WebSocket, отправляем на сервер уведомление о выходе пользователя
    // Это предполагает, что у вас уже есть глобальная переменная socket для WebSocket соединения
    // и что сервер обрабатывает событие 'logout'
    socket.emit('logout', localStorage.getItem('userId'));

    // Устанавливаем статус авторизации в false
    localStorage.setItem('isLoggedIn', false);
    // Удаляем данные авторизации из localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');

    // Обновляем интерфейс для неавторизованных пользователей
    showAuthButtons();

    // Дополнительно можно перенаправить пользователя на главную страницу или страницу входа
    // window.location.href = '/login.html'; // Например, если у вас есть отдельная страница входа
}

window.addEventListener('beforeunload', () => {
    // Отправляем событие 'userOffline' на сервер через WebSocket
    // с идентификатором пользователя в качестве данных
    socket.emit('userOffline', userId);
    socket.disconnect();
});
