#!/usr/bin/env node

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import {
  copyDirectoryContents,
  copyRepositoryTemplate,
} from "../lib/template.js";

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent ?? "";

  if (userAgent.includes("pnpm/")) {
    return "pnpm";
  }

  if (userAgent.includes("yarn/")) {
    return "yarn";
  }

  if (userAgent.includes("bun/")) {
    return "bun";
  }

  return "npm";
}

function getInstallCommand(packageManager) {
  switch (packageManager) {
    case "pnpm":
      return "pnpm install";
    case "yarn":
      return "yarn";
    case "bun":
      return "bun install";
    default:
      return "npm install";
  }
}

function getDevCommand(packageManager) {
  switch (packageManager) {
    case "npm":
      return "npm run dev";
    case "bun":
      return "bun run dev";
    default:
      return `${packageManager} dev`;
  }
}

function sanitizePackageName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseArguments(argv) {
  const args = [...argv];
  const options = {
    install: true,
    targetDirectory: "",
  };

  while (args.length > 0) {
    const currentArg = args.shift();

    if (!currentArg) {
      continue;
    }

    if (currentArg === "--no-install") {
      options.install = false;
      continue;
    }

    if (currentArg.startsWith("-")) {
      throw new Error(`지원하지 않는 옵션입니다: ${currentArg}`);
    }

    if (!options.targetDirectory) {
      options.targetDirectory = currentArg;
      continue;
    }

    throw new Error(`대상 디렉터리는 하나만 지정할 수 있습니다: ${currentArg}`);
  }

  return options;
}

async function promptForTargetDirectory() {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await readline.question(
      "생성할 디렉터리 이름을 입력하세요: ",
    );

    return answer.trim();
  } finally {
    readline.close();
  }
}

function ensureCreatableDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return;
  }

  const entries = fs.readdirSync(directoryPath);

  if (entries.length > 0) {
    throw new Error(`대상 디렉터리가 비어 있지 않습니다: ${directoryPath}`);
  }
}

function updateRootPackageJson(targetDirectory, projectName) {
  const packageJsonPath = path.join(targetDirectory, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const sanitizedName = sanitizePackageName(projectName);

  if (sanitizedName) {
    packageJson.name = sanitizedName;
  }

  packageJson.private = true;

  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf-8",
  );
}

function resolveTemplateSourceDirectory() {
  const packageDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const bundledTemplateDirectory = path.join(packageDirectory, "template");

  if (fs.existsSync(bundledTemplateDirectory)) {
    return {
      mode: "bundled",
      path: bundledTemplateDirectory,
    };
  }

  return {
    mode: "workspace",
    path: path.resolve(packageDirectory, "..", ".."),
  };
}

function copyTemplateIntoDirectory(targetDirectory) {
  const templateSource = resolveTemplateSourceDirectory();

  if (templateSource.mode === "bundled") {
    copyDirectoryContents(templateSource.path, targetDirectory);
    return;
  }

  copyRepositoryTemplate(templateSource.path, targetDirectory);
}

function printNextSteps(targetDirectory, packageManager, install) {
  const relativeDirectory =
    path.relative(process.cwd(), targetDirectory) || ".";
  const directoryLabel = relativeDirectory.startsWith("..")
    ? targetDirectory
    : relativeDirectory;

  console.log("");
  console.log("완료되었습니다 🎉");
  console.log("");
  console.log("다음 단계:");
  console.log(`  cd ${directoryLabel}`);

  if (!install) {
    console.log(`  ${getInstallCommand(packageManager)}`);
  }

  console.log(`  ${getDevCommand(packageManager)}`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const targetInput =
    options.targetDirectory || (await promptForTargetDirectory());

  if (!targetInput) {
    throw new Error("대상 디렉터리 이름이 필요합니다.");
  }

  const targetDirectory = path.resolve(process.cwd(), targetInput);
  const packageManager = detectPackageManager();

  ensureCreatableDirectory(targetDirectory);
  fs.mkdirSync(targetDirectory, { recursive: true });

  copyTemplateIntoDirectory(targetDirectory);
  updateRootPackageJson(targetDirectory, path.basename(targetDirectory));

  if (options.install) {
    execSync(getInstallCommand(packageManager), {
      cwd: targetDirectory,
      stdio: "inherit",
    });
  }

  printNextSteps(targetDirectory, packageManager, options.install);
}

main().catch((error) => {
  console.error("");
  console.error(
    error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
  );
  process.exit(1);
});
