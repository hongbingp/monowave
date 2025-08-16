// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControlRoles} from "../access/AccessControlRoles.sol";
import {TokenRegistry} from "../registry/TokenRegistry.sol";

contract Escrow is AccessControlRoles {
    using SafeERC20 for IERC20;

    TokenRegistry public tokenRegistry;
    uint16 public holdbackBps; // e.g., 500 = 5%
    // balances[account][token] = amount
    mapping(address => mapping(address => uint256)) public balances;

    event Deposited(address indexed acct, address indexed token, uint256 amt);
    event Withdrawn(address indexed acct, address indexed token, uint256 amt);
    event Credited(address indexed to, address indexed token, uint256 amt, bytes32 refId);
    event Debited(address indexed from, address indexed token, uint256 amt, bytes32 refId);
    event HoldbackSet(uint16 bps);

    function initialize(address admin, address tokenRegistry_) external initializer {
        __AccessControlRoles_init(admin);
        tokenRegistry = TokenRegistry(tokenRegistry_);
        holdbackBps = 0;
    }

    function setHoldback(uint16 bps) external onlyRole(RISK_ROLE) {
        require(bps <= 5000, "too high");
        holdbackBps = bps;
        emit HoldbackSet(bps);
    }

    function deposit(address token, uint256 amt) external whenNotPaused nonReentrant {
        require(tokenRegistry.isAllowed(token), "token !allowed");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amt);
        balances[msg.sender][token] += amt;
        emit Deposited(msg.sender, token, amt);
    }

    function withdraw(address token, uint256 amt) external whenNotPaused nonReentrant {
        require(balances[msg.sender][token] >= amt, "insufficient");
        balances[msg.sender][token] -= amt;
        IERC20(token).safeTransfer(msg.sender, amt);
        emit Withdrawn(msg.sender, token, amt);
    }

    function credit(address to, address token, uint256 amt, bytes32 refId) external onlyRole(SETTLER_ROLE) whenNotPaused {
        require(tokenRegistry.isAllowed(token), "token !allowed");
        uint256 creditAmt = amt * (10000 - holdbackBps) / 10000;
        balances[to][token] += creditAmt;
        emit Credited(to, token, creditAmt, refId);
    }

    function debit(address from, address token, uint256 amt, bytes32 refId) external onlyRole(SETTLER_ROLE) whenNotPaused {
        require(balances[from][token] >= amt, "insufficient");
        balances[from][token] -= amt;
        emit Debited(from, token, amt, refId);
    }

    function balanceOf(address account, address token) external view returns (uint256) {
        return balances[account][token];
    }
}
