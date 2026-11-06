import { spawn } from "node:child_process";
import nextEnv from "@next/env";
import { getDevelopmentMongoUri } from "./development-database.mjs";

nextEnv.loadEnvConfig(process.cwd());

const uri = getDevelopmentMongoUri();
if (process.env.NODE_ENV === "production") {
  throw new Error("The seeded development server cannot run with NODE_ENV=production.");
}
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: { ...process.env, MONGODB_URI: uri },
  },
);

child.on("error", (error) => {
  console.error(`Unable to start the development server: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
