import "dotenv/config"
import { loadConfig } from "./config"
import { createBot } from "./bot"
import { cloneRepo } from "./repos"

const config = loadConfig()

console.log(`[startup] cloning ${config.repos.length} repo(s)`)
await Promise.all(
  config.repos.map((r) => cloneRepo(r.repoUrl, config.githubToken)),
)

const app = createBot(config)
await app.start()
console.log(`Bot running — ${config.repos.length} repo(s) configured`)
