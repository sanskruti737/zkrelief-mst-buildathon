export default function About() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">About & Privacy</h1>
      
      <div className="card space-y-4">
        <h2 className="text-xl font-semibold text-teal-400">How ZKRelief Works</h2>
        <p className="text-gray-300">
          ZKRelief uses Groth16 zero-knowledge proofs to verify Merkle tree membership for aid eligibility. 
          Beneficiaries can prove they are eligible without revealing their secret or identity.
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li><span className="text-white">Private:</span> Your secret and Merkle path never leave your device</li>
          <li><span className="text-white">Verifiable:</span> On-chain proof verification ensures only eligible beneficiaries claim</li>
          <li><span className="text-white">Unique:</span> Campaign-specific nullifiers prevent duplicate claims</li>
          <li><span className="text-white">Auditable:</span> Claim counts and allocations are publicly visible</li>
        </ul>
      </div>

      <div className="card space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Privacy Limitations</h2>
        <div className="bg-yellow-900/30 border border-yellow-500/50 p-4 rounded-lg">
          <p className="text-yellow-200 font-semibold mb-2">Important Disclaimers:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li><strong>Wallet visibility:</strong> Your wallet address and transaction timing may be publicly visible on the blockchain</li>
            <li><strong>Transaction metadata:</strong> Gas usage and transaction patterns can be observed</li>
            <li><strong>Not anonymous:</strong> ZKRelief provides privacy of eligibility data, not complete transaction anonymity</li>
            <li><strong>Issuer trust:</strong> In this MVP, credential issuance is demo-only. Production requires authorized issuer</li>
            <li><strong>No on-chain payments:</strong> This system tracks verified claims for accounting; aid delivery is off-chain</li>
          </ul>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-xl font-semibold text-teal-400">Security Notes</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>Development uses a trusted setup - production requires MPC ceremony</li>
          <li>Never share your credential JSON or secret with anyone</li>
          <li>Private keys and credentials must never be committed to Git</li>
          <li>All ZK verification is performed on-chain using the generated verifier</li>
        </ul>
      </div>
    </div>
  )
}
