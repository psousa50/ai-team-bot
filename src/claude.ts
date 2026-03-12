import { query } from "@anthropic-ai/claude-agent-sdk"

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

    console.log(`[claude] starting query, cwd=${repoPath}${sessionId ? ` resume=${sessionId}` : ""}`)

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
      console.log(`[claude] ${message.type}${subtype ? `:${subtype}` : ""}`)

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
    console.log(`[claude] done in ${elapsed}s (${resultText.length} chars)`)
    return { text: resultText, sessionId: resultSessionId }
  } finally {
    clearTimeout(timer)
  }
}
