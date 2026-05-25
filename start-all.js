const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const C_ORCH = "\x1b[32m";
const C_BACK = "\x1b[36m";
const C_FRONT = "\x1b[35m";
const C_DB = "\x1b[33m";
const C_ERR = "\x1b[31m";
const C_RESET = "\x1b[0m";

const ROOT_DIR = __dirname;
const CLIENT_DIR = path.join(ROOT_DIR, "client");
const SERVER_DIR = path.join(ROOT_DIR, "server");
const SERVER_ENV_PATH = path.join(SERVER_DIR, ".env");
const SERVER_ENV_EXAMPLE_PATH = path.join(SERVER_DIR, ".env.example");
const POSTGRES_COMPOSE_FILE = path.join(ROOT_DIR, "docker-compose.dev.yml");

const childProcesses = [];
let shuttingDown = false;

function log(prefixColor, prefix, message) {
  console.log(`${prefixColor}${prefix}${C_RESET} ${message}`);
}

function logOrch(message) {
  log(C_ORCH, "[Orchestrator]", message);
}

function logDb(message) {
  log(C_DB, "[Postgres]", message);
}

function logError(message) {
  log(C_ERR, "[Orchestrator ERROR]", message);
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || ROOT_DIR,
    encoding: "utf-8",
    shell: false,
    stdio: options.stdio || "pipe",
  });
}

function commandWorks(command, args) {
  const result = runCommand(command, args);
  return result.status === 0;
}

function getEnvValue(content, key) {
  const line = content
    .split(/\r?\n/)
    .find((rawLine) => rawLine.trim().startsWith(`${key}=`));
  if (!line) return null;
  return line.split("=").slice(1).join("=").trim();
}

function loadServerEnvContent() {
  if (fs.existsSync(SERVER_ENV_PATH)) {
    return fs.readFileSync(SERVER_ENV_PATH, "utf-8");
  }
  if (fs.existsSync(SERVER_ENV_EXAMPLE_PATH)) {
    return fs.readFileSync(SERVER_ENV_EXAMPLE_PATH, "utf-8");
  }
  return "";
}

function ensureClientDependencies() {
  const nodeModulesDir = path.join(CLIENT_DIR, "node_modules");
  if (fs.existsSync(nodeModulesDir)) {
    logOrch("Client dependencies verified.");
    return true;
  }

  logOrch("Installing client dependencies...");
  const result = runCommand("npm.cmd", ["install"], { cwd: CLIENT_DIR, stdio: "inherit" });
  if (result.status !== 0) {
    logError("Failed to install client dependencies.");
    return false;
  }
  return true;
}

function resolvePythonCommand() {
  const candidates = [
    { command: path.join(SERVER_DIR, "venv", "Scripts", "python.exe"), args: ["--version"], label: "server venv python" },
    { command: "py", args: ["-3", "--version"], label: "py -3" },
    { command: "py", args: ["--version"], label: "py" },
    { command: "python", args: ["--version"], label: "python" },
  ];

  for (const candidate of candidates) {
    if (commandWorks(candidate.command, candidate.args)) {
      logOrch(`Using Python interpreter: ${candidate.label}`);
      return candidate.command;
    }
  }

  return null;
}

function ensurePostgresComposeFile() {
  if (fs.existsSync(POSTGRES_COMPOSE_FILE)) return;

  const content = `services:
  postgres:
    image: postgres:16
    container_name: aurelius-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: aurelius
      POSTGRES_PASSWORD: aurelius_password
      POSTGRES_DB: aurelius_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aurelius -d aurelius_db"]
      interval: 5s
      timeout: 5s
      retries: 20

volumes:
  postgres_data:
`;
  fs.writeFileSync(POSTGRES_COMPOSE_FILE, content, "utf-8");
}

function maybeStartPostgres() {
  const envContent = loadServerEnvContent();
  const dbUrl = getEnvValue(envContent, "DATABASE_URL") || "";
  const isPostgres = dbUrl.toLowerCase().startsWith("postgres");
  if (!isPostgres) {
    logDb("DATABASE_URL is not PostgreSQL. Skipping postgres startup.");
    return;
  }

  if (!commandWorks("docker", ["compose", "version"])) {
    logError("DATABASE_URL uses PostgreSQL but Docker Compose is unavailable.");
    process.exit(1);
  }

  ensurePostgresComposeFile();
  logDb("Starting PostgreSQL container...");
  const upResult = runCommand("docker", ["compose", "-f", POSTGRES_COMPOSE_FILE, "up", "-d", "postgres"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  if (upResult.status !== 0) {
    logError("Failed to start PostgreSQL container.");
    process.exit(1);
  }
}

function spawnService(command, args, options) {
  const mergedEnv = { ...process.env, ...(options.env || {}) };
  const sanitizedEnv = Object.fromEntries(
    Object.entries(mergedEnv).filter(([, value]) => value !== undefined && value !== null)
  );
  const useShell = process.platform === "win32" && command.toLowerCase().endsWith(".cmd");

  const child = spawn(command, args, {
    cwd: options.cwd,
    env: sanitizedEnv,
    shell: useShell,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  childProcesses.push(child);
  return child;
}

function pipeOutput(child, prefix, color) {
  child.stdout.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}${prefix}${C_RESET} ${line}`);
      }
    }
  });

  child.stderr.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${color}${prefix}${C_RESET} ${line}`);
      }
    }
  });
}

function attachExitHandler(child, serviceName) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      logError(`${serviceName} exited with code ${code}. Shutting down all services.`);
      shutdown(1);
    }
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logOrch("Shutting down services...");

  for (const child of childProcesses) {
    try {
      child.kill("SIGTERM");
    } catch (error) {
      // Best effort
    }
  }

  setTimeout(() => process.exit(exitCode), 400);
}

function main() {
  console.log(`
${C_ORCH}=============================================================
      AURELIUS MANAGEMENT OS - FULL STACK DEV STARTUP
=============================================================${C_RESET}
`);

  if (!ensureClientDependencies()) process.exit(1);

  const pythonCommand = resolvePythonCommand();
  if (!pythonCommand) {
    logError("No usable Python interpreter found for backend.");
    logError("Install Python 3.11+ and recreate server venv, then run npm run dev again.");
    process.exit(1);
  }

  maybeStartPostgres();

  logOrch("Starting backend on http://127.0.0.1:8000");
  const backend = spawnService(
    pythonCommand,
    ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
    { cwd: SERVER_DIR, env: { PYTHONIOENCODING: "utf-8" } }
  );
  pipeOutput(backend, "[Backend] ", C_BACK);
  attachExitHandler(backend, "Backend");

  logOrch("Starting frontend on http://localhost:5173");
  const frontend = spawnService("npm.cmd", ["run", "dev"], { cwd: CLIENT_DIR });
  pipeOutput(frontend, "[Frontend]", C_FRONT);
  attachExitHandler(frontend, "Frontend");

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
}

main();
