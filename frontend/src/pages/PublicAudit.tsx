import { useCallback, useEffect, useState } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { useWallet } from '../context/WalletContext'
import {
  CONTRACT_ADDRESS,
  getReadProvider,
  hasConfiguredContract,
  readCampaign,
  readCampaignCount,
  type CampaignInfo,
} from '../lib/zkrelief'

interface CampaignRow extends CampaignInfo {
  id: number
}

export default function PublicAudit() {
  const { provider } = useWallet()
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadCampaigns = useCallback(async () => {
    if (!hasConfiguredContract()) return
    setLoading(true)
    setError('')
    try {
      const runner = provider ?? getReadProvider()
      const count = await readCampaignCount(runner)
      const rows: CampaignRow[] = []
      for (let id = 1; id <= count; id++) {
        const campaign = await readCampaign(runner, id)
        rows.push({ ...campaign, id })
      }
      setCampaigns(rows)
    } catch (error: any) {
      setError(error.shortMessage || error.message || String(error))
    }
    setLoading(false)
  }, [provider])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Public Audit Dashboard</h1>
          <p className="text-gray-400">All campaign allocations and verified claim totals are read from the contract.</p>
        </div>
        <button onClick={loadCampaigns} disabled={loading} className="btn-secondary flex items-center space-x-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {!hasConfiguredContract() && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg text-sm text-yellow-200">
          Contract not configured. Set <code>VITE_CONTRACT_ADDRESS</code> to a deployed ZKRelief address to see live
          campaign data.
        </div>
      )}

      {hasConfiguredContract() && (
        <p className="text-xs text-gray-400 break-all">Contract: {CONTRACT_ADDRESS}</p>
      )}
      {error && <p className="text-red-400 text-sm break-all">{error}</p>}

      {campaigns.length === 0 && hasConfiguredContract() && !loading && !error && (
        <div className="card text-gray-400">No campaigns have been created yet.</div>
      )}

      {campaigns.map((campaign) => {
        const remaining = campaign.allocation - campaign.claimed
        return (
          <div key={campaign.id} className="card space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold">{campaign.name}</h2>
                <p className="text-gray-400 text-sm mt-1">{campaign.description}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                  campaign.active ? 'bg-green-900/50 text-green-400' : 'bg-gray-900/50 text-gray-400'
                }`}>
                  {campaign.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Campaign ID</p>
                <p className="text-xl font-mono">{campaign.id}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-navy-800 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Total Allocated</p>
                <p className="text-2xl font-bold">{campaign.allocation.toString()}</p>
              </div>
              <div className="bg-navy-800 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Verified Claims</p>
                <p className="text-2xl font-bold text-teal-400">{campaign.claimed.toString()}</p>
              </div>
              <div className="bg-navy-800 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Remaining</p>
                <p className="text-2xl font-bold text-blue-400">{remaining.toString()}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Public Merkle Root</p>
              <p className="font-mono text-xs bg-navy-800 p-2 rounded break-all">{campaign.merkleRoot}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Creator</p>
              <p className="font-mono text-xs bg-navy-800 p-2 rounded break-all">{campaign.creator}</p>
            </div>
          </div>
        )
      })}

      <div className="card">
        <FileText className="h-8 w-8 text-blue-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Public Accounting</h3>
        <p className="text-gray-400">
          Verified claims are recorded as public events on-chain. No beneficiary identities, secrets, or Merkle paths
          are disclosed by this dashboard.
        </p>
      </div>
    </div>
  )
}
