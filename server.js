const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { UserModel, MyModel, TrackedAwbModel } = require('./modules/schema');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const mongoose = require('mongoose');
require('dotenv/config')




const app = express()
app.use(cors())
var http = require('http');

http.createServer(function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE'
    });
    response.end('Hello World\n');
}).listen(400);
app.use(express.json())

mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB', err);
});

app.get('/data', async (req, res) => {
    try {
        const data = await MyModel.find();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
})

app.post('/users', async (req, res) => {
    const { email, username, password } = req.body;

    try {
        const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: "Email or username already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await UserModel.create({ email, username, password: hashedPassword });

        const verificationLink = `http://localhost:4000/verify/${newUser._id}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: 'Verify Your Email',
            html: `<p>Please click <a href="${verificationLink}">here</a> to verify your email address.</p>`
        });

        res.json({ message: "User created successfully", userId: newUser._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/verify/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        await UserModel.findByIdAndUpdate(userId, { isEmailVerified: true });
        res.send('Email verified successfully. You can now log in. ');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await UserModel.findOne({ email });
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid password" });
        }

        if (!user.isEmailVerified) {
            return res.status(401).json({ error: "Email not verified" })
        }

        res.json({ message: "Login successful", user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const port = process.env.PORT || 4000
const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})

