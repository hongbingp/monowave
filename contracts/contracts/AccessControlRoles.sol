// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Role constants shared across contracts. These are used with the existing AccessControl contract.
library AccessControlRoles {
    // Platform/governance roles
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00; // reserved semantics for reference
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    bytes32 public constant LEDGER_ROLE = keccak256("LEDGER_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant RISK_ROLE = keccak256("RISK_ROLE");

    // Participant role bit positions for ParticipantRegistry
    uint256 public constant ROLE_PUBLISHER = 1 << 0;
    uint256 public constant ROLE_ADVERTISER = 1 << 1;
    uint256 public constant ROLE_AI_SEARCHER = 1 << 2;
}


