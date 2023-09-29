// MAIN REQUIREMENTS
const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");

// WHATSAPP API REQUIREMENTS
const client = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

// MONGODB REQUIREMENTS
const mongoDB = require("mongoose");
const Music = require("./musicSchema.js");
const Message = require("./messageSchema.js");

// GEO DISTANCE REQUIREMENTS
const dist = require("geo-distance-js");
var geodist = require('geodist');

// DISCORDJS REQUIREMENTS

const discord = require("discord.js");
const {Client, IntentsBitField ,EmbedBuilder} = discord;
const dcClient = new Client({
    intents:[
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageTyping,
        IntentsBitField.Flags.MessageContent
    ]
});
dcClient.login(process.env.TOKEN);

dcClient.on("messageCreate", async (msg) => {
    const msgContent = msg.content;

    if(msgContent === "most viewed"){
        sendBusinessInitiated();
    }
});

// MAIN FUNCTION

async function main(){

    try {
        await mongoDB.connect(process.env.MONGO_CONNECTION);
        console.log("Successfully connected to MongoDB");
    } catch (error) {
        console.log("Could not connect to MongoDB: " + error);
    }

};

main().catch(console.error);


//  REST API
const App = express();

App.get("/", (req, res) => {
    console.log("You have entered");
});

var urlencodedParser = bodyParser.urlencoded({ extended: false });

App.post("/music_app", urlencodedParser , async (req, res) => {
    await respond(req.body);
});

App.listen(8080, () => {
    console.log("Heyyy, it is listened");
});


// MAIN RESPOND FUNCTION

async function respond(req){
    
    const latitude = req.Latitude;
    const longitude = req.Longitude;
    const userPhone = req.From;
    const profileName = req.ProfileName;
    const repliedMsgSID = req.OriginalRepliedMessageSid;
    const body = req.Body;

    // LIST VARIABLES
    const listID = req.ListId;

    // check if the response is a location
    if(longitude && latitude && !repliedMsgSID){
        respondLocation(profileName, userPhone, longitude, latitude);
    }

    // check if the list is replied
    if(repliedMsgSID && listID){

        // adding song to collection
        if(listID === "add_song"){
            requestSong(userPhone, repliedMsgSID);
        }
        else if(listID === "get_song"){
            getSong(userPhone, repliedMsgSID);
        }
    }

    // check if it is song addition
    if(repliedMsgSID && !listID){
        addSong(userPhone, body, profileName, repliedMsgSID);
    }

};

// SIDE FUNCTIONS

async function respondLocation(profileName, userPhone, longitude, latitude){
    try {

        const msg = await client.messages.create({
            contentSid: process.env.MAIN_MULTIPLE_CHOICE,
            from: process.env.SERVICE_SID,
            contentVariables: JSON.stringify({
                1: profileName
            }),
            to: userPhone,
        });

        const msgSID = msg.sid;
        console.log(msgSID);
        await Message.create({messageSID: msgSID, longitude: longitude, latitude: latitude});

    } catch (error) {
        console.log("Error occured: " + error);
    }
};

async function requestSong(userPhone, repliedMsgSID){

    try {

        const data = await Message.findOneAndDelete({messageSID: repliedMsgSID});
        const longitude = data.longitude;
        const latitude = data.latitude;
    
        const msg = await client.messages.create({
            body: "You've chosen to add the perfect song to this very location :) Now, you have to type your song's link by replying this message!",
            from: process.env.SERVICE_SID,
            to: userPhone
        });
    
        await Message.create({messageSID: msg.sid, longitude: longitude, latitude: latitude});

    } catch (error) {
        console.log("Error occured: " + error);
    }

};

async function addSong(userPhone, musicLink, name, repliedMsgSID){
    try {
        const data = await Message.findOneAndDelete({messageSID: repliedMsgSID});
        const longitude = data.longitude;
        const latitude = data.latitude;

        await Music.create({phone_number: userPhone, latitude: latitude, longitude: longitude, music_link: musicLink, name: name, views: 0});
        await client.messages.create({
            body: "Your song has been added to the collection successfully :) Thank you for your contribution!",
            from: process.env.SERVICE_SID,
            to: userPhone
        });
    } catch (error) {
        console.log("Error occured: " + error);
    }
};

async function getSong(userPhone, repliedMsgSID){
    try {
        const data = await Message.findOneAndDelete({messageSID: repliedMsgSID});
        const longitude = data.longitude;
        const latitude = data.latitude;

        var distance = -1;
        var closestMusic = {};

        const list = await Music.find({});
        list.forEach(music => {

            const userLongitude = music.longitude;
            const userLatitude = music.latitude;
            const user = music.phone_number;

            var currDistance = geodist({lat: latitude, lon: longitude}, {lat: userLatitude, lon: userLongitude}, {unit: "feet"});
            if((distance === -1 || distance > currDistance) && userPhone != user){
                
                closestMusic = music;
                distance = currDistance;

            }
    
        });

        
        await Music.updateOne({_id: closestMusic.id}, {views: (closestMusic.views ? closestMusic.views + 1 : 1)});
        await client.messages.create({
            messagingServiceSid: process.env.SERVICE_SID,
            body: `${closestMusic.music_link}\n\n${closestMusic.name}`,
            persistentAction: [`geo:${closestMusic.latitude},${closestMusic.longitude}`],
            to: userPhone
        });

    } catch (error) {
        console.log("Error occured: " + error);
    }
}

async function sendBusinessInitiated(){

    try {

        var closestMusic = {};
        const list = await Music.find({});
            list.forEach(music => {

                const user = music.phone_number;
                const view = music.views ? music.views : 0;
                music.mus

                var currentView = -1
                if((currentView === -1 || view > currentView)){
                    
                    closestMusic = music;

                }
        
            });

        const phone_number = closestMusic.phone_number;
        const musicLink = closestMusic.music_link;
        const name = closestMusic.name;

        await client.messages.create({
            body: `Congratulations ${name}! Your music has the most view in the entire app :) We just wanted to remind you this precious song that you have added.\n\n${musicLink}`,
            from: process.env.SERVICE_SID,
            to: phone_number
        });

        console.log("Message has sent to " + name);

    } catch (error) {
        console.log("Error occured: " + error);
    }
    
};