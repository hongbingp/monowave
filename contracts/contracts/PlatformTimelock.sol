// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

// Simple Timelock that can be used as proposer/executor for upgrades and pauses.
contract PlatformTimelock is TimelockController {
    constructor(uint256 minDelay, address[] memory proposers, address[] memory executors)
        TimelockController(minDelay, proposers, executors, msg.sender) {}
}


