import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    const signInButton = document.getElementById('sign-in-button');
    const authForm = document.getElementById('auth-form');
    const registerForm = document.getElementById('register-form');

    const registerLink = document.getElementById('register-link');
    const loginButton = document.getElementById('login-button');
    const cancelButton = document.getElementById('cancel-button');
    const registerButton = document.getElementById('register-button');
    const regCancelButton = document.getElementById('reg-cancel-button');

    signInButton.addEventListener('click', () => {
        authForm.style.display = 'block';
    });

    registerLink.addEventListener('click', () => {
        authForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    cancelButton.addEventListener('click', () => {
        authForm.style.display = 'none';
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
    });
});
