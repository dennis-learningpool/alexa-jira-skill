module.change_code = 1;
'use strict';

const STATUS_OPEN = 'Open';
const STATUS_TODO = 'To Do';

function JiraQuery(jiraApi) {
	this.jira = jiraApi;
}

JiraQuery.prototype.getEpicsInProject = function (project, options, next) {
	if ('function' === typeof options) {
		next = options;
		options = {
            epicStatus: STATUS_TODO,
            fields: ['summary', 'status', 'description']
        };
	}

    var jql = `issuetype=Epic AND project = ${project} AND "Epic Status" = "${options.epicStatus}"`;
	console.log(`jql: ${jql}`);
    this.jira.searchJira(jql, options, next);
}

JiraQuery.prototype.getEpicSummary = function (issueNumber, options, next) {
	if ('function' === typeof options) {
		next = options;
		options = {
        };
	}

    var summary = [];
    var self = this;
	self.jira.findIssue(issueNumber, function (err, epic) {
        if (err) {
            return next(err);
        }

        // add summary field to summary text
        summary.push(`The epic is ${epic.fields.summary}.`);

        // get stories in epic
	    var jql = `"Epic Link" = ${issueNumber}`;
        console.log(`jql: ${jql}`);
        self.jira.searchJira(jql, { fields: ['status', 'issuetype', 'assignee'] }, function (err, result) {
            if (err) {
                return next(err);
            }

            // group issuetype and statuses
            var epicIssues = Object.create(null);
            var openAndAssignedIssueCount = 0;
            var openIssueCount = 0;
            result.issues.forEach(function (issue) {
                var issueType = issue.fields.issuetype.name;
                if (!epicIssues[issueType]) {
                    epicIssues[issueType] = {};
                }

                var issueStatus = issue.fields.status.name;
                if (!epicIssues[issueType][issueStatus]) {
                    epicIssues[issueType][issueStatus] = 0;
                }

                epicIssues[issueType][issueStatus]++;

                // track count of open and assigned issues
                if (issueStatus === STATUS_OPEN) {
                    openIssueCount++;
                    if (issue.fields.assignee) {
                        openAndAssignedIssueCount++;
                    }
                }
            });

            summary.push('Issues in this epic are as follows:');
            Object.keys(epicIssues).forEach(function (issueType) {
                Object.keys(epicIssues[issueType]).forEach(function (issueStatus) {
                    var pluralised = (1 === epicIssues[issueType][issueStatus])
                        ? ''
                        : 's';
                    summary.push(`${epicIssues[issueType][issueStatus]} ${issueStatus} ${issueType}${pluralised};`);
                });
            });

            if (openIssueCount > 0) {
                var pluralised = (openIssueCount === 1)
                    ? ''
                    : 's';
                var haveOrHas = (openAndAssignedIssueCount === 1)
                    ? 'has'
                    : 'have';

                summary.push(`Of ${openIssueCount} ${STATUS_OPEN} issue${pluralised}, ${openAndAssignedIssueCount} ${haveOrHas} been assigned.`);
            }

            return next(null, summary.join("\n"));
        });
    });
}

module.exports = JiraQuery;
