const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const circuitsDir = path.join(rootDir, "circuits");
const buildDir = path.join(circuitsDir, "build");
const circomBin = process.env.CIRCOM_BIN || "circom";

function checkCompiler() {
  let version = "";
  try {
    version = execFileSync(circomBin, ["--version"], { encoding: "utf8" });
  } catch (error) {
    throw new Error(
      `Circom compiler not found (${circomBin}). Install Circom 2.1.6 and set CIRCOM_BIN if needed.`
    );
  }

  // The old npm "circom" package reports 0.5.x and cannot compile Circom 2.
  if (!version.includes("circom compiler 2.")) {
    throw new Error(
      `Found an incompatible Circom compiler: ${version.trim()}. ` +
        "Install Circom 2.1.6 (for example from https://github.com/iden3/circom/releases) " +
        "and set CIRCOM_BIN to its path."
    );
  }
  return version.trim();
}

fs.mkdirSync(buildDir, { recursive: true });

try {
  const version = checkCompiler();
  console.log(`Using ${version}`);
  console.log("Compiling circuit...");
  execFileSync(
    circomBin,
    [
      path.join(circuitsDir, "eligibility.circom"),
      "--r1cs",
      "--wasm",
      "--sym",
      "-o",
      buildDir,
      "-l",
      path.join(rootDir, "node_modules"),
    ],
    { stdio: "inherit", cwd: rootDir }
  );
  console.log("Circuit compiled successfully");
} catch (error) {
  console.error("Compilation failed:", error.message);
  process.exit(1);
}
