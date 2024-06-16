import './style.css';
import logoImage from './assets/header.png';
import { Game } from './game.js';

// Подключение клиентской библиотеки Socket.IO
import io from 'socket.io-client';

// Установка соединения WebSocket
const socket = io('https://192.168.0.37:8765');

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

    createUserStatsContainer();
    updateHeader(isLoggedIn);
}

function updateHeader(isLoggedIn) {
    const signButtonsContainer = document.getElementById('sign-buttons-container');
    const logoutButtonContainer = document.getElementById('logout-button-container');
    const userStatsContainer = document.getElementById('user-stats-container');

    if (isLoggedIn) {
        userStatsContainer.style.display = 'grid';
        signButtonsContainer.style.display = 'none';
        logoutButtonContainer.style.display = 'flex';

    } else {
        userStatsContainer.style.display = 'none';
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
        if (userId) {
            // Пользователь авторизован, показываем интерфейс для авторизованных пользователей
            showGameInterface(userId);
        } else {
            console.error('UserId not found');
        }
    } else {
        // Пользователь не авторизован, показываем интерфейс для неавторизованных пользователей
        showAuthButtons();
    }
}

function showGameInterface(userId) {
    // Скрываем формы регистрации и авторизации
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';

    const userLogin = localStorage.getItem('userLogin');
    document.getElementById('user-login').textContent = userLogin;

    const userStats = {
        total: localStorage.getItem('userTotalGames'), // Пример сохранения общего количества игр
        win: localStorage.getItem('userWins'), // Пример сохранения количества побед
        rank: localStorage.getItem('userRank'), // Пример сохранения рейтинга пользователя
        lose: localStorage.getItem('userLoses'), // Пример сохранения количества поражений
    };

    updateAndShowUserStats(userStats.total, userStats.win, userStats.rank, userStats.lose);
    
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
    const playButton = document.getElementById('play-button');

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

    playButton.addEventListener('click', () => {
        const game = new Game();
        console.log(`Start playing...`);
        game.start();
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
            console.log(`Waiting response for login`);
            const response = await fetch('https://192.168.0.37:8765/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ login, password }),
            });
            console.log(`Received response: ${response}`);
            if (response.ok) {
                const data = await response.json();
                // Сохраняем токен и другие данные в localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userId', data.userId);
                console.log('userId сохранен в localStorage:', data.userId);
                localStorage.setItem('userLogin', login);

                if (data && data.stats) {
                    console.log(`Success! data: ${data}, stats:${data.stats}`);
                    localStorage.setItem('userTotalGames', data.stats.total);
                    localStorage.setItem('userWins', data.stats.win);
                    localStorage.setItem('userRank', data.stats.rating);
                    localStorage.setItem('userLoses', data.stats.lose);
                } else {
                    console.log(`Fail! data: ${data}, stats:${data.stats}`);
                }
    
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
            const response = await fetch('https://192.168.0.37:8765/api/auth/register', {
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
                localStorage.setItem('userLogin', login);

                if (data && data.stats) {
                    console.log(`Success! data: ${data}, stats:${data.stats}`);
                    localStorage.setItem('userTotalGames', data.stats.total);
                    localStorage.setItem('userWins', data.stats.win);
                    localStorage.setItem('userRank', data.stats.rating);
                    localStorage.setItem('userLoses', data.stats.lose);
                } else {
                    console.log(`Fail! data: ${data}, stats:${data.stats}`);
                }
    
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
    // // Установка соединения WebSocket
    // После успешного подключения к серверу
    socket.on('connect', () => {
        console.log('Connected to the server via WebSocket');
            
        // Проверяем, авторизован ли пользователь
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        console.log(`Connect в WS - isLoggedIn: ${isLoggedIn}`);
        if (isLoggedIn) {
            // Если пользователь авторизован, отправляем информацию о его статусе на сервер
            const userId = localStorage.getItem('userId');
            console.log(`Connect в WS - userId: ${userId}`);
            if (userId) {
                console.log('Отправка login с userId после перезагрузки:', userId);
                socket.emit('login', userId);
            } else {
                console.error('UserId not found');
            }
        }
    });

    // Обработка события 'onlinePlayers', которое обновляет список онлайн-игроков
    socket.on('onlinePlayers', (onlinePlayers) => {
        console.log('Online players:', onlinePlayers);
        updateOnlinePlayers(onlinePlayers);
    });

    // Обработка других событий WebSocket, если требуется
    // Например, обработка сообщений чата, уведомлений о начале игры и т.д.

    // Обработка события закрытия страницы/вкладки для корректного отключения от WebSocket сервера
    window.addEventListener('beforeunload', () => {
        const userId = localStorage.getItem('userId');
        console.log('Отправка logout с userId:', userId);
        socket.emit('logout', userId); // Уведомляем сервер о выходе
        socket.disconnect();
    });

    socket.on('connect_error', function(err) {
        console.error('Ошибка подключения:', err);
    });
      
      socket.on('error', function(err) {
        console.error('Произошла ошибка:', err);
    });
}

function updateOnlinePlayers(players) {
    // Получаем элемент панели онлайн-игроков
    const panel = document.getElementById('online-players-panel');
    // Очищаем текущий список
    panel.innerHTML = '';
    
    // Создаем и добавляем заголовок
    const header = document.createElement('h3');
    header.textContent = 'Players online';
    panel.appendChild(header);

    // Создаем и добавляем разделительную линию
    const divider = document.createElement('hr');
    divider.style.marginBottom = '20px';
    panel.appendChild(divider);

    // Проверяем, что полученный список игроков является массивом
    if (Array.isArray(players)) {
        // Проходим по массиву игроков и создаем для каждого элемент списка
        players.forEach(player => {
            const playerContainer = document.createElement('div');
            playerContainer.classList.add('player-container');
            playerContainer.onclick = () => sendInvitation(player.id);

            const loginSpan = document.createElement('span');
            loginSpan.classList.add('player-login');
            loginSpan.textContent = player.login;
            loginSpan.style.width = '70%';

            const ratingSpan = document.createElement('span');
            ratingSpan.classList.add('player-rating');
            ratingSpan.textContent = player.rating;
            ratingSpan.style.width = '20%';

            const statusLabel = document.createElement('span');
            statusLabel.classList.add('status-label');
            statusLabel.innerHTML = '<i class="fas fa-exclamation-circle" style="color: green;"></i>';
            statusLabel.style.width = '10%';

            playerContainer.appendChild(loginSpan);
            playerContainer.appendChild(ratingSpan);
            playerContainer.appendChild(statusLabel);
            panel.appendChild(playerContainer);
        });
    } else {
        console.error('Expected players to be an array, but got:', players);
    }
}

function sendInvitation(playerId) {
    console.log(`Отправлено приглашение игроку с ID: ${playerId}`);
    // Здесь будет логика отправки приглашения
}

function setUserOnline(userId) {
    // Отправляем событие 'userOnline' на сервер через WebSocket
    // с идентификатором пользователя в качестве данных
    socket.emit('login', userId);
}

// Обработчик события переподключения
socket.on('reconnect', () => {
    console.log('Reconnected to the server');
    
    // Переотправляем информацию о пользователе на сервер
    // Здесь предполагается, что у вас есть функция getCurrentUserId(),
    // которая возвращает идентификатор текущего пользователя
    const userId = localStorage.getItem('userId');
    if (userId) {
      socket.emit('login', userId);
    }
  });

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
    localStorage.removeItem('userLogin');

    // Обновляем интерфейс для неавторизованных пользователей
    showAuthButtons();
}

function createUserStatsContainer() {
    const userStatsContainer = document.createElement('div');
    userStatsContainer.id = 'user-stats-container';
    userStatsContainer.style.display = 'grid'; // Изначально скрыт


    // Создаем ячейки для статистики
    const totalGames = document.createElement('div');
    totalGames.className = 'stats-cell'; // Применяем класс
    const totalWins = document.createElement('div');
    totalWins.className = 'stats-cell'; // Применяем класс
    const userRank = document.createElement('div');
    userRank.className = 'stats-cell'; // Применяем класс
    const totalLoses = document.createElement('div');
    totalLoses.className = 'stats-cell'; // Применяем класс

    // Добавляем ячейки в контейнер статистики
    userStatsContainer.appendChild(totalGames);
    userStatsContainer.appendChild(totalWins);
    userStatsContainer.appendChild(userRank);
    userStatsContainer.appendChild(totalLoses);

    // Добавляем контейнер статистики в DOM
    const header = document.getElementById('header');
    const buttonsContainer = document.getElementById('buttons-container');
    header.insertBefore(userStatsContainer, buttonsContainer); // Вставляем перед buttons-container
}

function updateAndShowUserStats(total, win, rank, lose) {
    // Обновляем статистику пользователя
    document.querySelector('#user-stats-container div:nth-child(1)').textContent = `TOTAL: ${total}`;
    document.querySelector('#user-stats-container div:nth-child(2)').textContent = `WIN: ${win}`;
    document.querySelector('#user-stats-container div:nth-child(3)').textContent = `RANK: ${rank}`;
    document.querySelector('#user-stats-container div:nth-child(4)').textContent = `LOSE: ${lose}`;
}

window.addEventListener('beforeunload', () => {
    // Отправляем событие 'userOffline' на сервер через WebSocket
    // с идентификатором пользователя в качестве данных
    socket.emit('userOffline', userId);
    socket.disconnect();
});
