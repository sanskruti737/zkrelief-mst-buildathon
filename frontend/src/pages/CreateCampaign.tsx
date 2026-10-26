import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { Users, Download } from 'lucide-react'
import { buildPoseidon } from 'circomlibjs'
import { MerkleTree } from '../../../../utils/merkle'

export default function CreateCampaign() {
  const { account, signer } = useWallet()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [allocation, setAllocation] = useState('8')
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState<any[]>([])

  const createCampaign = async () => {
    if (!account || !signer) {
      alert('Please connect wallet')
      return
    }
    setLoading(true)
    try {
      // Generate 8 demo credentials
      const poseidon = await buildPoseidon()
      const F = poseidon.F
      const creds = []
      const leaves = []
      
      for (let i = 0; i < 8; i++) {
        const secret = BigInt(Math.floor(Math.random() * 1000000000000))
        const commitment = F.toString(poseidon([secret]))
        creds.push({
          id: i + 1,
          secret: secret.toString(),
          commitment,
          campaignId: null
        })
        leaves.push(commitment)
      }
      
      const tree = new MerkleTree(leaves, 3)
      await tree.init()
      const root = tree.getRoot()
      
      // Add merkle proofs to credentials
      creds.forEach((cred, idx) => {
        const proof = tree.getProof(idx)
        cred.pathElements = proof.pathElements
        cred.pathIndices = proof.pathIndices
        cred.merkleRoot = root
      })
      
      setCredentials(creds)
      alert(`Campaign created! Merkle root: ${root.slice(0, 10)}... Generated 8 credentials.`)
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
    setLoading(false)
  }

  const downloadCredential = (cred: any) => {
    const blob = new Blob([JSON.stringify(cred, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zkrelief-credential-${cred.id}.json`
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
            value={allocation}
            onChange={(e) => setAllocation(e.target.value)}
            className="w-full px-4 py-2 bg-navy-800 border border-blue-500/30 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <button onClick={createCampaign} disabled={loading || !account} className="btn-primary">
          {loading ? 'Generating...' : 'Create Campaign & Generate 8 Demo Credentials'}
        </button>
        {!account && <p className="text-yellow-400 text-sm">Connect wallet to create campaign</p>}
      </div>

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
            ⚠️ Keep these credentials secure! Do not commit to Git. Only share with intended demo beneficiaries.
          </p>
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div key={cred.id} className="flex justify-between items-center bg-navy-800 p-3 rounded">
                <span>Credential #{cred.id}</span>
                <button onClick={() => downloadCredential(cred)} className="btn-secondary text-sm flex items-center space-x-1">
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
