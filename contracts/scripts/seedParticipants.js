const { ethers } = require("hardhat");

async function main() {
  const prAddr = process.env.PART_REG || "0x4c7d50000f02c6F4F0Afc94D6EFe7EBDf5904765";
  const pr = await ethers.getContractAt("ParticipantRegistry", prAddr);
  const [op] = await ethers.getSigners();
  const ROLE_PUB = 1 << 0;

  const total = parseInt(process.env.SEED_COUNT || "200");
  console.log(`Seeding ${total} publishers from operator ${op.address} ...`);

  for (let i = 0; i < total; i++) {
    const wallet = ethers.Wallet.createRandom();
    const payout = wallet.address; // demo: payout=wallet
    const who = wallet.address;
    await (await pr.register(who, ROLE_PUB, payout, ethers.id(`pub-${i}`))).wait();
    if ((i + 1) % 20 === 0) console.log(`  registered ${i + 1}/${total}`);
  }
  console.log("Done seeding.");
}

main().catch((e) => { console.error(e); process.exit(1); });


