// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {AccessControlRoles} from "../access/AccessControlRoles.sol";
import {BatchLedger} from "../ledger/BatchLedger.sol";
import {Escrow} from "../finance/Escrow.sol";

contract Distributor is AccessControlRoles {
    using MerkleProof for bytes32[];

    enum Status { None, Pending, Settled, Disputed, Reversed }

    struct PayoutInfo {
        address token;
        bytes32 root;
        uint64 windowEnd;
        address debtor; // who to debit when claims happen
        Status status;
    }

    BatchLedger public ledger;
    Escrow public escrow;

    mapping(bytes32 => PayoutInfo) public payoutOf; // batchId => info
    mapping(bytes32 => mapping(address => bool)) public claimed; // batchId => account => claimed

    event PayoutOpened(bytes32 indexed batchId, bytes32 root, address token, address debtor, uint64 windowEnd);
    event Claimed(bytes32 indexed batchId, address indexed account, address token, uint256 amount);
    event Settled(bytes32 indexed batchId);
    event Disputed(bytes32 indexed batchId, address indexed by, bytes32 reason);
    event Reversed(bytes32 indexed batchId, uint256 totalAdj);

    function initialize(address admin, address ledger_, address escrow_) external initializer {
        __AccessControlRoles_init(admin);
        ledger = BatchLedger(ledger_);
        escrow = Escrow(escrow_);
    }

    function openPayout(bytes32 batchId, bytes32 root, address token, address debtor, uint64 windowEnd) external onlyRole(SETTLER_ROLE) whenNotPaused {
        require(payoutOf[batchId].status == Status.None, "exists");
        payoutOf[batchId] = PayoutInfo({
            token: token,
            root: root,
            windowEnd: windowEnd,
            debtor: debtor,
            status: Status.Pending
        });
        emit PayoutOpened(batchId, root, token, debtor, windowEnd);
    }

    function claim(bytes32 batchId, address account, uint256 amount, bytes32[] calldata proof) external whenNotPaused nonReentrant {
        PayoutInfo memory p = payoutOf[batchId];
        require(p.status == Status.Pending, "not pending");
        require(!claimed[batchId][account], "claimed");
        // leaf = keccak256(abi.encode(account, amount))
        bytes32 leaf = keccak256(abi.encode(account, amount));
        require(MerkleProof.verify(proof, p.root, leaf), "bad proof");
        // debit debtor and credit account inside escrow
        escrow.debit(p.debtor, p.token, amount, batchId);
        escrow.credit(account, p.token, amount, batchId);
        claimed[batchId][account] = true;
        emit Claimed(batchId, account, p.token, amount);
    }

    function settle(bytes32 batchId) external onlyRole(SETTLER_ROLE) {
        PayoutInfo storage p = payoutOf[batchId];
        require(p.status == Status.Pending, "bad status");
        require(block.timestamp >= p.windowEnd, "window not ended");
        p.status = Status.Settled;
        emit Settled(batchId);
    }

    function dispute(bytes32 batchId, bytes32 reason) external whenNotPaused {
        PayoutInfo storage p = payoutOf[batchId];
        require(p.status == Status.Pending, "bad status");
        require(block.timestamp < p.windowEnd, "window ended");
        p.status = Status.Disputed;
        emit Disputed(batchId, msg.sender, reason);
    }

    function reverse(bytes32 batchId, address[] calldata accounts, uint256[] calldata amounts) external onlyRole(SETTLER_ROLE) whenNotPaused {
        require(accounts.length == amounts.length, "len");
        PayoutInfo storage p = payoutOf[batchId];
        require(p.status == Status.Disputed, "not disputed");
        uint256 totalAdj;
        for (uint256 i=0; i<accounts.length; i++) {
            // simple reverse: debit account, credit debtor
            escrow.debit(accounts[i], p.token, amounts[i], batchId);
            escrow.credit(p.debtor, p.token, amounts[i], batchId);
            totalAdj += amounts[i];
        }
        p.status = Status.Reversed;
        emit Reversed(batchId, totalAdj);
    }
}
