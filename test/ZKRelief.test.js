const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  createDemoCampaign,
  generateProof,
  verifyProof,
  toSolidityCalldata,
} = require("../scripts/lib/zk");

describe("ZKRelief", function () {
  const CAMPAIGN_ID = 1;
  const ALLOCATION = 8;

  let zkRelief;
  let owner;
  let campaign;
  let credential;
  let proof;
  let calldata;

  before(async function () {
    [owner] = await ethers.getSigners();

    campaign = await createDemoCampaign({ campaignId: CAMPAIGN_ID });
    credential = campaign.credentials[0];

    const result = await generateProof(credential, CAMPAIGN_ID);
    proof = result;

    // Prove the circuit's public input order is [root, nullifier, campaignId].
    expect(result.publicSignals[0]).to.equal(campaign.root);
    expect(result.publicSignals[1]).to.equal(result.nullifier);
    expect(result.publicSignals[2]).to.equal(String(CAMPAIGN_ID));

    const offChainValid = await verifyProof(result.proof, result.publicSignals);
    expect(offChainValid).to.equal(true);

    calldata = toSolidityCalldata(result.proof, result.publicSignals);
  });

  beforeEach(async function () {
    const ZKRelief = await ethers.getContractFactory("ZKRelief");
    zkRelief = await ZKRelief.deploy();
    await zkRelief.waitForDeployment();

    await zkRelief.createCampaign(
      "Emergency Food Relief",
      "Synthetic demo campaign",
      ALLOCATION,
      ethers.toBeHex(campaign.root, 32)
    );
  });

  it("deploys with the real generated Groth16 verifier", async function () {
    expect(await zkRelief.campaignCount()).to.equal(1n);
    const stored = await zkRelief.getCampaign(CAMPAIGN_ID);
    expect(stored.merkleRoot).to.equal(ethers.toBeHex(campaign.root, 32));
    expect(stored.allocation).to.equal(BigInt(ALLOCATION));
    expect(stored.claimed).to.equal(0n);
    expect(stored.active).to.equal(true);
  });

  it("verifies the generated proof on-chain and accepts a valid claim", async function () {
    const before = await zkRelief.getCampaign(CAMPAIGN_ID);

    const tx = await zkRelief.submitClaim(
      CAMPAIGN_ID,
      calldata.a,
      calldata.b,
      calldata.c,
      calldata.input
    );
    await expect(tx)
      .to.emit(zkRelief, "ClaimSubmitted")
      .withArgs(
        CAMPAIGN_ID,
        ethers.toBeHex(proof.nullifier, 32),
        before.claimed + 1n,
        before.allocation - before.claimed - 1n
      );

    const after = await zkRelief.getCampaign(CAMPAIGN_ID);
    expect(after.claimed).to.equal(1n);

    const nullifierUsed = await zkRelief.isNullifierUsed(
      CAMPAIGN_ID,
      ethers.toBeHex(proof.nullifier, 32)
    );
    expect(nullifierUsed).to.equal(true);
  });

  it("rejects a tampered/invalid proof", async function () {
    const tamperedA = [...calldata.a];
    tamperedA[0] = (BigInt(tamperedA[0]) + 1n).toString();

    await expect(
      zkRelief.submitClaim(
        CAMPAIGN_ID,
        tamperedA,
        calldata.b,
        calldata.c,
        calldata.input
      )
    ).to.be.revertedWith("Invalid proof");

    const campaignAfter = await zkRelief.getCampaign(CAMPAIGN_ID);
    expect(campaignAfter.claimed).to.equal(0n);
  });

  it("rejects a proof for a different Merkle root", async function () {
    const wrongInput = [...calldata.input];
    wrongInput[0] = (BigInt(wrongInput[0]) + 1n).toString();

    await expect(
      zkRelief.submitClaim(
        CAMPAIGN_ID,
        calldata.a,
        calldata.b,
        calldata.c,
        wrongInput
      )
    ).to.be.revertedWith("Invalid merkle root");
  });

  it("rejects the same campaign-specific nullifier claiming twice", async function () {
    await zkRelief.submitClaim(
      CAMPAIGN_ID,
      calldata.a,
      calldata.b,
      calldata.c,
      calldata.input
    );

    await expect(
      zkRelief.submitClaim(
        CAMPAIGN_ID,
        calldata.a,
        calldata.b,
        calldata.c,
        calldata.input
      )
    ).to.be.revertedWith("Nullifier already used");

    const campaignAfter = await zkRelief.getCampaign(CAMPAIGN_ID);
    expect(campaignAfter.claimed).to.equal(1n);
  });

  it("uses a different nullifier for the same credential in another campaign", async function () {
    await zkRelief.createCampaign(
      "Second Campaign",
      "Same beneficiary, different campaign",
      ALLOCATION,
      ethers.toBeHex(campaign.root, 32)
    );

    const result2 = await generateProof(credential, 2);
    expect(result2.publicSignals[0]).to.equal(campaign.root);
    expect(result2.publicSignals[2]).to.equal("2");
    expect(result2.nullifier).to.not.equal(proof.nullifier);

    const calldata2 = toSolidityCalldata(result2.proof, result2.publicSignals);
    await zkRelief.submitClaim(2, calldata2.a, calldata2.b, calldata2.c, calldata2.input);

    expect(await zkRelief.isNullifierUsed(2, ethers.toBeHex(result2.nullifier, 32))).to.equal(true);
    expect(await zkRelief.isNullifierUsed(1, ethers.toBeHex(proof.nullifier, 32))).to.equal(false);
    expect((await zkRelief.getCampaign(2)).claimed).to.equal(1n);
    expect((await zkRelief.getCampaign(1)).claimed).to.equal(0n);
  });

  it("rejects a proof whose public campaignId does not match the contract campaign", async function () {
    const wrongInput = [...calldata.input];
    wrongInput[2] = "2";

    await expect(
      zkRelief.submitClaim(
        CAMPAIGN_ID,
        calldata.a,
        calldata.b,
        calldata.c,
        wrongInput
      )
    ).to.be.revertedWith("Invalid campaign ID");
  });

  it("rejects claims for a non-existent or inactive campaign", async function () {
    await expect(
      zkRelief.submitClaim(
        999,
        calldata.a,
        calldata.b,
        calldata.c,
        calldata.input
      )
    ).to.be.revertedWith("Campaign does not exist");

    await zkRelief.toggleCampaign(CAMPAIGN_ID, false);
    await expect(
      zkRelief.submitClaim(
        CAMPAIGN_ID,
        calldata.a,
        calldata.b,
        calldata.c,
        calldata.input
      )
    ).to.be.revertedWith("Campaign not active");
  });
});
