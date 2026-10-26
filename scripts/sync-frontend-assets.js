const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const buildDir = path.join(rootDir, "circuits", "build");
const publicZkDir = path.join(rootDir, "frontend", "public", "zk");

const assets = [
  {
    from: path.join(buildDir, "eligibility_js", "eligibility.wasm"),
    to: path.join(publicZkDir, "eligibility.wasm"),
  },
  {
    from: path.join(buildDir, "eligibility_final.zkey"),
    to: path.join(publicZkDir, "eligibility_final.zkey"),
  },
  {
    from: path.join(buildDir, "verification_key.json"),
    to: path.join(publicZkDir, "verification_key.json"),
  },
  {
    from: path.join(rootDir, "artifacts", "contracts", "ZKRelief.sol", "ZKRelief.json"),
    to: path.join(publicZkDir, "ZKRelief.json"),
  },
];

fs.mkdirSync(publicZkDir, { recursive: true });

for (const asset of assets) {
  if (!fs.existsSync(asset.from)) {
    throw new Error(`Missing asset: ${asset.from}`);
  }
  fs.copyFileSync(asset.from, asset.to);
  console.log(`Synced ${path.relative(rootDir, asset.to)}`);
}
