const { ethers } = require("hardhat");

function buildTree(leaves) {
  if (!leaves || leaves.length === 0) return { root: ethers.ZeroHash, layers: [leaves] };
  const layers = [leaves.slice()];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i];
      const b = i + 1 < prev.length ? prev[i + 1] : prev[i];
      next.push(a < b ? ethers.keccak256(ethers.concat([a, b])) : ethers.keccak256(ethers.concat([b, a])));
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

function getProof(layers, index) {
  const proof = [];
  let idx = index;
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const pair = idx ^ 1;
    const sib = pair < layer.length ? layer[pair] : layer[idx];
    proof.push(sib);
    idx = Math.floor(idx / 2);
  }
  return proof;
}

module.exports = { buildTree, getProof };


