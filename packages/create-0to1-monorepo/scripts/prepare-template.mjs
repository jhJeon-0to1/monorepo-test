import path from "node:path";

import {
  copyRepositoryTemplate,
  getPackageDirectory,
} from "../lib/template.js";

const packageDirectory = getPackageDirectory(import.meta.url);
const repositoryRoot = path.resolve(packageDirectory, "..", "..");
const templateDirectory = path.join(packageDirectory, "template");

copyRepositoryTemplate(repositoryRoot, templateDirectory);

console.log(`Template prepared at ${templateDirectory}`);
