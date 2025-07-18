// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AdChainContract is Ownable, ReentrancyGuard {
    IERC20 public stablecoin;
    
    struct Publisher {
        address walletAddress;
        uint256 totalRevenue;
        uint256 pendingRevenue;
        bool isActive;
    }
    
    struct CrawlCharge {
        uint256 apiKeyId;
        uint256 amount;
        uint256 timestamp;
        bool processed;
    }
    
    mapping(address => Publisher) public publishers;
    mapping(uint256 => CrawlCharge) public crawlCharges;
    mapping(address => bool) public authorizedChargers;
    
    uint256 public totalCharges;
    uint256 public totalDistributed;
    uint256 public chargeCounter;
    
    event PublisherRegistered(address indexed publisher, uint256 timestamp);
    event ChargeProcessed(uint256 indexed chargeId, uint256 apiKeyId, uint256 amount);
    event RevenueDistributed(address indexed publisher, uint256 amount);
    event BatchDistributionCompleted(uint256 totalAmount, uint256 publisherCount);
    
    modifier onlyAuthorized() {
        require(authorizedChargers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor(address _stablecoin) Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoin);
    }
    
    function setStablecoin(address _stablecoin) external onlyOwner {
        stablecoin = IERC20(_stablecoin);
    }
    
    function addAuthorizedCharger(address _charger) external onlyOwner {
        authorizedChargers[_charger] = true;
    }
    
    function removeAuthorizedCharger(address _charger) external onlyOwner {
        authorizedChargers[_charger] = false;
    }
    
    function registerPublisher(address _publisher) external onlyOwner {
        require(_publisher != address(0), "Invalid publisher address");
        
        publishers[_publisher] = Publisher({
            walletAddress: _publisher,
            totalRevenue: 0,
            pendingRevenue: 0,
            isActive: true
        });
        
        emit PublisherRegistered(_publisher, block.timestamp);
    }
    
    function deactivatePublisher(address _publisher) external onlyOwner {
        publishers[_publisher].isActive = false;
    }
    
    function charge(uint256 _apiKeyId, uint256 _amount) external onlyAuthorized {
        require(_amount > 0, "Amount must be greater than 0");
        
        chargeCounter++;
        crawlCharges[chargeCounter] = CrawlCharge({
            apiKeyId: _apiKeyId,
            amount: _amount,
            timestamp: block.timestamp,
            processed: false
        });
        
        totalCharges += _amount;
        
        emit ChargeProcessed(chargeCounter, _apiKeyId, _amount);
    }
    
    function distribute(address[] calldata _publishers, uint256[] calldata _amounts) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(_publishers.length == _amounts.length, "Arrays length mismatch");
        require(_publishers.length > 0, "No publishers provided");
        
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < _publishers.length; i++) {
            address publisher = _publishers[i];
            uint256 amount = _amounts[i];
            
            require(publishers[publisher].isActive, "Publisher not active");
            require(amount > 0, "Amount must be greater than 0");
            
            totalAmount += amount;
            
            publishers[publisher].totalRevenue += amount;
            publishers[publisher].pendingRevenue += amount;
        }
        
        require(stablecoin.transferFrom(msg.sender, address(this), totalAmount), "Transfer failed");
        
        for (uint256 i = 0; i < _publishers.length; i++) {
            address publisher = _publishers[i];
            uint256 amount = _amounts[i];
            
            require(stablecoin.transfer(publisher, amount), "Distribution failed");
            
            publishers[publisher].pendingRevenue -= amount;
            
            emit RevenueDistributed(publisher, amount);
        }
        
        totalDistributed += totalAmount;
        
        emit BatchDistributionCompleted(totalAmount, _publishers.length);
    }
    
    function getPublisherStats(address _publisher) 
        external 
        view 
        returns (uint256 totalRevenue, uint256 pendingRevenue, bool isActive) 
    {
        Publisher memory publisher = publishers[_publisher];
        return (publisher.totalRevenue, publisher.pendingRevenue, publisher.isActive);
    }
    
    function getChargeDetails(uint256 _chargeId) 
        external 
        view 
        returns (uint256 apiKeyId, uint256 amount, uint256 timestamp, bool processed) 
    {
        CrawlCharge memory charge = crawlCharges[_chargeId];
        return (charge.apiKeyId, charge.amount, charge.timestamp, charge.processed);
    }
    
    function getTotalStats() 
        external 
        view 
        returns (uint256 _totalCharges, uint256 _totalDistributed, uint256 _chargeCounter) 
    {
        return (totalCharges, totalDistributed, chargeCounter);
    }
    
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            payable(owner()).transfer(_amount);
        } else {
            IERC20(_token).transfer(owner(), _amount);
        }
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}