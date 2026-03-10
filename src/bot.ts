import { App } from "@slack/bolt"
import type { Config } from "./config"
import { runClaude } from "./claude"
import { markdownToSlack } from "./format"

export function createBot(config: Config): App {
  const app = new App({
    token: config.slackBotToken,
    signingSecret: config.slackSigningSecret,
    socketMode: true,
    appToken: config.slackAppToken,
  })

  app.event("app_mention", async ({ event, client }) => {
    const question = event.text.replace(/<@[A-Z0-9]+>/g, "").trim()
    console.log(`[bot] mention received: "${question}"`)

    if (!question) {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: "You mentioned me but didn't ask anything. Try asking a question about the codebase.",
      })
      return
    }

    const thinkingMsg = await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: ":hourglass_flowing_sand: Thinking...",
    })

    try {
      const answer = await runClaude(question, config.repoPath, config.timeoutMs)
      const response = markdownToSlack(answer) || "No response from Claude."

      await client.chat.update({
        channel: event.channel,
        ts: thinkingMsg.ts!,
        text: response,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("Claude error:", message)

      await client.chat.update({
        channel: event.channel,
        ts: thinkingMsg.ts!,
        text: `:x: Something went wrong: ${message}`,
      })
    }
  })

  return app
}
