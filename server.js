const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { UserModel, MyModel, TrackedAwbModel } = require('./modules/schema');
const bcrypt = require('bcrypt');

const mongoose = require('mongoose');
require('dotenv/config')

const app = express()
app.use(cors())
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

app.post('/users', async (req, res) => {
    const { email, username, password } = req.body;

    try {
        const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: "Email or username already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await UserModel.create({ email, username, password: hashedPassword });
        res.json({ message: "User created successfully", userId: newUser._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid password" });
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

