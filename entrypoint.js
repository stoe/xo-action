/* eslint-disable camelcase */

const {Toolkit} = require('actions-toolkit');

Toolkit.run(async tools => {
  const pkg = tools.getPackageJSON();
  const {sha: head_sha, action: title} = tools.context;
  const annotations = [];
  const summary = [];

  let warningCount = 0;
  let errorCount = 0;
  let conclusion = 'success';
  let results;

  try {
    const {eslintConfig, xo} = pkg;
    const optionsXo = ['--reporter=json'];

    if ((eslintConfig && eslintConfig.plugins.includes('prettier')) || xo.prettier) {
      optionsXo.push('--prettier');
    }

    const result = await tools.runInWorkspace('xo', optionsXo, {
      reject: false
    });

    [...results] = JSON.parse(result.stdout);
  } catch (error) {
    // Non xo error
    if (!error.stdout) {
      // Let's just print out so the user can try and fix it
      console.error(error);
    }

    // XO will respond with a rejected Promise if errors/warnings are found
    [...results] = JSON.parse(error.stdout);
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
        path: filePath.replace(`${tools.workspace}/`, ''),
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
    const optionsCreate = {
      ...tools.context.repo,
      name: 'xo',
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
    };

    await tools.github.checks.create(optionsCreate);
  } catch (error) {
    // <Debug>
    tools.log.debug(error);
    console.trace(error);
    console.debug(error.request.request.validate);
    // </Debug>

    tools.exit.failure(error);
  }

  if (errorCount > 0) {
    tools.exit.failure(':x: Lint errors found!');
    return;
  }

  if (warningCount > 0) {
    tools.exit.neutral(':warning: Lint warnings found!');
    return;
  }

  tools.exit.success(':white_check_mark: No lint found!');
});
