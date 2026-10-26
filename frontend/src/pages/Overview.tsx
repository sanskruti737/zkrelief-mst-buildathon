import { useWallet } from '../context/WalletContext'
import { Wallet, Shield, Lock, Eye } from 'lucide-react'

export default function Overview() {
  const { account, connect } = useWallet()

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
          ZKRelief
        </h1>
        <p className="text-xl text-gray-300">Private Aid. Public Accountability.</p>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Privacy-preserving aid eligibility and claims verification using zero-knowledge proofs on MST Blockchain
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <Lock className="h-10 w-10 text-teal-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Private Verification</h3>
          <p className="text-gray-400">Prove eligibility with genuine ZK proofs without revealing identity or sensitive documents</p>
        </div>
        <div className="card">
          <Shield className="h-10 w-10 text-blue-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Duplicate Prevention</h3>
          <p className="text-gray-400">Campaign-specific nullifiers prevent multiple claims while preserving privacy</p>
        </div>
        <div className="card">
          <Eye className="h-10 w-10 text-teal-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Public Accountability</h3>
          <p className="text-gray-400">All allocations and verified claims are publicly auditable on-chain</p>
        </div>
      </div>

      <div className="card text-center">
        <Wallet className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
        {account ? (
          <p className="text-teal-400">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
        ) : (
          <button onClick={connect} className="btn-primary">Connect Wallet</button>
        )}
      </div>
    </div>
  )
}
