module.change_code = 1;
'use strict';

const Alexa = require('alexa-app');

var app = new Alexa.app('alexa-jira-skill');

app.launch(function (req, res) {
	res.say('What would you like to post?').reprompt('I\'m sorry. Could you repeat that?').shouldEndSession(false);
});

app.error = function (err, req, res) {
	console.log(err);
	console.log(req);
	console.log(res);

	res.say('Sorry, an error occurred ' + err.message);
};

app.intent( 
	'JiraEpicQueryIntent', {
		'slots': { 
			'message' : 'string'
		},
		'utterances': [
			'{message}'
		]
	},
	function (req, res) {
		var message = req.slot('message');

		res.say('Your message was posted');
	}	
);

module.exports = app;
