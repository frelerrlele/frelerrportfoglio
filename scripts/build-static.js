const fs = require("fs/promises");
const path = require("path");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "dist");
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "content.js",
  "schema.sql",
  "LICENSE",
  "README.md"
];
const dirs = ["assets"];

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  await Promise.all(entries.map((entry) => {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    return entry.isDirectory() ? copyDir(from, to) : fs.copyFile(from, to);
  }));
}

async function main() {
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });

  await Promise.all(files.map((file) => fs.copyFile(path.join(root, file), path.join(out, file))));
  await Promise.all(dirs.map((dir) => copyDir(path.join(root, dir), path.join(out, dir))));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
