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
const pluralize = require('pluralize');
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
        var session = req.getSession();
		var project = req.slot('project').toUpperCase();
        var query = new JiraQuery(jiraApi);
        var startAt = 0;

        // if session var 'project' is set, then we are responding to a request for more
        var sessionProject = session.get('project');
        if (sessionProject) {
            project = sessionProject;
            startAt = session.get('enumerated');

            // clear session vars
            session.clear('project');
            session.clear('enumerated');
        }

        query.getEpicsInProject(project, { startAt: startAt }, function (err, result) {
            if (err) {
                console.log('There was an error:', err);
                return res.say(`Sorry, there was an error. ${err.message}`).send();
            }

            var responseText = [`There are ${result.total} epics in the ${project} project. They are:`];
            result.issues.forEach(function (epic) {
                responseText.push(`${epic.key}: ${epic.fields.summary}.`);
            });

            var enumerated = result.startAt + result.maxResults;
            var hasMore = enumerated < result.total;
            if (enumerated < result.total) {
                var remaining = result.total - enumerated;
                var resultText = pluralize('result', remaining);
                responseText.push(`Shall I continue listing ${remaining} more ${resultText}?`);

                // set session vars for next time!
                session.set('enumerated', enumerated);
                session.set('project', project);
            }

            return res.say(responseText.join("\n")).send();
        });

        return false;
	}

);

app.intent(
	'JiraEpicSummaryIntent', {
		'slots': {
			'project' : 'string',
            'number' : 'number'
		},
		'utterances': [
			'{project} {number}'
		]
	},
	function (req, res) {
		var project = req.slot('project').toUpperCase();
        var number = req.slot('number');
        var epicKey = `${project}-${number}`;
        var query = new JiraQuery(jiraApi);
        query.getEpicSummary(epicKey, function (err, summary) {
            if (err) {
                console.log(err);
                return res.say(`Sorry, there was an error: ${err.message}`).send();
            }

            return res.say(summary).send();
        });

        return false;
    }
);

module.exports = app;
