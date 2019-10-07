/* eslint-disable camelcase */

const path = require('path');
const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const workspace = process.env.GITHUB_WORKSPACE;

// Returns results from xo command
const runXo = async options => {
  const xoPath = path.join(workspace, 'node_modules', '.bin', 'xo');
  let resultString = '';

  const parseResults = data => {
    resultString += data.toString();
  };

  await exec.exec(xoPath, options, {
    cwd: workspace,
    ignoreReturnCode: true,
    silent: true,
    listeners: {
      stdout: parseResults,
      stderr: parseResults
    }
  });

  return JSON.parse(resultString);
};

const updateCheck = async ({summary, conclusion, annotations}) => {
  const client = new github.GitHub(process.env.GITHUB_TOKEN);
  const {sha: head_sha, action: title, ref} = github.context;
  const {owner, repo} = github.context.repo;

  const checkRuns = await client.checks
    .listForRef({owner, repo, ref})
    .then(({data}) => data.check_runs);

  // User must provide the check run's name
  // so we can match it up with the correct run
  const checkName = core.getInput('check_name') || 'lint';
  let checkNameRun = checkRuns.find(check => check.name === checkName);

  // Bail if we have more than one check and there's no named run found
  if (checkRuns.length >= 2 && !checkNameRun) {
    core.debug(`Couldn't find a check run matching "${checkName}".`);

    // Create new check run as we couldn't find a matching one.
    await client.checks.create({
      ...github.context.repo,
      name: checkName,
      head_sha,
      started_at: new Date().toISOString()
    });

    const checkRuns = await client.checks
      .listForRef({owner, repo, ref})
      .then(({data}) => data.check_runs);

    checkNameRun = checkRuns.find(check => check.name === checkName);
  }

  const checkRunId = checkRuns.length >= 2 ? checkNameRun.id : checkRuns[0].id;

  await client.checks.update({
    ...github.context.repo,
    check_run_id: checkRunId,
    completed_at: new Date().toISOString(),
    conclusion,
    output: {
      title,
      summary:
        conclusion === 'success'
          ? 'XO found no lint in your code.'
          : 'XO found lint in your code.',
      text:
        conclusion === 'success'
          ? ':tada: XO found no lint in your code.'
          : summary.join('\n'),
      annotations: annotations.slice(0, 49)
    }
  });
};

const run = async () => {
  try {
    const annotations = [];
    const summary = [];

    let warningCount = 0;
    let errorCount = 0;
    let conclusion = 'success';

    const pkgPath = path.join(workspace, 'package.json');
    const {eslintConfig = {}, xo = {}} = require(pkgPath);

    // Only run with prettier flag if needed
    const needsPrettier =
      (eslintConfig &&
        eslintConfig.plugins &&
        eslintConfig.plugins.includes('prettier')) ||
      xo.prettier;

    // Run xo command
    const results = await runXo([
      '--reporter=json',
      needsPrettier ? '--prettier' : ''
    ]).catch(error => {
      core.setFailed(error.message);
      return [];
    });

    for (const result of results) {
      const {filePath, messages} = result;

      warningCount += Number(result.warningCount);
      errorCount += Number(result.errorCount);

      for (const msg of messages) {
        const {severity, ruleId: raw_details} = msg;
        let {line, endLine} = msg;
        let annotation_level;

        // Sanity checks
        let message = msg.message.replace(/["']/g, '`');
        if (encodeURI(message).split(/%..|./).length - 1 >= 64) {
          message = message.substring(0, 60) + '...';
        }

        switch (severity) {
          case 1:
            annotation_level = 'warning';
            break;
          case 2:
            annotation_level = 'failure';
            break;
          default:
            annotation_level = 'notice';
        }

        line = line || 1;
        if (endLine < line || !endLine) {
          endLine = line;
        }
        // EO - Sanity checks

        annotations.push({
          path: filePath.replace(`${workspace}/`, ''),
          start_line: line,
          end_line: endLine,
          annotation_level,
          message,
          raw_details
        });
      }
    }

    if (warningCount > 0) {
      summary.push(
        `:warning: Found ${warningCount} warning${
          warningCount === 1 ? '' : 's'
        }.`
      );
      conclusion = 'neutral';
    }

    if (errorCount > 0) {
      summary.push(
        `:x: Found ${errorCount} error${errorCount === 1 ? '' : 's'}.`
      );
      conclusion = 'failure';
    }

    await updateCheck({summary, conclusion, annotations}).catch(error => {
      core.setFailed(error.message);
    });

    if (errorCount > 0) {
      core.setFailed(':x: Lint errors found!');
      return;
    }

    if (warningCount > 0) {
      // Currently doesn't work
      // See https://github.com/actions/toolkit/tree/master/packages/core#exit-codes
      // core.setNeutral(':x: Lint warnings found.');
      core.warning(':x: Lint warnings found.');
      return;
    }

    // Tools.exit.success(':white_check_mark: No lint found!');
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
