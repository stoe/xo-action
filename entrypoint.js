/* eslint-disable camelcase */

const path = require('path');
const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const io = require('@actions/io');

const run = async () => {
  const workspace = process.env.GITHUB_WORKSPACE;
  try {
    const pkg = require(path.join(workspace, 'package.json'));
    const {sha: head_sha, action: title} = github.context;
    const annotations = [];
    const summary = [];

    let warningCount = 0;
    let errorCount = 0;
    let conclusion = 'success';
    let results = [];

    try {
      const {eslintConfig, xo = {}} = pkg;
      const optionsXo = ['--reporter=json'];

      if (
        (eslintConfig && eslintConfig.plugins.includes('prettier')) ||
        xo.prettier
      ) {
        optionsXo.push('--prettier');
      }

      const parseResults = data => {
        [...results] = JSON.parse(data.toString());
      };

      const xoPath = await io.which('xo', true);
      await exec.exec(xoPath, optionsXo, {
        cwd: workspace,
        listeners: {
          stdout: parseResults,
          stderr: parseResults
        }
      });
    } catch (error) {
      // Non xo error
      if (!error.stdout) {
        // Let's just error out so the user can try and fix it
        core.setFailed(error.message);
      }
    }

    for (const result of results) {
      const {filePath, messages} = result;

      warningCount += Number(result.warningCount);
      errorCount += Number(result.errorCount);

      for (const msg of messages) {
        const {severity, ruleId: raw_details} = msg;
        let {line, endLine, message} = msg;
        let annotation_level;

        // Sanity checks
        message = message.replace(/["']/g, '`');
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
      summary.push(`:warning: Found ${warningCount} warnings.`);
      conclusion = 'neutral';
    }

    if (errorCount > 0) {
      summary.push(`:x: Found ${errorCount} errors.`);
      conclusion = 'failure';
    }

    try {
      const client = new github.GitHub(process.env.GITHUB_TOKEN);
      const {owner, repo} = github.context.repo;
      const {ref} = github.context;

      const checkRunId = await client.checks
        .listForRef({owner, repo, ref})
        .then(checkList => checkList.data.check_runs[0].id);

      await client.checks.update({
        ...github.context.repo,
        check_run_id: checkRunId,
        head_sha,
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
          annotations
        }
      });
    } catch (error) {
      // <Debug>
      core.debug(error);
      console.trace(error);
      console.debug(error.request.request.validate);
      // </Debug>

      core.setFailed(error);
    }

    if (errorCount > 0) {
      core.setFailed(':x: Lint errors found!');
      return;
    }

    if (warningCount > 0) {
      // Currently doesn't work
      // See https://github.com/actions/toolkit/tree/master/packages/core#exit-codes
      // core.setNeutral(':x: Lint errors found!');
      core.warning(':x: Lint errors found!');
      return;
    }

    // Tools.exit.success(':white_check_mark: No lint found!');
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
