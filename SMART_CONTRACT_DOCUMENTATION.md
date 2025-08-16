# Monowave MVP Smart Contract Documentation

This document provides comprehensive documentation for the Monowave MVP smart contract architecture, including contract specifications, deployment patterns, and integration guides.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Contract Specifications](#contract-specifications)
- [Deployment Patterns](#deployment-patterns)
- [Role Management](#role-management)
- [Integration Guide](#integration-guide)
- [Security Considerations](#security-considerations)
- [Upgrade Procedures](#upgrade-procedures)

## 🏗️ Architecture Overview

### MVP Contract Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Monowave MVP Architecture                 │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Governance    │   Identity      │      Financial          │
│                 │                 │                         │
│ PlatformTimelock│ AccessControl   │   TokenRegistry         │
│ (Time-locked    │ (Role-based     │   (Whitelisted          │
│  operations)    │  permissions)   │    stablecoins)         │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────┬─────────────────┬─────────────────────────┐
│   Participants  │   Transactions  │     Distribution        │
│                 │                 │                         │
│ParticipantReg   │   BatchLedger   │     Distributor         │
│(Unified users   │   (Merkle       │     (Pull-based         │
│ w/ role bitmaps)│    batching)    │      claims)            │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────┬─────────────────┬─────────────────────────┐
│   Fund Custody  │   Deployment    │      Testing            │
│                 │                 │                         │
│     Escrow      │ ProxyImporter   │      MockUSDC           │
│ (Credit/debit   │ (ERC1967Proxy   │   (Test stablecoin)     │
│  accounting)    │  simplification)│                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Key Design Principles

1. **Modularity**: Each contract has a single, well-defined responsibility
2. **Upgradeability**: UUPS proxy pattern for all core contracts
3. **Security**: Role-based access control with time-locked governance
4. **Efficiency**: Batch processing with Merkle trees for scalability
5. **Flexibility**: Pull-based distribution with dispute resolution

## 📜 Contract Specifications

### 1. AccessControl.sol

**Purpose**: Role-based access control foundation for the entire platform.

**Key Features**:
- Owner-based administration
- Role granting and revocation
- Role membership tracking
- Integration with all MVP contracts

**Functions**:
```solidity
function grantRole(bytes32 role, address account) external onlyOwner
function revokeRole(bytes32 role, address account) external onlyOwner
function hasRole(bytes32 role, address account) public view returns (bool)
function getRoleMembers(bytes32 role) external view returns (address[] memory)
```

**Events**:
```solidity
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
```

### 2. AccessControlRoles.sol

**Purpose**: Centralized role definitions and participant role bitmaps.

**Role Constants**:
```solidity
bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
bytes32 public constant LEDGER_ROLE = keccak256("LEDGER_ROLE");
bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
bytes32 public constant RISK_ROLE = keccak256("RISK_ROLE");
```

**Participant Role Bitmaps**:
```solidity
uint256 public constant ROLE_PUBLISHER = 1 << 0;    // 1
uint256 public constant ROLE_ADVERTISER = 1 << 1;   // 2
uint256 public constant ROLE_AI_SEARCHER = 1 << 2;  // 4
```

### 3. ParticipantRegistry.sol

**Purpose**: Unified participant management with role bitmaps and metadata.

**Key Features**:
- UUPS upgradeable
- Role bitmap system for multiple participant types
- Payout address management
- Status tracking and metadata storage

**Core Functions**:
```solidity
function registerParticipant(
    address participant,
    address payoutAddress,
    uint256 roleBitmap,
    bytes calldata metadata
) external onlyRole(TREASURER_ROLE)

function updateParticipantStatus(
    address participant,
    uint8 status
) external onlyRole(RISK_ROLE)

function getParticipantInfo(address participant) 
    external view returns (ParticipantInfo memory)
```

**Structures**:
```solidity
struct ParticipantInfo {
    address payoutAddress;
    uint256 roleBitmap;
    uint8 status;
    bytes metadata;
    uint256 registeredAt;
}
```

### 4. TokenRegistry.sol

**Purpose**: Whitelisted token management with transaction limits.

**Key Features**:
- UUPS upgradeable
- Token whitelisting
- Single and daily transaction limits
- Pausable for emergency controls

**Core Functions**:
```solidity
function addToken(
    address token,
    uint256 singleLimit,
    uint256 dailyLimit
) external onlyRole(TREASURER_ROLE)

function checkLimits(
    address token,
    address user,
    uint256 amount
) external view returns (bool)

function recordTransaction(
    address token,
    address user,
    uint256 amount
) external onlyRole(LEDGER_ROLE)
```

### 5. Escrow.sol

**Purpose**: Fund custody with credit/debit accounting and holdback management.

**Key Features**:
- UUPS upgradeable
- Multi-token support
- Credit/debit accounting system
- Holdback percentage for dispute resolution

**Core Functions**:
```solidity
function deposit(
    address token,
    uint256 amount
) external nonReentrant whenNotPaused

function credit(
    address user,
    address token,
    uint256 amount,
    bytes32 reference
) external onlyRole(SETTLER_ROLE)

function debit(
    address user,
    address token,
    uint256 amount,
    bytes32 reference
) external onlyRole(SETTLER_ROLE)
```

**Events**:
```solidity
event Deposited(address indexed user, address indexed token, uint256 amount);
event Credited(address indexed user, address indexed token, uint256 amount, bytes32 reference);
event Debited(address indexed user, address indexed token, uint256 amount, bytes32 reference);
```

### 6. BatchLedger.sol

**Purpose**: High-frequency transaction batching with Merkle tree commitment.

**Key Features**:
- UUPS upgradeable
- Idempotent batch commitment
- Merkle root verification
- Gas-efficient batch processing

**Core Functions**:
```solidity
function commitBatch(
    bytes32 batchId,
    bytes32 merkleRoot,
    uint256 transactionCount,
    bytes calldata metadata
) external onlyRole(LEDGER_ROLE)

function isBatchCommitted(bytes32 batchId) external view returns (bool)

function getBatchInfo(bytes32 batchId) 
    external view returns (BatchInfo memory)
```

**Structures**:
```solidity
struct BatchInfo {
    bytes32 merkleRoot;
    uint256 transactionCount;
    uint256 committedAt;
    bytes metadata;
}
```

### 7. Distributor.sol

**Purpose**: Revenue distribution with Merkle claims and dispute resolution.

**Key Features**:
- UUPS upgradeable
- Pull-based Merkle claims
- Settlement state machine
- Dispute window management

**State Machine**:
```
pending → settled → disputed → reversed
    ↓        ↓         ↓          ↓
  Queued   Final   Disputed   Refunded
```

**Core Functions**:
```solidity
function openPayout(
    bytes32 payoutId,
    bytes32 batchId,
    bytes32 merkleRoot,
    uint256 totalAmount,
    address token
) external onlyRole(SETTLER_ROLE)

function claim(
    bytes32 payoutId,
    uint256 amount,
    bytes32[] calldata proof
) external nonReentrant

function dispute(
    bytes32 payoutId,
    string calldata reason
) external

function settle(bytes32 payoutId) external onlyRole(SETTLER_ROLE)
```

### 8. PlatformTimelock.sol

**Purpose**: Time-locked governance for critical operations.

**Key Features**:
- Inherits from OpenZeppelin TimelockController
- Configurable delay periods
- Multi-signature support
- Emergency execution capabilities

**Configuration**:
```solidity
constructor(
    uint256 minDelay,        // Minimum delay for operations
    address[] memory proposers,  // Addresses that can propose
    address[] memory executors,  // Addresses that can execute
    address admin            // Admin address
)
```

### 9. ProxyImporter.sol

**Purpose**: Simplified ERC1967Proxy import for deployment scripts.

**Usage**:
```solidity
// Resolves Hardhat HH701 errors with multiple AccessControl artifacts
import "./ProxyImporter.sol";
// Instead of: import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
```

### 10. MockUSDC.sol

**Purpose**: Test ERC20 token for development and testing.

**Features**:
- Standard ERC20 implementation
- Minting capability for testing
- 6 decimal places (like real USDC)

## 🚀 Deployment Patterns

### UUPS Proxy Deployment

All core contracts use the UUPS (Universal Upgradeable Proxy Standard) pattern:

```javascript
// 1. Deploy implementation contract
const Implementation = await ethers.getContractFactory("ContractName");
const impl = await Implementation.deploy();

// 2. Deploy proxy with initialization
const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
const proxy = await ProxyFactory.deploy(
    await impl.getAddress(),
    impl.interface.encodeFunctionData("initialize", [...initArgs])
);

// 3. Get contract instance
const contract = Implementation.attach(await proxy.getAddress());
```

### Deployment Sequence

1. **MockUSDC** (for testing)
2. **AccessControl** (role management foundation)
3. **TokenRegistry** (with proxy)
4. **ParticipantRegistry** (with proxy)
5. **BatchLedger** (with proxy)
6. **Escrow** (with proxy)
7. **Distributor** (with proxy)
8. **PlatformTimelock** (governance)

### Role Assignment

After deployment, roles must be assigned:

```javascript
// Grant roles to deployer for initial setup
await accessControl.grantRole(GOVERNOR_ROLE, deployer.address);
await accessControl.grantRole(SETTLER_ROLE, distributor.address);
await accessControl.grantRole(LEDGER_ROLE, batchLedger.address);
await accessControl.grantRole(TREASURER_ROLE, escrow.address);
```

## 🔐 Role Management

### Role Hierarchy

```
Owner (Deployer)
├── GOVERNOR_ROLE (Platform governance)
│   ├── Contract upgrades
│   ├── Critical parameter changes
│   └── Emergency operations
├── SETTLER_ROLE (Settlement operations)
│   ├── Escrow credit/debit
│   ├── Payout settlement
│   └── Dispute resolution
├── LEDGER_ROLE (Transaction recording)
│   ├── Batch commitment
│   ├── Transaction recording
│   └── Merkle root updates
├── TREASURER_ROLE (Fund management)
│   ├── Token whitelisting
│   ├── Participant registration
│   └── Limit management
└── RISK_ROLE (Risk management)
    ├── Emergency pausing
    ├── Limit enforcement
    └── Status updates
```

### Role Assignment Best Practices

1. **Principle of Least Privilege**: Assign minimal necessary permissions
2. **Role Separation**: Different entities for different roles
3. **Multi-signature**: Use timelock for critical operations
4. **Regular Rotation**: Periodic review and rotation of role holders

## 🔧 Integration Guide

### Backend Service Integration

```javascript
// Initialize contract instances
const contracts = {
    accessControl: new web3.eth.Contract(AccessControlABI, addresses.accessControl),
    participantRegistry: new web3.eth.Contract(ParticipantRegistryABI, addresses.participantRegistry),
    tokenRegistry: new web3.eth.Contract(TokenRegistryABI, addresses.tokenRegistry),
    escrow: new web3.eth.Contract(EscrowABI, addresses.escrow),
    batchLedger: new web3.eth.Contract(BatchLedgerABI, addresses.batchLedger),
    distributor: new web3.eth.Contract(DistributorABI, addresses.distributor),
    mockUSDC: new web3.eth.Contract(MockUSDCABI, addresses.mockUSDC)
};
```

### Participant Registration Flow

```javascript
async function registerParticipant(walletAddress, role) {
    // 1. Check if already registered
    const existing = await contracts.participantRegistry.methods
        .getParticipantInfo(walletAddress).call();
    
    if (existing.registeredAt > 0) {
        return existing;
    }
    
    // 2. Register with role bitmap
    const roleBitmap = role === 'publisher' ? 1 : 
                      role === 'advertiser' ? 2 : 
                      role === 'ai_searcher' ? 4 : 0;
    
    const tx = await contracts.participantRegistry.methods
        .registerParticipant(
            walletAddress,
            walletAddress, // payout address same as wallet
            roleBitmap,
            '0x' // empty metadata
        ).send({ from: treasurerAddress });
    
    return tx;
}
```

### Batch Processing Flow

```javascript
async function processBatch(transactions) {
    // 1. Generate Merkle tree
    const merkleTree = generateMerkleTree(transactions);
    const batchId = generateBatchId();
    
    // 2. Commit batch to ledger
    const commitTx = await contracts.batchLedger.methods
        .commitBatch(
            batchId,
            merkleTree.root,
            transactions.length,
            JSON.stringify({ timestamp: Date.now() })
        ).send({ from: ledgerAddress });
    
    // 3. Open payout in distributor
    const payoutTx = await contracts.distributor.methods
        .openPayout(
            generatePayoutId(),
            batchId,
            merkleTree.root,
            calculateTotalAmount(transactions),
            tokenAddress
        ).send({ from: settlerAddress });
    
    return { commitTx, payoutTx, merkleTree };
}
```

### Claim Processing

```javascript
async function processClaim(payoutId, userAddress, amount, proof) {
    // 1. Verify user hasn't already claimed
    const hasClaimed = await contracts.distributor.methods
        .hasClaimed(payoutId, userAddress).call();
    
    if (hasClaimed) {
        throw new Error('Already claimed');
    }
    
    // 2. Process claim
    const claimTx = await contracts.distributor.methods
        .claim(payoutId, amount, proof)
        .send({ from: userAddress });
    
    return claimTx;
}
```

## 🛡️ Security Considerations

### Access Control Security

1. **Role Verification**: All sensitive functions check roles via `onlyRole` modifier
2. **Owner Protection**: Critical functions require owner or specific role
3. **Role Revocation**: Ability to revoke compromised roles immediately

### Reentrancy Protection

All state-changing functions use `nonReentrant` modifier:

```solidity
function deposit(address token, uint256 amount) 
    external 
    nonReentrant 
    whenNotPaused 
{
    // Safe from reentrancy attacks
}
```

### Pausable Emergency Controls

All contracts implement pausable functionality:

```solidity
function emergencyPause() external onlyRole(RISK_ROLE) {
    _pause();
}

function emergencyUnpause() external onlyRole(GOVERNOR_ROLE) {
    _unpause();
}
```

### Input Validation

Comprehensive input validation on all functions:

```solidity
function registerParticipant(
    address participant,
    address payoutAddress,
    uint256 roleBitmap,
    bytes calldata metadata
) external onlyRole(TREASURER_ROLE) {
    require(participant != address(0), "Invalid participant");
    require(payoutAddress != address(0), "Invalid payout address");
    require(roleBitmap > 0, "Invalid role bitmap");
    // ... rest of function
}
```

## 🔄 Upgrade Procedures

### UUPS Upgrade Process

1. **Deploy New Implementation**:
```javascript
const NewImplementation = await ethers.getContractFactory("NewContractVersion");
const newImpl = await NewImplementation.deploy();
```

2. **Prepare Upgrade**:
```javascript
const upgradeData = newImpl.interface.encodeFunctionData("initialize", []);
```

3. **Execute Upgrade** (via Timelock):
```javascript
// Through timelock for governance
await timelock.schedule(
    proxyAddress,
    0,
    upgradeCalldata,
    predecessor,
    salt,
    delay
);

// After delay period
await timelock.execute(
    proxyAddress,
    0,
    upgradeCalldata,
    predecessor,
    salt
);
```

### Storage Layout Preservation

All upgradeable contracts include storage gaps:

```solidity
contract MyContract is Initializable, UUPSUpgradeable {
    // Contract storage variables
    mapping(address => uint256) private _balances;
    
    // Storage gap for future versions
    uint256[49] private __gap;
}
```

### Upgrade Testing

Before any upgrade:

1. **Local Testing**: Deploy and test on local network
2. **Testnet Deployment**: Full testing on Base Sepolia
3. **Security Audit**: Professional security review
4. **Community Review**: Transparent upgrade proposal
5. **Timelock Execution**: Governed upgrade process

## 📊 Gas Optimization

### Batch Processing Efficiency

- **Single Merkle Root**: Commit entire batch with one transaction
- **Lazy Claiming**: Users claim when needed, not pushed
- **Packed Structs**: Optimized storage layout

### Storage Optimization

```solidity
// Packed struct to save gas
struct ParticipantInfo {
    address payoutAddress;    // 20 bytes
    uint256 roleBitmap;      // 32 bytes  
    uint8 status;            // 1 byte
    // Total: 53 bytes (fits in 2 storage slots)
}
```

### Event Optimization

Indexed parameters for efficient filtering:

```solidity
event BatchCommitted(
    bytes32 indexed batchId,
    bytes32 indexed merkleRoot,
    uint256 transactionCount
);
```

---

**Monowave MVP Smart Contracts** - Modular, upgradeable, and secure blockchain infrastructure for AI content authorization and advertising settlement.
