import { execSync } from "node:child_process";
import * as fs from "node:fs";
import path from "node:path";

const APP_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEMPLATE_DIRECTORY = path.join(
  process.cwd(),
  "turbo",
  "generators",
  "templates",
);
const NEXT_ESLINT_FILES = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.ts",
];
const VITE_ESLINT_FILES = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.ts",
];
const VERSION_REFERENCE_FILES = [
  path.join(process.cwd(), "apps", "web", "package.json"),
  path.join(process.cwd(), "apps", "project", "package.json"),
  path.join(process.cwd(), "packages", "eslint-config", "package.json"),
  path.join(process.cwd(), "package.json"),
];
const NEXT_SITE_ID_ENV_KEY = "NEXT_PUBLIC_SITE_ID";
const NEXT_BASE_URL_ENV_KEY = "NEXT_PUBLIC_API_BASE_URL";
const VITE_SITE_ID_ENV_KEY = "VITE_SITE_ID";
const VITE_BASE_URL_ENV_KEY = "VITE_API_BASE_URL";
const KNOWN_NON_PLAIN_FRAMEWORKS = [
  "react",
  "react-dom",
  "vue",
  "svelte",
  "preact",
  "solid-js",
  "lit",
  "@builder.io/qwik",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readTemplate(templatePath) {
  return fs.readFileSync(path.join(TEMPLATE_DIRECTORY, templatePath), "utf-8");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function writeText(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${contents.replace(/\n?$/, "\n")}`, "utf-8");
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function toRepoRelativePath(filePath) {
  return toPosixPath(path.relative(process.cwd(), filePath));
}

function toAppRelativePath(appDirectory, filePath) {
  return toPosixPath(path.relative(appDirectory, filePath));
}

function serializeEnvValue(value) {
  return JSON.stringify(value ?? "");
}

function renderTemplate(templatePath, replacements = {}) {
  return Object.entries(replacements).reduce(
    (contents, [pattern, value]) => contents.replaceAll(pattern, value),
    readTemplate(templatePath),
  );
}

function sortRecord(record = {}) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function getWorkspacePackages({ includeRuntimeExcluded = true } = {}) {
  const packagesPath = path.join(process.cwd(), "packages");

  if (!fs.existsSync(packagesPath)) {
    return [];
  }

  return fs
    .readdirSync(packagesPath)
    .filter((dir) => {
      const fullPath = path.join(packagesPath, dir);

      return (
        fs.statSync(fullPath).isDirectory() &&
        fs.existsSync(path.join(fullPath, "package.json"))
      );
    })
    .map((dir) => {
      const pkgJson = readJson(path.join(packagesPath, dir, "package.json"));

      return {
        name: pkgJson.name,
        value: pkgJson.name,
      };
    })
    .filter(
      (pkg) =>
        includeRuntimeExcluded ||
        !["@repo/eslint-config", "@repo/typescript-config"].includes(pkg.value),
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getAppDirectory(appName) {
  return path.join(process.cwd(), "apps", appName);
}

function validateAppName(value) {
  const appName = value.trim();

  if (!appName) {
    return "앱 이름을 입력해주세요.";
  }

  if (!APP_NAME_PATTERN.test(appName)) {
    return "앱 이름은 소문자, 숫자, 하이픈만 사용할 수 있습니다.";
  }

  if (fs.existsSync(getAppDirectory(appName))) {
    return `apps/${appName} 가 이미 존재합니다.`;
  }

  return true;
}

function getSelectedWorkspaceDependencies(answers) {
  const runtimeDeps = Array.from(new Set(answers.workspaceDeps ?? []));
  const runtimeDepSet = new Set(runtimeDeps);
  const devDeps = Array.from(
    new Set(
      (answers.workspaceDevDeps ?? []).filter(
        (dependency) => !runtimeDepSet.has(dependency),
      ),
    ),
  );

  return {
    runtimeDeps,
    devDeps,
  };
}

function getConfiguredSiteId(answers) {
  return answers.siteId?.trim() || "a";
}

function getConfiguredBaseUrl(answers) {
  return answers.baseUrl?.trim() || "";
}

function createEnvFileContents(entries) {
  return Object.entries(entries)
    .map(([key, value]) => `${key}=${serializeEnvValue(value)}`)
    .join("\n");
}

function writeEnvLocalFile(appName, entries) {
  writeText(
    path.join(getAppDirectory(appName), ".env.local"),
    createEnvFileContents(entries),
  );
}

function getNextEnvConfig(answers) {
  const siteId = getConfiguredSiteId(answers);
  const baseUrl = getConfiguredBaseUrl(answers);

  return {
    siteId,
    baseUrl,
    siteIdEnvKey: NEXT_SITE_ID_ENV_KEY,
    baseUrlEnvKey: NEXT_BASE_URL_ENV_KEY,
    envEntries: {
      [NEXT_SITE_ID_ENV_KEY]: siteId,
      [NEXT_BASE_URL_ENV_KEY]: baseUrl,
    },
  };
}

function getViteEnvConfig(answers) {
  const siteId = getConfiguredSiteId(answers);
  const baseUrl = getConfiguredBaseUrl(answers);

  return {
    siteId,
    baseUrl,
    siteIdEnvKey: VITE_SITE_ID_ENV_KEY,
    baseUrlEnvKey: VITE_BASE_URL_ENV_KEY,
    envEntries: {
      [VITE_SITE_ID_ENV_KEY]: siteId,
      [VITE_BASE_URL_ENV_KEY]: baseUrl,
    },
  };
}

function ensureDependencies(pkg, field, dependencyMap) {
  if (Object.keys(dependencyMap).length === 0) {
    return;
  }

  pkg[field] = pkg[field] || {};

  Object.entries(dependencyMap).forEach(([dependency, version]) => {
    pkg[field][dependency] = version;
  });

  pkg[field] = sortRecord(pkg[field]);
}

function updateGeneratedPackageJson(
  appName,
  answers,
  {
    dependencies = {},
    devDependencies = {},
    scripts = {},
    forcePrivate = true,
  } = {},
) {
  const packageJsonPath = path.join(getAppDirectory(appName), "package.json");
  const pkg = readJson(packageJsonPath);
  const { runtimeDeps, devDeps } = getSelectedWorkspaceDependencies(answers);

  pkg.name = appName;

  if (forcePrivate) {
    pkg.private = true;
  }

  pkg.scripts = {
    ...(pkg.scripts || {}),
    ...scripts,
  };

  ensureDependencies(pkg, "dependencies", dependencies);
  ensureDependencies(pkg, "devDependencies", devDependencies);
  ensureDependencies(
    pkg,
    "dependencies",
    Object.fromEntries(
      runtimeDeps.map((dependency) => [dependency, "workspace:*"]),
    ),
  );
  ensureDependencies(
    pkg,
    "devDependencies",
    Object.fromEntries(
      devDeps.map((dependency) => [dependency, "workspace:*"]),
    ),
  );

  if (pkg.dependencies) {
    pkg.dependencies = sortRecord(pkg.dependencies);
  }

  if (pkg.devDependencies) {
    pkg.devDependencies = sortRecord(pkg.devDependencies);
  }

  writeJson(packageJsonPath, pkg);
}

function setJsonLikeExtends(filePath, extendsPath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const current = fs.readFileSync(filePath, "utf-8");
  const next = /"extends"\s*:/.test(current)
    ? current.replace(/"extends"\s*:\s*"[^"]+"/, `"extends": "${extendsPath}"`)
    : current.replace(/\{\s*/, `{\n  "extends": "${extendsPath}",\n  `);

  writeText(filePath, next);
}

function getDependencyVersion(packageJsonPath, dependencyName) {
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  const pkg = readJson(packageJsonPath);

  return (
    pkg.dependencies?.[dependencyName] ||
    pkg.devDependencies?.[dependencyName] ||
    undefined
  );
}

function getReferenceVersion(dependencyName, fallback) {
  for (const filePath of VERSION_REFERENCE_FILES) {
    const version = getDependencyVersion(filePath, dependencyName);

    if (version) {
      return version;
    }
  }

  return fallback;
}

function removeFiles(directory, fileNames) {
  fileNames.forEach((fileName) => {
    const filePath = path.join(directory, fileName);

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  });
}

function removeNestedPnpmWorkspace(appName) {
  const nestedWorkspacePath = path.join(
    getAppDirectory(appName),
    "pnpm-workspace.yaml",
  );

  if (fs.existsSync(nestedWorkspacePath)) {
    fs.rmSync(nestedWorkspacePath, { force: true });
  }
}

function installAppDependencies(appName) {
  execSync(`pnpm install --filter "./apps/${appName}"`, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function fixGeneratedAppLint(appName) {
  const appDirectory = getAppDirectory(appName);
  const eslintConfigFiles = new Set([
    ...NEXT_ESLINT_FILES,
    ...VITE_ESLINT_FILES,
  ]);
  const hasEslintConfig = [...eslintConfigFiles].some((fileName) =>
    fs.existsSync(path.join(appDirectory, fileName)),
  );

  if (!hasEslintConfig) {
    return;
  }

  execSync(`pnpm --filter "./apps/${appName}" exec eslint . --fix`, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function writeAppReadme(appName, templatePath, replacements) {
  const appDirectory = getAppDirectory(appName);
  const rootReadmePath = path.join(process.cwd(), "README.md");

  writeText(
    path.join(appDirectory, "README.md"),
    renderTemplate(templatePath, {
      "[[APPNAME]]": appName,
      "[[APP_PATH]]": toRepoRelativePath(appDirectory),
      "[[ROOT_README_PATH]]": toAppRelativePath(appDirectory, rootReadmePath),
      ...replacements,
    }),
  );
}

function resolveNextAppDirectory(appDirectory) {
  const srcAppDirectory = path.join(appDirectory, "src", "app");
  const rootAppDirectory = path.join(appDirectory, "app");

  if (fs.existsSync(srcAppDirectory)) {
    return srcAppDirectory;
  }

  if (fs.existsSync(rootAppDirectory)) {
    return rootAppDirectory;
  }

  fs.mkdirSync(srcAppDirectory, { recursive: true });
  return srcAppDirectory;
}

function resolveNextExtension(appRootDirectory) {
  const candidates = [".tsx", ".jsx", ".js", ".ts"];

  for (const extension of candidates) {
    if (
      fs.existsSync(path.join(appRootDirectory, `layout${extension}`)) ||
      fs.existsSync(path.join(appRootDirectory, `page${extension}`))
    ) {
      return extension;
    }
  }

  return ".tsx";
}

function createNextLayoutSource(appName, isTypeScript) {
  if (isTypeScript) {
    return renderTemplate("next-app/app/layout.tsx.tpl", {
      __APPNAME__: appName,
    });
  }

  return `import "./globals.css";

import { CoreBootstrap } from "@repo/core-next/bootstrap";

import { Providers } from "./providers";

export const metadata = {
  title: "${appName}",
  description: "${appName} application",
};

const SITE_ID = process.env.${NEXT_SITE_ID_ENV_KEY} ?? "a";
const BASE_URL = process.env.${NEXT_BASE_URL_ENV_KEY} || undefined;

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <CoreBootstrap siteId={SITE_ID} baseUrl={BASE_URL} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`;
}

function createNextProvidersSource(isTypeScript) {
  if (isTypeScript) {
    return readTemplate("next-app/app/providers.tsx.tpl");
  }

  return `"use client";

import {
  AppProviders,
  createClientQueryErrorHandler,
} from "@repo/core-next";

const handleClientQueryError = createClientQueryErrorHandler({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function Providers({ children }) {
  return (
    <AppProviders onGlobalError={handleClientQueryError}>
      {children}
    </AppProviders>
  );
}
`;
}

function createNextGlobalErrorSource(isTypeScript) {
  if (isTypeScript) {
    return readTemplate("next-app/app/global-error.tsx.tpl");
  }

  return `"use client";

export default function GlobalError({ error }) {
  return (
    <html>
      <body>
        <h2>Error</h2>
        <pre>{error.message}</pre>
      </body>
    </html>
  );
}
`;
}

function writeNextReadme(appName, appRootDirectory, extension, answers) {
  const envConfig = getNextEnvConfig(answers);

  writeAppReadme(appName, "next-app/README.md.tpl", {
    "[[LAYOUT_PATH]]": toRepoRelativePath(
      path.join(appRootDirectory, `layout${extension}`),
    ),
    "[[PROVIDERS_PATH]]": toRepoRelativePath(
      path.join(appRootDirectory, `providers${extension}`),
    ),
    "[[PAGE_PATH]]": toRepoRelativePath(
      path.join(appRootDirectory, `page${extension}`),
    ),
    "[[GLOBAL_ERROR_PATH]]": toRepoRelativePath(
      path.join(appRootDirectory, `global-error${extension}`),
    ),
    "[[ENV_FILE_PATH]]": toRepoRelativePath(
      path.join(getAppDirectory(appName), ".env.local"),
    ),
    "[[SITE_ID]]": envConfig.siteId,
    "[[BASE_URL]]": envConfig.baseUrl || "(비워둠)",
    "[[SITE_ID_ENV_KEY]]": envConfig.siteIdEnvKey,
    "[[BASE_URL_ENV_KEY]]": envConfig.baseUrlEnvKey,
    "[[ENV_SNIPPET]]": createEnvFileContents(envConfig.envEntries),
  });
}

function addImportIfMissing(source, statement) {
  if (source.includes(statement)) {
    return source;
  }

  const importMatches = [...source.matchAll(/^import .*;$/gm)];

  if (importMatches.length === 0) {
    return `${statement}\n${source}`;
  }

  const lastImport = importMatches.at(-1);
  const insertIndex = lastImport.index + lastImport[0].length;

  return `${source.slice(0, insertIndex)}\n${statement}${source.slice(insertIndex)}`;
}

function addDeclarationIfMissing(source, marker, declaration) {
  if (source.includes(declaration)) {
    return source;
  }

  const markerIndex = source.indexOf(marker);

  if (markerIndex === -1) {
    return `${source.trimEnd()}\n\n${declaration}\n`;
  }

  return `${source.slice(0, markerIndex).trimEnd()}\n\n${declaration}\n\n${source.slice(markerIndex)}`;
}

function upsertConstDeclaration(source, name, declaration, marker) {
  const pattern = new RegExp(`const ${name} = [^\\n]+;`);

  if (pattern.test(source)) {
    return source.replace(pattern, declaration);
  }

  return addDeclarationIfMissing(source, marker, declaration);
}

function applyNextLayoutBootstrap(source, appName, isTypeScript) {
  let nextSource =
    source.trim().length > 0
      ? source
      : createNextLayoutSource(appName, isTypeScript);

  nextSource = addImportIfMissing(
    nextSource,
    'import { CoreBootstrap } from "@repo/core-next/bootstrap";',
  );
  nextSource = addImportIfMissing(
    nextSource,
    'import { Providers } from "./providers";',
  );
  nextSource = upsertConstDeclaration(
    nextSource,
    "SITE_ID",
    `const SITE_ID = process.env.${NEXT_SITE_ID_ENV_KEY} ?? "a";`,
    "export default function",
  );
  nextSource = upsertConstDeclaration(
    nextSource,
    "BASE_URL",
    `const BASE_URL = process.env.${NEXT_BASE_URL_ENV_KEY} || undefined;`,
    "export default function",
  );

  if (!nextSource.includes("<CoreBootstrap")) {
    nextSource = nextSource.replace(
      /(<body[^>]*>)/,
      `$1\n        <CoreBootstrap siteId={SITE_ID} />`,
    );
  }

  nextSource = nextSource.replace(
    /<CoreBootstrap([^>]*?)siteId=\{SITE_ID\}(?![^>]*baseUrl=)([^>]*?)\/>/,
    `<CoreBootstrap$1siteId={SITE_ID} baseUrl={BASE_URL}$2 />`,
  );

  if (!nextSource.includes("<Providers>")) {
    if (
      /<body([^>]*)>\s*(?:<CoreBootstrap[^>]*siteId=\{SITE_ID\}[^>]*\/>\s*)?\{children\}\s*<\/body>/.test(
        nextSource,
      )
    ) {
      nextSource = nextSource.replace(
        /<body([^>]*)>\s*(?:<CoreBootstrap[^>]*siteId=\{SITE_ID\}[^>]*\/>\s*)?\{children\}\s*<\/body>/,
        `<body$1>\n        <CoreBootstrap siteId={SITE_ID} baseUrl={BASE_URL} />\n        <Providers>{children}</Providers>\n      </body>`,
      );
    } else if (/^(\s*)\{children\}$/m.test(nextSource)) {
      nextSource = nextSource.replace(
        /^(\s*)\{children\}$/m,
        (_match, indent) =>
          `${indent}<Providers>\n${indent}  {children}\n${indent}</Providers>`,
      );
    } else if (nextSource.includes("{children}")) {
      nextSource = nextSource.replace(
        "{children}",
        "<Providers>{children}</Providers>",
      );
    } else {
      nextSource = nextSource.replace(
        /(<body[^>]*>[\s\S]*?<CoreBootstrap[^>]*siteId=\{SITE_ID\}[^>]*\/>\s*)([\s\S]*?)(\s*<\/body>)/,
        (_match, prefix, bodyContent, suffix) => {
          const trimmedBodyContent = bodyContent.trim();

          if (!trimmedBodyContent) {
            return `${prefix}\n        <Providers />${suffix}`;
          }

          return `${prefix}\n        <Providers>\n${trimmedBodyContent}\n        </Providers>${suffix}`;
        },
      );
    }
  }

  return `${nextSource.trimEnd()}\n`;
}

function injectInitCoreIntoEntry(filePath) {
  const importStatement = 'import { initCore } from "@repo/core";';
  let source = readTextIfExists(filePath);

  if (!source || source.includes("initCore(")) {
    return;
  }

  if (!source.includes(importStatement)) {
    source = `${importStatement}\n${source}`;
  }

  const importLines = [...source.matchAll(/^import .*;$/gm)];
  const insertIndex =
    importLines.length > 0
      ? importLines.at(-1).index + importLines.at(-1)[0].length
      : 0;

  source = `${source.slice(0, insertIndex)}\n\nconst SITE_ID = import.meta.env.${VITE_SITE_ID_ENV_KEY} || "a";\nconst BASE_URL = import.meta.env.${VITE_BASE_URL_ENV_KEY} || undefined;\n\ninitCore(SITE_ID, BASE_URL);${source.slice(insertIndex)}`;

  writeText(filePath, source);
}

function applyNextDefaults(appName, answers) {
  const appDirectory = getAppDirectory(appName);
  const appRootDirectory = resolveNextAppDirectory(appDirectory);
  const extension = resolveNextExtension(appRootDirectory);
  const isTypeScript = extension === ".tsx" || extension === ".ts";
  const layoutPath = path.join(appRootDirectory, `layout${extension}`);
  const providersPath = path.join(appRootDirectory, `providers${extension}`);
  const globalErrorPath = path.join(
    appRootDirectory,
    `global-error${extension}`,
  );

  updateGeneratedPackageJson(appName, answers, {
    dependencies: {
      "@repo/core": "workspace:*",
      "@repo/core-next": "workspace:*",
    },
    devDependencies: {
      "@repo/eslint-config": "workspace:*",
      eslint: getReferenceVersion("eslint", "^9.39.1"),
      ...(isTypeScript ? { "@repo/typescript-config": "workspace:*" } : {}),
      ...(isTypeScript
        ? {
            typescript: getReferenceVersion("typescript", "5.9.2"),
          }
        : {}),
    },
    scripts: {
      lint: "eslint --max-warnings 0",
      ...(isTypeScript
        ? { "check-types": "next typegen && tsc --noEmit" }
        : {}),
    },
  });
  writeEnvLocalFile(appName, getNextEnvConfig(answers).envEntries);

  if (isTypeScript) {
    setJsonLikeExtends(
      path.join(appDirectory, "tsconfig.json"),
      "@repo/typescript-config/nextjs.json",
    );
  }

  removeFiles(appDirectory, NEXT_ESLINT_FILES);
  writeText(
    path.join(appDirectory, "eslint.config.mjs"),
    renderTemplate("next-app/eslint.config.js.tpl"),
  );
  writeText(
    layoutPath,
    applyNextLayoutBootstrap(
      readTextIfExists(layoutPath),
      appName,
      isTypeScript,
    ),
  );
  writeText(providersPath, createNextProvidersSource(isTypeScript));

  if (!fs.existsSync(globalErrorPath)) {
    writeText(globalErrorPath, createNextGlobalErrorSource(isTypeScript));
  }

  writeNextReadme(appName, appRootDirectory, extension, answers);
}

function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
}

function resolveViteMainEntry(appDirectory) {
  const candidates = [
    path.join(appDirectory, "src", "main.tsx"),
    path.join(appDirectory, "src", "main.jsx"),
    path.join(appDirectory, "src", "main.ts"),
    path.join(appDirectory, "src", "main.js"),
    path.join(appDirectory, "index.ts"),
    path.join(appDirectory, "index.js"),
  ];

  return candidates.find((filePath) => fs.existsSync(filePath));
}

function isReactViteApp(pkg, mainEntryPath) {
  return (
    Boolean(pkg.dependencies?.react && pkg.dependencies?.["react-dom"]) ||
    mainEntryPath.endsWith(".tsx") ||
    mainEntryPath.endsWith(".jsx")
  );
}

function isPlainViteApp(pkg) {
  const dependencyNames = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);

  return !KNOWN_NON_PLAIN_FRAMEWORKS.some((dependency) =>
    dependencyNames.has(dependency),
  );
}

function extractCssImport(source) {
  const match = source.match(/import\s+["'](.+?\.css)["'];?/);

  return match?.[1] ?? null;
}

function resolveAppComponentImport(mainEntryPath) {
  const directory = path.dirname(mainEntryPath);
  const candidates = ["App.tsx", "App.jsx", "App.ts", "App.js"];

  for (const fileName of candidates) {
    if (fs.existsSync(path.join(directory, fileName))) {
      return `./${fileName}`;
    }
  }

  return null;
}

function createReactProvidersSource(isTypeScript) {
  if (isTypeScript) {
    return `"use client";

import type { ReactNode } from "react";

import {
  AppProviders,
  createClientQueryErrorHandler,
} from "@repo/core-react";

const handleClientQueryError = createClientQueryErrorHandler({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <AppProviders onGlobalError={handleClientQueryError}>
      {children}
    </AppProviders>
  );
}
`;
  }

  return `"use client";

import {
  AppProviders,
  createClientQueryErrorHandler,
} from "@repo/core-react";

const handleClientQueryError = createClientQueryErrorHandler({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function Providers({ children }) {
  return (
    <AppProviders onGlobalError={handleClientQueryError}>
      {children}
    </AppProviders>
  );
}
`;
}

function createReactMainSource({
  cssImportPath,
  appImportPath,
  providersImportPath,
}) {
  const cssImport = cssImportPath ? `import "${cssImportPath}";\n` : "";

  return `import { initCore } from "@repo/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
${cssImport}import App from "${appImportPath}";
import { Providers } from "${providersImportPath}";

const SITE_ID = import.meta.env.${VITE_SITE_ID_ENV_KEY} || "a";
const BASE_URL = import.meta.env.${VITE_BASE_URL_ENV_KEY} || undefined;

initCore(SITE_ID, BASE_URL);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
`;
}

function createViteReactEslintSource() {
  return `import { config as reactConfig } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default reactConfig;
`;
}

function createViteBrowserEslintSource() {
  return `import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

import { config as baseConfig } from "@repo/eslint-config/base";

export default defineConfig([
  globalIgnores(["dist"]),
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
]);
`;
}

function writeViteReactReadme(appName, mainEntryPath, providersPath, answers) {
  const envConfig = getViteEnvConfig(answers);

  writeAppReadme(appName, "vite-app/README.react.md.tpl", {
    "[[ENTRY_PATH]]": toRepoRelativePath(mainEntryPath),
    "[[PROVIDERS_PATH]]": toRepoRelativePath(providersPath),
    "[[ENV_FILE_PATH]]": toRepoRelativePath(
      path.join(getAppDirectory(appName), ".env.local"),
    ),
    "[[SITE_ID]]": envConfig.siteId,
    "[[BASE_URL]]": envConfig.baseUrl || "(비워둠)",
    "[[SITE_ID_ENV_KEY]]": envConfig.siteIdEnvKey,
    "[[BASE_URL_ENV_KEY]]": envConfig.baseUrlEnvKey,
    "[[ENV_SNIPPET]]": createEnvFileContents(envConfig.envEntries),
  });
}

function writeVitePlainReadme(appName, mainEntryPath, answers) {
  const envConfig = getViteEnvConfig(answers);

  writeAppReadme(appName, "vite-app/README.plain.md.tpl", {
    "[[ENTRY_PATH]]": toRepoRelativePath(mainEntryPath),
    "[[ENV_FILE_PATH]]": toRepoRelativePath(
      path.join(getAppDirectory(appName), ".env.local"),
    ),
    "[[SITE_ID]]": envConfig.siteId,
    "[[BASE_URL]]": envConfig.baseUrl || "(비워둠)",
    "[[SITE_ID_ENV_KEY]]": envConfig.siteIdEnvKey,
    "[[BASE_URL_ENV_KEY]]": envConfig.baseUrlEnvKey,
    "[[ENV_SNIPPET]]": createEnvFileContents(envConfig.envEntries),
  });
}

function applyViteReactDefaults(appName, answers, mainEntryPath) {
  const appDirectory = getAppDirectory(appName);
  const envConfig = getViteEnvConfig(answers);
  const isTypeScript = mainEntryPath.endsWith(".tsx");
  const appImportPath = resolveAppComponentImport(mainEntryPath) ?? "./App";
  const providersExtension = isTypeScript ? ".tsx" : ".jsx";
  const providersImportPath = `./providers${providersExtension}`;
  const providersPath = path.join(
    path.dirname(mainEntryPath),
    `providers${providersExtension}`,
  );
  const cssImportPath = extractCssImport(readTextIfExists(mainEntryPath));
  const typecheckScript = fs.existsSync(
    path.join(appDirectory, "tsconfig.app.json"),
  )
    ? "tsc -b"
    : "tsc --noEmit";

  updateGeneratedPackageJson(appName, answers, {
    dependencies: {
      "@repo/core": "workspace:*",
      "@repo/core-react": "workspace:*",
    },
    devDependencies: {
      "@repo/eslint-config": "workspace:*",
      eslint: getReferenceVersion("eslint", "^9.39.1"),
      ...(isTypeScript ? { "@repo/typescript-config": "workspace:*" } : {}),
      ...(isTypeScript
        ? {
            typescript: getReferenceVersion("typescript", "5.9.2"),
          }
        : {}),
    },
    scripts: {
      lint: "eslint . --max-warnings 0",
      ...(isTypeScript ? { "check-types": typecheckScript } : {}),
    },
  });
  writeEnvLocalFile(appName, envConfig.envEntries);

  if (isTypeScript) {
    if (fs.existsSync(path.join(appDirectory, "tsconfig.app.json"))) {
      setJsonLikeExtends(
        path.join(appDirectory, "tsconfig.app.json"),
        "@repo/typescript-config/base.json",
      );
    } else if (fs.existsSync(path.join(appDirectory, "tsconfig.json"))) {
      setJsonLikeExtends(
        path.join(appDirectory, "tsconfig.json"),
        "@repo/typescript-config/base.json",
      );
    }
  }

  removeFiles(appDirectory, VITE_ESLINT_FILES);
  writeText(
    path.join(appDirectory, "eslint.config.js"),
    createViteReactEslintSource(),
  );
  writeText(providersPath, createReactProvidersSource(isTypeScript));
  writeText(
    mainEntryPath,
    createReactMainSource({
      cssImportPath,
      appImportPath,
      providersImportPath,
    }),
  );
  writeViteReactReadme(appName, mainEntryPath, providersPath, answers);
}

function applyVitePlainDefaults(appName, answers, mainEntryPath) {
  const appDirectory = getAppDirectory(appName);
  const isTypeScript = mainEntryPath.endsWith(".ts");

  updateGeneratedPackageJson(appName, answers, {
    dependencies: {
      "@repo/core": "workspace:*",
    },
    devDependencies: {
      "@repo/eslint-config": "workspace:*",
      eslint: getReferenceVersion("eslint", "^9.39.1"),
      globals: getReferenceVersion("globals", "^16.5.0"),
      ...(isTypeScript ? { "@repo/typescript-config": "workspace:*" } : {}),
      ...(isTypeScript
        ? {
            typescript: getReferenceVersion("typescript", "5.9.2"),
          }
        : {}),
    },
    scripts: {
      lint: "eslint . --max-warnings 0",
      ...(isTypeScript ? { "check-types": "tsc --noEmit" } : {}),
    },
  });
  writeEnvLocalFile(appName, getViteEnvConfig(answers).envEntries);

  if (isTypeScript && fs.existsSync(path.join(appDirectory, "tsconfig.json"))) {
    setJsonLikeExtends(
      path.join(appDirectory, "tsconfig.json"),
      "@repo/typescript-config/base.json",
    );
  }

  removeFiles(appDirectory, VITE_ESLINT_FILES);
  writeText(
    path.join(appDirectory, "eslint.config.mjs"),
    createViteBrowserEslintSource(),
  );
  injectInitCoreIntoEntry(mainEntryPath);
  writeVitePlainReadme(appName, mainEntryPath, answers);
}

function applyViteDefaults(appName, answers) {
  const appDirectory = getAppDirectory(appName);
  const packageJsonPath = path.join(appDirectory, "package.json");
  const pkg = readJson(packageJsonPath);
  const mainEntryPath = resolveViteMainEntry(appDirectory);

  if (!mainEntryPath) {
    updateGeneratedPackageJson(appName, answers);
    return;
  }

  if (isReactViteApp(pkg, mainEntryPath)) {
    applyViteReactDefaults(appName, answers, mainEntryPath);
    return;
  }

  if (isPlainViteApp(pkg)) {
    applyVitePlainDefaults(appName, answers, mainEntryPath);
    return;
  }

  updateGeneratedPackageJson(appName, answers);
}

function runCreateNextApp(appName) {
  const appPath = path.join("apps", appName);
  const command = `npm create next-app@latest ${appPath} -- --disable-git --skip-install`;

  execSync(command, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function runCreateViteApp(appName) {
  const appPath = path.join("apps", appName);
  const command = `npm create vite@latest ${appPath}`;

  execSync(command, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function getAppPrompts(appLabel) {
  return [
    {
      type: "input",
      name: "appName",
      message: `${appLabel} 앱 이름을 입력하세요:`,
      filter: (value) => value.trim(),
      validate: validateAppName,
    },
    {
      type: "input",
      name: "siteId",
      message: "siteId를 입력하세요:",
      default: "a",
      filter: (value) => value.trim(),
      validate: (value) => {
        if (!value.trim()) {
          return "siteId는 비워둘 수 없습니다.";
        }

        return true;
      },
    },
    {
      type: "input",
      name: "baseUrl",
      message:
        "API base URL을 입력하세요. 비워두면 나중에 .env.local에서 직접 설정합니다:",
      filter: (value) => value.trim(),
      validate: (value) => {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
          return true;
        }

        if (
          trimmedValue.startsWith("http://") ||
          trimmedValue.startsWith("https://")
        ) {
          return true;
        }

        return "base URL은 비우거나 http(s) 절대 URL로 입력해주세요.";
      },
    },
    {
      type: "checkbox",
      name: "workspaceDeps",
      message: "런타임 의존성(dependencies)에 추가할 패키지:",
      choices: getWorkspacePackages({ includeRuntimeExcluded: false }),
    },
    {
      type: "checkbox",
      name: "workspaceDevDeps",
      message: "개발 의존성(devDependencies)에 추가할 패키지:",
      choices: getWorkspacePackages(),
    },
  ];
}

export default function generator(plop) {
  plop.setGenerator("create-next", {
    description: "현재 워크스페이스에 Next.js 앱을 생성합니다.",
    prompts: getAppPrompts("Next.js"),
    actions: (data) => {
      const actions = [];

      if (!data) {
        return actions;
      }

      actions.push((answers) => {
        console.log(
          `${answers.appName} Next.js 앱을 인터랙티브하게 생성하는 중...`,
        );
        runCreateNextApp(answers.appName);

        return `${answers.appName} Next.js 앱 기본 생성이 완료되었습니다.`;
      });

      actions.push((answers) => {
        applyNextDefaults(answers.appName, answers);
        removeNestedPnpmWorkspace(answers.appName);
        installAppDependencies(answers.appName);
        fixGeneratedAppLint(answers.appName);

        return `${answers.appName} Next.js 앱 기본 설정이 반영되었습니다.`;
      });

      return actions;
    },
  });

  plop.setGenerator("create-vite", {
    description: "현재 워크스페이스에 Vite 앱을 생성합니다.",
    prompts: getAppPrompts("Vite"),
    actions: (data) => {
      const actions = [];

      if (!data) {
        return actions;
      }

      actions.push((answers) => {
        console.log(
          `${answers.appName} Vite 앱을 인터랙티브하게 생성하는 중...`,
        );
        runCreateViteApp(answers.appName);

        return `${answers.appName} Vite 앱 기본 생성이 완료되었습니다.`;
      });

      actions.push((answers) => {
        applyViteDefaults(answers.appName, answers);
        installAppDependencies(answers.appName);
        fixGeneratedAppLint(answers.appName);

        return `${answers.appName} Vite 앱 기본 설정이 반영되었습니다.`;
      });

      return actions;
    },
  });
}
