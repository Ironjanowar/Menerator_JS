// Require the dotenv library
require('dotenv').load();

// Require the API
var TelegramBot = require('node-telegram-bot-api');

// Get token from .env file
var token = process.env.TELEGRAM_BOT_TOKEN.replace(/^\s|\s+$|\n$/g, '');


// ------------------------------------ Utils ---------------------------------------
var request = require("./data/request.json");
var memes_info = request.data.memes;
var login = require("./data/api_login.json");
var api_request = {
    "username": login.username,
    "password": login.pass
};

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
};

var sendRequest = function sendRequest(cid) {
    var postRequest = require("request");
    postRequest.post({url: "https://api.imgflip.com/caption_image", form: api_request }, catchResponse.bind(null, cid));
};

var saveTextoAbajo = function saveTextoAbajo(message) {
    var cid = message.chat.id;
    var text = message.text;
    api_request.text1 = text;
    bot.sendMessage(cid, "Aquí esta tu nuevo meme!").then(sendRequest.bind(null, cid));
};

var textoAbajo = function textoAbajo(sended) {
    var cid = sended.chat.id;
    var messageId = sended.message_id;
    bot.onReplyToMessage(cid, messageId, saveTextoAbajo);
};

var saveTextoArriba = function saveTextoArriba(message) {
    var cid = message.chat.id;
    var text = message.text;
    if(text == "/abajo") {
        api_request.text0 = ""
        bot.sendMessage(cid, "En ese caso, escribe lo que quieras que aparezca solo abajo.", options).then(textoAbajo);
    } else {
        api_request.text0 = text;
        bot.sendMessage(cid, "Bien! Ahora lo que quieres que aparezca abajo.", options).then(textoAbajo);
    }
};

var textoArriba = function textoArriba(sended) {
    var cid = sended.chat.id;
    var messageId = sended.message_id;
    bot.onReplyToMessage(cid, messageId, saveTextoArriba);
};

var checkMemeName = function checkMemeName(idOrName, elem, index, arr) {
    return elem.name == idOrName || elem.id == idOrName;
};

var checkMeme = function sendName(message) {
    var cid = message.chat.id;
    var idOrName = message.text;
    var toSend = "Ese id o nombre no es válido.";
    if(memes_info.some(checkMemeName.bind(null, idOrName))) {
        var meme = memes_info.find(checkMemeName.bind(null, idOrName));
        api_request.template_id = meme.id;
        toSend = "Okkay! Mándame lo que quieres que aparezca en el texto de arriba.\nSi solo quieres texto de abajo escribe /abajo";
        bot.sendMessage(cid, toSend, options).then(textoArriba);
    } else {
        bot.sendMessage(cid, toSend);
        bot.sendMessage(cid, "¿Cuál es el nombre o ID del meme que quieres crear?", options).then(catchReply);
    }
};

var catchReply = function onReply(sended) {
    var cid = sended.chat.id;
    var messageId = sended.message_id;
    bot.onReplyToMessage(cid, messageId, checkMeme);
};

// Global bot
var bot;

var init = function init(client) {
    // Create the bot
    bot = new TelegramBot(token, {polling : true});


    bot.onText(/^\/newmeme$/, (message) => {
        bot.sendMessage(message.chat.id, "¿Cuál es el nombre o ID del meme que quieres crear?", options)
            .then(catchReply);
    });

    bot.onText(/^\/help$/, (message) => {
        bot.sendMessage(message.chat.id, "This is help!")
    });

    bot.onText(/^\/search (.+)/, (message, params) => {
        client.search(
            {
                index: "memes",
                body: {
                    query: {
                        "multi_match": {
                            query: params[1],
                            fields: ["id", "title"],
                            fuzziness: "AUTO"
                        }
                    }
                }
            }
        ).then(resp => {
            console.log(params);
            bot.sendMessage(message.chat.id, resp.hits.hits[0]._source.url);
        });
    });

    // Print bot already running
    bot.getMe().then(console.log("Running..."));
};

var loadElasticSearch = function loadElasticSearch(callback) {
    var elasticsearch = require("elasticsearch");

    var client = new elasticsearch.Client({
        host: 'localhost:9200',
        log: 'trace'
    });

    client.indices.delete({
        index: 'memes'
    });
    
    memes_info.forEach(populateElasticSearch.bind(null, client));
    callback(client);
};

function deleteIndex() {  
    return elasticClient.indices.delete({
        index: indexName
    });
}

var populateElasticSearch = function populateElasticSearch(client, elem, index, arr) {
    // TODO: Comprobar si existe

    
    client.create({
        index: 'memes',
        type: 'meme',
        id: elem.id,
        body: {
            title: elem.name,
            url: elem.url,
            id: elem.id
        }
    }, function (error, response) {
        console.log(error);
    });
};

// Load elasticsearch and run
loadElasticSearch(init);
