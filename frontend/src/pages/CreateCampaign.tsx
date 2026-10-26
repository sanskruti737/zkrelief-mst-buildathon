import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { Download } from 'lucide-react'
import { ethers } from 'ethers'
import { createCredentials, type Credential } from '../lib/merkle'
import { CONTRACT_ADDRESS, getContract, hasConfiguredContract } from '../lib/zkrelief'

export default function CreateCampaign() {
  const { account, signer } = useWallet()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [allocation, setAllocation] = useState('8')
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [campaignId, setCampaignId] = useState<number | null>(null)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')

  const createCampaign = async () => {
    if (!account || !signer) {
      alert('Please connect wallet')
      return
    }
    if (!hasConfiguredContract()) {
      setError('No contract address configured. Set VITE_CONTRACT_ADDRESS to the deployed ZKRelief address.')
      return
    }
    if (!name.trim()) {
      setError('Campaign name is required')
      return
    }

    setLoading(true)
    setError('')
    try {
      const count = 8
      const generated = await createCredentials(count, 3)

      const contract = getContract(signer)
      const tx = await contract.createCampaign(
        name,
        description,
        BigInt(allocation),
        ethers.toBeHex(BigInt(generated.root), 32)
      )
      const receipt = await tx.wait()

      let newCampaignId: number | null = null
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log)
          if (parsed?.name === 'CampaignCreated') {
            newCampaignId = Number(parsed.args.campaignId)
            break
          }
        } catch {
          // Ignore logs from other contracts.
        }
      }
      if (newCampaignId === null) {
        newCampaignId = Number(await contract.campaignCount())
      }

      const withCampaign = generated.credentials.map((credential) => ({
        ...credential,
        campaignId: newCampaignId,
      }))

      setCredentials(withCampaign)
      setCampaignId(newCampaignId)
      setTxHash(receipt.hash)
    } catch (error: any) {
      setError(error.shortMessage || error.message || String(error))
    }
    setLoading(false)
  }

  const downloadCredential = (credential: Credential) => {
    const blob = new Blob([JSON.stringify(credential, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zkrelief-credential-${credential.id}.json`
    a.click()
  }

  const downloadAll = () => {
    const blob = new Blob([JSON.stringify(credentials, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zkrelief-credentials-all.json`
    a.click()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Create Campaign (Organizer)</h1>

      {!hasConfiguredContract() && (
        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg text-sm text-red-200">
          Contract not configured. Set <code>VITE_CONTRACT_ADDRESS</code> to your deployed ZKRelief address.
        </div>
      )}

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Campaign Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-navy-800 border border-blue-500/30 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="e.g., Emergency Food Relief"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 bg-navy-800 border border-blue-500/30 rounded-lg focus:outline-none focus:border-blue-500"
            rows={3}
            placeholder="Describe the relief program"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Allocation (Aid Units)</label>
          <input
            type="number"
            min="1"
            value={allocation}
            onChange={(e) => setAllocation(e.target.value)}
            className="w-full px-4 py-2 bg-navy-800 border border-blue-500/30 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <button onClick={createCampaign} disabled={loading || !account} className="btn-primary">
          {loading ? 'Generating credentials & submitting...' : 'Create Campaign & Generate 8 Demo Credentials'}
        </button>
        {!account && <p className="text-yellow-400 text-sm">Connect wallet to create campaign</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {campaignId !== null && (
        <div className="card space-y-2">
          <h2 className="text-xl font-semibold">Campaign #{campaignId} created on-chain</h2>
          <p className="text-sm text-gray-400 break-all">Contract: {CONTRACT_ADDRESS}</p>
          <p className="text-sm text-gray-400 break-all">Transaction: {txHash}</p>
          <p className="text-sm text-gray-400 break-all">Merkle root: {credentials[0]?.merkleRoot}</p>
        </div>
      )}

      {credentials.length > 0 && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Generated Credentials</h2>
            <button onClick={downloadAll} className="btn-secondary flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Download All</span>
            </button>
          </div>
          <p className="text-sm text-yellow-400 bg-yellow-900/20 p-3 rounded">
            Keep these credentials secure. They are synthetic demo credentials and must not be committed to Git.
          </p>
          <div className="space-y-2">
            {credentials.map((credential) => (
              <div key={credential.id} className="flex justify-between items-center bg-navy-800 p-3 rounded">
                <span>Credential #{credential.id}</span>
                <button onClick={() => downloadCredential(credential)} className="btn-secondary text-sm flex items-center space-x-1">
                  <Download className="h-3 w-3" />
                  <span>Download JSON</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
