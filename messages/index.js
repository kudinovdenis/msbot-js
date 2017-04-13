"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

var luisURL = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/c73182a6-cd96-43e2-b680-07b7aa43c73b?subscription-key=1302fa19ca8d4d80bad455fc33201687&timezoneOffset=0.0&verbose=true"
var luisRecognizer = new builder.LuisRecognizer(luisURL);
var intents = new builder.IntentDialog({ recognizers: [luisRecognizer] });
bot.dialog('/', intents);

intents.matches('SearchForFeaturesAndDates', [
    function (session, args, next) {
        var entities = args.entities;
        entities.forEach(function(entity) {
            console.log("entity: ", entity);
            if (entity.entity == "photos" || entity.entity == "photo") {
                builder.Prompts.choice(session, "You loooking for some photo. Specify date?", ["Yes", "No"])
            }
        }, this);
    },
    function (session, results) {
        if (results.response) {
            if (results.response.entity == "Yes") {
                session.send("You answered yes. Will search with dates");
                builder.Prompts.time(session, "choose date");
            }
            else {
                builder.Prompts.text(session, "You answered no. No dates...");
            }
        }
    }, 
    function (session, results) {
        console.log("Date result: ", results);
        session.send(results);
    }
]);

// bot.dialog('/', function (session) {
//     session.send('You said ' + session.message.text);

//     var luisURL = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/c73182a6-cd96-43e2-b680-07b7aa43c73b?subscription-key=1302fa19ca8d4d80bad455fc33201687&timezoneOffset=0.0&verbose=true"
//     var luisRecognizer = new builder.LuisRecognizer(luisURL);
//     console.log("recognizer: ", luisRecognizer);
//     console.log("recognize context: ", session.toRecognizeContext);
//     luisRecognizer.recognize(session.toRecognizeContext, (error, result) => {
//         console.log("result: ", result);
//         console.log("error: ", error);
//     });
    
// });

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());  
} else {
    module.exports = { default: connector.listen() }
}
