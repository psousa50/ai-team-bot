import { App } from "@slack/bolt"
import type { WebClient } from "@slack/web-api"
import type { Config } from "./config"
import { runClaude } from "./claude"
import { markdownToSlack } from "./format"
import { pullRepo } from "./repos"
import { logger } from "./logger"

const threadSessions = new Map<string, string>()

function threadKey(channel: string, ts: string): string {
  return `${channel}:${ts}`
}

async function handleQuestion(
  question: string,
  channel: string,
  threadTs: string,
  repoUrl: string,
  config: Config,
  client: WebClient,
) {
  const key = threadKey(channel, threadTs)

  const thinkingMsg = await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: ":hourglass_flowing_sand: Thinking...",
  })

  try {
    const repoPath = await pullRepo(repoUrl, config.githubToken)
    const sessionId = threadSessions.get(key)
    const result = await runClaude(question, repoPath, config.timeoutMs, sessionId)
    const response = markdownToSlack(result.text) || "No response from Claude."

    threadSessions.set(key, result.sessionId)

    await client.chat.update({
      channel,
      ts: thinkingMsg.ts!,
      text: response,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ err }, "failed to handle question")

    await client.chat.update({
      channel,
      ts: thinkingMsg.ts!,
      text: `:x: Something went wrong: ${message}`,
    })
  }
}

export function createBot(config: Config): App {
  const app = new App({
    token: config.slackBotToken,
    signingSecret: config.slackSigningSecret,
    socketMode: true,
    appToken: config.slackAppToken,
  })

  const repoByChannel = new Map(
    config.repos.map((r) => [r.channelId, r.repoUrl]),
  )

  let botUserId = ""

  app.event("app_mention", async ({ event, client }) => {
    if (!botUserId) {
      const auth = await client.auth.test()
      botUserId = auth.user_id as string
    }

    const question = event.text.replace(/<@[A-Z0-9]+>/g, "").trim()
    logger.info({ channel: event.channel, question }, "mention received")

    const repoUrl = repoByChannel.get(event.channel)
    if (!repoUrl) {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: "This channel isn't linked to a repository. Ask an admin to add it to the REPOS config.",
      })
      return
    }

    if (!question) {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: "You mentioned me but didn't ask anything. Try asking a question about the codebase.",
      })
      return
    }

    const threadTs = event.thread_ts ?? event.ts
    await handleQuestion(question, event.channel, threadTs, repoUrl, config, client)
  })

  app.message(async ({ message, client }) => {
    if (message.subtype) return
    if (!("thread_ts" in message) || !message.thread_ts) return
    if (!("user" in message)) return
    if (message.user === botUserId) return

    const key = threadKey(message.channel, message.thread_ts)
    if (!threadSessions.has(key)) return

    const repoUrl = repoByChannel.get(message.channel)
    if (!repoUrl) return

    const question = (message.text ?? "").replace(/<@[A-Z0-9]+>/g, "").trim()
    if (!question) return

    logger.info({ channel: message.channel, question }, "thread reply received")

    if (!botUserId) {
      const auth = await client.auth.test()
      botUserId = auth.user_id as string
    }

    await handleQuestion(question, message.channel, message.thread_ts, repoUrl, config, client)
  })

  return app
}
