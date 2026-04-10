/*
This file runs the same Playwright browser flows against the Docker deployment stack.
Edit this file when docker e2e ports, env values, or stack startup rules change.
Copy a config pattern here when you add another Playwright target environment.
*/
import { defineConfig } from "@playwright/test";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
var frontendRoot = path.dirname(fileURLToPath(import.meta.url));
var repoRoot = path.resolve(frontendRoot, "..");
process.loadEnvFile(path.join(repoRoot, ".docker.env"));
var frontendUrl = process.env.DOCKER_E2E_FRONTEND_URL && process.env.DOCKER_E2E_FRONTEND_URL.trim();
if (!frontendUrl) {
  throw new Error("Missing DOCKER_E2E_FRONTEND_URL in .docker.env. Run make setup or update the root .docker.env file.");
}
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: frontendUrl,
  },
});
