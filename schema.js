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

const favoriteSchema = new Schema({
    email: String,
    awbNumber: String,
})

const UserSchema = new Schema({
    name: String,
    designation: String,
    companyName: String,
    email: { type: String, required: true, unique: true },
    mobileno: String,
    password: String,
    isEmailVerified: { type: Boolean, default: false }
});

const trackedAwbSchema = new Schema({
    awbNumber: String,
    airlineName: String,
});

const TrackedAwbModel = mongoose.model('TrackedAwb', trackedAwbSchema);
const UserModel = mongoose.model('users', UserSchema)
const MyModel = mongoose.model('awbNumber', airData);
const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = {
    UserModel,
    MyModel,
    TrackedAwbModel,
    Favorite
};
