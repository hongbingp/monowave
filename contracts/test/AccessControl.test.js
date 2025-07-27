const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AccessControl", function () {
  let AccessControl;
  let accessControl;
  let owner;
  let admin;
  let manager;
  let user;

  // Role constants - matching those in the contract
  const PUBLISHER_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PUBLISHER_MANAGER_ROLE"));
  const CHARGE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CHARGE_MANAGER_ROLE"));
  const REVENUE_DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REVENUE_DISTRIBUTOR_ROLE"));
  const ADVERTISER_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADVERTISER_MANAGER_ROLE"));
  const AI_SEARCHER_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AI_SEARCHER_MANAGER_ROLE"));
  const PREPAYMENT_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PREPAYMENT_MANAGER_ROLE"));
  const AD_TRANSACTION_RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AD_TRANSACTION_RECORDER_ROLE"));

  async function deployFixture() {
    const [owner, admin, manager, user] = await ethers.getSigners();

    const AccessControl = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControl.deploy(owner.address);
    await accessControl.waitForDeployment();

    return { accessControl, owner, admin, manager, user };
  }

  beforeEach(async function () {
    ({ accessControl, owner, admin, manager, user } = await loadFixture(deployFixture));
  });

  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await accessControl.owner()).to.equal(owner.address);
    });

    it("Should have correct role constants", async function () {
      expect(await accessControl.PUBLISHER_MANAGER_ROLE()).to.equal(PUBLISHER_MANAGER_ROLE);
      expect(await accessControl.CHARGE_MANAGER_ROLE()).to.equal(CHARGE_MANAGER_ROLE);
      expect(await accessControl.REVENUE_DISTRIBUTOR_ROLE()).to.equal(REVENUE_DISTRIBUTOR_ROLE);
      expect(await accessControl.ADVERTISER_MANAGER_ROLE()).to.equal(ADVERTISER_MANAGER_ROLE);
      expect(await accessControl.AI_SEARCHER_MANAGER_ROLE()).to.equal(AI_SEARCHER_MANAGER_ROLE);
      expect(await accessControl.PREPAYMENT_MANAGER_ROLE()).to.equal(PREPAYMENT_MANAGER_ROLE);
      expect(await accessControl.AD_TRANSACTION_RECORDER_ROLE()).to.equal(AD_TRANSACTION_RECORDER_ROLE);
    });
  });

  describe("Role Management", function () {
    it("Should grant role to address", async function () {
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address)).to.be.true;
    });

    it("Should emit RoleGranted event", async function () {
      await expect(accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address))
        .to.emit(accessControl, "RoleGranted")
        .withArgs(PUBLISHER_MANAGER_ROLE, manager.address, owner.address);
    });

    it("Should revoke role from address", async function () {
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      await accessControl.connect(owner).revokeRole(PUBLISHER_MANAGER_ROLE, manager.address);
      
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address)).to.be.false;
    });

    it("Should emit RoleRevoked event", async function () {
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      
      await expect(accessControl.connect(owner).revokeRole(PUBLISHER_MANAGER_ROLE, manager.address))
        .to.emit(accessControl, "RoleRevoked")
        .withArgs(PUBLISHER_MANAGER_ROLE, manager.address, owner.address);
    });

    it("Should not allow non-owner to grant role", async function () {
      await expect(
        accessControl.connect(user).grantRole(PUBLISHER_MANAGER_ROLE, manager.address)
      ).to.be.revertedWithCustomError(accessControl, "OwnableUnauthorizedAccount");
    });

    it("Should not allow non-owner to revoke role", async function () {
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      
      await expect(
        accessControl.connect(user).revokeRole(PUBLISHER_MANAGER_ROLE, manager.address)
      ).to.be.revertedWithCustomError(accessControl, "OwnableUnauthorizedAccount");
    });

    it("Should not grant role to zero address", async function () {
      await expect(
        accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, ethers.ZeroAddress)
      ).to.be.revertedWith("AccessControl: invalid account");
    });

    it("Should handle granting already granted role", async function () {
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      
      // Should not emit event for already granted role
      await expect(accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address))
        .to.not.emit(accessControl, "RoleGranted");
      
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address)).to.be.true;
    });

    it("Should handle revoking already revoked role", async function () {
      // Should not emit event for already revoked role
      await expect(accessControl.connect(owner).revokeRole(PUBLISHER_MANAGER_ROLE, manager.address))
        .to.not.emit(accessControl, "RoleRevoked");
      
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address)).to.be.false;
    });
  });

  describe("Role Queries", function () {
    beforeEach(async function () {
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      await accessControl.connect(owner).grantRole(CHARGE_MANAGER_ROLE, admin.address);
    });

    it("Should check if address has role", async function () {
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address)).to.be.true;
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, user.address)).to.be.false;
    });

    it("Should get role members", async function () {
      const publisherManagers = await accessControl.getRoleMembers(PUBLISHER_MANAGER_ROLE);
      expect(publisherManagers.length).to.equal(1);
      expect(publisherManagers[0]).to.equal(manager.address);

      const chargeManagers = await accessControl.getRoleMembers(CHARGE_MANAGER_ROLE);
      expect(chargeManagers.length).to.equal(1);
      expect(chargeManagers[0]).to.equal(admin.address);
    });

    it("Should get role member count", async function () {
      expect(await accessControl.getRoleMemberCount(PUBLISHER_MANAGER_ROLE)).to.equal(1);
      expect(await accessControl.getRoleMemberCount(CHARGE_MANAGER_ROLE)).to.equal(1);
      expect(await accessControl.getRoleMemberCount(REVENUE_DISTRIBUTOR_ROLE)).to.equal(0);
    });

    it("Should handle empty role", async function () {
      const members = await accessControl.getRoleMembers(REVENUE_DISTRIBUTOR_ROLE);
      expect(members.length).to.equal(0);
      expect(await accessControl.getRoleMemberCount(REVENUE_DISTRIBUTOR_ROLE)).to.equal(0);
    });
  });

  describe("Convenience Role Check Functions", function () {
    beforeEach(async function () {
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      await accessControl.connect(owner).grantRole(CHARGE_MANAGER_ROLE, admin.address);
      await accessControl.connect(owner).grantRole(REVENUE_DISTRIBUTOR_ROLE, user.address);
    });

    it("Should check publisher manager role", async function () {
      expect(await accessControl.isPublisherManager(manager.address)).to.be.true;
      expect(await accessControl.isPublisherManager(user.address)).to.be.false;
    });

    it("Should check charge manager role", async function () {
      expect(await accessControl.isChargeManager(admin.address)).to.be.true;
      expect(await accessControl.isChargeManager(user.address)).to.be.false;
    });

    it("Should check revenue distributor role", async function () {
      expect(await accessControl.isRevenueDistributor(user.address)).to.be.true;
      expect(await accessControl.isRevenueDistributor(manager.address)).to.be.false;
    });

    it("Should check advertiser manager role", async function () {
      expect(await accessControl.isAdvertiserManager(owner.address)).to.be.false;
      
      await accessControl.connect(owner).grantRole(ADVERTISER_MANAGER_ROLE, manager.address);
      expect(await accessControl.isAdvertiserManager(manager.address)).to.be.true;
    });

    it("Should check AI searcher manager role", async function () {
      expect(await accessControl.isAISearcherManager(owner.address)).to.be.false;
      
      await accessControl.connect(owner).grantRole(AI_SEARCHER_MANAGER_ROLE, manager.address);
      expect(await accessControl.isAISearcherManager(manager.address)).to.be.true;
    });

    it("Should check prepayment manager role", async function () {
      expect(await accessControl.isPrepaymentManager(owner.address)).to.be.false;
      
      await accessControl.connect(owner).grantRole(PREPAYMENT_MANAGER_ROLE, manager.address);
      expect(await accessControl.isPrepaymentManager(manager.address)).to.be.true;
    });

    it("Should check ad transaction recorder role", async function () {
      expect(await accessControl.isAdTransactionRecorder(owner.address)).to.be.false;
      
      await accessControl.connect(owner).grantRole(AD_TRANSACTION_RECORDER_ROLE, manager.address);
      expect(await accessControl.isAdTransactionRecorder(manager.address)).to.be.true;
    });
  });

  describe("Ownership Functions", function () {
    it("Should return correct owner", async function () {
      expect(await accessControl.owner()).to.equal(owner.address);
    });

    it("Should transfer ownership", async function () {
      await accessControl.connect(owner).transferOwnership(admin.address);
      
      expect(await accessControl.owner()).to.equal(admin.address);
    });

    it("Should emit OwnershipTransferred event", async function () {
      await expect(accessControl.connect(owner).transferOwnership(admin.address))
        .to.emit(accessControl, "OwnershipTransferred")
        .withArgs(owner.address, admin.address);
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      await expect(
        accessControl.connect(user).transferOwnership(admin.address)
      ).to.be.revertedWithCustomError(accessControl, "OwnableUnauthorizedAccount");
    });

    it("Should not transfer ownership to zero address", async function () {
      await expect(
        accessControl.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(accessControl, "OwnableInvalidOwner");
    });

    it("Should allow new owner to manage roles", async function () {
      await accessControl.connect(owner).transferOwnership(admin.address);
      
      await accessControl.connect(admin).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address)).to.be.true;
    });
  });

  describe("Multiple Role Management", function () {
    it("Should grant multiple roles to same address", async function () {
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      await accessControl.connect(owner).grantRole(CHARGE_MANAGER_ROLE, manager.address);
      await accessControl.connect(owner).grantRole(REVENUE_DISTRIBUTOR_ROLE, manager.address);
      
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address)).to.be.true;
      expect(await accessControl.hasRole(CHARGE_MANAGER_ROLE, manager.address)).to.be.true;
      expect(await accessControl.hasRole(REVENUE_DISTRIBUTOR_ROLE, manager.address)).to.be.true;
    });

    it("Should grant same role to multiple addresses", async function () {
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, admin.address);
      
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address)).to.be.true;
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, admin.address)).to.be.true;

      const members = await accessControl.getRoleMembers(PUBLISHER_MANAGER_ROLE);
      expect(members.length).to.equal(2);
      expect(members).to.include(manager.address);
      expect(members).to.include(admin.address);
    });

    it("Should handle mixed role operations", async function () {
      // Grant multiple roles
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      await accessControl.connect(owner).grantRole(CHARGE_MANAGER_ROLE, manager.address);
      
      // Revoke one role
      await accessControl.connect(owner).revokeRole(PUBLISHER_MANAGER_ROLE, manager.address);
      
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address)).to.be.false;
      expect(await accessControl.hasRole(CHARGE_MANAGER_ROLE, manager.address)).to.be.true;

      // Check role member arrays are updated correctly
      const publisherManagers = await accessControl.getRoleMembers(PUBLISHER_MANAGER_ROLE);
      const chargeManagers = await accessControl.getRoleMembers(CHARGE_MANAGER_ROLE);
      
      expect(publisherManagers.length).to.equal(0);
      expect(chargeManagers.length).to.equal(1);
      expect(chargeManagers[0]).to.equal(manager.address);
    });

    it("Should properly remove from middle of role members array", async function () {
      // Add three members to same role
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, admin.address);
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, user.address);

      let members = await accessControl.getRoleMembers(PUBLISHER_MANAGER_ROLE);
      expect(members.length).to.equal(3);

      // Remove middle member
      await accessControl.connect(owner).revokeRole(PUBLISHER_MANAGER_ROLE, admin.address);

      members = await accessControl.getRoleMembers(PUBLISHER_MANAGER_ROLE);
      expect(members.length).to.equal(2);
      expect(members).to.not.include(admin.address);
      expect(members).to.include(manager.address);
      expect(members).to.include(user.address);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle checking role for zero address", async function () {
      expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, ethers.ZeroAddress)).to.be.false;
    });

    it("Should handle all role constants correctly", async function () {
      const roles = [
        PUBLISHER_MANAGER_ROLE,
        CHARGE_MANAGER_ROLE,
        REVENUE_DISTRIBUTOR_ROLE,
        ADVERTISER_MANAGER_ROLE,
        AI_SEARCHER_MANAGER_ROLE,
        PREPAYMENT_MANAGER_ROLE,
        AD_TRANSACTION_RECORDER_ROLE
      ];

      for (const role of roles) {
        await accessControl.connect(owner).grantRole(role, manager.address);
        expect(await accessControl.hasRole(role, manager.address)).to.be.true;
        
        await accessControl.connect(owner).revokeRole(role, manager.address);
        expect(await accessControl.hasRole(role, manager.address)).to.be.false;
      }
    });

    it("Should handle large number of role members", async function () {
      const accounts = await ethers.getSigners();
      const testAccounts = accounts.slice(0, 10); // Use first 10 accounts

      // Grant role to multiple accounts
      for (const account of testAccounts) {
        await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, account.address);
      }

      expect(await accessControl.getRoleMemberCount(PUBLISHER_MANAGER_ROLE)).to.equal(10);

      const members = await accessControl.getRoleMembers(PUBLISHER_MANAGER_ROLE);
      expect(members.length).to.equal(10);

      // Verify all accounts have the role
      for (const account of testAccounts) {
        expect(await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, account.address)).to.be.true;
        expect(members).to.include(account.address);
      }

      // Remove some members
      for (let i = 0; i < 5; i++) {
        await accessControl.connect(owner).revokeRole(PUBLISHER_MANAGER_ROLE, testAccounts[i].address);
      }

      expect(await accessControl.getRoleMemberCount(PUBLISHER_MANAGER_ROLE)).to.equal(5);
      
      const remainingMembers = await accessControl.getRoleMembers(PUBLISHER_MANAGER_ROLE);
      expect(remainingMembers.length).to.equal(5);
    });
  });

  describe("Integration with Other Contracts", function () {
    it("Should work with role-based modifiers", async function () {
      // This test simulates how other contracts would use the AccessControl
      
      // Grant role
      await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);
      
      // Simulate checking role (as other contracts would do)
      const hasRole = await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, manager.address);
      const isOwner = await accessControl.owner() === manager.address;
      
      // In a real contract, this would be: require(hasRole || isOwner, "unauthorized")
      expect(hasRole || isOwner).to.be.true;
      
      // Test with non-authorized user
      const userHasRole = await accessControl.hasRole(PUBLISHER_MANAGER_ROLE, user.address);
      const userIsOwner = await accessControl.owner() === user.address;
      
      expect(userHasRole || userIsOwner).to.be.false;
    });
  });
});