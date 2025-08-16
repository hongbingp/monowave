const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenRegistry - limits", function () {
  it("enforces single and daily limits", async function () {
    const [admin, user] = await ethers.getSigners();
    const AccessControl = await ethers.getContractFactory("contracts/AccessControl.sol:AccessControl");
    const access = await AccessControl.deploy(admin.address);
    await access.waitForDeployment();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    const impl = await TokenRegistry.deploy();
    await impl.waitForDeployment();
    const Proxy = await ethers.getContractFactory("ProxyImporter");
    const init = TokenRegistry.interface.encodeFunctionData("initialize", [await access.getAddress()]);
    const proxy = await Proxy.deploy(await impl.getAddress(), init);
    await proxy.waitForDeployment();
    const reg = await ethers.getContractAt("TokenRegistry", await proxy.getAddress());

    const GOVERNOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNOR_ROLE"));
    await (await access.grantRole(GOVERNOR_ROLE, admin.address)).wait();

    await (await reg.allow(await usdc.getAddress(), true)).wait();
    await (await reg.setLimits(await usdc.getAddress(), ethers.parseUnits("5", 6), ethers.parseUnits("8", 6))).wait();

    // single > 5 should fail
    await expect(reg.checkAndConsume(await usdc.getAddress(), user.address, ethers.parseUnits("6", 6)))
      .to.be.revertedWith("TR: exceeds single max");
    // two calls within daily limit 8
    await expect(reg.checkAndConsume(await usdc.getAddress(), user.address, ethers.parseUnits("5", 6))).to.not.be
      .reverted;
    await expect(reg.checkAndConsume(await usdc.getAddress(), user.address, ethers.parseUnits("3", 6))).to.not.be
      .reverted;
    // exceeding daily
    await expect(reg.checkAndConsume(await usdc.getAddress(), user.address, ethers.parseUnits("1", 6)))
      .to.be.revertedWith("TR: exceeds daily max");
  });
});


