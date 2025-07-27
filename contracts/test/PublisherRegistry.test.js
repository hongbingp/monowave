const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("PublisherRegistry", function () {
  let AccessControl;
  let PublisherRegistry;
  let accessControl;
  let publisherRegistry;
  let owner;
  let manager;
  let publisher1;
  let publisher2;
  let user;

  const PUBLISHER_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PUBLISHER_MANAGER_ROLE"));

  async function deployFixture() {
    const [owner, manager, publisher1, publisher2, user] = await ethers.getSigners();

    // Deploy AccessControl first
    const AccessControl = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControl.deploy(owner.address);
    await accessControl.waitForDeployment();

    // Deploy PublisherRegistry
    const PublisherRegistry = await ethers.getContractFactory("PublisherRegistry");
    const publisherRegistry = await PublisherRegistry.deploy(await accessControl.getAddress());
    await publisherRegistry.waitForDeployment();

    // Grant publisher manager role to manager
    await accessControl.connect(owner).grantRole(PUBLISHER_MANAGER_ROLE, manager.address);

    return { accessControl, publisherRegistry, owner, manager, publisher1, publisher2, user };
  }

  beforeEach(async function () {
    ({ accessControl, publisherRegistry, owner, manager, publisher1, publisher2, user } = await loadFixture(deployFixture));
  });

  describe("Deployment", function () {
    it("Should start with zero publishers", async function () {
      expect(await publisherRegistry.getPublisherCount()).to.equal(0);
    });

    it("Should start with zero active publishers", async function () {
      expect(await publisherRegistry.getActivePublisherCount()).to.equal(0);
    });
  });

  describe("Publisher Registration", function () {
    const publisherInfo = {
      name: "Test Publisher",
      website: "https://testpublisher.com"
    };

    it("Should register a new publisher", async function () {
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        publisherInfo.name,
        publisherInfo.website
      );

      const stats = await publisherRegistry.getPublisherStats(publisher1.address);
      expect(stats.name).to.equal(publisherInfo.name);
      expect(stats.website).to.equal(publisherInfo.website);
      expect(stats.isActive).to.be.true;
      expect(stats.totalRevenue).to.equal(0);
      expect(stats.pendingRevenue).to.equal(0);
      expect(stats.registeredAt).to.be.gt(0);
    });

    it("Should emit PublisherRegistered event", async function () {
      const tx = await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        publisherInfo.name,
        publisherInfo.website
      );
      
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(publisherRegistry, "PublisherRegistered")
        .withArgs(publisher1.address, publisherInfo.name, publisherInfo.website, block.timestamp);
    });

    it("Should increment publisher count", async function () {
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        publisherInfo.name,
        publisherInfo.website
      );

      expect(await publisherRegistry.getPublisherCount()).to.equal(1);
      expect(await publisherRegistry.getActivePublisherCount()).to.equal(1);
    });

    it("Should not allow non-manager to register publisher", async function () {
      await expect(
        publisherRegistry.connect(user).registerPublisher(
          publisher1.address,
          publisherInfo.name,
          publisherInfo.website
        )
      ).to.be.revertedWith("PublisherRegistry: unauthorized");
    });

    it("Should not register publisher with zero address", async function () {
      await expect(
        publisherRegistry.connect(manager).registerPublisher(
          ethers.ZeroAddress,
          publisherInfo.name,
          publisherInfo.website
        )
      ).to.be.revertedWith("PublisherRegistry: invalid publisher address");
    });

    it("Should not register publisher with empty name", async function () {
      await expect(
        publisherRegistry.connect(manager).registerPublisher(
          publisher1.address,
          "",
          publisherInfo.website
        )
      ).to.be.revertedWith("PublisherRegistry: name cannot be empty");
    });

    it("Should not register duplicate publisher", async function () {
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        publisherInfo.name,
        publisherInfo.website
      );

      await expect(
        publisherRegistry.connect(manager).registerPublisher(
          publisher1.address,
          "Another Publisher",
          "https://another.com"
        )
      ).to.be.revertedWith("PublisherRegistry: publisher already registered");
    });
  });

  describe("Publisher Status Management", function () {
    beforeEach(async function () {
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        "Test Publisher",
        "https://testpublisher.com"
      );
    });

    it("Should deactivate publisher", async function () {
      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);

      const stats = await publisherRegistry.getPublisherStats(publisher1.address);
      expect(stats.isActive).to.be.false;
      expect(await publisherRegistry.getActivePublisherCount()).to.equal(0);
    });

    it("Should emit PublisherDeactivated event", async function () {
      const tx = await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);
      
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(publisherRegistry, "PublisherDeactivated")
        .withArgs(publisher1.address, block.timestamp);
    });

    it("Should reactivate publisher", async function () {
      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);
      await publisherRegistry.connect(manager).reactivatePublisher(publisher1.address);

      const stats = await publisherRegistry.getPublisherStats(publisher1.address);
      expect(stats.isActive).to.be.true;
      expect(await publisherRegistry.getActivePublisherCount()).to.equal(1);
    });

    it("Should emit PublisherReactivated event", async function () {
      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);

      await expect(publisherRegistry.connect(manager).reactivatePublisher(publisher1.address))
        .to.emit(publisherRegistry, "PublisherReactivated")
        .withArgs(publisher1.address, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
    });

    it("Should not allow non-manager to deactivate publisher", async function () {
      await expect(
        publisherRegistry.connect(user).deactivatePublisher(publisher1.address)
      ).to.be.revertedWith("PublisherRegistry: unauthorized");
    });

    it("Should not allow non-manager to reactivate publisher", async function () {
      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);

      await expect(
        publisherRegistry.connect(user).reactivatePublisher(publisher1.address)
      ).to.be.revertedWith("PublisherRegistry: unauthorized");
    });

    it("Should not deactivate non-active publisher", async function () {
      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);

      await expect(
        publisherRegistry.connect(manager).deactivatePublisher(publisher1.address)
      ).to.be.revertedWith("PublisherRegistry: publisher not active");
    });

    it("Should not reactivate already active publisher", async function () {
      await expect(
        publisherRegistry.connect(manager).reactivatePublisher(publisher1.address)
      ).to.be.revertedWith("PublisherRegistry: publisher already active");
    });

    it("Should not reactivate non-existent publisher", async function () {
      await expect(
        publisherRegistry.connect(manager).reactivatePublisher(publisher2.address)
      ).to.be.revertedWith("PublisherRegistry: publisher not found");
    });
  });

  describe("Publisher Information Updates", function () {
    beforeEach(async function () {
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        "Test Publisher",
        "https://testpublisher.com"
      );
    });

    it("Should update publisher information", async function () {
      const newName = "Updated Publisher";
      const newWebsite = "https://updated.com";

      await publisherRegistry.connect(manager).updatePublisher(
        publisher1.address,
        newName,
        newWebsite
      );

      const stats = await publisherRegistry.getPublisherStats(publisher1.address);
      expect(stats.name).to.equal(newName);
      expect(stats.website).to.equal(newWebsite);
    });

    it("Should emit PublisherUpdated event", async function () {
      const newName = "Updated Publisher";
      const newWebsite = "https://updated.com";

      await expect(publisherRegistry.connect(manager).updatePublisher(
        publisher1.address,
        newName,
        newWebsite
      ))
        .to.emit(publisherRegistry, "PublisherUpdated")
        .withArgs(publisher1.address, newName, newWebsite);
    });

    it("Should not allow non-manager to update publisher", async function () {
      await expect(
        publisherRegistry.connect(user).updatePublisher(
          publisher1.address,
          "New Name",
          "https://new.com"
        )
      ).to.be.revertedWith("PublisherRegistry: unauthorized");
    });

    it("Should not update non-existent publisher", async function () {
      await expect(
        publisherRegistry.connect(manager).updatePublisher(
          publisher2.address,
          "New Name",
          "https://new.com"
        )
      ).to.be.revertedWith("PublisherRegistry: publisher not found");
    });

    it("Should not update publisher with empty name", async function () {
      await expect(
        publisherRegistry.connect(manager).updatePublisher(
          publisher1.address,
          "",
          "https://new.com"
        )
      ).to.be.revertedWith("PublisherRegistry: name cannot be empty");
    });
  });

  describe("Publisher Lookup Functions", function () {
    beforeEach(async function () {
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        "Publisher One",
        "https://publisher1.com"
      );
      await publisherRegistry.connect(manager).registerPublisher(
        publisher2.address,
        "Publisher Two",
        "https://publisher2.com"
      );
    });

    it("Should check if address is publisher", async function () {
      expect(await publisherRegistry.isPublisher(publisher1.address)).to.be.true;
      expect(await publisherRegistry.isPublisher(publisher2.address)).to.be.true;
      expect(await publisherRegistry.isPublisher(user.address)).to.be.false;
    });

    it("Should check if publisher is active", async function () {
      expect(await publisherRegistry.isActivePublisher(publisher1.address)).to.be.true;

      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);
      expect(await publisherRegistry.isActivePublisher(publisher1.address)).to.be.false;
    });

    it("Should get all publishers", async function () {
      const allPublishers = await publisherRegistry.getAllPublishers();
      expect(allPublishers.length).to.equal(2);
      expect(allPublishers[0]).to.equal(publisher1.address);
      expect(allPublishers[1]).to.equal(publisher2.address);
    });

    it("Should get active publishers", async function () {
      const activePublishers = await publisherRegistry.getActivePublishers();
      expect(activePublishers.length).to.equal(2);
      expect(activePublishers[0]).to.equal(publisher1.address);
      expect(activePublishers[1]).to.equal(publisher2.address);

      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);
      const activePublishersAfter = await publisherRegistry.getActivePublishers();
      expect(activePublishersAfter.length).to.equal(1);
      expect(activePublishersAfter[0]).to.equal(publisher2.address);
    });

    it("Should handle empty active publishers list", async function () {
      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);
      await publisherRegistry.connect(manager).deactivatePublisher(publisher2.address);

      const activePublishers = await publisherRegistry.getActivePublishers();
      expect(activePublishers.length).to.equal(0);
    });

    it("Should get correct publisher counts", async function () {
      expect(await publisherRegistry.getPublisherCount()).to.equal(2);
      expect(await publisherRegistry.getActivePublisherCount()).to.equal(2);

      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);
      expect(await publisherRegistry.getPublisherCount()).to.equal(2); // Total doesn't change
      expect(await publisherRegistry.getActivePublisherCount()).to.equal(1);
    });
  });

  describe("Publisher Statistics", function () {
    beforeEach(async function () {
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        "Test Publisher",
        "https://testpublisher.com"
      );
    });

    it("Should return correct publisher stats", async function () {
      const stats = await publisherRegistry.getPublisherStats(publisher1.address);
      expect(stats.name).to.equal("Test Publisher");
      expect(stats.website).to.equal("https://testpublisher.com");
      expect(stats.totalRevenue).to.equal(0);
      expect(stats.pendingRevenue).to.equal(0);
      expect(stats.isActive).to.be.true;
      expect(stats.registeredAt).to.be.gt(0);
      expect(stats.lastActivityAt).to.be.gt(0);
    });

    it("Should handle getting stats for non-existent publisher", async function () {
      const stats = await publisherRegistry.getPublisherStats(publisher2.address);
      expect(stats.name).to.equal("");
      expect(stats.website).to.equal("");
      expect(stats.totalRevenue).to.equal(0);
      expect(stats.pendingRevenue).to.equal(0);
      expect(stats.isActive).to.be.false;
      expect(stats.registeredAt).to.equal(0);
      expect(stats.lastActivityAt).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle special characters in strings", async function () {
      const specialName = "Publisher™ & Co. @2024";
      const specialWebsite = "https://special-domain.com/path?param=value";
      
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        specialName,
        specialWebsite
      );

      const stats = await publisherRegistry.getPublisherStats(publisher1.address);
      expect(stats.name).to.equal(specialName);
      expect(stats.website).to.equal(specialWebsite);
    });

    it("Should handle empty website", async function () {
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        "Test Publisher",
        ""
      );

      const stats = await publisherRegistry.getPublisherStats(publisher1.address);
      expect(stats.name).to.equal("Test Publisher");
      expect(stats.website).to.equal("");
    });

    it("Should handle very long strings", async function () {
      const longName = "A".repeat(100);
      const longWebsite = "https://" + "a".repeat(200) + ".com";
      
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        longName,
        longWebsite
      );

      const stats = await publisherRegistry.getPublisherStats(publisher1.address);
      expect(stats.name).to.equal(longName);
      expect(stats.website).to.equal(longWebsite);
    });
  });

  describe("Contract State", function () {
    it("Should maintain correct state after multiple operations", async function () {
      // Register multiple publishers
      await publisherRegistry.connect(manager).registerPublisher(
        publisher1.address,
        "Publisher 1",
        "https://pub1.com"
      );
      
      await publisherRegistry.connect(manager).registerPublisher(
        publisher2.address,
        "Publisher 2",
        "https://pub2.com"
      );

      expect(await publisherRegistry.getPublisherCount()).to.equal(2);
      expect(await publisherRegistry.getActivePublisherCount()).to.equal(2);

      // Deactivate one
      await publisherRegistry.connect(manager).deactivatePublisher(publisher1.address);
      
      expect(await publisherRegistry.getPublisherCount()).to.equal(2); // Total doesn't change
      expect(await publisherRegistry.getActivePublisherCount()).to.equal(1);

      // Update one
      await publisherRegistry.connect(manager).updatePublisher(
        publisher2.address,
        "Updated Publisher 2",
        "https://updated-pub2.com"
      );

      const stats = await publisherRegistry.getPublisherStats(publisher2.address);
      expect(stats.name).to.equal("Updated Publisher 2");
      expect(stats.website).to.equal("https://updated-pub2.com");

      // Reactivate
      await publisherRegistry.connect(manager).reactivatePublisher(publisher1.address);
      expect(await publisherRegistry.getActivePublisherCount()).to.equal(2);
    });
  });
});