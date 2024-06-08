import './style.css';
import logoImage from './assets/header.png';

// Подключение клиентской библиотеки Socket.IO
import io from 'socket.io-client';

// Установка соединения WebSocket
const socket = io('https://localhost:8765');

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {

    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userId = localStorage.getItem('userId'); // Получаем userId из localStorage

    const headerElement = document.getElementById('header');
    const headerLogo = document.createElement('img');
    headerLogo.src = logoImage;
    headerLogo.alt = 'logo';
    headerLogo.classList.add('logo');

    // Создаем контейнер для логотипа и добавляем его в шапку
    const logoContainer = document.createElement('div');
    logoContainer.classList.add('logo-container');
    logoContainer.appendChild(headerLogo);
    
    // Добавляем контейнеры в шапку
    headerElement.prepend(logoContainer); // Используйте prepend для добавления в начало header

    
    // Создаем контейнер для кнопок
    const buttonsContainer = document.getElementById('buttons-container');
    buttonsContainer.classList.add('buttons-container');

    const signInButton = document.getElementById('header-sign-in-button');
    const signUpButton = document.getElementById('header-sign-up-button');
    const logoutButton = document.getElementById('logout-button');

    showHeader(false);

    const authForm = document.getElementById('auth-form');
    const registerForm = document.getElementById('register-form');

    const registerLink = document.getElementById('register-link');
    const loginButton = document.getElementById('login-button');
    const cancelButton = document.getElementById('cancel-button');
    const registerButton = document.getElementById('register-button');
    const regCancelButton = document.getElementById('reg-cancel-button');

    console.log(isLoggedIn);

    if (isLoggedIn === 'true' && userId) {
        showGameInterface(userId); // Восстанавливаем интерфейс с userId
    } else {
        showAuthButtons();
    }

    signInButton.addEventListener('click', () => {
        buttonsContainer.style.visibility = 'hidden';
        authForm.style.display = 'block';
    });

    signUpButton.addEventListener('click', () => {
        buttonsContainer.style.visibility = 'hidden';
        registerForm.style.display = 'block';
    });

    logoutButton.addEventListener('click', () => {
        logout(); // Вызываем функцию для очистки данных сессии и обновления интерфейса
    });

    // Обработка события закрытия страницы/вкладки
    window.addEventListener('beforeunload', () => {
        socket.disconnect();
    });

    registerLink.addEventListener('click', () => {
        authForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    cancelButton.addEventListener('click', () => {
        authForm.style.display = 'none';
        showHeader(false);
    });

    regCancelButton.addEventListener('click', () => {
        registerForm.style.display = 'none';
        authForm.style.display = 'block';
    });

    socket.on('onlinePlayers', (onlinePlayers) => {
        console.log(onlinePlayers)
        updateOnlinePlayers(onlinePlayers);
    });

    loginButton.addEventListener('click', async () => {
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;

        const response = await fetch('https://localhost:8765/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ login, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userId', data.userId); // Сохраняем userId в localStorage
            showGameInterface(data.userId);
        } else {
            alert('Invalid login or password');
        }
    });

    registerButton.addEventListener('click', async () => {
        const loginInput = document.getElementById('reg-login');
        const login = loginInput.value;
        const passwordInput = document.getElementById('reg-password');
        const password = passwordInput.value;
        const passwordConfirmInput = document.getElementById('reg-password-confirm');
        const emailInput = document.getElementById('reg-email');
        const email = emailInput.value;
        const errorMessageDiv = document.getElementById('register-error-message');

        // Очистить предыдущие ошибки
        [loginInput, passwordInput, passwordConfirmInput, emailInput].forEach(input => {
            input.classList.remove('input-error');
        });
        errorMessageDiv.textContent = '';

        // Проверка на заполненность полей
        if (!loginInput.value || !passwordInput.value || !passwordConfirmInput.value || !emailInput.value) {
            errorMessageDiv.textContent = 'All fields are required';
            [loginInput, passwordInput, passwordConfirmInput, emailInput].forEach(input => {
                if (!input.value) {
                    input.classList.add('input-error');
                }
            });
            return;
        }

        // Проверка на совпадение паролей
        if (passwordInput.value !== passwordConfirmInput.value) {
            errorMessageDiv.textContent = 'Passwords do not match';
            [passwordInput, passwordConfirmInput].forEach(input => {
                input.classList.add('input-error');
            });
            return;
        }

        try {
            const response = await fetch('https://localhost:8765/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ login, password, email })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                // Сохраняем факт того, что пользователь вошел в систему
                localStorage.setItem('isLoggedIn', 'true');
                if (data.userId) {
                    showGameInterface(data.userId);
                } else {
                    console.error('UserId not provided by the server');
                }
            } else {
                // Обработка ошибок регистрации
            }
        } catch (error) {
            console.error('Error during fetch:', error);
            alert('An error occurred while trying to register. Please try again later.');
        }
    });

    function showAuthButtons() {
        // Скрываем игровой интерфейс
        document.getElementById('game-interface').style.display = 'none';
        // Скрываем боковую панель игроков
        document.getElementById('online-players-panel').style.display = 'none';
        // Показываем кнопки входа и регистрации
        buttonsContainer.style.visibility = 'visible';
        // Скрываем формы авторизации и регистрации, если они были открыты
        authForm.style.display = 'none';
        registerForm.style.display = 'none';
    }

    function updateOnlinePlayers(players) {
        console.log(players);
        const panel = document.getElementById('online-players-panel');
        panel.innerHTML = ''; // Очищаем текущий список
    
        if (Array.isArray(players)) {
            players.forEach(player => {
                const button = document.createElement('button');
                button.textContent = player.login; // Используйте логин игрока
                button.classList.add('player-button');
                // Добавляем обработчик клика, если нужно
                button.addEventListener('click', () => {
                    // Логика при клике на кнопку игрока (например, начать игру или открыть чат)
                });
                panel.appendChild(button);
            });
        } else {
            console.error('Expected players to be an array, but got:', players);
        }
    }

    function logout() {
        // Очищаем данные о сессии
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userId');

        showHeader(false);

        // Показываем начальную страницу
        showAuthButtons();
    }
}

// После успешной авторизации или регистрации
function showGameInterface(userId) {
    // Скрываем формы регистрации и авторизации
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';

    // Получаем логин пользователя для отображения
    const userLogin = "Karapet"; // Замените на актуальное получение логина пользователя
    showHeader(true);
    const userInfo = document.getElementById('user-info');
    userInfo.style.display = 'flex';
    document.getElementById('user-login').textContent = userLogin; // Устанавливаем логин пользователя

    // Показываем игровой интерфейс
    document.getElementById('game-interface').style.display = 'block';

    // Показываем боковую панель игроков
    document.getElementById('online-players-panel').style.display = 'block';

    // Обновляем статус пользователя на онлайн
    // Предполагается, что userId доступен после успешной авторизации/регистрации
    setUserOnline(userId);
}

// Функция для установки статуса пользователя после успешной авторизации/регистрации
function setUserOnline(userId) {
    socket.emit('login', userId);
}

function showHeader(authorized) {
    console.log(authorized);
    const signButtonsContainer = document.getElementById('sign-buttons-container');
    const logoutButtonContainer = document.getElementById('logout-button-container');

    if (authorized) {
        signButtonsContainer.style.display = 'none'; // Скрываем блок с кнопками авторизации и регистрации
        logoutButtonContainer.style.display = 'flex'; // Показываем блок с аватаром+логином и кнопкой Logout
    } else {
        signButtonsContainer.style.display = 'flex'; // Показываем блок с кнопками авторизации и регистрации
        logoutButtonContainer.style.display = 'none'; // Скрываем блок с аватаром+логином и кнопкой Logout
    }
}
