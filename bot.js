// Require the dotenv library
require('dotenv').load();

// Require the API
var TelegramBot = require('node-telegram-bot-api');

// Get token from .env file
var token = process.env.TELEGRAM_BOT_TOKEN.replace(/^\s|\s+$|\n$/g, '');


// ------------------------------------ Utils ---------------------------------------
var request = require("./data/request.json");
// Lista de memes en JSON
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

var saveTextoArriba = function saveTextoArriba(message) {
    var cid = message.chat.id;
    var text = message.text;
    if(text == "/abajo") {
        api_request.text0 = ""
        bot.sendMessage(cid, "En ese caso, escribe lo que quieras que aparezca solo abajo.", options).then(textoAbajo);
    } else {
        api_request.text0 = text;
        bot.sendMessage(cid, "Bien! Ahora lo que quieres que aparezca abajo.", options).then(catchReply.bind(null, saveTextoAbajo));
    }
};

// Comprueba si la imagen existe
var checkMemeName = function checkMemeName(idOrName, elem, index, arr) {
    return elem.name == idOrName || elem.id == idOrName;
};

// Comprueba la imagen que quiere usar el usuario
var checkMeme = function sendName(message) {
    var cid = message.chat.id;
    var idOrName = message.text;
    var toSend = "Ese id o nombre no es válido.";
    client.search({
        index: "memes",
        body: {
            query: {
                "multi_match": {
                    query: idOrName,
                    fields: ["id", "title"],
                    fuzziness: "AUTO"
                }
            }
        }
    }).then(resp => {
        if (resp.hits.total != 0) {
            api_request.template_id = resp.hits.hits[0]._source.id;
            toSend = "Okkay! Mándame lo que quieres que aparezca en el texto de arriba.\nSi solo quieres texto de abajo escribe /abajo";
            bot.sendMessage(cid, toSend, options).then(catchReply.bind(null, saveTextoArriba));
        } else {
            bot.sendMessage(cid, toSend);
            bot.sendMessage(cid, "¿Cuál es el nombre o ID del meme que quieres crear?", options).then(catchReply.bind(null, checkMeme));
        }});
};

// Catch a reply and calls a callback
var catchReply = function catchReply(callback, sendedMessage) {
    var cid = sendedMessage.chat.id;
    var messageId = sendedMessage.message_id;
    bot.onReplyToMessage(cid, messageId, callback);
}

// Global bot
var bot;

// Global client
var client;

// Instancia el bot y lo inicia
var init = function init(client) {
    // Create the bot
    bot = new TelegramBot(token, {polling : true});

    // Start the proces of creating a meme
    bot.onText(/^\/create$/, (message) => {
        bot.sendMessage(message.chat.id, "¿Cuál es el nombre o ID del meme que quieres crear?", options)
            .then(catchReply.bind(null, checkMeme));
    });

    bot.onText(/^\/help$/, (message) => {
        bot.sendMessage(message.chat.id, "This is help!")
    });

    // Busca un meme en concreto
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
            bot.sendMessage(message.chat.id, resp.hits.hits[0]._source.url);
        });
    });

    bot.onText(/^\/memelist$/, (message) => {
        var toSend = sendMemeList();
        bot.sendMessage(message.chat.id, toSend);
    });

    // Print bot already running
    bot.getMe().then(console.log("Running..."));
};

// Crea un string con la informacion de cada meme
var formatMemeInfo = function (memesAnteriores, memeActual) {
    return memesAnteriores += "ID: " + memeActual.id + " -> " + memeActual.name + "\n";
};

// Envia una lista de memes
var sendMemeList = function () {
    return memes_info.reduce(formatMemeInfo, "");
};

var loadElasticSearch = function loadElasticSearch(callback) {
    var elasticsearch = require("elasticsearch");

    // Crea el cliente de elasticsearch
    client = new elasticsearch.Client({
        host: 'localhost:9200',
        log: 'trace'
    });

    // Borra los memes que pueden existir en elasticsearch para iniciarlos de nuevo
    deleteIndex(client, 'memes');

    // Crea los memes
    memes_info.forEach(populateElasticSearch.bind(null, client));

    // Llama a init que es el callback
    callback(client);
};

// Borra un indice de elasticsearch
function deleteIndex(client, indexName) {
    return client.indices.delete({
        index: indexName
    });
}

// Llena elasticsearch de memes para buscar por ellos
var populateElasticSearch = function populateElasticSearch(client, elem, index, arr) {
    // Aniade los memes a elasticsearch
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
