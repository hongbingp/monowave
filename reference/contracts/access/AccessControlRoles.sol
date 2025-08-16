// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

abstract contract AccessControlRoles is Initializable, UUPSUpgradeable, PausableUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant SETTLER_ROLE  = keccak256("SETTLER_ROLE");
    bytes32 public constant LEDGER_ROLE   = keccak256("LEDGER_ROLE");
    bytes32 public constant TREASURER_ROLE= keccak256("TREASURER_ROLE");
    bytes32 public constant RISK_ROLE     = keccak256("RISK_ROLE");

    function __AccessControlRoles_init(address admin) internal onlyInitializing {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNOR_ROLE, admin);
        _grantRole(SETTLER_ROLE, admin);
        _grantRole(LEDGER_ROLE, admin);
        _grantRole(TREASURER_ROLE, admin);
        _grantRole(RISK_ROLE, admin);
    }

    function pause() external onlyRole(GOVERNOR_ROLE) { _pause(); }
    function unpause() external onlyRole(GOVERNOR_ROLE) { _unpause(); }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(GOVERNOR_ROLE) {}
}
