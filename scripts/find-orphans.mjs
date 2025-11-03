import { execSync } from "node:child_process";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"], shell: "bash" })
    .toString()
    .trim();
}

const pages = sh(`git ls-files 'app/**/page.*'`)
  .split("\n")
  .filter(Boolean)
  .map(p => p.replace(/^app/, "").replace(/\/page\.(tsx|ts|jsx|js)$/, ""))
  .sort();

const whitelist = new Set([
  "/", "/offers", "/benefits", "/rewards", "/account", "/join",
  "/auth/callback",
  "/checkout", "/checkout/success", "/checkout/cancel",
  "/member/offers", "/member/benefits",
]);

let found = false;

for (const p of pages) {
  if (whitelist.has(p)) continue;
  const pat = `["']${p}["']|href=\\{[^}]*["']${p}["']`;
  try {
    execSync(`git grep -q -E '${pat}' -- ':!node_modules'`, {
      stdio: "ignore",
      shell: "bash",
    });
  } catch {
    console.log(`Unlinked route: ${p}`);
    found = true;
  }
}

if (!found) console.log("No unlinked routes 🎉");