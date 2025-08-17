// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./AccessControl.sol";
import "./AccessControlRoles.sol";

interface IBatchLedger {
    enum Kind { Charge, Payout }
    struct BatchMeta { address token; uint256 total; uint64 windowEnd; Kind kind; }
    function commitBatch(bytes32 root, bytes32 batchId, BatchMeta calldata meta) external;
    function isCommitted(bytes32 batchId) external view returns (bool);
    event BatchCommitted(bytes32 indexed batchId, bytes32 root, address token, uint256 total, uint64 windowEnd, Kind kind);
}

contract BatchLedger is IBatchLedger, Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    AccessControl public accessControl;

    struct BatchRecord { bytes32 root; address token; uint256 total; uint64 windowEnd; Kind kind; bool exists; }
    mapping(bytes32 => BatchRecord) public batches;

    modifier onlyLedger() {
        require(
            accessControl.hasRole(AccessControlRoles.LEDGER_ROLE, msg.sender) || msg.sender == accessControl.owner(),
            "BL: only ledger"
        );
        _;
    }

    constructor() { _disableInitializers(); }
    function initialize(address _accessControl) external initializer {
        require(_accessControl != address(0), "BL: invalid access");
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        accessControl = AccessControl(_accessControl);
    }

    function pause() external onlyLedger { _pause(); }
    function unpause() external onlyLedger { _unpause(); }

    function commitBatch(bytes32 root, bytes32 batchId, BatchMeta calldata meta) external override onlyLedger nonReentrant whenNotPaused {
        require(root != bytes32(0) && batchId != bytes32(0), "BL: zero root/id");
        require(!batches[batchId].exists, "BL: duplicate batchId");
        batches[batchId] = BatchRecord({ root: root, token: meta.token, total: meta.total, windowEnd: meta.windowEnd, kind: meta.kind, exists: true });
        emit BatchCommitted(batchId, root, meta.token, meta.total, meta.windowEnd, meta.kind);
    }

    function isCommitted(bytes32 batchId) external view returns (bool) { return batches[batchId].exists; }

    function getBatch(bytes32 batchId) external view returns (bytes32 root, address token, uint256 total, uint64 windowEnd, Kind kind, bool exists) {
        BatchRecord memory r = batches[batchId];
        return (r.root, r.token, r.total, r.windowEnd, r.kind, r.exists);
    }

    // Minimal Merkle verifier for optional on-chain checks
    function verifyLeaf(bytes32 batchId, bytes32 leaf, bytes32[] calldata proof) external view returns (bool) {
        BatchRecord memory r = batches[batchId];
        require(r.exists, "BL: not found");
        bytes32 h = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 p = proof[i];
            h = h <= p ? keccak256(abi.encodePacked(h, p)) : keccak256(abi.encodePacked(p, h));
        }
        return h == r.root;
    }

    function _authorizeUpgrade(address) internal view override {
        require(
            accessControl.hasRole(AccessControlRoles.GOVERNOR_ROLE, msg.sender) || msg.sender == accessControl.owner(),
            "BL: upgrade denied"
        );
    }

    uint256[48] private __gap;
}


