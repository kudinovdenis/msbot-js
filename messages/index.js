"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var request = require('request');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector,[ 
    function(session) {
        builder.Prompts.text(session, "To start say 'Login'");
    },
    function(session, results) {
        if (results.response == "Login") {
            session.beginDialog("login");
        } else {
            session.send("I did not recognize %s", results.response);
        }
    }
]);

bot.dialog('login', [
    function(session) {
        session.send("You are going to login");
        builder.Prompts.text(session, "Enter your ID");
    },
    function(session, results, next) {
        session.send("Your id is %s. Logging in...", results.response);
        next(results);
    },
    function(session, results) {
        var loginURL = "http://52.166.64.155:8080/auth?id=".concat(results.response);
        request.post(loginURL, function(err, res, body) {
            if(err) {
                console.log("ERROR: ", error);
                return
            } 
            if(res.statusCode !== 200 ) {
                console.log("WRONG STATUS CODE: ", res);
                return
            }
            console.log("BODY: ", body);
            var tokenInfo = JSON.parse(body);
            session.send("Your token is %s", tokenInfo.token);
            session.beginDialog("search", tokenInfo.token);
        });
    }
]);

bot.dialog('search', [
    function(session, results) {
        var token = results;
        var headers = {
            "Authorization" : "Bearer ".concat(token)
        }
        request.get({
            url: "http://52.166.64.155:8080/files/",
            headers: headers
        }, 
        function(err, res, body) {
            if(err) {
                console.log("ERROR: ", error);
                return
            } 
            if(res.statusCode !== 200 ) {
                console.log("WRONG STATUS CODE: ", res);
                return
            }
            var files = JSON.parse(body);
            files.forEach(function(file) {
                var card = new builder.HeroCard(session)
                .title("Name: ".concat(file.file_name))
                .text("File id: ".concat(file.id))
                .images([
                    builder.CardImage.create(session, file.thumbnails[0].content_url)
                ]);
                var msg = new builder.Message(session).attachments([card]);
                session.send(msg);
            }, this);
            session.endConversation("goodbye");
        })
    }
])

// var luisURL = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/c73182a6-cd96-43e2-b680-07b7aa43c73b?subscription-key=1302fa19ca8d4d80bad455fc33201687&timezoneOffset=0.0&verbose=true"
// var luisRecognizer = new builder.LuisRecognizer(luisURL);
// var intents = new builder.IntentDialog({ recognizers: [luisRecognizer] });
// bot.dialog('/', intents);

// intents.matches('SearchForFeaturesAndDates', [
//     function (session, args, next) {
//         var entities = args.entities;
//         entities.forEach(function(entity) {
//             if (entity.entity == "photos" || entity.entity == "photo") {
//                 builder.Prompts.choice(session, "You loooking for some photo. Specify date?", ["Yes", "No"])
//             }
//         }, this);
//     },
//     function (session, results) {
//         if (results.response) {
//             if (results.response.entity == "Yes") {
//                 session.send("You answered yes. Will search with dates");
//                 builder.Prompts.time(session, "choose date");
//             }
//             else {
//                 builder.Prompts.text(session, "You answered no. No dates...");
//             }
//         }
//     }, 
//     function (session, results) {
//         console.log("Date result: ", results);
//         session.send(results);
//     }
// ]);

if (useEmulator) {
    var restify = require('restify');
    var bunyan = require("bunyan")
    var logger = bunyan.createLogger({        
        name: 'ms-prototype',
        serializers: {
            req: bunyan.stdSerializers.req
        }})
    var server = restify.createServer({
        log: logger
    });
    server.pre(function (request, response, next) {
        // request.log.info({ req: request }, 'REQUEST');
        // response.log.info({res: response}, 'RESPONSE');
        next();
    });
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());  
} else {
    module.exports = { default: connector.listen() }
}
