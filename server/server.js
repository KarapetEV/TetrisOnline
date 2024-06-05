require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const https = require('https');

const { findUser, createUser, updateUserOnlineStatus, validateUser } = require('./db');

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
        res.status(201).json({ token });
        updateUserOnlineStatus(login, true);
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
        res.json({ token });
        updateUserOnlineStatus(login, true);
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

httpsServer.listen(port, () => {
    console.log(`Server is running on https://localhost:${port}`);
});
