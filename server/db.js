const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tetris_online',
    password: 'postgres',
    port: 5432,
});

async function findUser(login, email) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE login = $1 OR email = $2', [login, email]);
        return result.rows;
    } finally {
        client.release();
    }
}

async function createUser(login, password, email) {
    const client = await pool.connect();
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await client.query(
            'INSERT INTO users (login, password, email, role_id, reg_date) VALUES ($1, $2, $3, (SELECT id FROM roles WHERE role_name = $4), NOW()) RETURNING id',
            [login, hashedPassword, email, 'player']
        );
        return result.rows[0];
    } finally {
        client.release();
    }
}

async function updateUserOnlineStatus(userId, onlineStatus) {
    const client = await pool.connect();
    try {
        await client.query('UPDATE users SET online_status = $2 WHERE id = $1', [userId, onlineStatus]);
    } finally {
        client.release();
    }
}

async function getAllOnlinePlayers() {
    try {
        const result = await pool.query('SELECT id, login FROM users WHERE online_status = true');
        if (result.rows.length > 0) {
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

module.exports = {
    findUser,
    createUser,
    updateUserOnlineStatus,
    validateUser,
    getAllOnlinePlayers
};
