// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlRoles} from "../access/AccessControlRoles.sol";

contract TokenRegistry is AccessControlRoles {
    struct Limits { uint256 singleMax; uint256 dailyMax; }
    mapping(address => bool) public allowed;
    mapping(address => Limits) public limits;

    event TokenAllowed(address token, bool enabled);
    event TokenLimitUpdated(address token, uint256 singleMax, uint256 dailyMax);

    function initialize(address admin) external initializer {
        __AccessControlRoles_init(admin);
    }

    function allow(address token, bool enabled) external onlyRole(GOVERNOR_ROLE) {
        allowed[token] = enabled;
        emit TokenAllowed(token, enabled);
    }

    function setLimits(address token, uint256 singleMax, uint256 dailyMax) external onlyRole(RISK_ROLE) {
        limits[token] = Limits(singleMax, dailyMax);
        emit TokenLimitUpdated(token, singleMax, dailyMax);
    }

    function isAllowed(address token) external view returns (bool) {
        return allowed[token];
    }
}
