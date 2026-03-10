export function markdownToSlack(text: string): string {
  return text
    .replace(/^### (.+)$/gm, "*$1*")
    .replace(/^## (.+)$/gm, "*$1*")
    .replace(/^# (.+)$/gm, "*$1*")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "_$1_")
    .replace(/```(\w*)\n([\s\S]*?)```/g, "```$2```")
    .replace(/`([^`]+)`/g, "`$1`")
    .replace(/^\|.*\|$/gm, (line) => {
      if (/^[\s|:-]+$/.test(line)) return ""
      return line
        .split("|")
        .filter(Boolean)
        .map((cell) => cell.trim())
        .join(" | ")
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
