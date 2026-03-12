import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { logger } from "./logger"

const REPOS_DIR = "/tmp/repos"

export interface RepoMapping {
  channelId: string
  repoUrl: string
}

export function parseRepoMappings(json: string): RepoMapping[] {
  const parsed = JSON.parse(json) as Record<string, string>
  return Object.entries(parsed).map(([channelId, repoUrl]) => ({
    channelId,
    repoUrl,
  }))
}

function repoDir(repoUrl: string): string {
  const name = repoUrl.split("/").pop()!.replace(/\.git$/, "")
  return path.join(REPOS_DIR, name)
}

function authenticatedUrl(repoUrl: string, token?: string): string {
  if (!token) return repoUrl
  const url = new URL(repoUrl)
  url.username = "x-access-token"
  url.password = token
  return url.toString()
}

function git(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout.trim())
    })
  })
}

export async function cloneRepo(repoUrl: string, token?: string): Promise<string> {
  const dir = repoDir(repoUrl)
  const url = authenticatedUrl(repoUrl, token)

  if (existsSync(dir)) {
    logger.info({ dir }, "repo exists, pulling")
    await git(["pull", "--ff-only"], dir)
  } else {
    logger.info({ repoUrl, dir }, "cloning repo")
    await git(["clone", "--depth", "1", url, dir])
  }

  return dir
}

export async function pullRepo(repoUrl: string, token?: string): Promise<string> {
  const dir = repoDir(repoUrl)
  const url = authenticatedUrl(repoUrl, token)

  if (!existsSync(dir)) {
    logger.info({ dir }, "repo missing, cloning")
    await git(["clone", "--depth", "1", url, dir])
  } else {
    await git(["pull", "--ff-only"], dir)
  }

  return dir
}

export function localPath(repoUrl: string): string {
  return repoDir(repoUrl)
}
