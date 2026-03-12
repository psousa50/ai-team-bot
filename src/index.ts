import "dotenv/config"
import { loadConfig } from "./config"
import { createBot } from "./bot"
import { cloneRepo } from "./repos"
import { logger } from "./logger"

const config = loadConfig()

logger.info({ count: config.repos.length }, "cloning repos")
await Promise.all(
  config.repos.map((r) => cloneRepo(r.repoUrl, config.githubToken)),
)

const app = createBot(config)
await app.start()
logger.info({ count: config.repos.length }, "bot running")
