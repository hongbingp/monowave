// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

contract PublisherRegistry {
    AccessControl private accessControl;
    
    struct Publisher {
        address walletAddress;
        string name;
        string website;
        uint256 totalRevenue;
        uint256 pendingRevenue;
        bool isActive;
        uint256 registeredAt;
        uint256 lastActivityAt;
    }
    
    mapping(address => Publisher) public publishers;
    mapping(uint256 => address) public publisherIdToAddress;
    address[] public publisherList;
    uint256 public publisherCounter;
    
    // Events
    event PublisherRegistered(
        address indexed publisher, 
        string name, 
        string website, 
        uint256 timestamp
    );
    event PublisherDeactivated(address indexed publisher, uint256 timestamp);
    event PublisherReactivated(address indexed publisher, uint256 timestamp);
    event PublisherUpdated(address indexed publisher, string name, string website);
    
    modifier onlyPublisherManager() {
        require(
            accessControl.hasRole(accessControl.PUBLISHER_MANAGER_ROLE(), msg.sender) || 
            msg.sender == accessControl.owner(),
            "PublisherRegistry: unauthorized"
        );
        _;
    }
    
    constructor(address _accessControl) {
        require(_accessControl != address(0), "PublisherRegistry: invalid access control address");
        accessControl = AccessControl(_accessControl);
    }
    
    function registerPublisher(
        address _publisher,
        string calldata _name,
        string calldata _website
    ) external onlyPublisherManager {
        require(_publisher != address(0), "PublisherRegistry: invalid publisher address");
        require(bytes(_name).length > 0, "PublisherRegistry: name cannot be empty");
        require(!publishers[_publisher].isActive, "PublisherRegistry: publisher already registered");
        
        publisherCounter++;
        
        publishers[_publisher] = Publisher({
            walletAddress: _publisher,
            name: _name,
            website: _website,
            totalRevenue: 0,
            pendingRevenue: 0,
            isActive: true,
            registeredAt: block.timestamp,
            lastActivityAt: block.timestamp
        });
        
        publisherIdToAddress[publisherCounter] = _publisher;
        publisherList.push(_publisher);
        
        emit PublisherRegistered(_publisher, _name, _website, block.timestamp);
    }
    
    function deactivatePublisher(address _publisher) external onlyPublisherManager {
        require(publishers[_publisher].isActive, "PublisherRegistry: publisher not active");
        
        publishers[_publisher].isActive = false;
        
        emit PublisherDeactivated(_publisher, block.timestamp);
    }
    
    function reactivatePublisher(address _publisher) external onlyPublisherManager {
        require(publishers[_publisher].walletAddress != address(0), "PublisherRegistry: publisher not found");
        require(!publishers[_publisher].isActive, "PublisherRegistry: publisher already active");
        
        publishers[_publisher].isActive = true;
        publishers[_publisher].lastActivityAt = block.timestamp;
        
        emit PublisherReactivated(_publisher, block.timestamp);
    }
    
    function updatePublisher(
        address _publisher,
        string calldata _name,
        string calldata _website
    ) external onlyPublisherManager {
        require(publishers[_publisher].walletAddress != address(0), "PublisherRegistry: publisher not found");
        require(bytes(_name).length > 0, "PublisherRegistry: name cannot be empty");
        
        publishers[_publisher].name = _name;
        publishers[_publisher].website = _website;
        publishers[_publisher].lastActivityAt = block.timestamp;
        
        emit PublisherUpdated(_publisher, _name, _website);
    }
    
    function addRevenue(address _publisher, uint256 _amount) external {
        require(
            accessControl.hasRole(accessControl.REVENUE_DISTRIBUTOR_ROLE(), msg.sender),
            "PublisherRegistry: only revenue distributor can add revenue"
        );
        require(publishers[_publisher].isActive, "PublisherRegistry: publisher not active");
        
        publishers[_publisher].totalRevenue += _amount;
        publishers[_publisher].pendingRevenue += _amount;
        publishers[_publisher].lastActivityAt = block.timestamp;
    }
    
    function deductPendingRevenue(address _publisher, uint256 _amount) external {
        require(
            accessControl.hasRole(accessControl.REVENUE_DISTRIBUTOR_ROLE(), msg.sender),
            "PublisherRegistry: only revenue distributor can deduct revenue"
        );
        require(publishers[_publisher].pendingRevenue >= _amount, "PublisherRegistry: insufficient pending revenue");
        
        publishers[_publisher].pendingRevenue -= _amount;
        publishers[_publisher].lastActivityAt = block.timestamp;
    }
    
    function getPublisherStats(address _publisher) 
        external 
        view 
        returns (
            string memory name,
            string memory website,
            uint256 totalRevenue, 
            uint256 pendingRevenue, 
            bool isActive,
            uint256 registeredAt,
            uint256 lastActivityAt
        ) 
    {
        Publisher memory publisher = publishers[_publisher];
        return (
            publisher.name,
            publisher.website,
            publisher.totalRevenue,
            publisher.pendingRevenue,
            publisher.isActive,
            publisher.registeredAt,
            publisher.lastActivityAt
        );
    }
    
    function isPublisher(address _publisher) external view returns (bool) {
        return publishers[_publisher].walletAddress != address(0);
    }
    
    function isActivePublisher(address _publisher) external view returns (bool) {
        return publishers[_publisher].isActive;
    }
    
    function getActivePublishers() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active publishers
        for (uint256 i = 0; i < publisherList.length; i++) {
            if (publishers[publisherList[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active publishers
        address[] memory activePublishers = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < publisherList.length; i++) {
            if (publishers[publisherList[i]].isActive) {
                activePublishers[index] = publisherList[i];
                index++;
            }
        }
        
        return activePublishers;
    }
    
    function getAllPublishers() external view returns (address[] memory) {
        return publisherList;
    }
    
    function getPublisherCount() external view returns (uint256) {
        return publisherList.length;
    }
    
    function getActivePublisherCount() external view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < publisherList.length; i++) {
            if (publishers[publisherList[i]].isActive) {
                activeCount++;
            }
        }
        return activeCount;
    }
}