// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

contract ChargeManager {
    AccessControl private accessControl;
    
    struct CrawlCharge {
        uint256 apiKeyId;
        address aiSearcher;
        string url;
        uint256 amount;
        uint256 timestamp;
        bool processed;
        string chargeType; // "crawl", "format_premium", "overage"
        bytes32 transactionHash;
    }
    
    mapping(uint256 => CrawlCharge) public crawlCharges;
    mapping(address => uint256[]) public aiSearcherCharges;
    mapping(uint256 => uint256[]) public apiKeyCharges;
    
    uint256 public chargeCounter;
    uint256 public totalCharges;
    uint256 public totalProcessedCharges;
    
    // Events
    event ChargeProcessed(
        uint256 indexed chargeId,
        uint256 indexed apiKeyId,
        address indexed aiSearcher,
        string url,
        uint256 amount,
        string chargeType
    );
    event ChargeMarkedProcessed(uint256 indexed chargeId, bytes32 transactionHash);
    event ChargeDisputed(uint256 indexed chargeId, string reason);
    
    modifier onlyChargeManager() {
        require(
            accessControl.hasRole(accessControl.CHARGE_MANAGER_ROLE(), msg.sender) || 
            msg.sender == accessControl.owner(),
            "ChargeManager: unauthorized"
        );
        _;
    }
    
    constructor(address _accessControl) {
        require(_accessControl != address(0), "ChargeManager: invalid access control address");
        accessControl = AccessControl(_accessControl);
    }
    
    function processCharge(
        uint256 _apiKeyId,
        address _aiSearcher,
        string calldata _url,
        uint256 _amount,
        string calldata _chargeType
    ) external onlyChargeManager returns (uint256) {
        require(_aiSearcher != address(0), "ChargeManager: invalid AI searcher address");
        require(_amount > 0, "ChargeManager: amount must be greater than 0");
        require(bytes(_url).length > 0, "ChargeManager: URL cannot be empty");
        
        chargeCounter++;
        
        crawlCharges[chargeCounter] = CrawlCharge({
            apiKeyId: _apiKeyId,
            aiSearcher: _aiSearcher,
            url: _url,
            amount: _amount,
            timestamp: block.timestamp,
            processed: false,
            chargeType: _chargeType,
            transactionHash: bytes32(0)
        });
        
        // Add to tracking arrays
        aiSearcherCharges[_aiSearcher].push(chargeCounter);
        apiKeyCharges[_apiKeyId].push(chargeCounter);
        
        totalCharges += _amount;
        
        emit ChargeProcessed(chargeCounter, _apiKeyId, _aiSearcher, _url, _amount, _chargeType);
        
        return chargeCounter;
    }
    
    function markChargeProcessed(uint256 _chargeId, bytes32 _transactionHash) external onlyChargeManager {
        require(_chargeId <= chargeCounter && _chargeId > 0, "ChargeManager: invalid charge ID");
        require(!crawlCharges[_chargeId].processed, "ChargeManager: charge already processed");
        
        crawlCharges[_chargeId].processed = true;
        crawlCharges[_chargeId].transactionHash = _transactionHash;
        totalProcessedCharges += crawlCharges[_chargeId].amount;
        
        emit ChargeMarkedProcessed(_chargeId, _transactionHash);
    }
    
    function disputeCharge(uint256 _chargeId, string calldata _reason) external {
        require(_chargeId <= chargeCounter && _chargeId > 0, "ChargeManager: invalid charge ID");
        require(
            crawlCharges[_chargeId].aiSearcher == msg.sender ||
            accessControl.hasRole(accessControl.CHARGE_MANAGER_ROLE(), msg.sender) ||
            msg.sender == accessControl.owner(),
            "ChargeManager: unauthorized to dispute"
        );
        require(bytes(_reason).length > 0, "ChargeManager: dispute reason cannot be empty");
        
        emit ChargeDisputed(_chargeId, _reason);
    }
    
    function getChargeDetails(uint256 _chargeId) 
        external 
        view 
        returns (
            uint256 apiKeyId,
            address aiSearcher,
            string memory url,
            uint256 amount,
            uint256 timestamp,
            bool processed,
            string memory chargeType,
            bytes32 transactionHash
        ) 
    {
        require(_chargeId <= chargeCounter && _chargeId > 0, "ChargeManager: invalid charge ID");
        CrawlCharge memory charge = crawlCharges[_chargeId];
        return (
            charge.apiKeyId,
            charge.aiSearcher,
            charge.url,
            charge.amount,
            charge.timestamp,
            charge.processed,
            charge.chargeType,
            charge.transactionHash
        );
    }
    
    function getAISearcherCharges(address _aiSearcher) external view returns (uint256[] memory) {
        return aiSearcherCharges[_aiSearcher];
    }
    
    function getAPIKeyCharges(uint256 _apiKeyId) external view returns (uint256[] memory) {
        return apiKeyCharges[_apiKeyId];
    }
    
    function getAISearcherChargeStats(address _aiSearcher) 
        external 
        view 
        returns (
            uint256 totalChargeCount,
            uint256 totalChargeAmount,
            uint256 processedChargeCount,
            uint256 processedChargeAmount
        ) 
    {
        uint256[] memory charges = aiSearcherCharges[_aiSearcher];
        uint256 processedCount = 0;
        uint256 processedAmount = 0;
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < charges.length; i++) {
            CrawlCharge memory charge = crawlCharges[charges[i]];
            totalAmount += charge.amount;
            
            if (charge.processed) {
                processedCount++;
                processedAmount += charge.amount;
            }
        }
        
        return (charges.length, totalAmount, processedCount, processedAmount);
    }
    
    function getAPIKeyChargeStats(uint256 _apiKeyId) 
        external 
        view 
        returns (
            uint256 totalChargeCount,
            uint256 totalChargeAmount,
            uint256 processedChargeCount,
            uint256 processedChargeAmount
        ) 
    {
        uint256[] memory charges = apiKeyCharges[_apiKeyId];
        uint256 processedCount = 0;
        uint256 processedAmount = 0;
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < charges.length; i++) {
            CrawlCharge memory charge = crawlCharges[charges[i]];
            totalAmount += charge.amount;
            
            if (charge.processed) {
                processedCount++;
                processedAmount += charge.amount;
            }
        }
        
        return (charges.length, totalAmount, processedCount, processedAmount);
    }
    
    function getChargesByTimeRange(uint256 _startTime, uint256 _endTime) 
        external 
        view 
        returns (uint256[] memory) 
    {
        require(_startTime <= _endTime, "ChargeManager: invalid time range");
        
        uint256 count = 0;
        
        // First pass: count matching charges
        for (uint256 i = 1; i <= chargeCounter; i++) {
            if (crawlCharges[i].timestamp >= _startTime && crawlCharges[i].timestamp <= _endTime) {
                count++;
            }
        }
        
        // Second pass: collect matching charges
        uint256[] memory matchingCharges = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= chargeCounter; i++) {
            if (crawlCharges[i].timestamp >= _startTime && crawlCharges[i].timestamp <= _endTime) {
                matchingCharges[index] = i;
                index++;
            }
        }
        
        return matchingCharges;
    }
    
    function getTotalStats() 
        external 
        view 
        returns (
            uint256 _totalCharges,
            uint256 _totalProcessedCharges,
            uint256 _chargeCounter,
            uint256 pendingCharges
        ) 
    {
        return (
            totalCharges,
            totalProcessedCharges,
            chargeCounter,
            totalCharges - totalProcessedCharges
        );
    }
}