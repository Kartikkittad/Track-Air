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


const UserSchema = new Schema({
    email: String,
    username: String,
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isEmailVerified: { type: Boolean, default: false }
});

const trackedAwbSchema = new Schema({
    awbNumber: String
});

const TrackedAwbModel = mongoose.model('TrackedAwb', trackedAwbSchema);
const UserModel = mongoose.model('users', UserSchema)
const MyModel = mongoose.model('awbNumber', airData);

module.exports = {
    UserModel,
    MyModel,
    TrackedAwbModel
};
