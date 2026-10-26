import { useState, useEffect } from 'react'
import { BarChart3, FileText } from 'lucide-react'

export default function PublicAudit() {
  const [campaigns, setCampaigns] = useState<any[]>([])

  useEffect(() => {
    // Demo data - will be replaced with contract reads
    setCampaigns([
      {
        id: 1,
        name: "Demo Relief Campaign",
        status: "Active",
        allocation: 8,
        claimed: 0,
        remaining: 8,
        merkleRoot: "0x...",
        events: []
      }
    ])
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Public Audit Dashboard</h1>
      <p className="text-gray-400">All campaign data is publicly auditable on-chain</p>

      {campaigns.map(campaign => (
        <div key={campaign.id} className="card space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold">{campaign.name}</h2>
              <span className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                campaign.status === 'Active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-900/50 text-gray-400'
              }`}>
                {campaign.status}
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
              <p className="text-2xl font-bold">{campaign.allocation}</p>
            </div>
            <div className="bg-navy-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Verified Claims</p>
              <p className="text-2xl font-bold text-teal-400">{campaign.claimed}</p>
            </div>
            <div className="bg-navy-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Remaining</p>
              <p className="text-2xl font-bold text-blue-400">{campaign.remaining}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-2">Public Merkle Root</p>
            <p className="font-mono text-xs bg-navy-800 p-2 rounded break-all">{campaign.merkleRoot}</p>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-lg">
            <p className="text-xs text-yellow-200">⚠️ Demo data shown. Connect to a deployed contract to view live data.</p>
          </div>
        </div>
      ))}

      <div className="card">
        <FileText className="h-8 w-8 text-blue-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Public Accounting</h3>
        <p className="text-gray-400">All claim verifications are recorded as public events on-chain. No beneficiary identities or private credentials are disclosed.</p>
      </div>
    </div>
  )
}
