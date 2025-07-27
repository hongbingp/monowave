const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AdTransactionRecorder", function () {
  let AccessControl;
  let PublisherRegistry;
  let AdvertiserRegistry;
  let AISearcherRegistry;  
  let AdTransactionRecorder;
  let accessControl;
  let publisherRegistry;
  let advertiserRegistry;
  let aiSearcherRegistry;
  let adTransactionRecorder;
  let owner;
  let manager;
  let publisher;
  let advertiser;
  let aiSearcher;
  let user;

  const PUBLISHER_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PUBLISHER_MANAGER_ROLE"));
  const ADVERTISER_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADVERTISER_MANAGER_ROLE"));
  const AI_SEARCHER_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AI_SEARCHER_MANAGER_ROLE"));
  const AD_TRANSACTION_RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AD_TRANSACTION_RECORDER_ROLE"));
  const PREPAYMENT_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PREPAYMENT_MANAGER_ROLE"));

  async function deployFixture() {
    const [owner, manager, publisher, advertiser, aiSearcher, user] = await ethers.getSigners();

    // Deploy AccessControl
    const AccessControl = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControl.deploy(owner.address);
    await accessControl.waitForDeployment();

    // Deploy PublisherRegistry
    const PublisherRegistry = await ethers.getContractFactory("PublisherRegistry");
    const publisherRegistry = await PublisherRegistry.deploy(await accessControl.getAddress());
    await publisherRegistry.waitForDeployment();

    // Deploy AdvertiserRegistry
    const AdvertiserRegistry = await ethers.getContractFactory("AdvertiserRegistry");
    const advertiserRegistry = await AdvertiserRegistry.deploy(await accessControl.getAddress());
    await advertiserRegistry.waitForDeployment();

    // Deploy AISearcherRegistry
    const AISearcherRegistry = await ethers.getContractFactory("AISearcherRegistry");
    const aiSearcherRegistry = await AISearcherRegistry.deploy(await accessControl.getAddress());
    await aiSearcherRegistry.waitForDeployment();

    // Deploy AdTransactionRecorder
    const AdTransactionRecorder = await ethers.getContractFactory("AdTransactionRecorder");
    const adTransactionRecorder = await AdTransactionRecorder.deploy(
      await accessControl.getAddress(),
      await publisherRegistry.getAddress(),
      await advertiserRegistry.getAddress(),
      await aiSearcherRegistry.getAddress()
    );
    await adTransactionRecorder.waitForDeployment();

    // Grant roles to manager
    await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
    await accessControl.connect(owner).grantRole(ADVERTISER_MANAGER_ROLE, manager.address);
    await accessControl.connect(owner).grantRole(AI_SEARCHER_MANAGER_ROLE, manager.address);
    await accessControl.connect(owner).grantRole(AD_TRANSACTION_RECORDER_ROLE, manager.address);
    await accessControl.connect(owner).grantRole(PREPAYMENT_MANAGER_ROLE, manager.address);
    
    // Grant AD_TRANSACTION_RECORDER_ROLE to the AdTransactionRecorder contract itself
    await accessControl.connect(owner).grantRole(AD_TRANSACTION_RECORDER_ROLE, await adTransactionRecorder.getAddress());

    return { 
      accessControl, 
      publisherRegistry, 
      advertiserRegistry, 
      aiSearcherRegistry, 
      adTransactionRecorder, 
      owner, 
      manager, 
      publisher, 
      advertiser, 
      aiSearcher, 
      user 
    };
  }

  beforeEach(async function () {
    ({ 
      accessControl, 
      publisherRegistry, 
      advertiserRegistry, 
      aiSearcherRegistry, 
      adTransactionRecorder, 
      owner, 
      manager, 
      publisher, 
      advertiser, 
      aiSearcher, 
      user 
    } = await loadFixture(deployFixture));
  });

  describe("Deployment", function () {
    it("Should initialize with correct default values", async function () {
      expect(await adTransactionRecorder.transactionCounter()).to.equal(0);
      expect(await adTransactionRecorder.totalTransactionVolume()).to.equal(0);
      expect(await adTransactionRecorder.totalPlatformFees()).to.equal(0);
      expect(await adTransactionRecorder.platformFeeRate()).to.equal(200); // 2%
    });

    it("Should get platform stats correctly", async function () {
      const [transactionCounter, totalVolume, totalFees, feeRate] = await adTransactionRecorder.getPlatformStats();
      expect(transactionCounter).to.equal(0);
      expect(totalVolume).to.equal(0);
      expect(totalFees).to.equal(0);
      expect(feeRate).to.equal(200);
    });
  });

  describe("Platform Fee Management", function () {
    it("Should update platform fee rate", async function () {
      const newFeeRate = 300; // 3%
      
      await adTransactionRecorder.connect(owner).updatePlatformFee(newFeeRate);
      
      expect(await adTransactionRecorder.platformFeeRate()).to.equal(newFeeRate);
    });

    it("Should emit PlatformFeeUpdated event", async function () {
      const newFeeRate = 300;
      
      await expect(adTransactionRecorder.connect(owner).updatePlatformFee(newFeeRate))
        .to.emit(adTransactionRecorder, "PlatformFeeUpdated")
        .withArgs(200, newFeeRate);
    });

    it("Should not allow non-owner to update platform fee", async function () {
      await expect(
        adTransactionRecorder.connect(user).updatePlatformFee(300)
      ).to.be.revertedWith("AdTransactionRecorder: only owner can update platform fee");
    });

    it("Should not allow platform fee above maximum", async function () {
      const maxFee = 1000; // 10%
      
      await expect(
        adTransactionRecorder.connect(owner).updatePlatformFee(maxFee + 1)
      ).to.be.revertedWith("AdTransactionRecorder: fee rate too high");
    });

    it("Should allow platform fee at maximum", async function () {
      const maxFee = 1000; // 10%
      
      await adTransactionRecorder.connect(owner).updatePlatformFee(maxFee);
      expect(await adTransactionRecorder.platformFeeRate()).to.equal(maxFee);
    });
  });

  describe("Ad Transaction Recording", function () {
    beforeEach(async function () {
      // Register participants
      await publisherRegistry.connect(manager).registerPublisher(
        publisher.address,
        "Test Publisher",
        "https://publisher.com"
      );

      await advertiserRegistry.connect(manager).registerAdvertiser(
        advertiser.address,
        "Test Advertiser",
        "https://advertiser.com",
        ["tech", "finance"],
        ethers.parseUnits("10000", 6) // $10,000 credit limit
      );

      await aiSearcherRegistry.connect(manager).registerAISearcher(
        aiSearcher.address,
        "Test AI Searcher",
        "AI powered search service",
        "https://api.aisearcher.com",
        ["raw", "summary"],
        ethers.parseUnits("5000", 6) // $5,000 credit limit
      );

      // Activate participants
      await advertiserRegistry.connect(manager).updateAdvertiserStatus(advertiser.address, "active");
      await aiSearcherRegistry.connect(manager).updateAISearcherStatus(aiSearcher.address, "active");

      // Add escrow balance for advertiser
      await advertiserRegistry.connect(manager).depositEscrow(advertiser.address, ethers.parseUnits("1000", 6));

      // Create a campaign for the advertiser
      const currentTime = Math.floor(Date.now() / 1000);
      await advertiserRegistry.connect(manager).createCampaign(
        advertiser.address,
        "Test Campaign",
        "Test campaign description",
        ethers.parseUnits("500", 6),
        currentTime,
        currentTime + 86400, // 1 day later
        ["tech"],
        ethers.parseUnits("10", 6),
        "https://creative.com/image.jpg",
        "https://landing.com"
      );
    });

    it("Should record ad transaction correctly", async function () {
      const adAmount = ethers.parseUnits("100", 6); // $100
      const campaignId = 1;
      const adId = "ad_12345";
      const transactionType = "impression";

      const tx = await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        campaignId,
        adAmount,
        adId,
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        transactionType
      );

      expect(await adTransactionRecorder.transactionCounter()).to.equal(1);

      // Check transaction details
      const details = await adTransactionRecorder.getAdTransactionDetails(1);
      expect(details.publisher).to.equal(publisher.address);
      expect(details.advertiser).to.equal(advertiser.address);
      expect(details.aiSearcher).to.equal(aiSearcher.address);
      expect(details.campaignId).to.equal(campaignId);
      expect(details.adAmount).to.equal(adAmount);
      expect(details.adId).to.equal(adId);
      expect(details.transactionType).to.equal(transactionType);
      expect(details.settled).to.be.false;
      expect(details.status).to.equal("pending");

      // Check platform fee calculation (2% of $100 = $2)
      const expectedPlatformFee = (adAmount * BigInt(200)) / BigInt(10000);
      expect(details.platformFee).to.equal(expectedPlatformFee);

      // Check revenue shares (70% publisher, 30% AI searcher of remaining $98)
      const remainingAmount = adAmount - expectedPlatformFee;
      const expectedPublisherShare = (remainingAmount * BigInt(70)) / BigInt(100);
      const expectedAISearcherShare = remainingAmount - expectedPublisherShare;
      
      expect(details.publisherShare).to.equal(expectedPublisherShare);
      expect(details.aiSearcherShare).to.equal(expectedAISearcherShare);
    });

    it("Should emit AdTransactionRecorded event", async function () {
      const adAmount = ethers.parseUnits("100", 6);
      const campaignId = 1;
      const adId = "ad_12345";
      const transactionType = "click";

      await expect(adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        campaignId,
        adAmount,
        adId,
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        transactionType
      ))
        .to.emit(adTransactionRecorder, "AdTransactionRecorded")
        .withArgs(1, publisher.address, advertiser.address, aiSearcher.address, campaignId, adAmount, transactionType, adId);
    });

    it("Should update platform statistics", async function () {
      const adAmount = ethers.parseUnits("100", 6);
      const expectedPlatformFee = (adAmount * BigInt(200)) / BigInt(10000);

      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        adAmount,
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      expect(await adTransactionRecorder.totalTransactionVolume()).to.equal(adAmount);
      expect(await adTransactionRecorder.totalPlatformFees()).to.equal(expectedPlatformFee);
    });

    it("Should not allow non-recorder to record transaction", async function () {
      await expect(
        adTransactionRecorder.connect(user).recordAdTransaction(
          publisher.address,
          advertiser.address,
          aiSearcher.address,
          1,
          ethers.parseUnits("100", 6),
          "ad_12345",
          "https://creative.com/image.jpg",
          "https://landing.com",
          "tech enthusiasts",
          "https://content.com",
          "impression"
        )
      ).to.be.revertedWith("AdTransactionRecorder: unauthorized");
    });

    it("Should not allow invalid addresses", async function () {
      const adAmount = ethers.parseUnits("100", 6);

      await expect(
        adTransactionRecorder.connect(manager).recordAdTransaction(
          ethers.ZeroAddress,
          advertiser.address,
          aiSearcher.address,
          1,
          adAmount,
          "ad_12345",
          "https://creative.com/image.jpg",
          "https://landing.com",
          "tech enthusiasts",
          "https://content.com",
          "impression"
        )
      ).to.be.revertedWith("AdTransactionRecorder: invalid publisher address");

      await expect(
        adTransactionRecorder.connect(manager).recordAdTransaction(
          publisher.address,
          ethers.ZeroAddress,
          aiSearcher.address,
          1,
          adAmount,
          "ad_12345",
          "https://creative.com/image.jpg",
          "https://landing.com",
          "tech enthusiasts",
          "https://content.com",
          "impression"
        )
      ).to.be.revertedWith("AdTransactionRecorder: invalid advertiser address");

      await expect(
        adTransactionRecorder.connect(manager).recordAdTransaction(
          publisher.address,
          advertiser.address,
          ethers.ZeroAddress,
          1,
          adAmount,
          "ad_12345",
          "https://creative.com/image.jpg",
          "https://landing.com",
          "tech enthusiasts",
          "https://content.com",
          "impression"
        )
      ).to.be.revertedWith("AdTransactionRecorder: invalid AI searcher address");
    });

    it("Should not allow zero amount", async function () {
      await expect(
        adTransactionRecorder.connect(manager).recordAdTransaction(
          publisher.address,
          advertiser.address,
          aiSearcher.address,
          1,
          0,
          "ad_12345",
          "https://creative.com/image.jpg",
          "https://landing.com",
          "tech enthusiasts",
          "https://content.com",
          "impression"
        )
      ).to.be.revertedWith("AdTransactionRecorder: amount must be greater than 0");
    });

    it("Should not allow empty ad ID", async function () {
      await expect(
        adTransactionRecorder.connect(manager).recordAdTransaction(
          publisher.address,
          advertiser.address,
          aiSearcher.address,
          1,
          ethers.parseUnits("100", 6),
          "",
          "https://creative.com/image.jpg",
          "https://landing.com",
          "tech enthusiasts",
          "https://content.com",
          "impression"
        )
      ).to.be.revertedWith("AdTransactionRecorder: ad ID cannot be empty");
    });

    it("Should not allow inactive participants", async function () {
      // Deactivate publisher
      await publisherRegistry.connect(manager).deactivatePublisher(publisher.address);

      await expect(
        adTransactionRecorder.connect(manager).recordAdTransaction(
          publisher.address,
          advertiser.address,
          aiSearcher.address,
          1,
          ethers.parseUnits("100", 6),
          "ad_12345",
          "https://creative.com/image.jpg",
          "https://landing.com",
          "tech enthusiasts",
          "https://content.com",
          "impression"
        )
      ).to.be.revertedWith("AdTransactionRecorder: publisher not active");
    });
  });

  describe("Transaction Settlement", function () {
    let transactionId;

    beforeEach(async function () {
      // Set up participants
      await publisherRegistry.connect(manager).registerPublisher(
        publisher.address,
        "Test Publisher",
        "https://publisher.com"
      );

      await advertiserRegistry.connect(manager).registerAdvertiser(
        advertiser.address,
        "Test Advertiser",
        "https://advertiser.com",
        ["tech"],
        ethers.parseUnits("10000", 6)
      );

      await aiSearcherRegistry.connect(manager).registerAISearcher(
        aiSearcher.address,
        "Test AI Searcher",
        "AI service",
        "https://api.com",
        ["raw"],
        ethers.parseUnits("5000", 6)
      );

      await advertiserRegistry.connect(manager).updateAdvertiserStatus(advertiser.address, "active");
      await aiSearcherRegistry.connect(manager).updateAISearcherStatus(aiSearcher.address, "active");
      await advertiserRegistry.connect(manager).depositEscrow(advertiser.address, ethers.parseUnits("1000", 6));

      // Create a campaign for the advertiser
      const currentTime = Math.floor(Date.now() / 1000);
      await advertiserRegistry.connect(manager).createCampaign(
        advertiser.address,
        "Test Campaign",
        "Test campaign description",
        ethers.parseUnits("500", 6),
        currentTime,
        currentTime + 86400, // 1 day later
        ["tech"],
        ethers.parseUnits("10", 6),
        "https://creative.com/image.jpg",
        "https://landing.com"
      );

      // Record a transaction
      transactionId = await adTransactionRecorder.connect(manager).recordAdTransaction.staticCall(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );
    });

    it("Should settle transaction correctly", async function () {
      const settlementHash = ethers.keccak256(ethers.toUtf8Bytes("settlement_data"));

      await adTransactionRecorder.connect(manager).settleAdTransaction(transactionId, settlementHash);

      const details = await adTransactionRecorder.getAdTransactionDetails(transactionId);
      expect(details.settled).to.be.true;
      expect(details.status).to.equal("completed");
      expect(details.settlementHash).to.equal(settlementHash);
    });

    it("Should emit AdTransactionSettled event", async function () {
      const settlementHash = ethers.keccak256(ethers.toUtf8Bytes("settlement_data"));

      const details = await adTransactionRecorder.getAdTransactionDetails(transactionId);

      await expect(adTransactionRecorder.connect(manager).settleAdTransaction(transactionId, settlementHash))
        .to.emit(adTransactionRecorder, "AdTransactionSettled")
        .withArgs(transactionId, settlementHash, details.publisherShare, details.aiSearcherShare, details.platformFee);
    });

    it("Should not allow settling invalid transaction ID", async function () {
      const settlementHash = ethers.keccak256(ethers.toUtf8Bytes("settlement_data"));

      await expect(
        adTransactionRecorder.connect(manager).settleAdTransaction(999, settlementHash)
      ).to.be.revertedWith("AdTransactionRecorder: invalid transaction ID");
    });

    it("Should not allow settling already settled transaction", async function () {
      const settlementHash = ethers.keccak256(ethers.toUtf8Bytes("settlement_data"));

      await adTransactionRecorder.connect(manager).settleAdTransaction(transactionId, settlementHash);

      await expect(
        adTransactionRecorder.connect(manager).settleAdTransaction(transactionId, settlementHash)
      ).to.be.revertedWith("AdTransactionRecorder: transaction already settled");
    });

    it("Should not allow non-recorder to settle transaction", async function () {
      const settlementHash = ethers.keccak256(ethers.toUtf8Bytes("settlement_data"));

      await expect(
        adTransactionRecorder.connect(user).settleAdTransaction(transactionId, settlementHash)
      ).to.be.revertedWith("AdTransactionRecorder: unauthorized");
    });
  });

  describe("Transaction Status Management", function () {
    let transactionId;

    beforeEach(async function () {
      // Set up participants and record transaction
      await publisherRegistry.connect(manager).registerPublisher(
        publisher.address,
        "Test Publisher",
        "https://publisher.com"
      );

      await advertiserRegistry.connect(manager).registerAdvertiser(
        advertiser.address,
        "Test Advertiser",
        "https://advertiser.com",
        ["tech"],
        ethers.parseUnits("10000", 6)
      );

      await aiSearcherRegistry.connect(manager).registerAISearcher(
        aiSearcher.address,
        "Test AI Searcher",
        "AI service",
        "https://api.com",
        ["raw"],
        ethers.parseUnits("5000", 6)
      );

      await advertiserRegistry.connect(manager).updateAdvertiserStatus(advertiser.address, "active");
      await aiSearcherRegistry.connect(manager).updateAISearcherStatus(aiSearcher.address, "active");
      await advertiserRegistry.connect(manager).depositEscrow(advertiser.address, ethers.parseUnits("1000", 6));

      // Create a campaign for the advertiser
      const currentTime = Math.floor(Date.now() / 1000);
      await advertiserRegistry.connect(manager).createCampaign(
        advertiser.address,
        "Test Campaign",
        "Test campaign description",
        ethers.parseUnits("500", 6),
        currentTime,
        currentTime + 86400, // 1 day later
        ["tech"],
        ethers.parseUnits("10", 6),
        "https://creative.com/image.jpg",
        "https://landing.com"
      );

      transactionId = await adTransactionRecorder.connect(manager).recordAdTransaction.staticCall(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );
    });

    it("Should update transaction status", async function () {
      await adTransactionRecorder.connect(manager).updateTransactionStatus(
        transactionId,
        "processing",
        "Transaction is being processed"
      );

      const details = await adTransactionRecorder.getAdTransactionDetails(transactionId);
      expect(details.status).to.equal("processing");
    });

    it("Should emit AdTransactionStatusChanged event", async function () {
      await expect(adTransactionRecorder.connect(manager).updateTransactionStatus(
        transactionId,
        "processing",
        "Transaction is being processed"
      ))
        .to.emit(adTransactionRecorder, "AdTransactionStatusChanged")
        .withArgs(transactionId, "pending", "processing", "Transaction is being processed");
    });

    it("Should not allow non-recorder to update status", async function () {
      await expect(
        adTransactionRecorder.connect(user).updateTransactionStatus(
          transactionId,
          "processing",
          "Transaction is being processed"
        )
      ).to.be.revertedWith("AdTransactionRecorder: unauthorized");
    });

    it("Should allow participant to dispute transaction", async function () {
      await adTransactionRecorder.connect(publisher).disputeTransaction(
        transactionId,
        "Ad content was not displayed correctly"
      );

      const details = await adTransactionRecorder.getAdTransactionDetails(transactionId);
      expect(details.status).to.equal("disputed");
    });

    it("Should emit event when transaction is disputed", async function () {
      await expect(adTransactionRecorder.connect(advertiser).disputeTransaction(
        transactionId,
        "Publisher did not meet requirements"
      ))
        .to.emit(adTransactionRecorder, "AdTransactionStatusChanged")
        .withArgs(transactionId, "pending", "disputed", "Publisher did not meet requirements");
    });

    it("Should not allow unauthorized user to dispute", async function () {
      await expect(
        adTransactionRecorder.connect(user).disputeTransaction(
          transactionId,
          "Some reason"
        )
      ).to.be.revertedWith("AdTransactionRecorder: unauthorized to dispute");
    });
  });

  describe("Transaction Queries", function () {
    beforeEach(async function () {
      // Set up participants
      await publisherRegistry.connect(manager).registerPublisher(
        publisher.address,
        "Test Publisher",
        "https://publisher.com"
      );

      await advertiserRegistry.connect(manager).registerAdvertiser(
        advertiser.address,
        "Test Advertiser",
        "https://advertiser.com",
        ["tech"],
        ethers.parseUnits("10000", 6)
      );

      await aiSearcherRegistry.connect(manager).registerAISearcher(
        aiSearcher.address,
        "Test AI Searcher",
        "AI service",
        "https://api.com",
        ["raw"],
        ethers.parseUnits("5000", 6)
      );

      await advertiserRegistry.connect(manager).updateAdvertiserStatus(advertiser.address, "active");
      await aiSearcherRegistry.connect(manager).updateAISearcherStatus(aiSearcher.address, "active");
      await advertiserRegistry.connect(manager).depositEscrow(advertiser.address, ethers.parseUnits("1000", 6));

      // Create campaigns for the advertiser
      const currentTime = Math.floor(Date.now() / 1000);
      await advertiserRegistry.connect(manager).createCampaign(
        advertiser.address,
        "Test Campaign 1",
        "Test campaign description 1",
        ethers.parseUnits("500", 6),
        currentTime,
        currentTime + 86400, // 1 day later
        ["tech"],
        ethers.parseUnits("10", 6),
        "https://creative.com/image.jpg",
        "https://landing.com"
      );

      await advertiserRegistry.connect(manager).createCampaign(
        advertiser.address,
        "Test Campaign 2",
        "Test campaign description 2",
        ethers.parseUnits("300", 6),
        currentTime,
        currentTime + 86400, // 1 day later
        ["finance"],
        ethers.parseUnits("8", 6),
        "https://creative.com/banner.jpg",
        "https://landing2.com"
      );

      // Record multiple transactions
      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        2,
        ethers.parseUnits("50", 6),
        "ad_67890",
        "https://creative.com/banner.jpg",
        "https://landing2.com",
        "finance professionals",
        "https://content2.com",
        "click"
      );
    });

    it("Should get entity transactions for publisher", async function () {
      const publisherTransactions = await adTransactionRecorder.getEntityTransactions(
        publisher.address,
        "publisher"
      );
      expect(publisherTransactions.length).to.equal(2);
      expect(publisherTransactions[0]).to.equal(1);
      expect(publisherTransactions[1]).to.equal(2);
    });

    it("Should get entity transactions for advertiser", async function () {
      const advertiserTransactions = await adTransactionRecorder.getEntityTransactions(
        advertiser.address,
        "advertiser"
      );
      expect(advertiserTransactions.length).to.equal(2);
    });

    it("Should get entity transactions for AI searcher", async function () {
      const aiTransactions = await adTransactionRecorder.getEntityTransactions(
        aiSearcher.address,
        "ai_searcher"
      );
      expect(aiTransactions.length).to.equal(2);
    });

    it("Should get campaign transactions", async function () {
      const campaignTransactions = await adTransactionRecorder.getCampaignTransactions(1);
      expect(campaignTransactions.length).to.equal(1);
      expect(campaignTransactions[0]).to.equal(1);
    });

    it("Should get ad ID transactions", async function () {
      const adTransactions = await adTransactionRecorder.getAdIdTransactions("ad_12345");
      expect(adTransactions.length).to.equal(1);
      expect(adTransactions[0]).to.equal(1);
    });

    it("Should revert for invalid entity type", async function () {
      await expect(
        adTransactionRecorder.getEntityTransactions(publisher.address, "invalid")
      ).to.be.revertedWith("AdTransactionRecorder: invalid entity type");
    });

    it("Should handle invalid transaction ID", async function () {
      await expect(
        adTransactionRecorder.getAdTransactionDetails(999)
      ).to.be.revertedWith("AdTransactionRecorder: invalid transaction ID");
    });
  });

  describe("Metrics and Analytics", function () {
    beforeEach(async function () {
      // Set up participants
      await publisherRegistry.connect(manager).registerPublisher(
        publisher.address,
        "Test Publisher",
        "https://publisher.com"
      );

      await advertiserRegistry.connect(manager).registerAdvertiser(
        advertiser.address,
        "Test Advertiser",
        "https://advertiser.com",
        ["tech"],
        ethers.parseUnits("10000", 6)
      );

      await aiSearcherRegistry.connect(manager).registerAISearcher(
        aiSearcher.address,
        "Test AI Searcher",
        "AI service",
        "https://api.com",
        ["raw"],
        ethers.parseUnits("5000", 6)
      );

      await advertiserRegistry.connect(manager).updateAdvertiserStatus(advertiser.address, "active");
      await aiSearcherRegistry.connect(manager).updateAISearcherStatus(aiSearcher.address, "active");
      await advertiserRegistry.connect(manager).depositEscrow(advertiser.address, ethers.parseUnits("1000", 6));

      // Create a campaign for the advertiser
      const currentTime = Math.floor(Date.now() / 1000);
      await advertiserRegistry.connect(manager).createCampaign(
        advertiser.address,
        "Test Campaign",
        "Test campaign description",
        ethers.parseUnits("500", 6),
        currentTime,
        currentTime + 86400, // 1 day later
        ["tech"],
        ethers.parseUnits("10", 6),
        "https://creative.com/image.jpg",
        "https://landing.com"
      );
    });

    it("Should track impression metrics correctly", async function () {
      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      const publisherMetrics = await adTransactionRecorder.getEntityMetrics(publisher.address, "publisher");
      expect(publisherMetrics.impressions).to.equal(1);
      expect(publisherMetrics.clicks).to.equal(0);
      expect(publisherMetrics.conversions).to.equal(0);
      expect(publisherMetrics.totalRevenue).to.equal(ethers.parseUnits("100", 6));

      const advertiserMetrics = await adTransactionRecorder.getEntityMetrics(advertiser.address, "advertiser");
      expect(advertiserMetrics.impressions).to.equal(1);
      expect(advertiserMetrics.totalRevenue).to.equal(ethers.parseUnits("100", 6));
    });

    it("Should track click metrics correctly", async function () {
      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("50", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "click"
      );

      const publisherMetrics = await adTransactionRecorder.getEntityMetrics(publisher.address, "publisher");
      expect(publisherMetrics.clicks).to.equal(1);
      expect(publisherMetrics.averageCPC).to.equal(ethers.parseUnits("50", 6));
    });

    it("Should track conversion metrics correctly", async function () {
      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("200", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "conversion"
      );

      const publisherMetrics = await adTransactionRecorder.getEntityMetrics(publisher.address, "publisher");
      expect(publisherMetrics.conversions).to.equal(1);
      expect(publisherMetrics.averageCPA).to.equal(ethers.parseUnits("200", 6));
    });

    it("Should get campaign metrics", async function () {
      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      const campaignMetrics = await adTransactionRecorder.getCampaignMetrics(1);
      expect(campaignMetrics.impressions).to.equal(1);
      expect(campaignMetrics.totalRevenue).to.equal(ethers.parseUnits("100", 6));
    });

    it("Should emit MetricsUpdated events", async function () {
      await expect(adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      ))
        .to.emit(adTransactionRecorder, "MetricsUpdated")
        .withArgs(publisher.address, "publisher", 1, 0, 0, ethers.parseUnits("100", 6))
        .to.emit(adTransactionRecorder, "MetricsUpdated")
        .withArgs(advertiser.address, "advertiser", 1, 0, 0, ethers.parseUnits("100", 6));
    });

    it("Should calculate CPM correctly for multiple impressions", async function () {
      // Record multiple impression transactions
      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("200", 6),
        "ad_67890",
        "https://creative.com/image2.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      const publisherMetrics = await adTransactionRecorder.getEntityMetrics(publisher.address, "publisher");
      expect(publisherMetrics.impressions).to.equal(2);
      expect(publisherMetrics.totalRevenue).to.equal(ethers.parseUnits("300", 6));
      
      // CPM = (totalRevenue * 1000) / impressions = (300 * 1000) / 2 = 150,000
      const expectedCPM = (ethers.parseUnits("300", 6) * BigInt(1000)) / BigInt(2);
      expect(publisherMetrics.averageCPM).to.equal(expectedCPM);
    });

    it("Should revert for invalid entity type in metrics", async function () {
      await expect(
        adTransactionRecorder.getEntityMetrics(publisher.address, "invalid")
      ).to.be.revertedWith("AdTransactionRecorder: invalid entity type");
    });
  });

  describe("Edge Cases", function () {
    beforeEach(async function () {
      // Set up participants
      await publisherRegistry.connect(manager).registerPublisher(
        publisher.address,
        "Test Publisher",
        "https://publisher.com"
      );

      await advertiserRegistry.connect(manager).registerAdvertiser(
        advertiser.address,
        "Test Advertiser",
        "https://advertiser.com",
        ["tech"],
        ethers.parseUnits("10000", 6)
      );

      await aiSearcherRegistry.connect(manager).registerAISearcher(
        aiSearcher.address,
        "Test AI Searcher",
        "AI service",
        "https://api.com",
        ["raw"],
        ethers.parseUnits("5000", 6)
      );

      await advertiserRegistry.connect(manager).updateAdvertiserStatus(advertiser.address, "active");
      await aiSearcherRegistry.connect(manager).updateAISearcherStatus(aiSearcher.address, "active");
      await advertiserRegistry.connect(manager).depositEscrow(advertiser.address, ethers.parseUnits("1000", 6));

      // Create a campaign for the advertiser
      const currentTime = Math.floor(Date.now() / 1000);
      await advertiserRegistry.connect(manager).createCampaign(
        advertiser.address,
        "Test Campaign",
        "Test campaign description",
        ethers.parseUnits("500", 6),
        currentTime,
        currentTime + 86400, // 1 day later
        ["tech"],
        ethers.parseUnits("10", 6),
        "https://creative.com/image.jpg",
        "https://landing.com"
      );
    });

    it("Should handle zero platform fee", async function () {
      await adTransactionRecorder.connect(owner).updatePlatformFee(0);

      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        ethers.parseUnits("100", 6),
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      const details = await adTransactionRecorder.getAdTransactionDetails(1);
      expect(details.platformFee).to.equal(0);
      expect(details.publisherShare + details.aiSearcherShare).to.equal(ethers.parseUnits("100", 6));
    });

    it("Should handle fractional amounts in revenue distribution", async function () {
      // Use an amount that doesn't divide evenly
      const oddAmount = ethers.parseUnits("100.000001", 6);

      await adTransactionRecorder.connect(manager).recordAdTransaction(
        publisher.address,
        advertiser.address,
        aiSearcher.address,
        1,
        oddAmount,
        "ad_12345",
        "https://creative.com/image.jpg",
        "https://landing.com",
        "tech enthusiasts",
        "https://content.com",
        "impression"
      );

      const details = await adTransactionRecorder.getAdTransactionDetails(1);
      
      // Verify the amounts add up correctly
      expect(details.publisherShare + details.aiSearcherShare + details.platformFee).to.equal(oddAmount);
    });

    it("Should handle empty arrays for non-existent entities", async function () {
      const nonExistentTransactions = await adTransactionRecorder.getEntityTransactions(
        user.address,
        "publisher"
      );
      expect(nonExistentTransactions.length).to.equal(0);

      const nonExistentCampaign = await adTransactionRecorder.getCampaignTransactions(999);
      expect(nonExistentCampaign.length).to.equal(0);

      const nonExistentAdId = await adTransactionRecorder.getAdIdTransactions("nonexistent_ad");
      expect(nonExistentAdId.length).to.equal(0);
    });

    it("Should handle metrics for entities with no transactions", async function () {
      const emptyMetrics = await adTransactionRecorder.getEntityMetrics(user.address, "publisher");
      expect(emptyMetrics.impressions).to.equal(0);
      expect(emptyMetrics.clicks).to.equal(0);
      expect(emptyMetrics.conversions).to.equal(0);
      expect(emptyMetrics.totalRevenue).to.equal(0);
      expect(emptyMetrics.averageCPM).to.equal(0);
      expect(emptyMetrics.averageCPC).to.equal(0);
      expect(emptyMetrics.averageCPA).to.equal(0);
    });
  });
});