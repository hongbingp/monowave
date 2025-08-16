// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlRoles} from "../access/AccessControlRoles.sol";

contract ParticipantRegistry is AccessControlRoles {
    enum Status { Inactive, Active, Suspended }
    struct Part {
        address payout;
        uint256 roleBitmap; // 1=Publisher, 2=Advertiser, 4=AISearcher
        Status status;
        bytes32 meta;
    }

    mapping(address => Part) public participants;

    event ParticipantRegistered(address indexed who, uint256 roles, address payout);
    event ParticipantUpdated(address indexed who);
    event ParticipantSuspended(address indexed who);

    function initialize(address admin) external initializer {
        __AccessControlRoles_init(admin);
    }

    function register(address who, uint256 roles, address payout, bytes32 meta) external onlyRole(GOVERNOR_ROLE) {
        participants[who] = Part({payout: payout, roleBitmap: roles, status: Status.Active, meta: meta});
        emit ParticipantRegistered(who, roles, payout);
    }

    function setPayout(address who, address payout) external onlyRole(GOVERNOR_ROLE) {
        participants[who].payout = payout;
        emit ParticipantUpdated(who);
    }

    function setStatus(address who, Status status_) external onlyRole(GOVERNOR_ROLE) {
        participants[who].status = status_;
        if (status_ != Status.Active) emit ParticipantSuspended(who);
        else emit ParticipantUpdated(who);
    }

    function hasRoleOf(address who, uint256 bit) public view returns (bool) {
        return (participants[who].roleBitmap & bit) != 0 && participants[who].status == Status.Active;
    }
}
