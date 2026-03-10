import "dotenv/config"
import { loadConfig } from "./config"
import { createBot } from "./bot"

const config = loadConfig()
const app = createBot(config)

await app.start()
console.log(`Bot running — repo: ${config.repoPath}`)
