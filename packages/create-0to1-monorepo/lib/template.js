import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_TEMPLATE_ENTRIES = [
  ".changeset",
  ".dockerignore",
  ".github",
  ".gitignore",
  ".npmrc",
  "README.md",
  "apps",
  "package.json",
  "packages",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo",
  "turbo.json",
];

const EXCLUDED_BASENAMES = new Set([
  ".DS_Store",
  ".git",
  ".idea",
  ".turbo",
  ".vscode",
  "node_modules",
]);
const EXCLUDED_ENV_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
  ".env.test.local",
]);
const CREATE_PACKAGE_RELATIVE_PATH = path.join(
  "packages",
  "create-0to1-monorepo",
);

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function shouldSkipPath(sourceRoot, currentPath) {
  const relativePath = normalizePath(path.relative(sourceRoot, currentPath));

  if (!relativePath || relativePath === ".") {
    return false;
  }

  const segments = relativePath.split("/");

  if (segments.some((segment) => EXCLUDED_BASENAMES.has(segment))) {
    return true;
  }

  if (EXCLUDED_ENV_FILE_NAMES.has(path.basename(currentPath))) {
    return true;
  }

  return relativePath === normalizePath(CREATE_PACKAGE_RELATIVE_PATH);
}

export function ensureEmptyDirectory(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((entryName) => {
      fs.rmSync(path.join(directoryPath, entryName), {
        force: true,
        recursive: true,
      });
    });
  }

  fs.mkdirSync(directoryPath, { recursive: true });
}

export function copyDirectoryContents(sourceDirectory, destinationDirectory) {
  ensureEmptyDirectory(destinationDirectory);

  fs.readdirSync(sourceDirectory).forEach((entryName) => {
    const sourcePath = path.join(sourceDirectory, entryName);
    const destinationPath = path.join(destinationDirectory, entryName);

    fs.cpSync(sourcePath, destinationPath, {
      recursive: true,
    });
  });
}

export function copyRepositoryTemplate(sourceRoot, destinationDirectory) {
  ensureEmptyDirectory(destinationDirectory);

  ROOT_TEMPLATE_ENTRIES.forEach((entryName) => {
    const sourcePath = path.join(sourceRoot, entryName);

    if (!fs.existsSync(sourcePath)) {
      return;
    }

    const destinationPath = path.join(destinationDirectory, entryName);

    if (entryName === "packages") {
      fs.mkdirSync(destinationPath, { recursive: true });

      fs.readdirSync(sourcePath).forEach((packageName) => {
        if (packageName === "create-0to1-monorepo") {
          return;
        }

        const sourcePackagePath = path.join(sourcePath, packageName);
        const destinationPackagePath = path.join(destinationPath, packageName);

        fs.cpSync(sourcePackagePath, destinationPackagePath, {
          filter: (currentPath) => !shouldSkipPath(sourceRoot, currentPath),
          recursive: true,
        });
      });

      return;
    }

    fs.cpSync(sourcePath, destinationPath, {
      filter: (currentPath) => !shouldSkipPath(sourceRoot, currentPath),
      recursive: true,
    });
  });
}

export function getPackageDirectory(metaUrl) {
  return path.resolve(path.dirname(fileURLToPath(metaUrl)), "..");
}
