import { expect } from "chai";
import hre from "hardhat";

// Get network connection and ethers object using top-level await
const { ethers } = await hre.network.connect();

describe("MockUSDC", function () {
  let MockUSDC;
  let mockUSDC;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await mockUSDC.name()).to.equal("Mock USDC");
      expect(await mockUSDC.symbol()).to.equal("USDC");
    });

    it("Should set the correct decimals", async function () {
      expect(await mockUSDC.decimals()).to.equal(6);
    });

    it("Should mint initial supply to deployer", async function () {
      const initialSupply = ethers.parseUnits("1000000", 6); // 1M USDC
      expect(await mockUSDC.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it("Should set correct total supply", async function () {
      const initialSupply = ethers.parseUnits("1000000", 6); // 1M USDC
      expect(await mockUSDC.totalSupply()).to.equal(initialSupply);
    });
  });

  describe("Minting", function () {
    it("Should mint tokens to specified address", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await mockUSDC.mint(user1.address, amount);
      
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should increase total supply when minting", async function () {
      const amount = ethers.parseUnits("1000", 6);
      const initialSupply = await mockUSDC.totalSupply();
      
      await mockUSDC.mint(user1.address, amount);
      
      expect(await mockUSDC.totalSupply()).to.equal(initialSupply + amount);
    });

    it("Should allow anyone to mint (for testing purposes)", async function () {
      const amount = ethers.parseUnits("1000", 6);
      
      await mockUSDC.connect(user1).mint(user2.address, amount);
      
      expect(await mockUSDC.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should mint zero amount without error", async function () {
      const balanceBefore = await mockUSDC.balanceOf(user1.address);
      
      await mockUSDC.mint(user1.address, 0);
      
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(balanceBefore);
    });
  });

  describe("Standard ERC20 Functions", function () {
    beforeEach(async function () {
      // Give user1 some tokens
      await mockUSDC.mint(user1.address, ethers.parseUnits("1000", 6));
    });

    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await mockUSDC.connect(user1).transfer(user2.address, amount);
      
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(ethers.parseUnits("900", 6));
      expect(await mockUSDC.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should fail when trying to transfer more than balance", async function () {
      const amount = ethers.parseUnits("2000", 6); // More than user1's balance
      
      await expect(
        mockUSDC.connect(user1).transfer(user2.address, amount)
      ).to.be.revertedWithCustomError(mockUSDC, "ERC20InsufficientBalance");
    });

    it("Should approve spending allowance", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await mockUSDC.connect(user1).approve(user2.address, amount);
      
      expect(await mockUSDC.allowance(user1.address, user2.address)).to.equal(amount);
    });

    it("Should transfer from with allowance", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await mockUSDC.connect(user1).approve(user2.address, amount);
      await mockUSDC.connect(user2).transferFrom(user1.address, user2.address, amount);
      
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(ethers.parseUnits("900", 6));
      expect(await mockUSDC.balanceOf(user2.address)).to.equal(amount);
      expect(await mockUSDC.allowance(user1.address, user2.address)).to.equal(0);
    });

    it("Should fail transferFrom without sufficient allowance", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await expect(
        mockUSDC.connect(user2).transferFrom(user1.address, user2.address, amount)
      ).to.be.revertedWithCustomError(mockUSDC, "ERC20InsufficientAllowance");
    });

    it("Should emit Transfer event", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await expect(mockUSDC.connect(user1).transfer(user2.address, amount))
        .to.emit(mockUSDC, "Transfer")
        .withArgs(user1.address, user2.address, amount);
    });

    it("Should emit Approval event", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await expect(mockUSDC.connect(user1).approve(user2.address, amount))
        .to.emit(mockUSDC, "Approval")
        .withArgs(user1.address, user2.address, amount);
    });
  });

  describe("Decimal Handling", function () {
    it("Should handle 6 decimal places correctly", async function () {
      // 1 USDC = 1,000,000 units (6 decimals)
      const oneUSDC = ethers.parseUnits("1", 6);
      expect(oneUSDC.toString()).to.equal("1000000");
      
      await mockUSDC.mint(user1.address, oneUSDC);
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(oneUSDC);
    });

    it("Should handle fractional amounts", async function () {
      // 0.5 USDC = 500,000 units
      const halfUSDC = ethers.parseUnits("0.5", 6);
      expect(halfUSDC.toString()).to.equal("500000");
      
      await mockUSDC.mint(user1.address, halfUSDC);
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(halfUSDC);
    });

    it("Should handle minimum unit (1 wei)", async function () {
      const minUnit = 1;
      
      await mockUSDC.mint(user1.address, minUnit);
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(minUnit);
    });
  });

  describe("Large Numbers", function () {
    it("Should handle large amounts", async function () {
      // 1 million USDC
      const largeAmount = ethers.parseUnits("1000000", 6);
      
      await mockUSDC.mint(user1.address, largeAmount);
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(largeAmount);
    });

    it("Should handle large amounts within safe range", async function () {
      // Use a large but safe amount instead of MaxUint256 to avoid overflow
      const largeAmount = ethers.parseUnits("1000000000", 6); // 1 billion USDC
      
      await mockUSDC.mint(user1.address, largeAmount);
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(largeAmount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle transfer to zero address", async function () {
      const amount = ethers.parseUnits("100", 6);
      await mockUSDC.mint(user1.address, amount);
      
      await expect(
        mockUSDC.connect(user1).transfer(ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(mockUSDC, "ERC20InvalidReceiver");
    });

    it("Should not allow approve to zero address", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await expect(
        mockUSDC.connect(user1).approve(ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(mockUSDC, "ERC20InvalidSpender");
    });

    it("Should handle mint to zero address", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await expect(
        mockUSDC.mint(ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(mockUSDC, "ERC20InvalidReceiver");
    });
  });
});