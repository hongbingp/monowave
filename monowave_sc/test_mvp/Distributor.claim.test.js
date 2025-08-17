import { expect } from "chai";
import hre from "hardhat";

// Get network connection and ethers object using top-level await
const { ethers } = await hre.network.connect();

function merkleRoot(leaves) {
  // Very small helper building a balanced pairwise hash tree
  let level = leaves.map((x) => x);
  if (level.length === 0) return ethers.ZeroHash;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(a < b ? ethers.keccak256(ethers.concat([a, b])) : ethers.keccak256(ethers.concat([b, a])));
    }
    level = next;
  }
  return level[0];
}

function merkleProof(leaves, index) {
  const proof = [];
  let idx = index;
  let level = leaves.slice();
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = i + 1 < level.length ? level[i + 1] : level[i];
      if (i === idx || i + 1 === idx) {
        proof.push(i === idx ? b : a);
        idx = Math.floor(i / 2);
      }
      next.push(a < b ? ethers.keccak256(ethers.concat([a, b])) : ethers.keccak256(ethers.concat([b, a])));
    }
    level = next;
  }
  return proof;
}

describe("Distributor - claim bitmap & dispute window", function () {
  it("prevents double-claim and enforces window before settle", async function () {
    const [admin, userA, userB] = await ethers.getSigners();
    const AccessControl = await ethers.getContractFactory("AccessControl");
    const access = await AccessControl.deploy(admin.address);
    await access.waitForDeployment();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    const tokenRegImpl = await TokenRegistry.deploy();
    await tokenRegImpl.waitForDeployment();
    const Proxy = await ethers.getContractFactory("ProxyImporter");
    const initTR = TokenRegistry.interface.encodeFunctionData("initialize", [await access.getAddress()]);
    const trProxy = await Proxy.deploy(await tokenRegImpl.getAddress(), initTR);
    await trProxy.waitForDeployment();
    const tokenReg = await ethers.getContractAt("TokenRegistry", await trProxy.getAddress());
    await (await tokenReg.allow(await usdc.getAddress(), true)).wait();

    const BatchLedger = await ethers.getContractFactory("BatchLedger");
    const ledgerImpl = await BatchLedger.deploy();
    await ledgerImpl.waitForDeployment();
    const initBL = BatchLedger.interface.encodeFunctionData("initialize", [await access.getAddress()]);
    const blProxy = await Proxy.deploy(await ledgerImpl.getAddress(), initBL);
    await blProxy.waitForDeployment();
    const ledger = await ethers.getContractAt("BatchLedger", await blProxy.getAddress());

    const Escrow = await ethers.getContractFactory("Escrow");
    const escrowImpl = await Escrow.deploy();
    await escrowImpl.waitForDeployment();
    const initEsc = Escrow.interface.encodeFunctionData("initialize", [await access.getAddress(), await tokenReg.getAddress()]);
    const escProxy = await Proxy.deploy(await escrowImpl.getAddress(), initEsc);
    await escProxy.waitForDeployment();
    const escrow = await ethers.getContractAt("Escrow", await escProxy.getAddress());

    const Distributor = await ethers.getContractFactory("Distributor");
    const distImpl = await Distributor.deploy();
    await distImpl.waitForDeployment();
    const initDist = Distributor.interface.encodeFunctionData("initialize", [await access.getAddress(), await ledger.getAddress(), await escrow.getAddress()]);
    const distProxy = await Proxy.deploy(await distImpl.getAddress(), initDist);
    await distProxy.waitForDeployment();
    const dist = await ethers.getContractAt("Distributor", await distProxy.getAddress());

    // grant roles
    const GOVERNOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNOR_ROLE"));
    const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));
    const LEDGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LEDGER_ROLE"));
    await (await access.grantRole(GOVERNOR_ROLE, admin.address)).wait();
    await (await access.grantRole(SETTLER_ROLE, admin.address)).wait();
    await (await access.grantRole(LEDGER_ROLE, admin.address)).wait();
    // grant SETTLER to distributor so it can credit escrow during claim
    await (await access.grantRole(SETTLER_ROLE, await dist.getAddress())).wait();

    // commit a payout batch
    const batchId = ethers.id("b1");
    const windowEnd = BigInt((await ethers.provider.getBlock("latest")).timestamp + 3600);
    const meta = { token: await usdc.getAddress(), total: 0n, windowEnd, kind: 1 }; // Payout
    await (await ledger.commitBatch(ethers.id("root-placeholder"), batchId, meta)).wait();

    // prepare leaves for userA and userB
    const aAmount = ethers.parseUnits("10", 6);
    const bAmount = ethers.parseUnits("20", 6);
    const leafA = ethers.keccak256(ethers.solidityPacked(["address", "address", "uint256"], [userA.address, await usdc.getAddress(), aAmount]));
    const leafB = ethers.keccak256(ethers.solidityPacked(["address", "address", "uint256"], [userB.address, await usdc.getAddress(), bAmount]));
    const leaves = [leafA, leafB];
    const root = merkleRoot(leaves);
    await (await dist.openPayout(batchId, root, await usdc.getAddress())).wait();

    // userA claims
    const proofA = merkleProof(leaves, 0);
    await expect(dist.connect(userA).claim(batchId, await usdc.getAddress(), aAmount, proofA)).to.emit(dist, "Claimed");
    // second claim should fail
    await expect(dist.connect(userA).claim(batchId, await usdc.getAddress(), aAmount, proofA)).to.be.revertedWith("Dist: already claimed");

    // settle is only allowed after windowEnd
    await expect(dist.settle(batchId)).to.be.revertedWith("Dist: window not ended");
  });
});


