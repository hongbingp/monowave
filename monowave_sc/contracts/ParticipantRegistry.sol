// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./AccessControl.sol";
import "./AccessControlRoles.sol";

interface IParticipantRegistry {
    enum Role { None, Publisher, Advertiser, AISearcher }
    struct Part { address payout; uint256 roleBitmap; uint8 status; bytes32 meta; }
    function register(address who, uint256 roleBitmap, address payout, bytes32 meta) external;
    function setPayout(address who, address payout) external;
    function setStatus(address who, uint8 status) external;
    function hasRole(address who, Role r) external view returns (bool);
    event ParticipantRegistered(address indexed who, uint256 roles, address payout);
    event ParticipantUpdated(address indexed who);
    event ParticipantSuspended(address indexed who);
}

contract ParticipantRegistry is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, IParticipantRegistry {
    using EnumerableSet for EnumerableSet.AddressSet;

    AccessControl public accessControl;

    // 0 = inactive, 1 = active, 2 = suspended
    mapping(address => Part) private participants;
    EnumerableSet.AddressSet private participantSet;

    event ParticipantStatusSet(address indexed who, uint8 status);
    event ParticipantPayoutSet(address indexed who, address payout);

    modifier onlyGovernor() {
        require(
            accessControl.hasRole(AccessControlRoles.GOVERNOR_ROLE, msg.sender) || msg.sender == accessControl.owner(),
            "PR: unauthorized"
        );
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(address _accessControl) external initializer {
        require(_accessControl != address(0), "PR: invalid access control");
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        accessControl = AccessControl(_accessControl);
    }

    function pause() external onlyGovernor { _pause(); }
    function unpause() external onlyGovernor { _unpause(); }

    function register(address who, uint256 roleBitmap, address payout, bytes32 meta) external onlyGovernor nonReentrant whenNotPaused {
        require(who != address(0), "PR: invalid who");
        require(payout != address(0), "PR: invalid payout");
        Part storage p = participants[who];
        if (p.payout == address(0)) {
            participantSet.add(who);
            p.payout = payout;
            p.roleBitmap = roleBitmap;
            p.status = 1; // active
            p.meta = meta;
            emit ParticipantRegistered(who, roleBitmap, payout);
        } else {
            p.payout = payout;
            p.roleBitmap = roleBitmap;
            p.meta = meta;
            emit ParticipantUpdated(who);
        }
    }

    function setPayout(address who, address payout) external onlyGovernor whenNotPaused {
        require(participants[who].payout != address(0), "PR: not found");
        require(payout != address(0), "PR: invalid payout");
        participants[who].payout = payout;
        emit ParticipantPayoutSet(who, payout);
        emit ParticipantUpdated(who);
    }

    function setStatus(address who, uint8 status) external onlyGovernor whenNotPaused {
        require(participants[who].payout != address(0), "PR: not found");
        require(status <= 2, "PR: bad status");
        participants[who].status = status;
        emit ParticipantStatusSet(who, status);
        if (status == 2) emit ParticipantSuspended(who);
        emit ParticipantUpdated(who);
    }

    function hasRole(address who, Role r) external view returns (bool) {
        Part memory p = participants[who];
        if (p.payout == address(0)) return false;
        if (r == Role.None) return p.roleBitmap == 0;
        if (r == Role.Publisher) return (p.roleBitmap & AccessControlRoles.ROLE_PUBLISHER) != 0;
        if (r == Role.Advertiser) return (p.roleBitmap & AccessControlRoles.ROLE_ADVERTISER) != 0;
        if (r == Role.AISearcher) return (p.roleBitmap & AccessControlRoles.ROLE_AI_SEARCHER) != 0;
        return false;
    }

    function get(address who) external view returns (Part memory) { return participants[who]; }
    function isRegistered(address who) external view returns (bool) { return participants[who].payout != address(0); }
    function payoutOf(address who) external view returns (address) { return participants[who].payout; }
    function statusOf(address who) external view returns (uint8) { return participants[who].status; }
    function roleBitmapOf(address who) external view returns (uint256) { return participants[who].roleBitmap; }
    function totalParticipants() external view returns (uint256) { return participantSet.length(); }
    function participantAt(uint256 i) external view returns (address) { return participantSet.at(i); }

    function _authorizeUpgrade(address) internal view override {
        require(
            accessControl.hasRole(AccessControlRoles.GOVERNOR_ROLE, msg.sender) || msg.sender == accessControl.owner(),
            "PR: upgrade denied"
        );
    }

    uint256[49] private __gap;

}


