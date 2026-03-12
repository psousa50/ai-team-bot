import { parseRepoMappings, type RepoMapping } from "./repos"

export interface Config {
  slackBotToken: string
  slackSigningSecret: string
  slackAppToken: string
  repos: RepoMapping[]
  githubToken?: string
  timeoutMs: number
}

export function loadConfig(): Config {
  const required = {
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
    slackAppToken: process.env.SLACK_APP_TOKEN,
    repos: process.env.REPOS,
  }

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length) {
    console.error(`Missing required config: ${missing.join(", ")}`)
    console.error("Copy .env.example to .env and fill in the values.")
    process.exit(1)
  }

  return {
    slackBotToken: required.slackBotToken!,
    slackSigningSecret: required.slackSigningSecret!,
    slackAppToken: required.slackAppToken!,
    repos: parseRepoMappings(required.repos!),
    githubToken: process.env.GITHUB_TOKEN,
    timeoutMs: parseInt(process.env.CLAUDE_TIMEOUT_MS || "120000", 10),
  }
}
