const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { UserModel, MyModel, TrackedAwbModel, Favorite, User, Container, BillOfLading } = require('./modules/schema');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv/config')
const Token = require('./modules/token');
const crypto = require('crypto');
const formData = require('form-data');
const mailgun = require('mailgun-js');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express()
app.use(cors())
var http = require('http');
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

http.createServer(function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE'
    });
    response.end('Hello World\n');
}).listen(400);
app.use(express.json())

const front = process.env.FRONTEND_URL;

const JWT_SECRET = 'E39BF8B10CA47DD21E11B421A7E98927C3971F10ECA8A42F7231FB2134C3D2C1';

mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB', err);
});

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'kartikkittad9314@gmail.com',
        pass: 'jjrpmgqlqlesvinb',
    },
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
const BillSchema = new mongoose.Schema({
    userEmail: String,
    BillNumbers: [String],
    favorites: [String],
});


const AWBModel = mongoose.model('AWB', AWBSchema);
const ContainerModel = mongoose.model('trackedContainers', ContainerSchema);
const BillModel = mongoose.model('trackedBOL', BillSchema);

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

app.get('/bol', async (req, res) => {
    try {
        const data = await BillOfLading.find();
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

app.post('/trackBillOfLading', async (req, res) => {
    const { Bill, userEmail } = req.body;

    try {
        const user = await BillModel.findOne({ userEmail });

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        user.BillNumbers.push(Bill);
        await user.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking B/L number:', error);
        res.status(500).json({ success: false, error: 'An error occurred while tracking B/L number.' });
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
        console.error('Error deleting tracked Container number:', error);
        res.status(500).json({ error: 'An error occurred while deleting the tracked  Container.' });
    }
});

app.get('/tracked-bills', async (req, res) => {
    const { userEmail } = req.query;

    try {
        const billDocument = await BillModel.findOne({ userEmail });

        if (!billDocument) {
            return res.json([]);
        }

        res.json(billDocument.BillNumbers);
    } catch (error) {
        console.error('Error fetching tracked BOL number:', error);
        res.status(500).json({ error: 'An error occurred while fetching tracked BOL number.' });
    }
});

app.delete('/tracked-bills', async (req, res) => {
    const { userEmail, BillNumber } = req.body;

    try {
        const billDocument = await BillModel.findOne({ userEmail });
        if (!billDocument) {
            return res.status(404).json({ error: 'No tracked BOL numbers found for the provided user email.' });
        }

        const updatedBills = billDocument.BillNumbers.filter((num) => num !== BillNumber);
        billDocument.BillNumbers = updatedBills;
        await billDocument.save();

        res.json({ success: true, message: 'BOL number deleted successfully.' });
    } catch (error) {
        console.error('Error deleting tracked BOL number:', error);
        res.status(500).json({ error: 'An error occurred while deleting the tracked BOL.' });
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
    const { userEmail, containerNumber } = req.body;

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

app.post('/billFavorites', async (req, res) => {
    const { Bill, userEmail } = req.body;

    try {
        const user = await BillModel.findOne({ userEmail });

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        if (user.favorites.includes(Bill)) {
            return res.status(400).json({ success: false, error: "BOL number already exists in favorites" });
        }

        user.favorites.push(Bill);
        await user.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error adding BOL number to favorites:', error);
        res.status(500).json({ success: false, error: 'An error occurred while adding BOL number to favorites.' });
    }
});

app.get('/billFavorites', async (req, res) => {
    const { userEmail } = req.query;

    try {
        const billDocument = await BillModel.findOne({ userEmail });

        if (!billDocument) {
            return res.json([]);
        }

        res.json(billDocument.favorites);
    } catch (error) {
        console.error('Error fetching tracked BOL number:', error);
        res.status(500).json({ error: 'An error occurred while fetching tracked BOL number.' });
    }
});

app.delete('/removeFavoriteBills', async (req, res) => {
    const { userEmail, BillNumber } = req.body;

    try {
        const billDocument = await BillModel.findOne({ userEmail });
        if (!billDocument) {
            return res.status(404).json({ error: 'No tracked BOL numbers found for the provided user email.' });
        }

        const updatedFavorites = billDocument.favorites.filter((num) => num !== BillNumber);
        billDocument.favorites = updatedFavorites;
        await billDocument.save();

        res.json({ success: true, message: 'BOL number deleted successfully from favorites.' });
    } catch (error) {
        console.error('Error deleting tracked BOL number from favorites:', error);
        res.status(500).json({ error: 'An error occurred while deleting the tracked BOL from favorites.' });
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
            verificationToken: verificationToken,
        });

        await newUser.save();

        const verificationUrl = `${front}/verify-email/${verificationToken}`;
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Verify your email address',
            text: `Hello ${name},\n\nPlease click the following link to verify your email address:\n\n${verificationUrl}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending verification email:', error);
                res.status(500).json({ error: 'Failed to send verification email' });
            } else {
                console.log('Verification email sent:', info.response);
                res.status(201).json({ message: 'User registered successfully. Please check your email for verification.' });
            }
        });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await UserModel.find({}, 'email');
        res.json(users);
    } catch (error) {
        console.error('Error fetching user data:', error);
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

app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const secret = JWT_SECRET + user.password;
        const token = jwt.sign({ email: user.email, id: user._id }, secret, { expiresIn: '10m' });

        const resetLink = `${front}/reset-password/${user._id}/${token}`;
        const mailOptions = {
            from: 'kartikkittad9314@gmail.com',
            to: email,
            subject: 'Password Reset Link',
            text: `Click the following link to reset your password: ${resetLink}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                res.status(500).json({ error: 'Failed to send password reset email' });
            } else {
                res.status(200).json({ message: 'Password reset link sent successfully' });
            }
        });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/get-user-email/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await UserModel.findById(id);

        if (user) {
            res.json({ email: user.email });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user email:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    console.log(req.params);

    const user = await UserModel.findOne({ _id: id });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const secret = JWT_SECRET + user.password;
    try {
        const verify = jwt.verify(token, secret);
        res.render("index", { id: id, email: verify.email, token: token, status: "not verified" });
    } catch (error) {
        console.log(error)
        res.send("Not verified");
    }
});

app.post('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;

    const user = await UserModel.findOne({ _id: id });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const secret = JWT_SECRET + user.password;
    try {
        const verify = jwt.verify(token, secret);
        const hashedPassword = await bcrypt.hash(password, 10);
        await UserModel.updateOne(
            { _id: id },
            { $set: { password: hashedPassword } }
        );
        return res.json({ status: "Password Updated" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Something went wrong" });
    }
})

const port = process.env.PORT || 4000
const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})

