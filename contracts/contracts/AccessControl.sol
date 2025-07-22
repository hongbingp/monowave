// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AccessControl is Ownable {
    // Role definitions
    bytes32 public constant PUBLISHER_MANAGER_ROLE = keccak256("PUBLISHER_MANAGER_ROLE");
    bytes32 public constant CHARGE_MANAGER_ROLE = keccak256("CHARGE_MANAGER_ROLE");
    bytes32 public constant REVENUE_DISTRIBUTOR_ROLE = keccak256("REVENUE_DISTRIBUTOR_ROLE");
    bytes32 public constant ADVERTISER_MANAGER_ROLE = keccak256("ADVERTISER_MANAGER_ROLE");
    bytes32 public constant AI_SEARCHER_MANAGER_ROLE = keccak256("AI_SEARCHER_MANAGER_ROLE");
    bytes32 public constant PREPAYMENT_MANAGER_ROLE = keccak256("PREPAYMENT_MANAGER_ROLE");
    bytes32 public constant AD_TRANSACTION_RECORDER_ROLE = keccak256("AD_TRANSACTION_RECORDER_ROLE");

    // Role to addresses mapping
    mapping(bytes32 => mapping(address => bool)) private _roles;
    mapping(bytes32 => address[]) private _roleMembers;

    // Events
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender) || msg.sender == owner(), "AccessControl: unauthorized");
        _;
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    function grantRole(bytes32 role, address account) external onlyOwner {
        require(account != address(0), "AccessControl: invalid account");
        
        if (!_roles[role][account]) {
            _roles[role][account] = true;
            _roleMembers[role].push(account);
            emit RoleGranted(role, account, msg.sender);
        }
    }

    function revokeRole(bytes32 role, address account) external onlyOwner {
        if (_roles[role][account]) {
            _roles[role][account] = false;
            
            // Remove from role members array
            address[] storage members = _roleMembers[role];
            for (uint256 i = 0; i < members.length; i++) {
                if (members[i] == account) {
                    members[i] = members[members.length - 1];
                    members.pop();
                    break;
                }
            }
            
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    function getRoleMembers(bytes32 role) external view returns (address[] memory) {
        return _roleMembers[role];
    }

    function getRoleMemberCount(bytes32 role) external view returns (uint256) {
        return _roleMembers[role].length;
    }

    // Convenience functions for checking specific roles
    function isPublisherManager(address account) external view returns (bool) {
        return hasRole(PUBLISHER_MANAGER_ROLE, account);
    }

    function isChargeManager(address account) external view returns (bool) {
        return hasRole(CHARGE_MANAGER_ROLE, account);
    }

    function isRevenueDistributor(address account) external view returns (bool) {
        return hasRole(REVENUE_DISTRIBUTOR_ROLE, account);
    }

    function isAdvertiserManager(address account) external view returns (bool) {
        return hasRole(ADVERTISER_MANAGER_ROLE, account);
    }

    function isAISearcherManager(address account) external view returns (bool) {
        return hasRole(AI_SEARCHER_MANAGER_ROLE, account);
    }

    function isPrepaymentManager(address account) external view returns (bool) {
        return hasRole(PREPAYMENT_MANAGER_ROLE, account);
    }

    function isAdTransactionRecorder(address account) external view returns (bool) {
        return hasRole(AD_TRANSACTION_RECORDER_ROLE, account);
    }
}