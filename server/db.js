const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { cli } = require('webpack');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tetris_online',
    password: 'postgres',
    port: 5432,
});

async function findUser(login, email) {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE login = $1 OR email = $2', [login, email]);
        return result.rows;
    } catch (err) {
        console.error('Error in findUser:', err);
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function createUser(login, password, email) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Начало транзакции
        const hashedPassword = await bcrypt.hash(password, 10);

        // Сначала создаем запись в game_info
        const gameInfoResult = await client.query(
            'INSERT INTO game_info (win, lose, rating) VALUES (0, 0, 1000) RETURNING id'
        );
        const gameInfoId = gameInfoResult.rows[0].id;

        // Получаем id для роли "player"
        const roleResult = await client.query(
            'SELECT id FROM roles WHERE role_name = $1',
            ['player']
        );
        const roleId = roleResult.rows[0].id;

        // Теперь создаем пользователя с ссылкой на game_info и ролью "player"
        const userResult = await client.query(
            'INSERT INTO users (login, password, email, role_id, reg_date, game_info_id) VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING id',
            [login, hashedPassword, email, roleId, gameInfoId]
        );

        // Обновляем game_info с user_id
        await client.query(
            'UPDATE game_info SET user_id = $1 WHERE id = $2',
            [userResult.rows[0].id, gameInfoId]
        );
        await client.query('COMMIT'); // Фиксируем транзакцию
        return userResult.rows[0];
    } catch (err) {
        await client.query('ROLLBACK'); // Откатываем транзакцию в случае ошибки
        console.error('Error creating user:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function updateUserOnlineStatus(userId, onlineStatus) {
    const date = new Date();
    console.log(`Обновляем статус для userId: ${userId}. Status: ${onlineStatus}. Time: ${date.toLocaleTimeString()}`);
    const client = await pool.connect();
    try {
        await client.query('UPDATE users SET online_status = $2 WHERE id = $1', [userId, onlineStatus]);
    } finally {
        client.release();
    }
}

async function getAllOnlinePlayers() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT u.id, u.login, g.rating FROM users u JOIN game_info g ON u.id = g.user_id WHERE u.online_status = true;');
        if (result.rows.length > 0) {
            console.log(`online players from db: ${result.rows.length}`);
            return result.rows;
        } else {
            return [];
        }
    } catch (err) {
        console.error('Error fetching online players:', err);
        return [];
    }
}

async function validateUser(login, password) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE login = $1', [login]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            let hashedPassword = user.password;
            if (typeof hashedPassword !== 'string') {
                // Если hashedPassword не строка, преобразуйте её в строку
                // Например, если hashedPassword является объектом с полем toString
                hashedPassword = hashedPassword.toString();
            }
            const isPasswordValid = await bcrypt.compare(password, hashedPassword);
            return { isPasswordValid, user };
        }
        return { isPasswordValid: false };
    } finally {
        client.release();
    }
}

async function getUserStats(userId) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT win, lose, rating FROM game_info WHERE user_id = $1', [userId]);
        if (result.rows.length > 0) {
            const stats = result.rows[0];
            stats.total = stats.win + stats.lose; // Вычисляем общее количество игр
            return stats;
        } else {
            return { win: 0, lose: 0, rating: 0, total: 0 }; // Возвращаем нулевую статистику, если данных нет
        }
    } finally {
        client.release();
    }
}

async function getLoginById(userId) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT login FROM users WHERE id = $1', [userId]);
        return result.rows[0].login;
    } catch (error) {
        console.error('Error in getLoginById:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function updatePlayerStats(userId, isWinner, newRating) {
    const client = await pool.connect();
    try {
        if (isWinner) {
            await client.query(`UPDATE game_info SET win = win + 1, rating = $1 WHERE user_id = $2`, [newRating, userId]);
        } else {
            await client.query(`UPDATE game_info SET lose = lose + 1, rating = $1 WHERE user_id = $2`, [newRating, userId]);
        }
    } catch (error) {
        console.error('Error in updatePlayerStats:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function addGameRecord(playerOneId, playerTwoId, startTime, endTime, status) {
    const client = await pool.connect();
    try {
        const result = await client.query(`INSERT INTO games (player_one_id, player_two_id, start_time, end_time, status) VALUES ($1, $2, $3, $4, $5)`, [playerOneId, playerTwoId, startTime, endTime, status]);
        return result.rows[0];
    } catch (error) {
        console.error('Error in updatePlayerStats:', error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    findUser,
    createUser,
    updateUserOnlineStatus,
    validateUser,
    getAllOnlinePlayers,
    getUserStats,
    getLoginById,
    updatePlayerStats,
    addGameRecord
};
