module.change_code = 1;
'use strict';

// load jira api config
var jiraConfig = {
	protocol: process.env.JIRA_PROTOCOL || 'https',
	uri: process.env.JIRA_URI,
	port: process.env.JIRA_PORT || 443,
	user: process.env.JIRA_USER,
	pass: process.env.JIRA_PASS,
	apiVersion: process.env.JIRA_API_VERSION || '2'
};

const Alexa = require('alexa-app');
const JiraApi = require('jira').JiraApi;
const JiraQuery = require('./lib/jiraquery');

var app = new Alexa.app('alexa-jira-skill');
var jiraApi = new JiraApi(
	jiraConfig.protocol,
	jiraConfig.uri,
   	jiraConfig.port,
	jiraConfig.user,
	jiraConfig.pass,
	jiraConfig.apiVersion
);

app.launch(function (req, res) {
	res.say('Which project?')
        .reprompt('I\'m sorry. Could you repeat that?')
        .shouldEndSession(false);
});

app.error = function (err, req, res) {
	console.log(err);
	console.log(req);
	console.log(res);

	res.say('Sorry, an error occurred ' + err.message);
};

app.intent(
	'JiraProjectRequestIntent', {
		'slots': {
			'project' : 'string'
		},
		'utterances': [
			'{project}'
		]
	},
	function (req, res) {
		var project = req.slot('project');
        var query = new JiraQuery(jiraApi);
        query.getEpicsInProject(project, function (err, result) {
            if (err) {
                console.log('There was an error:', err);
                return res.say(`Sorry, there was an error. ${err.message}`).send();
            }

            var epicKeys = [];
            var responseText = [`There are ${result.issues.length} epics in the ${project} project. They are:`];
            result.issues.forEach(function (epic) {
                epicKeys.push(epic.key);
                responseText.push(`${epic.key}: ${epic.fields.summary}`);
            });

            // save epic keys in session
            res.getSession().set('epicKeys', epicKeys);

            responseText.push(`Which epic shall I summarize?`);

            res.say(responseText.join("\n")).send();
        });
	}
);

app.intent(
	'JiraEpicSummaryIntent', {
		'slots': {
			'project' : 'string',
            'number' : Amazon.NUMBER
		},
		'utterances': [
			'{project} {number}'
		]
	},
	function (req, res) {
		var project = req.slot('project').toLowerCase();
        var number = req.slot('number');
        var epicKey = `${project}-${number}`;
        var query = new JiraQuery(jiraApi);
        query.getEpicSummary(key, function (err, summary) {
            if (err) {
                console.log(err);
                return res.say(`Sorry, there was an error: ${err.message}`).send();
            }

            return res.say(summary).send();
        });
    }
):

module.exports = app;
