const mongoose = require("mongoose");

const musicSchema = new mongoose.Schema({
    phone_number: String,
    name: String,
    music_link: String,
    longitude: Number,
    latitude: Number,
    views: Number
});

module.exports = mongoose.model("Music", musicSchema);