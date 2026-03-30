{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "moduleResolution": "nodenext"
  },
  "include": ["src", "./index.ts"],
  "exclude": ["node_modules", "dist"]
}
