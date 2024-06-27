require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const https = require('https');

const { findUser, createUser, updateUserOnlineStatus, validateUser, getAllOnlinePlayers, 
    getUserStats, getLoginById, updatePlayerStats, addGameRecord } = require('./db');

const app = express();
const port = 8765;

const userTimeouts = {};
let debounceTimer;

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
    console.log('User connected:', socket.id);
    // Функция для отправки списка онлайн игроков
    async function sendOnlinePlayersDebounced() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            let onlinePlayers = await getAllOnlinePlayers();
            // Проверка, что результат является массивом
            if (!Array.isArray(onlinePlayers)) {
                console.error('getAllOnlinePlayers did not return an array');
                onlinePlayers = []; // Используем пустой массив, если результат не массив
            }
            io.emit('onlinePlayers', onlinePlayers);
            console.log(`Отправлен обновленный список онлайн-игроков: ${onlinePlayers.length}`);
        }, 500); // Задержка в 500 мс
    }
  
    socket.on('login', async (userId) => {
        console.log(`Отрабатывает событие login с userId: ${userId}`);

        if (userTimeouts[userId]) {
            clearTimeout(userTimeouts[userId]);
            delete userTimeouts[userId];
            console.log(`Таймер для пользователя ${userId} отменен, так как он снова онлайн`);
        }

        // Сохраняем соответствие между socket.id и userId
        socket.userId = userId;
        userSockets[userId] = socket.id;
        // Обновляем статус пользователя на онлайн
        await updateUserOnlineStatus(userId, true);

        console.log(`Вызов sendOnlinePlayersDebounced в событии login`);
        sendOnlinePlayersDebounced();
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
        console.log(`Вызов sendOnlinePlayersDebounced в событии logout`);
        sendOnlinePlayersDebounced();
    });
  
    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        // Получаем userId для socket.id
        const userId = userSockets[socket.id];
        if (userId) {
            // Запускаем таймер, который пометит пользователя как офлайн, если он не переподключится в течение заданного времени
            userTimeouts[userId] = setTimeout(async () => {
                // Проверяем, не переподключился ли пользователь
                if (!Object.values(userSockets).includes(userId)) {
                    await updateUserOnlineStatus(userId, false);
                    console.log(`Статус пользователя ${userId} изменен на оффлайн`);
                    sendOnlinePlayersDebounced();
                    delete userSockets[socket.id]; // Удаление записи о сокете
                    delete userTimeouts[userId]; // Удаляем таймер из объекта
                }
            }, 10000); // Установите таймаут, например, в 10 секунд
        }
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
                sendOnlinePlayersDebounced();
            }).catch((error) => {
                console.error(`Ошибка при обновлении статуса пользователя ${userId}:`, error);
            });
        } else {
            console.log('Не удалось идентифицировать пользователя для события userOffline');
        }
    });

    // Обработка отправки приглашения от одного клиента другому
    socket.on('sendInvitation', (data) => {
        const { recipientId } = data;
        console.log(`Отправка приглашения, recipientId: ${recipientId}`);
        // Найти сокет получателя по его ID и отправить ему приглашение
        const recipientSocket = findSocketByUserId(recipientId);
        console.log(`Отправка приглашения, recipientSocket: ${recipientSocket}`);
        if (recipientSocket) {
            console.log(`Отправка приглашения от ${socket.userId} к ${recipientId}`);
            recipientSocket.emit('invitationReceived', { from: socket.userId });
        }
    });
    
    // Обработка отмены приглашения
    socket.on('cancelInvitation', (data) => {
        const { recipientId } = data;
        // Найти сокет получателя и отправить ему уведомление об отмене приглашения
        const recipientSocket = findSocketByUserId(recipientId);
        if (recipientSocket) {
            recipientSocket.emit('invitationCancelled', { from: socket.userId });
        }
    });

    // Обработка события принятия приглашения
    socket.on('acceptInvitation', async (data) => {
        const { senderId, recipientId } = data;

        console.log(`Событие на сервере - Принято приглашение от ${senderId}`);

        const senderSocketId = userSockets[senderId]; // Находим ID сокета отправителя приглашения
        const recipientSocketId = userSockets[recipientId]; // ID сокета получателя приглашения

        console.log(`senderSocketId: ${senderSocketId}, recipientSocketId: ${recipientSocketId}`);
        
        if (senderSocketId && recipientSocketId) {
            try {
                console.log(`Событие на сервере - Уведомление ${senderSocketId} о принятии приглашения от ${socket.userId}`);
                const senderLogin = await getLoginById(senderId);
                const recipientLogin = await getLoginById(recipientId);

                // Отправляем уведомление обоим игрокам о начале игры
                console.log(`Emit signal to senderSocketId: ${recipientLogin} - ${recipientId}`);
                io.to(senderSocketId).emit('gameStart', { opponentLogin: recipientLogin, opponentId: recipientId });
                console.log(`Emit signal to recipientSocketId: ${senderLogin} - ${senderId}`);
                io.to(recipientSocketId).emit('gameStart', { opponentLogin: senderLogin, opponentId: senderId });
            } catch (error) {
                console.error('Error in acceptInvitation event handler:', error);
            }
        }
    });

    // Сервер
    socket.on('declineGame', (data) => {
        const { senderId, recipientId } = data;
        const senderSocketId = userSockets[senderId];
        const recipientSocketId = userSockets[recipientId];

        // Отправляем уведомление обоим игрокам об отмене игры
        io.to(senderSocketId).emit('gameDeclined');
        io.to(recipientSocketId).emit('gameDeclined');
    });

    socket.on('gameStateUpdate', async (data) => {
        const { myId, opponentId, gameState, isGameOver, playerOneId, gameStartTime } = data;
        const opponentSocketId = userSockets[opponentId]; // Находим ID сокета соперника
        if (isGameOver) {
            console.log(`**********GAME OVER**********`);
            const currentTime = new Date();
            const gameEndTime = Math.floor(currentTime.getTime() / 1000); // Преобразование в timestamp в секундах

            const loserSocket = socket;
            const winnerSocket = findSocketByUserId(opponentId);

            const loserStats = await getUserStats(myId);
            const loserCurrentRating = loserStats.rating;
            console.log(`loserCurrentRating for ${myId}: ${loserCurrentRating}`);
            const winnerStats = await getUserStats(opponentId);
            const winnerCurrentRating = winnerStats.rating; // Используем opponentId для нахождения сокета победителя
            console.log(`winnerCurrentRating for ${opponentId}: ${winnerCurrentRating}`);

            const winnerNewRating = calculateNewRating(winnerCurrentRating, loserCurrentRating, true);
            console.log(`winnerNewRating: ${winnerNewRating}`);
            const loserNewRating = calculateNewRating(loserCurrentRating, winnerCurrentRating, false);
            console.log(`loserNewRating: ${loserNewRating}`);

            console.log(`передаем сигнал gameOver победителю на сокет ${winnerSocket.id}`);
            io.to(winnerSocket.id).emit('gameOver', {
                result: 'Congratulations! You win!',
                ratingChange: `Rating: ${winnerCurrentRating} -> ${winnerNewRating}`
            });
            console.log(`передаем сигнал gameOver лузеру на сокет ${loserSocket.id}`);
            io.to(loserSocket.id).emit('gameOver', {
                result: 'Sorry! You lose!',
                ratingChange: `Rating: ${loserCurrentRating} -> ${loserNewRating}`
            });

            // Обновляем статистику игроков в БД
            await updatePlayerStats(opponentId, true, winnerNewRating);
            await updatePlayerStats(myId, false, loserNewRating);

            // Добавляем запись о прошедшей игре
            const playerTwoId = playerOneId !== myId ? myId : opponentId;
            const status = playerOneId !== myId ? "win" : "lose";
            await addGameRecord(playerOneId, playerTwoId, gameStartTime, gameEndTime, status);
        }
        // Пересылаем состояние игры сопернику
        io.to(opponentSocketId).emit('opponentGameStateUpdate', { gameState: gameState });
    });

    // Функция для поиска сокета по userId
    function findSocketByUserId(userId) {
        const socketId = userSockets[userId];
        return io.sockets.sockets.get(socketId);
    }

    // Функция для добавления записи о прошедшей игре
    async function addGameRecord() {

    }

    // Функция для расчета рейтинга
    function calculateNewRating(currentRating, opponentRating, isWin) {
        const K = 10; // Примерное значение коэффициента K
        const S = isWin ? 1 : 0; // 1 если победа, 0 если поражение
        const E = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));

        const newRating = currentRating + K * (S - E);
        return Math.round(newRating); // Округляем до ближайшего целого
    }
 
    // Другие обработчики событий...
  });
  
  httpsServer.listen(port, () => {
    console.log(`Server is running on https://localhost:${port}`);
  });
