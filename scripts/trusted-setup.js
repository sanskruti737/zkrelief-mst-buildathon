const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const circuitsDir = path.join(__dirname, '..', 'circuits');
const buildDir = path.join(circuitsDir, 'build');
const ptauPath = path.join(circuitsDir, 'pot12_final.ptau');

try {
  if (!fs.existsSync(ptauPath)) {
    console.log('Downloading powers of tau...');
    execSync(`curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau -o ${ptauPath}`, { stdio: 'inherit' });
  }
  
  console.log('Generating zkey...');
  execSync(`snarkjs groth16 setup ${path.join(buildDir, 'eligibility.r1cs')} ${ptauPath} ${path.join(buildDir, 'eligibility_0000.zkey')}`, { stdio: 'inherit' });
  
  console.log('Contributing to phase 2...');
  execSync(`snarkjs zkey contribute ${path.join(buildDir, 'eligibility_0000.zkey')} ${path.join(buildDir, 'eligibility_final.zkey')} --name="ZKRelief" -v -e="random"`, { stdio: 'inherit' });
  
  console.log('Exporting verification key...');
  execSync(`snarkjs zkey export verificationkey ${path.join(buildDir, 'eligibility_final.zkey')} ${path.join(buildDir, 'verification_key.json')}`, { stdio: 'inherit' });
  
  console.log('Generating Solidity verifier...');
  execSync(`snarkjs zkey export solidityverifier ${path.join(buildDir, 'eligibility_final.zkey')} ${path.join(__dirname, '..', 'contracts', 'Verifier.sol')}`, { stdio: 'inherit' });
  
  console.log('Setup complete!');
} catch (e) {
  console.error('Setup failed:', e.message);
  process.exit(1);
}
