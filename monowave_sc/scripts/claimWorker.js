const { ethers } = require("hardhat");
const fs = require("fs");

// 简化：从本地文件读取一个 proofs.json 列表，执行 claim
// 文件格式示例：[{ batchId, token, account, amount, proof[] }]

async function main() {
  const distAddr = process.env.DIST || "0x3fEC9A964F421E8D1C3a2B4D57E925f9d6e75654";
  const file = process.env.PROOFS_FILE || "./proofs.json";
  const dist = await ethers.getContractAt("Distributor", distAddr);

  if (!fs.existsSync(file)) {
    console.log("No proofs file found:", file);
    return;
  }
  const entries = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Loaded ${entries.length} proofs.`);

  for (const e of entries) {
    try {
      await (await dist.claim(e.batchId, e.token, BigInt(e.amount), e.proof)).wait();
      console.log("claimed:", e.account, e.amount);
    } catch (err) {
      console.log("claim failed:", e.account, err.message || err);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


