// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Verifier.sol";

contract ZKRelief is Groth16Verifier {
    struct Campaign {
        string name;
        string description;
        uint256 allocation;
        uint256 claimed;
        bytes32 merkleRoot;
        uint256 campaignId;
        bool active;
        address creator;
    }
    
    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(bytes32 => bool)) public nullifierUsed;
    
    event CampaignCreated(uint256 indexed campaignId, string name, bytes32 merkleRoot, uint256 allocation);
    event ClaimSubmitted(uint256 indexed campaignId, bytes32 nullifier, uint256 claimedCount, uint256 remaining);
    
    modifier onlyCampaignCreator(uint256 campaignId) {
        require(campaigns[campaignId].creator == msg.sender, "Not campaign creator");
        _;
    }
    
    function createCampaign(
        string memory name,
        string memory description,
        uint256 allocation,
        bytes32 merkleRoot
    ) external returns (uint256) {
        campaignCount++;
        campaigns[campaignCount] = Campaign({
            name: name,
            description: description,
            allocation: allocation,
            claimed: 0,
            merkleRoot: merkleRoot,
            campaignId: campaignCount,
            active: true,
            creator: msg.sender
        });
        emit CampaignCreated(campaignCount, name, merkleRoot, allocation);
        return campaignCount;
    }
    
    function toggleCampaign(uint256 campaignId, bool active) external onlyCampaignCreator(campaignId) {
        campaigns[campaignId].active = active;
    }
    
    function submitClaim(
        uint256 campaignId,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input // [root, nullifier, campaignId]
    ) external {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.campaignId == campaignId, "Campaign does not exist");
        require(campaign.active, "Campaign not active");
        require(campaign.claimed < campaign.allocation, "Allocation exhausted");
        
        bytes32 nullifier = bytes32(input[1]);
        require(!nullifierUsed[campaignId][nullifier], "Nullifier already used");
        require(campaign.merkleRoot == bytes32(input[0]), "Invalid merkle root");
        require(input[2] == campaignId, "Invalid campaign ID");
        
        // Verify proof
        require(verifyProof(a, b, c, input), "Invalid proof");
        
        // Mark nullifier as used and update counts
        nullifierUsed[campaignId][nullifier] = true;
        campaign.claimed++;
        
        emit ClaimSubmitted(campaignId, nullifier, campaign.claimed, campaign.allocation - campaign.claimed);
    }
    
    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }
    
    function isNullifierUsed(uint256 campaignId, bytes32 nullifier) external view returns (bool) {
        return nullifierUsed[campaignId][nullifier];
    }
}
