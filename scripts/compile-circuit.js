const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const circuitsDir = path.join(__dirname, '..', 'circuits');
const buildDir = path.join(circuitsDir, 'build');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

try {
  console.log('Compiling circuit...');
  execSync(`circom ${path.join(circuitsDir, 'eligibility.circom')} --r1cs --wasm --sym -o ${buildDir} -l ${path.join(__dirname, '..', 'node_modules')}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('Circuit compiled successfully');
} catch (e) {
  console.error('Compilation failed:', e.message);
  process.exit(1);
}
