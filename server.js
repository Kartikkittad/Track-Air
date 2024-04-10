const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { UserModel, MyModel, TrackedAwbModel, Favorite, User, Container } = require('./modules/schema');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv/config')
const Token = require('./modules/token')
const crypto = require('crypto');
const formData = require('form-data');
const mailgun = require('mailgun-js');

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

const mailgunClient = mailgun({
    apiKey: 'ddddd875488e00e557bfd20233857258-309b0ef4-48b0667f',
    domain: 'sandbox30eb952e91da42e39eaefa78f5ee53a7.mailgun.org'
});

const AWBSchema = new mongoose.Schema({
    awbNumbers: [String],
    userEmail: String,
    favorites: [String],
});
const ContainerSchema = new mongoose.Schema({
    userEmail: String,
    containerNumbers: [String],
    favorites: [String],
});

const AWBModel = mongoose.model('AWB', AWBSchema);
const ContainerModel = mongoose.model('trackedContainers', ContainerSchema);


app.get('/data', async (req, res) => {
    try {
        const data = await MyModel.find();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/container', async (req, res) => {
    try {
        const data = await Container.find();
        res.json(data);
    }
    catch {
        res.status(500).json({ error: 'Internal server error' });
    }
})

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

app.post('/trackContainers', async (req, res) => {
    const { userEmail, containerNumber } = req.body;

    try {
        let contDocument = await ContainerModel.findOne({ userEmail });
        if (!contDocument) {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        contDocument.containerNumbers.push(containerNumber);
        await contDocument.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking Container', error);
        res.status(500).json({ success: false, error: 'An error occurred while tracking Container.' });
    }
})

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

app.get('/tracked-containers', async (req, res) => {
    const { userEmail } = req.query;

    try {
        const conDocument = await ContainerModel.findOne({ userEmail });

        if (!conDocument) {
            return res.json([]);
        }

        res.json(conDocument.containerNumbers);
    } catch (error) {
        console.error('Error fetching tracked Containers:', error);
        res.status(500).json({ error: 'An error occurred while fetching tracked Container.' });
    }
});

app.delete('/tracked-containers', async (req, res) => {
    const { userEmail, containerNumber } = req.body;

    try {
        const conDocument = await ContainerModel.findOne({ userEmail });
        if (!conDocument) {
            return res.status(404).json({ error: 'No tracked Containers found for the provided user email.' });
        }

        const updatedContainers = conDocument.containerNumbers.filter((num) => num !== containerNumber);
        conDocument.containerNumbers = updatedContainers;
        await conDocument.save();

        res.json({ success: true, message: 'Container number deleted successfully.' });
    } catch (error) {
        console.error('Error deleting tracked AWB number:', error);
        res.status(500).json({ error: 'An error occurred while deleting the tracked  Container.' });
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

app.post('/containerFavorites', async (req, res) => {
    const { userEmail, containerNumber } = req.body; // Assuming userEmail and containerNumber are sent in the request body

    try {
        let container = await ContainerModel.findOne({ userEmail });

        if (!container) {
            return res.status(404).json({ error: 'Container not found.' });
        }

        container.favorites.push(containerNumber);
        await container.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error adding container to favorites:', error);
        res.status(500).json({ error: 'An error occurred while adding container to favorites.' });
    }
});

app.get('/containerFavorites', async (req, res) => {
    const { userEmail } = req.query;

    try {
        const conDocument = await ContainerModel.findOne({ userEmail });

        if (!conDocument) {
            return res.json([]);
        }

        res.json(conDocument.favorites);
    } catch (error) {
        console.error('Error fetching tracked container numbers:', error);
        res.status(500).json({ error: 'An error occurred while fetching tracked container numbers.' });
    }
})

app.delete('/removeFromContainerFavorites', async (req, res) => {
    const { userEmail, favorite } = req.body;

    try {
        const conDocument = await ContainerModel.findOne({ userEmail });
        if (!conDocument) {
            return res.status(404).json({ error: 'No tracked container numbers found for the provided user email.' });
        }

        const updatedFavorites = conDocument.favorites.filter((num) => num !== favorite);
        conDocument.favorites = updatedFavorites;
        await conDocument.save();
        res.json({ success: true, message: 'Container number deleted successfully.' });
    } catch (error) {
        console.error('Error deleting tracked container number:', error);
        res.status(500).json({ error: 'An error occurred while deleting the tracked container number.' });
    }
});

app.post('/users', async (req, res) => {
    const { name, designation, companyName, email, mobileno, password } = req.body;
    try {
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationToken = crypto.randomBytes(20).toString('hex');

        const newUser = new UserModel({
            name,
            designation,
            email,
            companyName,
            mobileno,
            password: hashedPassword,
            verificationToken: verificationToken
        });

        await newUser.save();

        const verificationUrl = `http://localhost:3000/verify-email/${verificationToken}`;
        const mailgunData = {
            from: 'kartikkittad9314@gmail.com',
            to: email,
            subject: 'Verify your email address',
            text: `Hello ${name},\n\nPlease click the following link to verify your email address:\n\n${verificationUrl}`,
        };

        mailgunClient.messages().send(mailgunData, (error, body) => {
            if (error) {
                console.error('Error sending verification email:', error);
                res.status(500).json({ error: 'Failed to send verification email' });
            } else {
                console.log('Verification email sent:', body);
                res.status(201).json({ message: 'User registered successfully. Please check your email for verification.' });
            }
        });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    try {
        const user = await UserModel.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({ error: 'Invalid verification token' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully' });
    } catch (err) {
        console.error('Error verifying email:', err);
        res.status(500).json({ error: 'Internal server error' });
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

        if (!user.isVerified) {
            let token = await Token.findOne({ userId: user._id });
            if (!token) {
                token = await new Token({
                    userId: user._id,
                    token: crypto.randomBytes(32).toString("hex")
                }).save();
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

