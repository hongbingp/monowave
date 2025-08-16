const { ethers, run } = require("hardhat");

const EIP1967_IMPL_SLOT = "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";

async function getImpl(proxy) {
  const provider = (await ethers.getSigners())[0].provider;
  const raw = await provider.getStorage(proxy, EIP1967_IMPL_SLOT);
  return ethers.getAddress("0x" + raw.slice(26));
}

async function main() {
  const addrs = {
    access: process.env.ACCESS || "0x7F5100B88e0E55D7D2b22844fC8cC80aadeEEF82",
    tokenRegistry: process.env.TOKEN_REG || "0x7dA2b55BBAd825177c9d978dD6bbeaB085e0BF99",
    participantRegistry: process.env.PART_REG || "0x4c7d50000f02c6F4F0Afc94D6EFe7EBDf5904765",
    batchLedger: process.env.LEDGER || "0x322d1ad82664e1b22fA813a0CDfB44c02cbA2832",
    escrow: process.env.ESCROW || "0xb54b32AC2Ef06E5bD4E03121D0023d5d41BC63fA",
    distributor: process.env.DIST || "0x3fEC9A964F421E8D1C3a2B4D57E925f9d6e75654",
    usdc: process.env.USDC || "0x1cF6f62197703876C13AD64039A3dFC5cB5839F8",
  };

  // 1) Verify non-proxy contracts
  console.log("Verifying AccessControl...");
  const [deployer] = await ethers.getSigners();
  await run("verify:verify", { address: addrs.access, constructorArguments: [deployer.address] });

  console.log("Verifying MockUSDC...");
  await run("verify:verify", { address: addrs.usdc });

  // 2) Compute init data for proxies
  const AccessControl = await ethers.getContractAt("contracts/AccessControl.sol:AccessControl", addrs.access);
  const acAddr = AccessControl.target;

  const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
  const initTR = TokenRegistry.interface.encodeFunctionData("initialize", [acAddr]);

  const ParticipantRegistry = await ethers.getContractFactory("ParticipantRegistry");
  const initPR = ParticipantRegistry.interface.encodeFunctionData("initialize", [acAddr]);

  const BatchLedger = await ethers.getContractFactory("BatchLedger");
  const initBL = BatchLedger.interface.encodeFunctionData("initialize", [acAddr]);

  const Escrow = await ethers.getContractFactory("Escrow");
  const initESC = Escrow.interface.encodeFunctionData("initialize", [acAddr, addrs.tokenRegistry]);

  const Distributor = await ethers.getContractFactory("Distributor");
  const initDIST = Distributor.interface.encodeFunctionData("initialize", [acAddr, addrs.batchLedger, addrs.escrow]);

  // 3) Read implementation addresses
  const implTR = await getImpl(addrs.tokenRegistry);
  const implPR = await getImpl(addrs.participantRegistry);
  const implBL = await getImpl(addrs.batchLedger);
  const implESC = await getImpl(addrs.escrow);
  const implDIST = await getImpl(addrs.distributor);

  // 4) Verify implementations
  console.log("Verifying implementations...");
  for (const a of [implTR, implPR, implBL, implESC, implDIST]) {
    try { await run("verify:verify", { address: a }); } catch (e) { console.log("impl verify skip:", a, e.message || e); }
  }

  // 5) Verify proxies (ERC1967Proxy)
  console.log("Verifying proxies...");
  const fq = "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy";
  try { await run("verify:verify", { address: addrs.tokenRegistry, constructorArguments: [implTR, initTR], contract: fq }); } catch(e){ console.log("proxy TR skip", e.message||e); }
  try { await run("verify:verify", { address: addrs.participantRegistry, constructorArguments: [implPR, initPR], contract: fq }); } catch(e){ console.log("proxy PR skip", e.message||e); }
  try { await run("verify:verify", { address: addrs.batchLedger, constructorArguments: [implBL, initBL], contract: fq }); } catch(e){ console.log("proxy BL skip", e.message||e); }
  try { await run("verify:verify", { address: addrs.escrow, constructorArguments: [implESC, initESC], contract: fq }); } catch(e){ console.log("proxy ESC skip", e.message||e); }
  try { await run("verify:verify", { address: addrs.distributor, constructorArguments: [implDIST, initDIST], contract: fq }); } catch(e){ console.log("proxy DIST skip", e.message||e); }

  console.log("All verification tasks submitted.");
}

main().catch((e) => { console.error(e); process.exit(1); });


