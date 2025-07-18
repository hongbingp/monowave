const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AdChainContract", function () {
  let AdChainContract;
  let adChainContract;
  let MockUSDC;
  let mockUSDC;
  let owner;
  let publisher1;
  let publisher2;
  let charger;
  let user;

  beforeEach(async function () {
    [owner, publisher1, publisher2, charger, user] = await ethers.getSigners();

    // Deploy MockUSDC
    MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy AdChainContract
    AdChainContract = await ethers.getContractFactory("AdChainContract");
    adChainContract = await AdChainContract.deploy(mockUSDC.target);
    await adChainContract.waitForDeployment();

    // Set up initial state
    await adChainContract.addAuthorizedCharger(charger.address);
    await adChainContract.registerPublisher(publisher1.address);
    await adChainContract.registerPublisher(publisher2.address);

    // Give some USDC to charger and contract
    await mockUSDC.mint(charger.address, ethers.parseUnits("10000", 6));
    await mockUSDC.mint(adChainContract.target, ethers.parseUnits("10000", 6));
    
    // Approve contract to spend USDC
    await mockUSDC.connect(charger).approve(adChainContract.target, ethers.parseUnits("10000", 6));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await adChainContract.owner()).to.equal(owner.address);
    });

    it("Should set the right stablecoin address", async function () {
      expect(await adChainContract.stablecoin()).to.equal(mockUSDC.target);
    });

    it("Should initialize with zero totals", async function () {
      const stats = await adChainContract.getTotalStats();
      expect(stats._totalCharges).to.equal(0);
      expect(stats._totalDistributed).to.equal(0);
      expect(stats._chargeCounter).to.equal(0);
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to add authorized charger", async function () {
      await adChainContract.addAuthorizedCharger(user.address);
      expect(await adChainContract.authorizedChargers(user.address)).to.be.true;
    });

    it("Should allow owner to remove authorized charger", async function () {
      await adChainContract.addAuthorizedCharger(user.address);
      await adChainContract.removeAuthorizedCharger(user.address);
      expect(await adChainContract.authorizedChargers(user.address)).to.be.false;
    });

    it("Should not allow non-owner to add authorized charger", async function () {
      await expect(
        adChainContract.connect(user).addAuthorizedCharger(user.address)
      ).to.be.revertedWithCustomError(adChainContract, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to register publisher", async function () {
      await adChainContract.registerPublisher(user.address);
      const publisher = await adChainContract.publishers(user.address);
      expect(publisher.walletAddress).to.equal(user.address);
      expect(publisher.isActive).to.be.true;
    });

    it("Should not allow non-owner to register publisher", async function () {
      await expect(
        adChainContract.connect(user).registerPublisher(user.address)
      ).to.be.revertedWithCustomError(adChainContract, "OwnableUnauthorizedAccount");
    });

    it("Should not allow zero address as publisher", async function () {
      await expect(
        adChainContract.registerPublisher(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid publisher address");
    });
  });

  describe("Charging", function () {
    it("Should allow authorized charger to charge", async function () {
      const apiKeyId = 1;
      const amount = ethers.parseEther("1");

      await expect(adChainContract.connect(charger).charge(apiKeyId, amount))
        .to.emit(adChainContract, "ChargeProcessed")
        .withArgs(1, apiKeyId, amount);

      const chargeDetails = await adChainContract.getChargeDetails(1);
      expect(chargeDetails.apiKeyId).to.equal(apiKeyId);
      expect(chargeDetails.amount).to.equal(amount);
      expect(chargeDetails.processed).to.be.false;

      const stats = await adChainContract.getTotalStats();
      expect(stats._totalCharges).to.equal(amount);
      expect(stats._chargeCounter).to.equal(1);
    });

    it("Should not allow unauthorized address to charge", async function () {
      const apiKeyId = 1;
      const amount = ethers.parseEther("1");

      await expect(
        adChainContract.connect(user).charge(apiKeyId, amount)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should not allow zero amount charge", async function () {
      const apiKeyId = 1;
      const amount = 0;

      await expect(
        adChainContract.connect(charger).charge(apiKeyId, amount)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should increment charge counter correctly", async function () {
      const apiKeyId = 1;
      const amount = ethers.parseEther("1");

      await adChainContract.connect(charger).charge(apiKeyId, amount);
      await adChainContract.connect(charger).charge(apiKeyId + 1, amount);

      const stats = await adChainContract.getTotalStats();
      expect(stats._chargeCounter).to.equal(2);
    });
  });

  describe("Distribution", function () {
    beforeEach(async function () {
      // Give USDC to charger for distribution
      await mockUSDC.mint(charger.address, ethers.parseUnits("1000", 6));
      await mockUSDC.connect(charger).approve(adChainContract.target, ethers.parseUnits("1000", 6));
    });

    it("Should distribute to multiple publishers", async function () {
      const publishers = [publisher1.address, publisher2.address];
      const amounts = [
        ethers.parseUnits("100", 6), // 100 USDC
        ethers.parseUnits("200", 6)  // 200 USDC
      ];

      await expect(adChainContract.connect(charger).distribute(publishers, amounts))
        .to.emit(adChainContract, "RevenueDistributed")
        .withArgs(publisher1.address, amounts[0])
        .to.emit(adChainContract, "RevenueDistributed")
        .withArgs(publisher2.address, amounts[1])
        .to.emit(adChainContract, "BatchDistributionCompleted")
        .withArgs(amounts[0] + amounts[1], 2);

      // Check publisher balances
      expect(await mockUSDC.balanceOf(publisher1.address)).to.equal(amounts[0]);
      expect(await mockUSDC.balanceOf(publisher2.address)).to.equal(amounts[1]);

      // Check publisher stats
      const pub1Stats = await adChainContract.getPublisherStats(publisher1.address);
      expect(pub1Stats.totalRevenue).to.equal(amounts[0]);
      expect(pub1Stats.pendingRevenue).to.equal(0);

      const pub2Stats = await adChainContract.getPublisherStats(publisher2.address);
      expect(pub2Stats.totalRevenue).to.equal(amounts[1]);
      expect(pub2Stats.pendingRevenue).to.equal(0);

      // Check total distributed
      const stats = await adChainContract.getTotalStats();
      expect(stats._totalDistributed).to.equal(amounts[0] + amounts[1]);
    });

    it("Should not allow distribution to inactive publisher", async function () {
      await adChainContract.deactivatePublisher(publisher1.address);

      const publishers = [publisher1.address];
      const amounts = [ethers.parseUnits("100", 6)];

      await expect(
        adChainContract.connect(charger).distribute(publishers, amounts)
      ).to.be.revertedWith("Publisher not active");
    });

    it("Should not allow distribution with mismatched array lengths", async function () {
      const publishers = [publisher1.address, publisher2.address];
      const amounts = [ethers.parseUnits("100", 6)]; // Only one amount

      await expect(
        adChainContract.connect(charger).distribute(publishers, amounts)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should not allow distribution with zero amount", async function () {
      const publishers = [publisher1.address];
      const amounts = [0];

      await expect(
        adChainContract.connect(charger).distribute(publishers, amounts)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not allow distribution with empty arrays", async function () {
      const publishers = [];
      const amounts = [];

      await expect(
        adChainContract.connect(charger).distribute(publishers, amounts)
      ).to.be.revertedWith("No publishers provided");
    });

    it("Should not allow unauthorized address to distribute", async function () {
      const publishers = [publisher1.address];
      const amounts = [ethers.parseUnits("100", 6)];

      await expect(
        adChainContract.connect(user).distribute(publishers, amounts)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should handle insufficient allowance", async function () {
      // Set allowance to less than required
      await mockUSDC.connect(charger).approve(adChainContract.target, ethers.parseUnits("50", 6));

      const publishers = [publisher1.address];
      const amounts = [ethers.parseUnits("100", 6)];

      await expect(
        adChainContract.connect(charger).distribute(publishers, amounts)
      ).to.be.revertedWithCustomError(mockUSDC, "ERC20InsufficientAllowance");
    });
  });

  describe("Publisher Management", function () {
    it("Should register publisher correctly", async function () {
      const tx = await adChainContract.registerPublisher(user.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(adChainContract, "PublisherRegistered")
        .withArgs(user.address, block.timestamp);

      const publisher = await adChainContract.publishers(user.address);
      expect(publisher.walletAddress).to.equal(user.address);
      expect(publisher.totalRevenue).to.equal(0);
      expect(publisher.pendingRevenue).to.equal(0);
      expect(publisher.isActive).to.be.true;
    });

    it("Should deactivate publisher", async function () {
      await adChainContract.deactivatePublisher(publisher1.address);

      const publisher = await adChainContract.publishers(publisher1.address);
      expect(publisher.isActive).to.be.false;
    });

    it("Should get publisher stats", async function () {
      const stats = await adChainContract.getPublisherStats(publisher1.address);
      expect(stats.totalRevenue).to.equal(0);
      expect(stats.pendingRevenue).to.equal(0);
      expect(stats.isActive).to.be.true;
    });
  });

  describe("Configuration", function () {
    it("Should allow owner to set stablecoin", async function () {
      const newMockUSDC = await MockUSDC.deploy();
      await newMockUSDC.waitForDeployment();

      await adChainContract.setStablecoin(newMockUSDC.target);
      expect(await adChainContract.stablecoin()).to.equal(newMockUSDC.target);
    });

    it("Should not allow non-owner to set stablecoin", async function () {
      const newMockUSDC = await MockUSDC.deploy();
      await newMockUSDC.waitForDeployment();

      await expect(
        adChainContract.connect(user).setStablecoin(newMockUSDC.target)
      ).to.be.revertedWithCustomError(adChainContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw tokens", async function () {
      const amount = ethers.parseUnits("100", 6);
      await mockUSDC.mint(adChainContract.target, amount);

      const ownerBalanceBefore = await mockUSDC.balanceOf(owner.address);
      await adChainContract.emergencyWithdraw(mockUSDC.target, amount);
      const ownerBalanceAfter = await mockUSDC.balanceOf(owner.address);

      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(amount);
    });

    it("Should allow owner to emergency withdraw ETH", async function () {
      // Send ETH to contract
      await owner.sendTransaction({
        to: adChainContract.target,
        value: ethers.parseEther("1")
      });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await adChainContract.emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("1"));
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Account for gas costs: ownerBalanceAfter + gasUsed should equal ownerBalanceBefore + ETH withdrawn
      expect(ownerBalanceAfter + gasUsed - ownerBalanceBefore).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.01"));
    });

    it("Should not allow non-owner to emergency withdraw", async function () {
      await expect(
        adChainContract.connect(user).emergencyWithdraw(mockUSDC.target, 100)
      ).to.be.revertedWithCustomError(adChainContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("Statistics", function () {
    it("Should return correct total stats", async function () {
      // Add some charges
      await adChainContract.connect(charger).charge(1, ethers.parseEther("1"));
      await adChainContract.connect(charger).charge(2, ethers.parseEther("2"));

      // Add some distributions
      await mockUSDC.connect(charger).approve(adChainContract.target, ethers.parseUnits("300", 6));
      await adChainContract.connect(charger).distribute(
        [publisher1.address],
        [ethers.parseUnits("300", 6)]
      );

      const stats = await adChainContract.getTotalStats();
      expect(stats._totalCharges).to.equal(ethers.parseEther("3"));
      expect(stats._totalDistributed).to.equal(ethers.parseUnits("300", 6));
      expect(stats._chargeCounter).to.equal(2);
    });
  });

  // Helper function to get block timestamp
  async function getBlockTimestamp() {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    return block.timestamp;
  }
});