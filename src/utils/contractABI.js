import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load contract ABIs
const loadContractABI = (contractName) => {
  const contractPath = path.resolve(__dirname, `../../monowave_sc/artifacts/monowave_sc/contracts/${contractName}.sol/${contractName}.json`);
  try {
    const artifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    return artifact.abi;
  } catch (error) {
    console.warn(`Failed to load ABI for ${contractName}:`, error.message);
    return [];
  }
};

// Export all contract ABIs
export const ParticipantRegistryABI = loadContractABI('ParticipantRegistry');
export const BatchLedgerABI = loadContractABI('BatchLedger');
export const EscrowABI = loadContractABI('Escrow');
export const DistributorABI = loadContractABI('Distributor');
export const TokenRegistryABI = loadContractABI('TokenRegistry');
export const MockUSDCABI = loadContractABI('MockUSDC');
export const AccessControlABI = loadContractABI('AccessControl');
export const PlatformTimelockABI = loadContractABI('PlatformTimelock');

export default {
  ParticipantRegistryABI,
  BatchLedgerABI,
  EscrowABI,
  DistributorABI,
  TokenRegistryABI,
  MockUSDCABI,
  AccessControlABI,
  PlatformTimelockABI
};
