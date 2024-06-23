import './style.css';
import logoImage from './assets/header.png';
import { Game } from './game.js';

// Подключение клиентской библиотеки Socket.IO
import io from 'socket.io-client';

// Установка соединения WebSocket
const socket = io('https://192.168.0.37:8765');

const INVITATION_SENT_ICON = '<i class="fas fa-exclamation-circle" style="color: green;"></i>'; // Значок для отправленного приглашения
const INVITATION_RECEIVED_ICON = '<i class="fas fa-question-circle" style="color: yellow;"></i>'; // Значок для полученного приглашения
// Массивы для отслеживания отправленных и полученных приглашений
let sentInvitations = [];
let receivedInvitations = [];
let onlinePlayersList = [];
let countdownInterval;
let isGameActive = false;
let currentOpponentId = null;
let gameInstance = null;

window.onload = function() {
    // Проверяем статус авторизации и устанавливаем UI
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; // Преобразуем строку в boolean
    initializeHeader(isLoggedIn);
    if (isLoggedIn) {
        const userId = localStorage.getItem('userId');
        if (userId) {
            socket.emit('login', userId);
        }
        restoreUIState(true);
    } else {
        restoreUIState(false);
    }
    setupWebSocket(); // Установка WebSocket соединения и обработчиков событий
    createModalWindow();
    setupEventHandlers();
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
    initOnlinePlayersPanel();
    updateHeader(isLoggedIn);
}

