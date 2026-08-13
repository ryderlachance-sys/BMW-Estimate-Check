const path = require("node:path");
const { spawnSync } = require("node:child_process");

const shim = path.join(__dirname, "tsx-windows-shim.cjs");
const cli = path.join(__dirname, "..", "node_modules", "tsx", "dist", "cli.mjs");
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${shim}`.trim(),
  },
});

process.exit(result.status ?? 1);
