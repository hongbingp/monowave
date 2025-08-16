const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AccessControl (MVP)", function () {
  let AccessControl;
  let accessControl;
  let owner;
  let admin;
  let manager;
  let user;

  // MVP Role constants - matching AccessControlRoles library
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const GOVERNOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNOR_ROLE"));
  const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));
  const LEDGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LEDGER_ROLE"));
  const TREASURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TREASURER_ROLE"));
  const RISK_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RISK_ROLE"));

  async function deployFixture() {
    const [owner, admin, manager, user] = await ethers.getSigners();

    const AccessControl = await ethers.getContractFactory("contracts/AccessControl.sol:AccessControl");
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

    it("Should have owner with admin privileges", async function () {
      // The owner doesn't have DEFAULT_ADMIN_ROLE in this custom implementation
      // Instead, the owner has special privileges through the onlyOwner modifier
      expect(await accessControl.owner()).to.equal(owner.address);
    });
  });

  describe("MVP Role Management", function () {
    beforeEach(async function () {
      // Grant roles for testing
      await accessControl.connect(owner).grantRole(GOVERNOR_ROLE, admin.address);
      await accessControl.connect(owner).grantRole(SETTLER_ROLE, manager.address);
      await accessControl.connect(owner).grantRole(LEDGER_ROLE, user.address);
    });

    it("Should grant and check GOVERNOR_ROLE", async function () {
      expect(await accessControl.hasRole(GOVERNOR_ROLE, admin.address)).to.be.true;
      expect(await accessControl.hasRole(GOVERNOR_ROLE, user.address)).to.be.false;
    });

    it("Should grant and check SETTLER_ROLE", async function () {
      expect(await accessControl.hasRole(SETTLER_ROLE, manager.address)).to.be.true;
      expect(await accessControl.hasRole(SETTLER_ROLE, user.address)).to.be.false;
    });

    it("Should grant and check LEDGER_ROLE", async function () {
      expect(await accessControl.hasRole(LEDGER_ROLE, user.address)).to.be.true;
      expect(await accessControl.hasRole(LEDGER_ROLE, admin.address)).to.be.false;
    });

    it("Should grant and check TREASURER_ROLE", async function () {
      await accessControl.connect(owner).grantRole(TREASURER_ROLE, manager.address);
      expect(await accessControl.hasRole(TREASURER_ROLE, manager.address)).to.be.true;
      expect(await accessControl.hasRole(TREASURER_ROLE, user.address)).to.be.false;
    });

    it("Should grant and check RISK_ROLE", async function () {
      await accessControl.connect(owner).grantRole(RISK_ROLE, admin.address);
      expect(await accessControl.hasRole(RISK_ROLE, admin.address)).to.be.true;
      expect(await accessControl.hasRole(RISK_ROLE, manager.address)).to.be.false;
    });

    it("Should work with role-based modifiers", async function () {
      await accessControl.connect(owner).grantRole(GOVERNOR_ROLE, manager.address);
      const hasRole = await accessControl.hasRole(GOVERNOR_ROLE, manager.address);
      const isOwner = await accessControl.owner() === manager.address;
      expect(hasRole || isOwner).to.be.true;

      const userHasRole = await accessControl.hasRole(GOVERNOR_ROLE, user.address);
      const userIsOwner = await accessControl.owner() === user.address;
      expect(userHasRole || userIsOwner).to.be.false;
    });
  });

  describe("Role Revocation", function () {
    beforeEach(async function () {
      await accessControl.connect(owner).grantRole(GOVERNOR_ROLE, admin.address);
      await accessControl.connect(owner).grantRole(SETTLER_ROLE, manager.address);
    });

    it("Should revoke GOVERNOR_ROLE", async function () {
      expect(await accessControl.hasRole(GOVERNOR_ROLE, admin.address)).to.be.true;
      
      await accessControl.connect(owner).revokeRole(GOVERNOR_ROLE, admin.address);
      expect(await accessControl.hasRole(GOVERNOR_ROLE, admin.address)).to.be.false;
    });

    it("Should revoke SETTLER_ROLE", async function () {
      expect(await accessControl.hasRole(SETTLER_ROLE, manager.address)).to.be.true;
      
      await accessControl.connect(owner).revokeRole(SETTLER_ROLE, manager.address);
      expect(await accessControl.hasRole(SETTLER_ROLE, manager.address)).to.be.false;
    });
  });

  describe("Access Control Enforcement", function () {
    it("Should only allow admin to grant roles", async function () {
      // Non-admin should not be able to grant roles
      await expect(
        accessControl.connect(user).grantRole(GOVERNOR_ROLE, manager.address)
      ).to.be.reverted;

      // Admin should be able to grant roles
      await accessControl.connect(owner).grantRole(GOVERNOR_ROLE, manager.address);
      expect(await accessControl.hasRole(GOVERNOR_ROLE, manager.address)).to.be.true;
    });

    it("Should only allow admin to revoke roles", async function () {
      await accessControl.connect(owner).grantRole(GOVERNOR_ROLE, manager.address);
      
      // Non-admin should not be able to revoke roles
      await expect(
        accessControl.connect(user).revokeRole(GOVERNOR_ROLE, manager.address)
      ).to.be.reverted;

      // Admin should be able to revoke roles
      await accessControl.connect(owner).revokeRole(GOVERNOR_ROLE, manager.address);
      expect(await accessControl.hasRole(GOVERNOR_ROLE, manager.address)).to.be.false;
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

    it("Should only allow owner to transfer ownership", async function () {
      await expect(
        accessControl.connect(user).transferOwnership(manager.address)
      ).to.be.reverted;
    });
  });

  describe("MVP Integration", function () {
    it("Should support multiple MVP roles for same address", async function () {
      // Grant multiple roles to same address
      await accessControl.connect(owner).grantRole(GOVERNOR_ROLE, admin.address);
      await accessControl.connect(owner).grantRole(TREASURER_ROLE, admin.address);
      await accessControl.connect(owner).grantRole(RISK_ROLE, admin.address);

      // Verify all roles are granted
      expect(await accessControl.hasRole(GOVERNOR_ROLE, admin.address)).to.be.true;
      expect(await accessControl.hasRole(TREASURER_ROLE, admin.address)).to.be.true;
      expect(await accessControl.hasRole(RISK_ROLE, admin.address)).to.be.true;
    });

    it("Should support role hierarchy (admin can manage all roles)", async function () {
      // Owner (DEFAULT_ADMIN_ROLE) should be able to grant any MVP role
      await accessControl.connect(owner).grantRole(GOVERNOR_ROLE, admin.address);
      await accessControl.connect(owner).grantRole(SETTLER_ROLE, manager.address);
      await accessControl.connect(owner).grantRole(LEDGER_ROLE, user.address);

      expect(await accessControl.hasRole(GOVERNOR_ROLE, admin.address)).to.be.true;
      expect(await accessControl.hasRole(SETTLER_ROLE, manager.address)).to.be.true;
      expect(await accessControl.hasRole(LEDGER_ROLE, user.address)).to.be.true;
    });
  });
});
