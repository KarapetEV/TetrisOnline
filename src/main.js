import './style.css';
import logoImage from './assets/header.png';

document.addEventListener('DOMContentLoaded', () => {
    const headerElement = document.getElementById('header');
    const headerLogo = document.createElement('img');
    headerLogo.src = logoImage; // Используйте импортированное изображение
    headerLogo.alt = 'Логотип';
    headerLogo.classList.add('logo');

    // Создаем контейнер для логотипа и добавляем его в шапку
    const logoContainer = document.createElement('div');
    logoContainer.classList.add('logo-container');
    logoContainer.appendChild(headerLogo);

    // Создаем контейнер для кнопок, если он еще не создан
    const buttonsContainer = document.getElementById('buttons-container');
    buttonsContainer.classList.add('buttons-container');
  
    // Добавляем контейнеры в шапку
    headerElement.prepend(logoContainer); // Используйте prepend для добавления в начало header

    const header = document.getElementById('header');
    const signInButton = document.getElementById('header-sign-in-button');
    const signUpButton = document.getElementById('header-sign-up-button');
    const authForm = document.getElementById('auth-form');
    const registerForm = document.getElementById('register-form');

    const registerLink = document.getElementById('register-link');
    const loginButton = document.getElementById('login-button');
    const cancelButton = document.getElementById('cancel-button');
    const registerButton = document.getElementById('register-button');
    const regCancelButton = document.getElementById('reg-cancel-button');

    signInButton.addEventListener('click', () => {
        buttonsContainer.style.visibility = 'hidden';
        authForm.style.display = 'block';
    });

    signUpButton.addEventListener('click', () => {
        buttonsContainer.style.visibility = 'hidden';
        registerForm.style.display = 'block';
    });

    registerLink.addEventListener('click', () => {
        authForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    cancelButton.addEventListener('click', () => {
        authForm.style.display = 'none';
        header.style.display = 'flex';
        buttonsContainer.style.visibility = 'visible';
    });

    regCancelButton.addEventListener('click', () => {
        registerForm.style.display = 'none';
        authForm.style.display = 'block';
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
            window.location.href = '/game';
        } else {
            alert('Invalid login or password');
        }
    });

    registerButton.addEventListener('click', async () => {
        const login = document.getElementById('reg-login').value;
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;
        const email = document.getElementById('reg-email').value;

        if (!login || !password || !passwordConfirm || !email) {
            alert('All fields are required');
            return;
        }

        if (password !== passwordConfirm) {
            alert('Passwords do not match');
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
                window.location.href = '/game';
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error during fetch:', error);
            alert('An error occurred while trying to register. Please try again later.');
        }
    });
});
