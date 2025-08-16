// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./AccessControl.sol";
import "./AccessControlRoles.sol";
import "./TokenRegistry.sol";

interface IEscrow {
    function deposit(address token, uint256 amt) external;
    function withdraw(address token, uint256 amt) external;
    function credit(address to, address token, uint256 amt, bytes32 ref) external; // only SETTLER_ROLE
    function debit(address from, address token, uint256 amt, bytes32 ref) external; // only SETTLER_ROLE
    function balanceOf(address account, address token) external view returns (uint256);
    event Deposited(address indexed acct, address token, uint256 amt);
    event Withdrawn(address indexed acct, address token, uint256 amt);
    event Credited(address indexed to, address token, uint256 amt, bytes32 ref);
    event Debited(address indexed from, address token, uint256 amt, bytes32 ref);
    event HoldbackSet(uint16 bps);
}

contract Escrow is IEscrow, Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    AccessControl public accessControl;
    TokenRegistry public tokenRegistry;

    // account => token => balance
    mapping(address => mapping(address => uint256)) private balances;
    uint16 public holdbackBps; // optional risk holdback

    modifier onlyTreasurerOrGovernor() {
        require(
            accessControl.hasRole(AccessControlRoles.TREASURER_ROLE, msg.sender) ||
            accessControl.hasRole(AccessControlRoles.GOVERNOR_ROLE, msg.sender) ||
            msg.sender == accessControl.owner(),
            "Escrow: unauthorized"
        );
        _;
    }

    modifier onlySettler() {
        require(
            accessControl.hasRole(AccessControlRoles.SETTLER_ROLE, msg.sender) || msg.sender == accessControl.owner(),
            "Escrow: only settler"
        );
        _;
    }

    constructor() { _disableInitializers(); }
    function initialize(address _accessControl, address _tokenRegistry) external initializer {
        require(_accessControl != address(0) && _tokenRegistry != address(0), "Escrow: bad args");
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        accessControl = AccessControl(_accessControl);
        tokenRegistry = TokenRegistry(_tokenRegistry);
    }

    function pause() external onlyTreasurerOrGovernor { _pause(); }
    function unpause() external onlyTreasurerOrGovernor { _unpause(); }

    function setHoldback(uint16 bps) external onlyTreasurerOrGovernor {
        require(bps <= 10_000, "Escrow: bps>100%");
        holdbackBps = bps;
        emit HoldbackSet(bps);
    }

    function deposit(address token, uint256 amt) external nonReentrant whenNotPaused {
        tokenRegistry.checkAndConsume(token, msg.sender, amt);
        require(IERC20(token).transferFrom(msg.sender, address(this), amt), "Escrow: transferFrom failed");
        balances[msg.sender][token] += amt;
        emit Deposited(msg.sender, token, amt);
    }

    function withdraw(address token, uint256 amt) external nonReentrant whenNotPaused {
        tokenRegistry.checkAndConsume(token, msg.sender, amt);
        require(balances[msg.sender][token] >= amt, "Escrow: insufficient");
        balances[msg.sender][token] -= amt;
        require(IERC20(token).transfer(msg.sender, amt), "Escrow: transfer failed");
        emit Withdrawn(msg.sender, token, amt);
    }

    function credit(address to, address token, uint256 amt, bytes32 ref) external onlySettler whenNotPaused {
        balances[to][token] += amt;
        emit Credited(to, token, amt, ref);
    }

    function debit(address from, address token, uint256 amt, bytes32 ref) external onlySettler whenNotPaused {
        require(balances[from][token] >= amt, "Escrow: insufficient");
        balances[from][token] -= amt;
        emit Debited(from, token, amt, ref);
    }

    function balanceOf(address account, address token) external view returns (uint256) {
        return balances[account][token];
    }

    function _authorizeUpgrade(address) internal view override {
        require(
            accessControl.hasRole(AccessControlRoles.GOVERNOR_ROLE, msg.sender) || msg.sender == accessControl.owner(),
            "Escrow: upgrade denied"
        );
    }

    uint256[47] private __gap;
}


