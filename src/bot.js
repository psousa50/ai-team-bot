const { App } = require('@slack/bolt');
const { runClaude } = require('./claude');

function createBot(config) {
  const app = new App({
    token: config.slackBotToken,
    signingSecret: config.slackSigningSecret,
    socketMode: true,
    appToken: config.slackAppToken,
  });

  app.event('app_mention', async ({ event, client }) => {
    const question = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    console.log(`[bot] mention received: "${question}"`);

    if (!question) {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: 'You mentioned me but didn\'t ask anything. Try asking a question about the codebase.',
      });
      return;
    }

    const thinkingMsg = await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: ':hourglass_flowing_sand: Thinking...',
    });

    try {
      const answer = await runClaude(question, {
        repoPath: config.repoPath,
        allowedTools: config.allowedTools,
        timeoutMs: config.timeoutMs,
      });

      const response = answer || 'No response from Claude.';

      await client.chat.update({
        channel: event.channel,
        ts: thinkingMsg.ts,
        text: response,
      });
    } catch (err) {
      console.error('Claude error:', err.message);

      await client.chat.update({
        channel: event.channel,
        ts: thinkingMsg.ts,
        text: `:x: Something went wrong: ${err.message}`,
      });
    }
  });

  return app;
}

module.exports = { createBot };
