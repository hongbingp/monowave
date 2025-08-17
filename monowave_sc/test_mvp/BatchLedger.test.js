import { expect } from "chai";
import hre from "hardhat";

// Get network connection and ethers object using top-level await
const { ethers } = await hre.network.connect();

describe("BatchLedger - idempotent commits", function () {
  it("rejects duplicate batchId", async function () {
    const [admin] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const AccessControl = await ethers.getContractFactory("AccessControl");
    const access = await AccessControl.deploy(admin.address);
    await access.waitForDeployment();

    const BatchLedger = await ethers.getContractFactory("BatchLedger");
    const ledgerImpl = await BatchLedger.deploy();
    await ledgerImpl.waitForDeployment();
    const Proxy = await ethers.getContractFactory("ProxyImporter");
    const init = BatchLedger.interface.encodeFunctionData("initialize", [await access.getAddress()]);
    const proxy = await Proxy.deploy(await ledgerImpl.getAddress(), init);
    await proxy.waitForDeployment();
    const ledger = await ethers.getContractAt("BatchLedger", await proxy.getAddress());

    // grant LEDGER_ROLE
    const LEDGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LEDGER_ROLE"));
    await (await access.grantRole(LEDGER_ROLE, admin.address)).wait();

    const batchId = ethers.id("batch-1");
    const root = ethers.id("root");
    const meta = { token: await usdc.getAddress(), total: 1000n, windowEnd: 0, kind: 0 };
    await expect(ledger.commitBatch(root, batchId, meta)).to.emit(ledger, "BatchCommitted");
    await expect(ledger.commitBatch(root, batchId, meta)).to.be.revertedWith("BL: duplicate batchId");
  });
});


