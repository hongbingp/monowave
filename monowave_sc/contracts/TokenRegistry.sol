// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./AccessControl.sol";
import "./AccessControlRoles.sol";

contract TokenRegistry is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    AccessControl public accessControl;

    struct Limits { uint256 singleMax; uint256 dailyMax; }
    mapping(address => bool) public isAllowedToken;
    mapping(address => Limits) public tokenLimits;
    mapping(address => mapping(address => uint256)) public spentToday; // token => user => amount
    mapping(address => uint256) public lastReset; // token => timestamp

    event TokenAllowed(address token, bool enabled);
    event TokenLimitUpdated(address token, uint256 singleMax, uint256 dailyMax);

    modifier onlyGovernor() {
        require(
            accessControl.hasRole(AccessControlRoles.GOVERNOR_ROLE, msg.sender) || msg.sender == accessControl.owner(),
            "TR: unauthorized"
        );
        _;
    }

    constructor() { _disableInitializers(); }
    function initialize(address _accessControl) external initializer {
        require(_accessControl != address(0), "TR: invalid access control");
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        accessControl = AccessControl(_accessControl);
    }

    function pause() external onlyGovernor { _pause(); }
    function unpause() external onlyGovernor { _unpause(); }

    function allow(address token, bool enabled) external onlyGovernor {
        isAllowedToken[token] = enabled;
        emit TokenAllowed(token, enabled);
    }

    function setLimits(address token, uint256 singleMax, uint256 dailyMax) external onlyGovernor {
        tokenLimits[token] = Limits(singleMax, dailyMax);
        emit TokenLimitUpdated(token, singleMax, dailyMax);
    }

    function checkAndConsume(address token, address user, uint256 amount) external whenNotPaused {
        require(isAllowedToken[token], "TR: token not allowed");
        Limits memory lim = tokenLimits[token];
        if (lim.singleMax > 0) require(amount <= lim.singleMax, "TR: exceeds single max");
        uint256 last = lastReset[token];
        if (block.timestamp > last + 1 days) {
            lastReset[token] = block.timestamp;
            spentToday[token][user] = 0;
        }
        if (lim.dailyMax > 0) require(spentToday[token][user] + amount <= lim.dailyMax, "TR: exceeds daily max");
        spentToday[token][user] += amount;
    }

    function _authorizeUpgrade(address) internal view override {
        require(
            accessControl.hasRole(AccessControlRoles.GOVERNOR_ROLE, msg.sender) || msg.sender == accessControl.owner(),
            "TR: upgrade denied"
        );
    }

    uint256[48] private __gap;
}


