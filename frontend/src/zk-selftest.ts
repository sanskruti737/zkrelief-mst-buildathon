import { ethers } from 'ethers'
import { generateEligibilityProof } from './lib/zkrelief'
import { createCredentials, type Credential } from './lib/merkle'

const statusEl = document.getElementById('status')!
const params = new URLSearchParams(window.location.search)
const runE2E = params.get('e2e') === '1'

function setStatus(lines: string[]) {
  statusEl.textContent = lines.join('\n')
}

async function loadCredential(): Promise<Credential> {
  const response = await fetch('/zk/demo-credential.json')
  if (!response.ok) throw new Error('Failed to load demo credential')
  return (await response.json()) as Credential
}

async function proofOnly() {
  const credential = await loadCredential()
  const result = await generateEligibilityProof(credential, '1', (status) => {
    statusEl.textContent = `STATUS:${status}`
    console.log(status)
  })
  return [
    'PASS',
    `NULLIFIER=${result.nullifier}`,
    `ROOT=${result.publicSignals[0]}`,
    `CAMPAIGN=${result.publicSignals[2]}`,
  ]
}

async function e2e() {
  const rpcUrl = `${window.location.origin}/rpc`
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const network = await provider.getNetwork()
  statusEl.textContent = `STATUS:Connected to chain ${network.chainId}`

  // Ephemeral local-only test wallet. Funded by the local Hardhat node.
  const wallet = ethers.Wallet.createRandom()
  const signer = wallet.connect(provider)
  const fundTx = await provider.send('hardhat_setBalance', [
    wallet.address,
    ethers.toBeHex(ethers.parseEther('20')),
  ])
  console.log('funded test wallet', wallet.address, fundTx)

  statusEl.textContent = 'STATUS:Deploying contract'
  const artifactResponse = await fetch('/zk/ZKRelief.json')
  if (!artifactResponse.ok) throw new Error('Failed to load ZKRelief artifact')
  const artifact = await artifactResponse.json()
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
  const deployed = await factory.deploy()
  await deployed.waitForDeployment()
  const contract = deployed as ethers.Contract
  const contractAddress = await contract.getAddress()

  statusEl.textContent = 'STATUS:Creating campaign'
  const generated = await createCredentials(8, 3)
  const createTx = await contract.createCampaign(
    'Browser E2E Campaign',
    'Synthetic browser self-test',
    8,
    ethers.toBeHex(BigInt(generated.root), 32)
  )
  const createReceipt = await createTx.wait()

  let campaignId: number | null = null
  for (const log of createReceipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log)
      if (parsed?.name === 'CampaignCreated') {
        campaignId = Number(parsed.args.campaignId)
        break
      }
    } catch {
      // Ignore unrelated logs.
    }
  }
  if (campaignId === null) throw new Error('CampaignCreated event not found')

  statusEl.textContent = 'STATUS:Generating browser proof'
  const credential = generated.credentials[0]
  const result = await generateEligibilityProof(credential, String(campaignId), (status) => {
    statusEl.textContent = `STATUS:${status}`
    console.log(status)
  })

  statusEl.textContent = 'STATUS:Submitting valid claim'
  const claimTx = await contract.submitClaim(
    campaignId,
    result.calldata.a,
    result.calldata.b,
    result.calldata.c,
    result.calldata.input
  )
  const claimReceipt = await claimTx.wait()

  const after = await contract.getCampaign(campaignId)
  if (after.claimed !== 1n) throw new Error('Claim total did not update to 1')

  statusEl.textContent = 'STATUS:Submitting duplicate claim'
  let duplicateRejected = false
  let duplicateReason = ''
  try {
    const dupTx = await contract.submitClaim(
      campaignId,
      result.calldata.a,
      result.calldata.b,
      result.calldata.c,
      result.calldata.input
    )
    await dupTx.wait()
  } catch (error: any) {
    duplicateRejected = true
    duplicateReason = error.shortMessage || error.message || String(error)
  }

  if (!duplicateRejected) throw new Error('Duplicate claim was not rejected')
  const finalCampaign = await contract.getCampaign(campaignId)
  if (finalCampaign.claimed !== 1n) throw new Error('Duplicate changed claim total')

  return [
    'PASS',
    `CHAIN=${network.chainId}`,
    `CONTRACT=${contractAddress}`,
    `CAMPAIGN=${campaignId}`,
    `NULLIFIER=${result.nullifier}`,
    `CLAIM_TX=${claimReceipt.hash}`,
    `CLAIMED=${finalCampaign.claimed}`,
    `DUPLICATE_REJECTED=${duplicateRejected}`,
    `DUPLICATE_REASON=${duplicateReason}`,
  ]
}

async function run() {
  try {
    statusEl.textContent = 'STARTING'
    const lines = runE2E ? await e2e() : await proofOnly()
    setStatus(lines)
  } catch (error: any) {
    setStatus([`FAIL`, `${error?.stack || error?.message || String(error)}`])
  }
}

run()
