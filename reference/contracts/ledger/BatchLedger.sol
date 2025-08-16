// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlRoles} from "../access/AccessControlRoles.sol";

contract BatchLedger is AccessControlRoles {
    enum Kind { Charge, Payout }
    struct BatchMeta { address token; uint256 total; uint64 windowEnd; Kind kind; }

    mapping(bytes32 => bool) public committed;
    mapping(bytes32 => BatchMeta) public metaOf;
    mapping(bytes32 => bytes32) public rootOf;

    event BatchCommitted(bytes32 indexed batchId, bytes32 root, address token, uint256 total, uint64 windowEnd, Kind kind);

    function initialize(address admin) external initializer {
        __AccessControlRoles_init(admin);
    }

    function commitBatch(bytes32 root, bytes32 batchId, BatchMeta calldata meta) external onlyRole(LEDGER_ROLE) whenNotPaused {
        require(!committed[batchId], "already");
        committed[batchId] = true;
        metaOf[batchId] = meta;
        rootOf[batchId] = root;
        emit BatchCommitted(batchId, root, meta.token, meta.total, meta.windowEnd, meta.kind);
    }
}
