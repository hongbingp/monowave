import { expect } from "chai";
import hre from "hardhat";

// Get network connection and ethers object using top-level await
const { ethers } = await hre.network.connect();

describe("Distributor - dispute window", function () {
  it("allows dispute within window and reverse adjustments", async function () {
    const [admin, user] = await ethers.getSigners();
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

    const GOVERNOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNOR_ROLE"));
    const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));
    const LEDGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LEDGER_ROLE"));
    await (await access.grantRole(GOVERNOR_ROLE, admin.address)).wait();
    await (await access.grantRole(SETTLER_ROLE, admin.address)).wait();
    await (await access.grantRole(LEDGER_ROLE, admin.address)).wait();
    await (await access.grantRole(SETTLER_ROLE, await dist.getAddress())).wait();

    // commit payout batch with windowEnd in the future
    const batchId = ethers.id("b2");
    const windowEnd = BigInt((await ethers.provider.getBlock("latest")).timestamp + 3600);
    const meta = { token: await usdc.getAddress(), total: 0n, windowEnd, kind: 1 };
    await (await ledger.commitBatch(ethers.id("root"), batchId, meta)).wait();
    await (await dist.openPayout(batchId, ethers.id("root"), await usdc.getAddress())).wait();

    // dispute within window
    await expect(dist.dispute(batchId, ethers.id("reason"))).to.emit(dist, "Disputed");

    // credit some balance first to then reverse
    const TREASURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TREASURER_ROLE"));
    await (await access.grantRole(TREASURER_ROLE, admin.address)).wait();
    // grant SETTLER already granted; directly credit then reverse
    // use escrow.credit via role in Distributor.reverse; grant SETTLER
    const SETTLER = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));
    await (await access.grantRole(SETTLER, admin.address)).wait();
    await (await escrow.credit(user.address, await usdc.getAddress(), 100n, ethers.id("ref"))).wait();

    // reverse some amount
    await expect(dist.reverse(batchId, [user.address], [50n])).to.emit(dist, "Reversed");
  });
});


