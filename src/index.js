require('dotenv').config();
const { createBot } = require('./bot');

const config = {
  slackBotToken: process.env.SLACK_BOT_TOKEN,
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  slackAppToken: process.env.SLACK_APP_TOKEN,
  repoPath: process.env.REPO_PATH,
  allowedTools: process.env.CLAUDE_ALLOWED_TOOLS || 'Read,Glob,Grep,Bash',
  timeoutMs: parseInt(process.env.CLAUDE_TIMEOUT_MS || '120000', 10),
};

const missing = ['slackBotToken', 'slackSigningSecret', 'slackAppToken', 'repoPath']
  .filter((key) => !config[key]);

if (missing.length) {
  console.error(`Missing required config: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const app = createBot(config);

(async () => {
  await app.start();
  console.log(`Bot running — repo: ${config.repoPath}`);
})();
