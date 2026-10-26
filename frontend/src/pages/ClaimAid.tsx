import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { Upload, FileCheck, Loader, ShieldCheck } from 'lucide-react'
import type { Credential } from '../lib/merkle'
import {
  CONTRACT_ADDRESS,
  generateEligibilityProof,
  getContract,
  hasConfiguredContract,
  readCampaign,
  type CampaignInfo,
  type GeneratedProof,
} from '../lib/zkrelief'

export default function ClaimAid() {
  const { account, signer } = useWallet()
  const [credential, setCredential] = useState<Credential | null>(null)
  const [campaignId, setCampaignId] = useState('1')
  const [proofStatus, setProofStatus] = useState('')
  const [proofResult, setProofResult] = useState<GeneratedProof | null>(null)
  const [loading, setLoading] = useState(false)
  const [claimTx, setClaimTx] = useState('')
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null)
  const [error, setError] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string)
          if (!data.secret || !data.pathElements || !data.pathIndices || !data.merkleRoot) {
            setError('Invalid credential format')
            return
          }
          setCredential(data)
          setProofResult(null)
          setClaimTx('')
          setError('')
          alert('Credential loaded successfully')
        } catch {
          setError('Error reading credential file')
        }
      }
      reader.readAsText(file)
    }
  }

  const generateProof = async () => {
    if (!credential) {
      setError('Please upload credential first')
      return
    }
    if (!hasConfiguredContract()) {
      setError('No contract address configured. Set VITE_CONTRACT_ADDRESS.')
      return
    }

    setLoading(true)
    setError('')
    setClaimTx('')
    try {
      const result = await generateEligibilityProof(credential, campaignId, setProofStatus)
      setProofResult(result)
      setProofStatus('Proof generated and verified. Ready to submit.')
    } catch (error: any) {
      setError(error.message || String(error))
      setProofStatus('Error generating proof')
    }
    setLoading(false)
  }

  const submitClaim = async () => {
    if (!account || !signer) {
      setError('Please connect wallet')
      return
    }
    if (!proofResult) {
      setError('Please generate a proof first')
      return
    }

    setLoading(true)
    setError('')
    setProofStatus('Submitting claim transaction...')
    try {
      const contract = getContract(signer)
      const tx = await contract.submitClaim(
        BigInt(campaignId),
        proofResult.calldata.a,
        proofResult.calldata.b,
        proofResult.calldata.c,
        proofResult.calldata.input
      )
      const receipt = await tx.wait()
      setClaimTx(receipt.hash)
      setProofStatus('Claim verified on-chain.')
      const updated = await readCampaign(signer, Number(campaignId))
      setCampaign(updated)
    } catch (error: any) {
      const message = error.shortMessage || error.reason || error.message || String(error)
      setError(message)
      setProofStatus('Claim rejected')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Claim Aid (Beneficiary)</h1>
      <p className="text-gray-400">
        Upload your credential, generate a real Groth16 proof in your browser, and submit it on-chain.
      </p>

      <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg">
        <p className="text-sm text-yellow-200">
          <strong>Privacy Notice:</strong> Your wallet address and transaction timing are visible. Your secret,
          Merkle path, and identity are never revealed on-chain.
        </p>
      </div>

      {!hasConfiguredContract() && (
        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg text-sm text-red-200">
          Contract not configured. Set <code>VITE_CONTRACT_ADDRESS</code> to the deployed ZKRelief address.
        </div>
      )}

      <div className="card space-y-4">
        <h2 className="text-xl font-semibold">1. Select Campaign</h2>
        <div>
          <label className="block text-sm font-medium mb-2">Campaign ID</label>
          <input
            type="number"
            min="1"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="w-full px-4 py-2 bg-navy-800 border border-blue-500/30 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-xl font-semibold">2. Upload Credential</h2>
        <div className="border-2 border-dashed border-blue-500/30 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
            id="credential-upload"
          />
          <label htmlFor="credential-upload" className="btn-primary cursor-pointer inline-block">
            Choose Credential JSON
          </label>
          {credential && (
            <p className="mt-4 text-teal-400">Credential #{credential.id} loaded</p>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-xl font-semibold">3. Generate ZK Proof</h2>
        <button onClick={generateProof} disabled={loading || !credential} className="btn-primary flex items-center space-x-2">
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
          <span>{loading ? 'Working...' : 'Generate Groth16 Proof'}</span>
        </button>
        {proofStatus && (
          <div className="bg-navy-800 p-3 rounded text-sm">{proofStatus}</div>
        )}
        {proofResult && (
          <div className="bg-navy-800 p-3 rounded text-xs space-y-1">
            <p className="text-teal-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Proof verified against verification_key.json
            </p>
            <p className="text-gray-400 break-all">Nullifier: {proofResult.nullifier}</p>
            <p className="text-gray-400 break-all">Public root: {proofResult.publicSignals[0]}</p>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="text-xl font-semibold">4. Submit Claim</h2>
        <button
          onClick={submitClaim}
          disabled={loading || !account || !proofResult}
          className="btn-primary"
        >
          Submit Claim Transaction
        </button>
        {!account && <p className="text-yellow-400 text-sm">Connect wallet to submit claim</p>}
        {claimTx && (
          <div className="bg-navy-800 p-3 rounded text-sm space-y-1">
            <p className="text-teal-400">Claim accepted on-chain.</p>
            <p className="text-gray-400 break-all">Transaction: {claimTx}</p>
            <p className="text-gray-400">Contract: {CONTRACT_ADDRESS}</p>
          </div>
        )}
        {campaign && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-navy-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Verified Claims</p>
              <p className="text-2xl font-bold text-teal-400">{campaign.claimed.toString()}</p>
            </div>
            <div className="bg-navy-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Remaining</p>
              <p className="text-2xl font-bold text-blue-400">
                {(campaign.allocation - campaign.claimed).toString()}
              </p>
            </div>
          </div>
        )}
        {error && <p className="text-red-400 text-sm break-all">{error}</p>}
      </div>
    </div>
  )
}
