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

async function updateUserOnlineStatus(login, onlineStatus) {
    const client = await pool.connect();
    try {
        await client.query('UPDATE users SET online_status = $2 WHERE login = $1', [login, onlineStatus]);
    } finally {
        client.release();
    }
}

module.exports = {
    findUser,
    createUser,
    updateUserOnlineStatus,
};
