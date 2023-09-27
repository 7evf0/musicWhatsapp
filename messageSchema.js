const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    messageSID: String,
    longitude: Number,
    latitude: Number,
});

module.exports = mongoose.model("Message", messageSchema);