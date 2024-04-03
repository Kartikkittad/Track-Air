const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const airData = new Schema({
    "Airline Name": String,
    "IATA Designator": String,
    "3-Digit Code": String,
    "ICAO Designator": String,
    "Country": String,
    "URL": String
});

const conData = new Schema({
    "Container Company Name": String,
    "URL": String,
    "Prefix": String,
    "Track URL": String
})

const favoriteSchema = new Schema({
    email: String,
    awbNumber: String,
})

const UserSchema = new Schema({
    name: String,
    designation: String,
    companyName: String,
    email: { type: String, unique: true },
    mobileno: String,
    password: String,
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
});

const trackedAwbSchema = new Schema({
    awbNumber: String,
    airlineName: String,
});

const TrackedAwbModel = mongoose.model('TrackedAwb', trackedAwbSchema);
const UserModel = mongoose.model('users', UserSchema)
const MyModel = mongoose.model('awbNumber', airData);
const Favorite = mongoose.model('Favorite', favoriteSchema);
const Container = mongoose.model('containers', conData);

module.exports = {
    UserModel,
    MyModel,
    TrackedAwbModel,
    Favorite,
    Container,
};
