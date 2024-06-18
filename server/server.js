require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const https = require('https');

const { findUser, createUser, updateUserOnlineStatus, validateUser, getAllOnlinePlayers, getUserStats } = require('./db');

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
        const stats = await getUserStats(newUser.id);
        const token = jwt.sign({ userId: newUser.id }, jwtSecret, { expiresIn: '1h' });
        res.status(201).json({ token, userId: newUser.id, stats });
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

        // Если пароль валиден, получаем статистику пользователя
        const stats = await getUserStats(user.id);

        // Если пароль валиден, создаем токен и отправляем его пользователю
        const token = jwt.sign({ userId: user.id, login: user.login, stats }, jwtSecret, { expiresIn: '1h' });
        res.json({ token, userId: user.id, stats });
        console.log(`User logged in successfully: ${login}`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

const privateKey = fs.readFileSync('./certs/localhost.key', 'utf8');
const certificate = fs.readFileSync('./certs/localhost.crt', 'utf8');
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
    const userTimeouts = {};
    console.log('User connected:', socket.id);
    // Функция для отправки списка онлайн игроков
    async function sendOnlinePlayers() {
        console.log(`Отрабатывает событие sendOnlinePlayers`);
        let onlinePlayers = await getAllOnlinePlayers(); // Получаем список онлайн игроков
        console.log(`В событии sendOnlinePlayers онлайн-игроков: ${onlinePlayers.length}`);
        // Убедитесь, что onlinePlayers действительно является массивом
        if (!Array.isArray(onlinePlayers)) {
            console.error('getAllOnlinePlayers did not return an array');
            onlinePlayers = []; // Используем пустой массив, если результат не массив
        }
        console.log(`online players from server: ${onlinePlayers.length}`);
        io.emit('onlinePlayers', onlinePlayers); // Отправляем список всем подключенным клиентам
    }
    
    // console.log(`Вызов sendOnlinePlayers в событии connection`);
    // // Вызываем функцию при подключении нового пользователя и при других событиях, которые могут изменить статус онлайн
    // sendOnlinePlayers();
  
    socket.on('login', async (userId) => {
        console.log(`Отрабатывает событие login с userId: ${userId}`);

        if (userTimeouts[userId]) {
            clearTimeout(userTimeouts[userId]);
            delete userTimeouts[userId];
            console.log(`Таймер для пользователя ${userId} отменен, так как он снова онлайн`);
        }

        // Сохраняем соответствие между socket.id и userId
        userSockets[socket.id] = userId;
        // Обновляем статус пользователя на онлайн
        await updateUserOnlineStatus(userId, true);

        console.log(`Вызов sendOnlinePlayers в событии login`);
        sendOnlinePlayers();
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
        console.log(`Вызов sendOnlinePlayers в событии logout`);
        sendOnlinePlayers();
    });
  
    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        // Получаем userId для socket.id
        const userId = userSockets[socket.id];
        if (userId) {
            // Запускаем таймер, который пометит пользователя как офлайн, если он не переподключится в течение заданного времени
            userTimeouts[userId] = setTimeout(async () => {
                // Проверяем, не переподключился ли пользователь
                if (!userSockets[socket.id]) {
                    await updateUserOnlineStatus(userId, false);
                    delete userSockets[socket.id];
                    console.log(`Статус пользователя ${userId} изменен на офлайн`);
                    // sendOnlinePlayers();
                }
            }, 10000); // Установите таймаут, например, в 10 секунд
        }
        // sendOnlinePlayers();
    });

    // Добавьте логику для отмены таймаута при переподключении пользователя
    socket.on('reconnect', async () => {
        const userId = userSockets[socket.id];
        console.log(`userId when reconnect: ${userId}`);
        console.log(`userTimeouts when reconnect: ${userTimeouts[userId]}`);
        if (userId && userTimeouts[userId]) {
            clearTimeout(userTimeouts[userId]);
            delete userTimeouts[userId];
        }
        // Возможно, вам понадобится повторно вызвать updateUserOnlineStatus, если статус был изменен
        await updateUserOnlineStatus(userId, true);
        console.log(`Вызов sendOnlinePlayers в событии connection`);
        sendOnlinePlayers();
    });

    socket.on('userOffline', () => {
        const userId = userSockets[socket.id];
        if (userId) {
            console.log(`Пользователь с ID ${userId} уходит офлайн`);
            // Здесь можно реализовать логику для обновления статуса пользователя на офлайн
            // Например, обновить статус в базе данных
            updateUserOnlineStatus(userId, false).then(() => {
                console.log(`Статус пользователя ${userId} обновлен на офлайн`);
                // Опционально, можно отправить обновленный список онлайн-игроков всем подключенным клиентам
                sendOnlinePlayers();
            }).catch((error) => {
                console.error(`Ошибка при обновлении статуса пользователя ${userId}:`, error);
            });
        } else {
            console.log('Не удалось идентифицировать пользователя для события userOffline');
        }
    });
 
    // Другие обработчики событий...
  });
  
  httpsServer.listen(port, () => {
    console.log(`Server is running on https://localhost:${port}`);
  });
