import path from "node:path";
import * as fs from "node:fs";
import { execSync } from "child_process";

export default function generator(plop) {
  const getWorkspacePackages = () => {
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
        const pkgJson = JSON.parse(
          fs.readFileSync(
            path.join(packagesPath, dir, "package.json"),
            "utf-8",
          ),
        );

        return {
          name: pkgJson.name,
          value: pkgJson.name,
        };
      });
  };

  plop.setGenerator("create-next", {
    description: "현재 워크스페이스에 Next.js 앱을 생성합니다.",
    prompts: [
      {
        type: "input",
        name: "appName",
        message: "Next.js 앱 이름을 입력하세요:",
      },
      {
        type: "checkbox",
        name: "workspaceDeps",
        message: "런타임 의존성(dependencies)에 추가할 패키지:",
        choices: getWorkspacePackages(),
      },
      {
        type: "checkbox",
        name: "workspaceDevDeps",
        message: "개발 의존성(devDependencies)에 추가할 패키지:",
        choices: getWorkspacePackages(),
      },
    ],
    actions: (data) => {
      const actions = [];
      if (!data) return actions;

      const appPath = path.join("apps", data.appName);

      actions.push(async (answers) => {
        console.log(`${answers.appName} 앱을 생성하는 중...`);
        const command = `pnpm create next-app@latest ${appPath} --disable-git`;
        execSync(command, { stdio: "inherit" });
        console.log(`${answers.appName} 앱이 생성되었습니다.`);
      });

      actions.push(async (answers) => {
        const pkgPath = path.join(process.cwd(), appPath, "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

        if (answers.workspaceDeps.length > 0) {
          pkg.dependencies = pkg.dependencies || {};
          answers.workspaceDeps.forEach((dep) => {
            pkg.dependencies[dep] = "workspace:*";
          });
        }

        if (answers.workspaceDevDeps.length > 0) {
          pkg.devDependencies = pkg.devDependencies || {};
          answers.workspaceDevDeps.forEach((devDep) => {
            pkg.devDependencies[devDep] = "workspace:*";
          });
        }

        pkg.name = `@repo/${answers.appName}`;

        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
        console.log(
          `${answers.appName} 앱의 package.json이 업데이트되었습니다.`,
        );
      });

      return actions;
    },
  });
}
