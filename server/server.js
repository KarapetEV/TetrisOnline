require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const https = require('https');

const { findUser, createUser, updateUserOnlineStatus, validateUser, getAllOnlinePlayers } = require('./db');

const app = express();
const port = 8765;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const jwtSecret = process.env.JWT_SECRET;

app.post('/api/auth/register', async (req, res) => {
    const { login, password, email } = req.body;

    console.log('Register request received:', req.body);

    try {
        const existingUser = await findUser(login, email);
        
        if (existingUser.length > 0) {
            console.log(`Registration failed for ${login}: User already exists.`);
            return res.status(400).json({ message: 'Login or email already exists' });
        }

        const newUser = await createUser(login, password, email);
        const token = jwt.sign({ userId: newUser.id }, jwtSecret, { expiresIn: '1h' });
        res.status(201).json({ token, userId: newUser.id });
        // updateUserOnlineStatus(login, true);
        console.log(`User registered successfully: ${login}`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { login, password } = req.body;

    try {
        const { isPasswordValid, user } = await validateUser(login, password);

        if (!isPasswordValid) {
            console.log(`Login failed for ${login}: Invalid login or password.`);
            return res.status(400).json({ message: 'Invalid login or password' });
        }

        // Если пароль валиден, создаем токен и отправляем его пользователю
        const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '1h' });
        res.json({ token, userId: user.id });
        // updateUserOnlineStatus(login, true);
        console.log(`User logged in successfully: ${login}`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

const privateKey = fs.readFileSync('./certs/private.key', 'utf8');
const certificate = fs.readFileSync('./certs/certificate.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const httpsServer = https.createServer(credentials, app);
const io = require('socket.io')(httpsServer, {
    cors: {
      origin: "*", // Укажите здесь ваш домен или '*', если хотите разрешить все домены
      methods: ["GET", "POST"]
    }
  });
  
  const userSockets = {};
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    // Функция для отправки списка онлайн игроков
    function sendOnlinePlayers() {
        let onlinePlayers = getAllOnlinePlayers(); // Получаем список онлайн игроков
        // Убедитесь, что onlinePlayers действительно является массивом
        if (!Array.isArray(onlinePlayers)) {
            console.error('getAllOnlinePlayers did not return an array');
            onlinePlayers = []; // Используем пустой массив, если результат не массив
        }
        io.emit('onlinePlayers', onlinePlayers); // Отправляем список всем подключенным клиентам
    }
    
    // Вызываем функцию при подключении нового пользователя и при других событиях, которые могут изменить статус онлайн
    sendOnlinePlayers();
  
    socket.on('login', async (userId) => {
      // Сохраняем соответствие между socket.id и userId
      userSockets[socket.id] = userId;
      // Обновляем статус пользователя на онлайн
      await updateUserOnlineStatus(userId, true);
    });

    socket.on('logout', async (userId) => {
        console.log('User going offline:', userId);
        if (userId) {
            await updateUserOnlineStatus(userId, false);
            // Удаляем запись из объекта соответствия, если используется
            delete userSockets[socket.id];
        } else {
            console.log('No userId provided for logout event');
        }
    });
  
    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        // Получаем userId для socket.id
        const userId = userSockets[socket.id];
        if (userId) {
            // Обновляем статус пользователя на офлайн
            await updateUserOnlineStatus(userId, false);
            // Удаляем запись из объекта соответствия
            delete userSockets[socket.id];
        }
    });
 
    // Другие обработчики событий...
  });
  
  httpsServer.listen(port, () => {
    console.log(`Server is running on https://localhost:${port}`);
  });
