const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { UserModel, MyModel, TrackedAwbModel, Favorite, User } = require('./modules/schema');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
require('dotenv/config')
const Token = require('./modules/token')
const sendEmail = require('./sendEmail')
const crypto = require('crypto');
const jwt = require('jsonwebtoken')

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

const AWBSchema = new mongoose.Schema({
    awbNumbers: [String],
    userEmail: {
        type: String,
        required: true,
        unique: true
    },
    favorites: [String]
});

const AWBModel = mongoose.model('AWB', AWBSchema);

app.get('/data', async (req, res) => {
    try {
        const data = await MyModel.find();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.use(bodyParser.json());

app.post('/track', async (req, res) => {
    const { awbNumber, userEmail } = req.body;

    try {
        let awbDocument = await AWBModel.findOne({ userEmail });
        if (!awbDocument) {
            awbDocument = new AWBModel({ userEmail, awbNumbers: [awbNumber] });

        } else {
            awbDocument.awbNumbers.push(awbNumber);
        }
        await awbDocument.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking AWB number:', error);
        res.status(500).json({ success: false, error: 'An error occurred while tracking AWB number.' });
    }
});

app.get('/tracked-awbs', async (req, res) => {
    const { userEmail } = req.query;

    try {
        const awbDocument = await AWBModel.findOne({ userEmail });

        if (!awbDocument) {
            return res.json([]);
        }

        res.json(awbDocument.awbNumbers);
    } catch (error) {
        console.error('Error fetching tracked AWB numbers:', error);
        res.status(500).json({ error: 'An error occurred while fetching tracked AWB numbers.' });
    }
});

app.delete('/tracked-awbs', async (req, res) => {
    const { userEmail, awbNumber } = req.body;

    try {
        const awbDocument = await AWBModel.findOne({ userEmail });
        if (!awbDocument) {
            return res.status(404).json({ error: 'No tracked AWB numbers found for the provided user email.' });
        }

        const updatedAwbNumbers = awbDocument.awbNumbers.filter((num) => num !== awbNumber);
        awbDocument.awbNumbers = updatedAwbNumbers;
        await awbDocument.save();

        res.json({ success: true, message: 'AWB number deleted successfully.' });
    } catch (error) {
        console.error('Error deleting tracked AWB number:', error);
        res.status(500).json({ error: 'An error occurred while deleting the tracked AWB number.' });
    }
});

app.post('/addToFavorites', async (req, res) => {
    const { userEmail, awbNumber } = req.body;

    try {
        let awbDocument = await AWBModel.findOne({ userEmail });
        if (!awbDocument) {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        if (awbDocument.favorites.includes(awbNumber)) {
            return res.status(400).json({ success: false, error: "AWB number already exists in favorites" });
        }

        awbDocument.favorites.push(awbNumber);
        await awbDocument.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding AWB number to favorites:', error);
        res.status(500).json({ success: false, error: 'An error occurred while adding AWB number to favorites.' });
    }
});

app.get('/addToFavorites', async (req, res) => {
    const { userEmail } = req.query;

    try {
        const awbDocument = await AWBModel.findOne({ userEmail });

        if (!awbDocument) {
            return res.json([]);
        }

        res.json(awbDocument.favorites);
    } catch (error) {
        console.error('Error fetching tracked AWB numbers:', error);
        res.status(500).json({ error: 'An error occurred while fetching tracked AWB numbers.' });
    }
})

app.delete('/removeFromFavorites', async (req, res) => {
    const { userEmail, favorite } = req.body;

    try {
        const awbDocument = await AWBModel.findOne({ userEmail });
        if (!awbDocument) {
            return res.status(404).json({ error: 'No tracked AWB numbers found for the provided user email.' });
        }

        const updatedFavorites = awbDocument.favorites.filter((num) => num !== favorite);
        awbDocument.favorites = updatedFavorites;
        await awbDocument.save();
        res.json({ success: true, message: 'AWB number deleted successfully.' });
    } catch (error) {
        console.error('Error deleting tracked AWB number:', error);
        res.status(500).json({ error: 'An error occurred while deleting the tracked AWB number.' });
    }
});

app.post('/users', async (req, res) => {
    const { name, designation, email, companyName, mobileno, password } = req.body;
    try {
        const existingUser = await UserModel.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ error: "Email or username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await UserModel.create({ name, designation, email, companyName, mobileno, password: hashedPassword });
        user = await new UserModel({ ...req.body, password: hashedPassword }).save();

        const token = await new Token({
            userId: user._id,
            token: crypto.randomBytes(32).toString("hex")
        }).save();

        const url = `http://localhost:3000/users/${user._id}/verify/${token.token}`;
        await sendEmail(user.email, "Verify Air Track", url);

        res.json({ message: "User created successfully, Verify your email", userId: newUser._id });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.get("/:id/verify/:token", async (req, res) => {
    try {
        const user = await UserModel.findOne({ _id: req.params.id });
        if (!user) return res.status(400).send({ message: "Invalid link" });

        const token = await Token.findOne({
            userId: user._id,
            token: req.params.token
        });
        if (!token) return res.status(400).send({ message: "Invalid link" });

        await UserModel.updateOne({ _id: user._id, isEmailVerified: true })
        await token.remove()

        res.status(200).send({ message: "Email Verified Succesfully" })
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await UserModel.findOne({ email });
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid password" });
        }

        if (!user.isEmailVerified) {
            let token = await Token.findOne({ userId: user._id });
            if (!token) {
                token = await new Token({
                    userId: user._id,
                    token: crypto.randomBytes(32).toString("hex")
                }).save();
                const url = `${process.env.BASE_URL}users/${userd._id}/verify/${token.token}`
                await sendEmail(user.email, "Verify Air Track", url);
            }
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

