// Require the dotenv library
require('dotenv').load();

// Require the API
var TelegramBot = require('node-telegram-bot-api');

// Get token from .env file
var token = process.env.TELEGRAM_BOT_TOKEN.replace(/^\s|\s+$|\n$/g, '');

// Create the bot
var bot = new TelegramBot(token, {polling : true});

// ------------------------------------ Utils ---------------------------------------
var request = require("./data/request.json");
var memes_info = request["data"]["memes"];
var login = require("./data/api_login.json")
var api_request = {
    "username": login["username"],
    "password": login["pass"]
}

// ------------------------------------ Handlers ------------------------------------
// Reply markup to force reply a message
var options = {
    reply_markup : JSON.stringify(
        {
            force_reply: true
        }
    )
};

var catchResponse = function catchResponse(cid, err, response, body) {
    if(err) {
        console.log(err);
    } else {
        var parsedBody = JSON.parse(body)
        var image = parsedBody.data.url;
        bot.sendMessage(cid, image)
    }
}

var sendRequest = function sendRequest(cid) {
    var postRequest = require("request");
    postRequest.post({url: "https://api.imgflip.com/caption_image", form: api_request }, catchResponse.bind(null, cid));
}

var saveTextoAbajo = function saveTextoAbajo(message) {
    var cid = message.chat.id;
    var text = message.text;
    api_request["text1"] = text;
    bot.sendMessage(cid, "Aquí esta tu nuevo meme!").then(sendRequest.bind(null, cid));
}

var textoAbajo = function textoAbajo(sended) {
    var cid = sended.chat.id;
    var messageId = sended.message_id;
    bot.onReplyToMessage(cid, messageId, saveTextoAbajo);
}

var saveTextoArriba = function saveTextoArriba(message) {
    var cid = message.chat.id;
    var text = message.text;
    if(text == "/abajo") {
        api_request["text0"] = ""
        bot.sendMessage(cid, "En ese caso, escribe lo que quieras que aparezca solo abajo.", options).then(textoAbajo);
    } else {
        api_request["text0"] = text;
        bot.sendMessage(cid, "Bien! Ahora lo que quieres que aparezca abajo.", options).then(textoAbajo);
    }
}

var textoArriba = function textoArriba(sended) {
    var cid = sended.chat.id;
    var messageId = sended.message_id;
    bot.onReplyToMessage(cid, messageId, saveTextoArriba);
}

var checkMemeName = function checkMemeName(idOrName, elem, index, arr) {
    return elem["name"] == idOrName || elem["id"] == idOrName;
}

var checkMeme = function sendName(message) {
    var cid = message.chat.id;
    var idOrName = message.text;
    var toSend = "Ese id o nombre no es válido.";
    if(memes_info.some(checkMemeName.bind(null, idOrName))) {
        var meme = memes_info.find(checkMemeName.bind(null, idOrName));
        api_request["template_id"] = meme["id"];
        toSend = "Okkay! Mándame lo que quieres que aparezca en el texto de arriba.\nSi solo quieres texto de abajo escribe /abajo";
        bot.sendMessage(cid, toSend, options).then(textoArriba);
    } else {
        bot.sendMessage(cid, toSend);
        bot.sendMessage(cid, "¿Cuál es el nombre o ID del meme que quieres crear?", options).then(catchReply);
    }
}

var catchReply = function onReply(sended) {
    var cid = sended.chat.id;
    var messageId = sended.message_id;
    bot.onReplyToMessage(cid, messageId, checkMeme);
}

bot.onText(/^\/newmeme$/, (message) => {
    bot.sendMessage(message.chat.id, "¿Cuál es el nombre o ID del meme que quieres crear?", options)
        .then(catchReply);
});

// Echo handler
bot.onText(/^\/newmeme (.+)/, (message, match) => {
    var toSend = "You said: " + match[1];
    bot.sendMessage(message.chat.id, toSend);
});

bot.getMe().then(console.log("Running..."));
