const { ethers } = require("hardhat");

async function main() {
  const addrs = {
    dist: process.env.DIST || "0x3fEC9A964F421E8D1C3a2B4D57E925f9d6e75654",
    ledger: process.env.LEDGER || "0x322d1ad82664e1b22fA813a0CDfB44c02cbA2832",
  };
  const provider = ethers.provider;
  const dist = await ethers.getContractAt("Distributor", addrs.dist);
  const ledger = await ethers.getContractAt("BatchLedger", addrs.ledger);

  const metrics = { committed:0, opened:0, claimed:0, settled:0, disputed:0, reversed:0 };
  const start = Date.now();
  function report() {
    const s = (Date.now()-start)/1000;
    console.log(`[t+${s.toFixed(1)}s]`, metrics);
  }

  ledger.on("BatchCommitted", () => { metrics.committed++; report(); });
  dist.on("PayoutOpened", () => { metrics.opened++; report(); });
  dist.on("Claimed", () => { metrics.claimed++; if (metrics.claimed%10===0) report(); });
  dist.on("Settled", () => { metrics.settled++; report(); });
  dist.on("Disputed", () => { metrics.disputed++; report(); });
  dist.on("Reversed", () => { metrics.reversed++; report(); });

  console.log("Monitor started. Press Ctrl+C to exit.");
  // keep alive
  await new Promise(() => {});
}

main().catch((e) => { console.error(e); process.exit(1); });


