// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');
const launchDoc = require('./documents/launchScreen.json');

const util = require('./util');
const commands = require('./documents/commands.json');
const birthdayDoc = require('./documents/birthdayScreen.json');

const HasBirthdayLaunchRequestHandler = {
    canHandle(handlerInput) {
        console.log(JSON.stringify(handlerInput.requestEnvelope.request));
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};
        
        const year = sessionAttributes.hasOwnProperty('year') ? sessionAttributes.year : 0;
        const month = sessionAttributes.hasOwnProperty('month') ? sessionAttributes.month : 0;
        const day = sessionAttributes.hasOwnProperty('day') ? sessionAttributes.day : 0;

        return handlerInput.requestEnvelope.request.type === 'LaunchRequest' &&
            year &&
            month &&
            day;
    },
    async handle(handlerInput) {
        
        const serviceClientFactory = handlerInput.serviceClientFactory;
        const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
        
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};
        
        const year = sessionAttributes.hasOwnProperty('year') ? sessionAttributes.year : 0;
        const month = sessionAttributes.hasOwnProperty('month') ? sessionAttributes.month : 0;
        const day = sessionAttributes.hasOwnProperty('day') ? sessionAttributes.day : 0;
        
        let userTimeZone;
        try {
            const upsServiceClient = serviceClientFactory.getUpsServiceClient();
            userTimeZone = await upsServiceClient.getSystemTimeZone(deviceId);    
        } catch (error) {
            if (error.name !== 'ServiceError') {
                return handlerInput.responseBuilder.speak("There was a problem connecting to the service.").getResponse();
            }
            console.log('error', error.message);
        }
        console.log('userTimeZone', userTimeZone);
        
        const oneDay = 24*60*60*1000;
        
        // getting the current date with the time
        const currentDateTime = new Date(new Date().toLocaleString("en-US", {timeZone: userTimeZone}));
        // removing the time from the date because it affects our difference calculation
        const currentDate = new Date(currentDateTime.getFullYear(), currentDateTime.getMonth(), currentDateTime.getDate());
        let currentYear = currentDate.getFullYear();
        
        console.log('currentDateTime:', currentDateTime);
        console.log('currentDate:', currentDate);
        
        // getting the next birthday
        let nextBirthday = Date.parse(`${month} ${day}, ${currentYear}`);
        
        // adjust the nextBirthday by one year if the current date is after their birthday
        if (currentDate.getTime() > nextBirthday) {
            nextBirthday = Date.parse(`${month} ${day}, ${currentYear + 1}`);
            currentYear++;
        }
        
        // setting the default speakOutput to Happy xth Birthday!! 
        // Alexa will automatically correct the ordinal for you.
        // no need to worry about when to use st, th, rd
        const yearsOld = currentYear - year;
        let speakOutput = `Happy ${yearsOld}th birthday!`;
        let isBirthday = true;

        if (currentDate.getTime() !== nextBirthday) {
            isBirthday = false;
            const diffDays = Math.round(Math.abs((currentDate.getTime() - nextBirthday)/oneDay));
            speakOutput = `Welcome back. It looks like there are ${diffDays} days until your ${currentYear - year}th birthday.`
        }

        const headerMessage = "LaunchRequest with All";
        const hintString = "This is my hint";

        // Add APL directive to response
        if (supportsAPL(handlerInput)) {
            if(!isBirthday){
                const {Viewport} = handlerInput.requestEnvelope.context;
                const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
                handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: launchDoc,
                    datasources: {
                        launchData: {
                            type: 'object',
                            properties: {
                                headerTitle: headerMessage,
                                mainText: speakOutput,
                                hintString: hintString,
                                logoImage: Viewport.pixelWidth > 480 ? util.getS3PreSignedUrl('Media/full_icon_512.png') : util.getS3PreSignedUrl('Media/full_icon_108.png'),
                                backgroundImage: util.getS3PreSignedUrl('Media/garlands_'+resolution+'.png'),
                                backgroundOpacity: "0.5"
                            },
                            transformers: [{
                                inputPath: 'hintString',
                                transformer: 'textToHint',
                            }]
                        }
                    }
                });
            } else {
                addAnimations(handlerInput, yearsOld);
            }
        }
        
        // Add card to response
        handlerInput.responseBuilder.withStandardCard(
                headerMessage,
                speakOutput,
                util.getS3PreSignedUrl('Media/garlands_480x480.png'));

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello! Welcome to Cake walk. What is your birthday?';
        const repromptOutput = 'I was born Nov. 6th, 2015. When were you born?'; 

        const headerMessage = "Default LaunchRequest";
        const hintString = "Say your birthday!";   

        // Add APL directive to response
        if (supportsAPL(handlerInput)) {
            const {Viewport} = handlerInput.requestEnvelope.context;
            const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.0',
                document: launchDoc,
                datasources: {
                    launchData: {
                        type: 'object',
                        properties: {
                            headerTitle: headerMessage,
                            mainText: speakOutput,
                            hintString: hintString,
                            logoImage: Viewport.pixelWidth > 480 ? util.getS3PreSignedUrl('Media/full_icon_512.png') : util.getS3PreSignedUrl('Media/full_icon_108.png'),
                            backgroundImage: util.getS3PreSignedUrl('Media/lights_'+resolution+'.png'),
                            backgroundOpacity: "0.5"
                        },
                        transformers: [{
                            inputPath: 'hintString',
                            transformer: 'textToHint',
                        }]
                    }
                }
            });
        }

        // Add card to response
        handlerInput.responseBuilder.withStandardCard(
                headerMessage,
                speakOutput,
                util.getS3PreSignedUrl('Media/garlands_480x480.png'));

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};
const BirthdayIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CaptureBirthdayIntent';
    },
    async handle(handlerInput) {
        const year = handlerInput.requestEnvelope.request.intent.slots.year.value;
        const month = handlerInput.requestEnvelope.request.intent.slots.month.value;
        const day = handlerInput.requestEnvelope.request.intent.slots.day.value;
        
        const attributesManager = handlerInput.attributesManager;
        
        const birthdayAttributes = {
            "year": year,
            "month": month,
            "day": day
            
        };
        attributesManager.setPersistentAttributes(birthdayAttributes);
        await attributesManager.savePersistentAttributes();    

        const headerMessage = "CaptureBirthdayIntent";
        const hintString = "This is my hint";
        const speakOutput = `Thanks, I'll remember that you were born ${month} ${day} ${year}.`;

        // Add APL directive to response
        if (supportsAPL(handlerInput)) {
            const {Viewport} = handlerInput.requestEnvelope.context;
            const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.0',
                document: launchDoc,
                datasources: {
                    launchData: {
                        type: 'object',
                        properties: {
                            headerTitle: headerMessage,
                            mainText: speakOutput,
                            hintString: hintString,
                            logoImage: Viewport.pixelWidth > 480 ? util.getS3PreSignedUrl('Media/full_icon_512.png') : util.getS3PreSignedUrl('Media/full_icon_108.png'),
                            backgroundImage: util.getS3PreSignedUrl('Media/straws_'+resolution+'.png'),
                            backgroundOpacity: "0.5"
                        },
                        transformers: [{
                            inputPath: 'hintString',
                            transformer: 'textToHint',
                        }]
                    }
                }
            });
        }
        
        // Add card to response
        handlerInput.responseBuilder.withStandardCard(
                headerMessage,
                speakOutput,
                util.getS3PreSignedUrl('Media/garlands_480x480.png'));

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.message}`);
        const speakOutput = `Sorry, I couldn't understand what you said. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const LoadBirthdayInterceptor = {
    async process(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};
        
        const year = sessionAttributes.hasOwnProperty('year') ? sessionAttributes.year : 0;
        const month = sessionAttributes.hasOwnProperty('month') ? sessionAttributes.month : 0;
        const day = sessionAttributes.hasOwnProperty('day') ? sessionAttributes.day : 0;
        
        if (year && month && day) {
            attributesManager.setSessionAttributes(sessionAttributes);
        }
    }
}

//Utility Functions
function addAnimations(handlerInput, yearsOld) {
    handlerInput.responseBuilder
        .addDirective(
        {
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.1',
                    document: birthdayDoc,
                    datasources: {
                        birthdayData: {
                            type: 'object',
                            properties: {
                                year: yearsOld
                            }
                        }
                    }
                })
        .addDirective(commands);
}

// function getS3PreSignedUrl(filename) {
    // return "https://raw.githubusercontent.com/germanviscuso/ASKVideoSeries/master/08/lambda/documents/images/" + filename;
// }

function supportsAPL(handlerInput) {
    const {supportedInterfaces} = handlerInput.requestEnvelope.context.System.device;
    return supportedInterfaces['Alexa.Presentation.APL'];
}

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({bucketName:process.env.S3_PERSISTENCE_BUCKET})
    )
    .addRequestHandlers(
        HasBirthdayLaunchRequestHandler,
        LaunchRequestHandler,
        BirthdayIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        LoadBirthdayInterceptor
    )
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();
