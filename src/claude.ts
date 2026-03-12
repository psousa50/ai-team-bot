import { query } from "@anthropic-ai/claude-agent-sdk"
import { logger } from "./logger"

export interface ClaudeResult {
  text: string
  sessionId: string
}

export async function runClaude(
  prompt: string,
  repoPath: string,
  timeoutMs: number,
  sessionId?: string,
): Promise<ClaudeResult> {
  const abortController = new AbortController()
  const timer = setTimeout(() => abortController.abort(), timeoutMs)

  try {
    let resultText = ""
    let resultSessionId = ""
    const startTime = Date.now()

    const sensitiveKeys = ["CLAUDECODE", "SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "SLACK_APP_TOKEN"]
    const cleanEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !sensitiveKeys.includes(key)),
    )

    logger.info({ cwd: repoPath, sessionId }, "starting claude query")

    for await (const message of query({
      prompt,
      options: {
        abortController,
        cwd: repoPath,
        env: cleanEnv as Record<string, string>,
        permissionMode: "bypassPermissions",
        allowedTools: ["Read", "Glob", "Grep", "Edit", "Write"],
        allowDangerouslySkipPermissions: true,
        ...(sessionId && { resume: sessionId }),
      },
    })) {
      const subtype = "subtype" in message ? message.subtype : undefined
      logger.debug({ type: message.type, subtype, message }, "claude message")

      if (message.type === "result") {
        if (message.subtype === "success") {
          resultText = message.result
          resultSessionId = message.session_id
        } else {
          const errors =
            "errors" in message
              ? (message.errors as string[]).join(", ")
              : String(subtype)
          throw new Error(`Claude error: ${errors}`)
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.info({ elapsed, chars: resultText.length, sessionId: resultSessionId }, "claude query done")
    return { text: resultText, sessionId: resultSessionId }
  } finally {
    clearTimeout(timer)
  }
}
