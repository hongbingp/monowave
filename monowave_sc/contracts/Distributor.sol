// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "./AccessControl.sol";
import "./AccessControlRoles.sol";
import "./BatchLedger.sol";
import "./Escrow.sol";

interface IDistributor {
  function openPayout(bytes32 batchId, bytes32 root, address token) external;
  function claim(bytes32 batchId, address token, uint256 amount, bytes32[] calldata proof) external;
  function settle(bytes32 batchId) external;
  function dispute(bytes32 batchId, bytes32 reason) external;
  function reverse(bytes32 batchId, address[] calldata accounts, uint256[] calldata amounts) external;
  event PayoutOpened(bytes32 indexed batchId, bytes32 root, address token);
  event Claimed(bytes32 indexed batchId, address indexed account, address token, uint256 amount);
  event Settled(bytes32 indexed batchId);
  event Disputed(bytes32 indexed batchId, address indexed by, bytes32 reason);
  event Reversed(bytes32 indexed batchId, uint256 totalAdj);
}

contract Distributor is IDistributor, Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  using BitMaps for BitMaps.BitMap;

  enum Status { None, Pending, Settled, Disputed, Reversed }

  AccessControl public accessControl;
  BatchLedger public ledger;
  Escrow public escrow;

  struct PayoutBatch { bytes32 root; address token; uint64 windowEnd; Status status; }
  mapping(bytes32 => PayoutBatch) public payoutBatches; // batchId => batch
  mapping(bytes32 => BitMaps.BitMap) private claimed; // batchId => claims bitmap keyed by account index (off-chain index)

  modifier onlySettler() {
    require(
      accessControl.hasRole(AccessControlRoles.SETTLER_ROLE, msg.sender) || msg.sender == accessControl.owner(),
      "Dist: only settler"
    );
    _;
  }

  constructor() { _disableInitializers(); }
  function initialize(address _accessControl, address _ledger, address _escrow) external initializer {
    require(_accessControl != address(0) && _ledger != address(0) && _escrow != address(0), "Dist: bad args");
    __ReentrancyGuard_init();
    __Pausable_init();
    __UUPSUpgradeable_init();
    accessControl = AccessControl(_accessControl);
    ledger = BatchLedger(_ledger);
    escrow = Escrow(_escrow);
  }

  function pause() external onlySettler { _pause(); }
  function unpause() external onlySettler { _unpause(); }

  function openPayout(bytes32 batchId, bytes32 root, address token) external override onlySettler whenNotPaused {
    require(ledger.isCommitted(batchId), "Dist: batch not committed");
    ( , address bToken, , uint64 windowEnd, IBatchLedger.Kind kind, bool exists) = ledger.getBatch(batchId);
    require(exists, "Dist: no batch");
    require(kind == IBatchLedger.Kind.Payout && bToken == token, "Dist: meta mismatch");
    require(payoutBatches[batchId].status == Status.None, "Dist: exists");
    payoutBatches[batchId] = PayoutBatch({ root: root, token: token, windowEnd: windowEnd, status: Status.Pending });
    emit PayoutOpened(batchId, root, token);
  }

  function claim(bytes32 batchId, address token, uint256 amount, bytes32[] calldata proof) external override nonReentrant whenNotPaused {
    require(payoutBatches[batchId].status == Status.Pending, "Dist: not pending");
    require(payoutBatches[batchId].token == token, "Dist: token mismatch");
    // Verify proof: leaf = keccak256(account, token, amount)
    bytes32 leaf = keccak256(abi.encodePacked(msg.sender, token, amount));
    // reconstruct root
    bytes32 h = leaf;
    for (uint256 i = 0; i < proof.length; i++) {
      bytes32 p = proof[i];
      h = h <= p ? keccak256(abi.encodePacked(h, p)) : keccak256(abi.encodePacked(p, h));
    }
    require(h == payoutBatches[batchId].root, "Dist: bad proof");
    // Idempotency: use hash(account) mod 2^256 as index (off-chain should avoid collisions by mapping index, here we use single-bit per account hash)
    uint256 bitIndex = uint256(keccak256(abi.encodePacked(msg.sender)));
    require(!claimed[batchId].get(bitIndex), "Dist: already claimed");
    claimed[batchId].set(bitIndex);
    // Credit to user balance in Escrow (pull pattern)
    escrow.credit(msg.sender, token, amount, keccak256(abi.encodePacked(batchId, msg.sender, amount)));
    emit Claimed(batchId, msg.sender, token, amount);
  }

  function settle(bytes32 batchId) external override onlySettler whenNotPaused {
    require(payoutBatches[batchId].status == Status.Pending, "Dist: not pending");
    require(block.timestamp >= payoutBatches[batchId].windowEnd, "Dist: window not ended");
    payoutBatches[batchId].status = Status.Settled;
    emit Settled(batchId);
  }

  function dispute(bytes32 batchId, bytes32 reason) external override whenNotPaused {
    require(payoutBatches[batchId].status == Status.Pending, "Dist: not pending");
    require(block.timestamp < payoutBatches[batchId].windowEnd, "Dist: window passed");
    payoutBatches[batchId].status = Status.Disputed;
    emit Disputed(batchId, msg.sender, reason);
  }

  function reverse(bytes32 batchId, address[] calldata accounts, uint256[] calldata amounts) external override onlySettler whenNotPaused {
    require(payoutBatches[batchId].status == Status.Disputed, "Dist: not disputed");
    require(accounts.length == amounts.length && accounts.length > 0, "Dist: bad arrays");
    uint256 totalAdj = 0;
    address token = payoutBatches[batchId].token;
    for (uint256 i = 0; i < accounts.length; i++) {
      escrow.debit(accounts[i], token, amounts[i], keccak256(abi.encodePacked(batchId, accounts[i], amounts[i])));
      totalAdj += amounts[i];
    }
    payoutBatches[batchId].status = Status.Reversed;
    emit Reversed(batchId, totalAdj);
  }

  function _authorizeUpgrade(address) internal view override {
    require(
      accessControl.hasRole(AccessControlRoles.GOVERNOR_ROLE, msg.sender) || msg.sender == accessControl.owner(),
      "Dist: upgrade denied"
    );
  }

  uint256[47] private __gap;
}