function initOnlinePlayersPanel() {
    const panel = document.getElementById('online-players-panel');
    panel.innerHTML = ''; // Очищаем панель для инициализации

    // Создаем и добавляем заголовок
    const header = document.createElement('h3');
    header.textContent = 'Players online';
    panel.appendChild(header);

    // Создаем и добавляем разделительную линию
    const divider = document.createElement('hr');
    divider.style.marginBottom = '20px';
    panel.appendChild(divider);

    // Создаем контейнер для списка игроков
    const playersListContainer = document.createElement('div');
    playersListContainer.id = 'players-list-container';
    panel.appendChild(playersListContainer);
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
    const declineButton = document.getElementById('declineButton'); 

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
            const response = await fetch('https://192.168.0.37:8765/api/auth/login', {
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

    // Обработчик события для кнопки "Отказаться"
    declineButton.addEventListener('click', () => {
        // Получаем myId из localStorage
        const myId = localStorage.getItem('userId');

        // Проверяем, что myId действительно получен
        if (myId && currentOpponentId) {
            // Отправляем сигнал declineGame на сервер, включая myId
            socket.emit('declineGame', { senderId: currentOpponentId, recipientId: myId });
        } else {
            console.log("Ошибка: Не удалось получить идентификатор пользователя из localStorage.");
        }        
    });
}

function setupWebSocket() {
    // // Установка соединения WebSocket
    // После успешного подключения к серверу
    socket.on('connect', () => {
        console.log('Connected to the server via WebSocket');
            
        // Проверяем, авторизован ли пользователь
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            // Если пользователь авторизован, отправляем информацию о его статусе на сервер
            const userId = localStorage.getItem('userId');
            if (userId) {
                socket.emit('login', userId);
            } else {
                console.error('UserId not found');
            }
        }
    });

    // Обработка события 'onlinePlayers', которое обновляет список онлайн-игроков
    socket.on('onlinePlayers', (onlinePlayers) => {
        console.log('Online players:', onlinePlayers);
        onlinePlayersList = onlinePlayers;
        updateOnlinePlayers();
    });

    // Обработка других событий WebSocket, если требуется
    // Например, обработка сообщений чата, уведомлений о начале игры и т.д.

    // Обработка события закрытия страницы/вкладки для корректного отключения от WebSocket сервера
    window.addEventListener('beforeunload', () => {
        const userId = localStorage.getItem('userId'); // Получаем userId из localStorage
        if (userId) {
            socket.emit('logout', userId); // Уведомляем сервер о выходе пользователя
        } else {
            // Если userId по какой-то причине отсутствует, можно отправить другое событие или обработать этот случай иначе
            socket.emit('userOffline'); // Уведомляем сервер, что пользователь уходит офлайн
        }
        socket.disconnect(); // Отключаемся от WebSocket сервера
    });

    socket.on('connect_error', function(err) {
        console.error('Ошибка подключения:', err);
    });
      
      socket.on('error', function(err) {
        console.error('Произошла ошибка:', err);
    });
}

function updateOnlinePlayers() {
    console.log(`Всего получегно приглашений: ${receivedInvitations.length}`);
    const players = onlinePlayersList;
    console.log(`Список игроков в updateOnlinePlayers: ${players}`);

    // Получаем контейнер для списка игроков
    const playersListContainer = document.getElementById('players-list-container');
    playersListContainer.innerHTML = ''; // Очищаем текущий список игроков

    // Проверяем, что полученный список игроков является массивом
    if (Array.isArray(players)) {
        console.log(`Онлайн игроков на панели должно быть: ${players.length}`);
        // Проходим по массиву игроков и создаем для каждого элемент списка
        players.forEach(player => {
            const playerContainer = document.createElement('div');
            playerContainer.classList.add('player-container');
            playerContainer.onclick = () => sendInvitation(player.id, player.login);

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
            statusLabel.style.width = '10%';
            // Установка значка статуса в зависимости от состояния приглашения
            if (invitationSentTo(player.id)) {
                console.log(`Установка значка отправки приглашения`);
                statusLabel.innerHTML = INVITATION_SENT_ICON; // Приглашение отправлено
            } else if (invitationReceivedFrom(player.id)) {
                console.log(`Установка значка получения приглашения`);
                statusLabel.innerHTML = INVITATION_RECEIVED_ICON; // Приглашение получено
            } else {
                statusLabel.innerHTML = ''; // Нет значка по умолчанию
            }

            playerContainer.appendChild(loginSpan);
            playerContainer.appendChild(ratingSpan);
            playerContainer.appendChild(statusLabel);
            playersListContainer.appendChild(playerContainer);
        });
    } else {
        console.error('Expected players to be an array, but got:', players);
    }
}

function sendInvitation(playerId, playerLogin) {
    // Предотвращаем клики по игрокам во время игры
    if (isGameActive) {
        console.log("Игра уже идет. Клики по игрокам заблокированы.");
        return;
    }
    // Проверяем, получено ли приглашение от этого игрока
    if (invitationReceivedFrom(playerId)) {
        console.log(`Проверяем, что получено приглашение от ${playerLogin}`);
        acceptInvitationEvent(playerId, playerLogin);
    } else {
        // Проверяем, было ли уже отправлено приглашение этому игроку
        console.log(`Запуск sendInvitation для playerId: ${playerId}`);
        if (invitationSentTo(playerId)) {
            // Отменяем приглашение
            cancelInvitation(playerId);
            alert("Приглашение отменено.");
        } else {
            // Проверяем, не превышено ли количество отправленных приглашений
            console.log(`Осталось приглашений: ${sentInvitations.length}`);
            if (sentInvitations.length >= 3) {
                alert("Вы не можете отправить более трех приглашений.");
                return;
            }

            console.log(`Вызываем событие sendInvitation`);
            // Отправляем приглашение игроку с playerId через WebSocket
            socket.emit('sendInvitation', { recipientId: playerId });

            console.log(`Вызываем метод  addSentInvitation`);
            // Добавляем playerId в список отправленных приглашений
            addSentInvitation(playerId);
        }
    }

    console.log(`Обновляем список онлайн-игроков после отправки приглашения`);
    // Обновляем список онлайн-игроков
    updateOnlinePlayers();
}

function acceptInvitationEvent(playerId) {
    // Получаем myId из localStorage
    const myId = localStorage.getItem('userId');

    // Проверяем, что myId действительно получен
    if (myId) {
        // Отправляем сигнал acceptInvitation на сервер, включая myId
        socket.emit('acceptInvitation', { senderId: playerId, recipientId: myId });
    } else {
        console.log("Ошибка: Не удалось получить идентификатор пользователя из localStorage.");
    }
}

// Функция для отмены уже отправленного приглашения
function cancelInvitation(playerId) {
    // Удаляем playerId из списка отправленных приглашений
    sentInvitations = sentInvitations.filter(id => id !== playerId);

    // Отправляем сигнал об отмене приглашения через WebSocket
    socket.emit('cancelInvitation', { recipientId: playerId });
}

// Функция для проверки, было ли отправлено приглашение игроку с данным ID
function invitationSentTo(playerId) {
    console.log(`Вызван метод проверки отправки приглашения`);
    return sentInvitations.includes(playerId);
}

// Функция для проверки, было ли получено приглашение от игрока с данным ID
function invitationReceivedFrom(playerId) {
    console.log(`Вызван метод проверки получения приглашения`);
    return receivedInvitations.includes(playerId);
}

// Функция для добавления ID игрока в массив отправленных приглашений
function addSentInvitation(playerId) {
    console.log(`Запуск метода addSentInvitation дял playerId: ${playerId}`);
    if (!invitationSentTo(playerId)) {
        sentInvitations.push(playerId);
        updateOnlinePlayers();
    }
}

// Функция для добавления ID игрока в массив полученных приглашений
function addReceivedInvitation(playerId) {
    if (!invitationReceivedFrom(playerId)) {
        receivedInvitations.push(playerId);
        console.log(`Полученные приглашения: ${receivedInvitations}`);
        updateOnlinePlayers();
    }
}

// Обработка получения приглашения
socket.on('invitationReceived', (data) => {
    const { from: senderId } = data;
    console.log(`Получено приглашение от игрока с ID: ${senderId}`);

    // Добавляем ID отправителя в список полученных приглашений
    addReceivedInvitation(senderId);

    console.log(`После добавления в список получено приглашение от игрока с ID: ${senderId}`);
    
    // Обновляем интерфейс, чтобы отразить полученное приглашение
    updateOnlinePlayers();
});

// Обработка отмены приглашения
socket.on('invitationCancelled', (data) => {
    const { from: senderId } = data;
    console.log(`Приглашение от игрока с ID: ${senderId} отменено`);
    receivedInvitations = receivedInvitations.filter(id => id !== senderId);

    // Обновляем интерфейс, чтобы отразить полученное приглашение
    updateOnlinePlayers();
});

socket.on('gameStart', (data) => {
    const { opponentLogin, opponentId } = data; // ID игрока, который принял ваше приглашение
    currentOpponentId = opponentId;

    console.log(`GameStart with ${opponentLogin} - ${opponentId}`);

    // Показываем модальное окно с обратным отсчетом
    showInvitationModal(opponentLogin);

    // Очищаем значок приглашения у текущего пользователя
    receivedInvitations = receivedInvitations.filter(id => id !== opponentId);
    console.log(`Событие в клиенте - Принято приглашение от ${opponentId}`);
    // Удаление ID игрока из массива отправленных приглашений
    sentInvitations = sentInvitations.filter(id => id !== opponentId);

    // Обновление интерфейса для отражения изменений
    updateOnlinePlayers();
});

socket.on('gameDeclined', () => {
    // Останавливаем обратный отсчет и закрываем модальное окно
    clearInterval(countdownInterval);
    const invitationModal = document.getElementById('invitationModal');
    const modalContent = document.getElementById("modal-content");
    invitationModal.style.display = 'none';
    modalContent.style.display = 'none';

    console.log("Игра отменена. Обратный отсчет остановлен.");
    // Выполнение других действий для отмены игры, если это необходимо
});

socket.on('opponentGameStateUpdate', (data) => {
    const { gameState } = data;
    if (gameInstance) {
        gameInstance.drawOpponentField(gameState); // Обновление поля соперника
    }
});

function setUserOnline(userId) {
    console.log(`Вызов метода setUserOnline для userId: ${userId}`);
    if (!localStorage.getItem('loginSent')) {
        socket.emit('login', userId);
        localStorage.setItem('loginSent', 'true');
        console.log('Отправка login с userId:', userId);
    }
}

// Обработчик события переподключения
socket.on('reconnect', () => {
    console.log('Reconnected to the server');
    
    // Переотправляем информацию о пользователе на сервер
    // Здесь предполагается, что у вас есть функция getCurrentUserId(),
    // которая возвращает идентификатор текущего пользователя
    const userId = localStorage.getItem('userId');
    console.log(`Reconnect в WS - userId: ${userId}`);
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
    localStorage.removeItem('loginSent'); // Добавлено удаление флага loginSent

    // Обновляем интерфейс для неавторизованных пользователей
    showAuthButtons();

    // Отключаемся от WebSocket сервера
    socket.disconnect();
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

// Функция для начала игры
function startGame() {
    isGameActive = true;
    gameInstance = new Game(currentOpponentId, socket);
    console.log(`Start playing...`);
    gameInstance.start();
    gameInstance.sendGameState();
}

function createModalWindow() {
    // Создаем основной контейнер модального окна
    const modal = document.createElement('div');
    modal.id = 'invitationModal';
    modal.className = 'modal';

    // Создаем контент модального окна
    const modalContent = document.createElement('div');
    modalContent.id = 'modal-content';
    modalContent.className = 'modal-content';

    // Создаем параграф с текстом приглашения
    const invitationText = document.createElement('p');
    invitationText.id = 'invitationText';
    invitationText.textContent = 'Игра с ';

    // Создаем span для логина соперника
    const opponentLogin = document.createElement('span');
    opponentLogin.id = 'opponentLogin';

    // Добавляем span в параграф с текстом приглашения
    invitationText.appendChild(opponentLogin);
    invitationText.append(' начнется через ');

    // Создаем параграф с обратным отсчетом
    const countdownText = document.createElement('p');
    countdownText.id = 'countdownText';

    // Создаем span для обратного отсчета
    const countdown = document.createElement('span');
    countdown.id = 'countdown';
    countdown.textContent = '10';

    // Добавляем текст и span в параграф обратного отсчета
    countdownText.appendChild(countdown);
    countdownText.append(' секунд');

    // Создаем контейнер для кнопки
    const buttonContainer = document.createElement('div');

    // Создаем кнопку отказа
    const declineButton = document.createElement('button');
    declineButton.id = 'declineButton';
    declineButton.textContent = 'Отказаться';

    // Добавляем кнопку в ее контейнер
    buttonContainer.appendChild(declineButton);

    // Собираем все части вместе
    modalContent.appendChild(invitationText);
    modalContent.appendChild(countdownText);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);

    // Добавляем модальное окно в body
    document.body.appendChild(modal);
}

function showInvitationModal(opponentName) {
    // Получение элементов модального окна
    const invitationModal = document.getElementById('invitationModal');
    const opponentLogin = document.getElementById('opponentLogin');
    const countdownElement = document.getElementById('countdown');
    const modalContent = document.getElementById("modal-content");

    // Установка имени соперника и показ модального окна
    opponentLogin.textContent = opponentName;
    invitationModal.style.display = 'block';
    modalContent.style.display = 'flex';

    // Начало обратного отсчета
    let countdown = 10;
    countdownElement.textContent = countdown;
    countdownInterval = setInterval(() => {
        countdown -= 1;
        countdownElement.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            invitationModal.style.display = 'none';
            modalContent.style.display = 'none';
            // Здесь можно добавить логику начала игры
            startGame();
        }
    }, 1000);
}

// Слушатель события завершения игры
document.addEventListener("gameEnd", function() {
    console.log("Игра закончилась. Обновляем рейтинг и статистику.");
    isGameActive = false;
    // Здесь код для обновления рейтинга и статистики игроков
});

