// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

contract AISearcherRegistry {
    AccessControl private accessControl;
    
    struct AISearcher {
        address walletAddress;
        string name;
        string description;
        string apiEndpoint;
        uint256 totalCrawlRequests;
        uint256 totalSpent;
        uint256 prepaidBalance;
        bool isActive;
        uint256 registeredAt;
        uint256 lastActivityAt;
        string[] supportedFormats; // ["raw", "summary", "structured"]
        uint256 creditLimit;
        string status; // "active", "suspended", "pending_approval"
    }
    
    struct APIKey {
        uint256 keyId;
        address aiSearcher;
        string keyHash;
        string name;
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 rateLimit; // requests per second
        bool isActive;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 usageToday;
        uint256 usageThisMonth;
        uint256 lastUsageReset;
    }
    
    mapping(address => AISearcher) public aiSearchers;
    mapping(uint256 => APIKey) public apiKeys;
    mapping(address => uint256[]) public searcherApiKeys;
    mapping(string => uint256) public keyHashToId;
    
    address[] public aiSearcherList;
    uint256 public aiSearcherCounter;
    uint256 public apiKeyCounter;
    
    // Events
    event AISearcherRegistered(
        address indexed aiSearcher,
        string name,
        string description,
        uint256 timestamp
    );
    event AISearcherStatusChanged(
        address indexed aiSearcher,
        string oldStatus,
        string newStatus,
        uint256 timestamp
    );
    event AISearcherUpdated(
        address indexed aiSearcher,
        string name,
        string description,
        string apiEndpoint
    );
    event PrepaidBalanceUpdated(
        address indexed aiSearcher,
        uint256 oldBalance,
        uint256 newBalance,
        string operation
    );
    event APIKeyCreated(
        uint256 indexed keyId,
        address indexed aiSearcher,
        string name,
        uint256 dailyLimit,
        uint256 monthlyLimit
    );
    event APIKeyStatusChanged(
        uint256 indexed keyId,
        bool oldStatus,
        bool newStatus
    );
    event UsageRecorded(
        uint256 indexed keyId,
        address indexed aiSearcher,
        uint256 requestCount,
        uint256 bytesProcessed,
        uint256 cost
    );
    
    modifier onlyAISearcherManager() {
        require(
            accessControl.hasRole(accessControl.AI_SEARCHER_MANAGER_ROLE(), msg.sender) || 
            msg.sender == accessControl.owner(),
            "AISearcherRegistry: unauthorized"
        );
        _;
    }
    
    modifier onlySearcherOrManager(address _aiSearcher) {
        require(
            msg.sender == _aiSearcher ||
            accessControl.hasRole(accessControl.AI_SEARCHER_MANAGER_ROLE(), msg.sender) ||
            msg.sender == accessControl.owner(),
            "AISearcherRegistry: unauthorized"
        );
        _;
    }
    
    constructor(address _accessControl) {
        require(_accessControl != address(0), "AISearcherRegistry: invalid access control address");
        accessControl = AccessControl(_accessControl);
    }
    
    function registerAISearcher(
        address _aiSearcher,
        string calldata _name,
        string calldata _description,
        string calldata _apiEndpoint,
        string[] calldata _supportedFormats,
        uint256 _creditLimit
    ) external onlyAISearcherManager {
        require(_aiSearcher != address(0), "AISearcherRegistry: invalid AI searcher address");
        require(bytes(_name).length > 0, "AISearcherRegistry: name cannot be empty");
        require(!aiSearchers[_aiSearcher].isActive, "AISearcherRegistry: AI searcher already registered");
        
        aiSearcherCounter++;
        
        aiSearchers[_aiSearcher] = AISearcher({
            walletAddress: _aiSearcher,
            name: _name,
            description: _description,
            apiEndpoint: _apiEndpoint,
            totalCrawlRequests: 0,
            totalSpent: 0,
            prepaidBalance: 0,
            isActive: true,
            registeredAt: block.timestamp,
            lastActivityAt: block.timestamp,
            supportedFormats: _supportedFormats,
            creditLimit: _creditLimit,
            status: "pending_approval"
        });
        
        aiSearcherList.push(_aiSearcher);
        
        emit AISearcherRegistered(_aiSearcher, _name, _description, block.timestamp);
    }
    
    function updateAISearcherStatus(
        address _aiSearcher,
        string calldata _newStatus
    ) external onlyAISearcherManager {
        require(aiSearchers[_aiSearcher].walletAddress != address(0), "AISearcherRegistry: AI searcher not found");
        
        string memory oldStatus = aiSearchers[_aiSearcher].status;
        aiSearchers[_aiSearcher].status = _newStatus;
        aiSearchers[_aiSearcher].lastActivityAt = block.timestamp;
        
        // Update active status based on new status
        aiSearchers[_aiSearcher].isActive = 
            keccak256(bytes(_newStatus)) == keccak256(bytes("active"));
        
        emit AISearcherStatusChanged(_aiSearcher, oldStatus, _newStatus, block.timestamp);
    }
    
    function updateAISearcher(
        address _aiSearcher,
        string calldata _name,
        string calldata _description,
        string calldata _apiEndpoint,
        string[] calldata _supportedFormats,
        uint256 _creditLimit
    ) external onlySearcherOrManager(_aiSearcher) {
        require(aiSearchers[_aiSearcher].walletAddress != address(0), "AISearcherRegistry: AI searcher not found");
        require(bytes(_name).length > 0, "AISearcherRegistry: name cannot be empty");
        
        aiSearchers[_aiSearcher].name = _name;
        aiSearchers[_aiSearcher].description = _description;
        aiSearchers[_aiSearcher].apiEndpoint = _apiEndpoint;
        aiSearchers[_aiSearcher].supportedFormats = _supportedFormats;
        aiSearchers[_aiSearcher].creditLimit = _creditLimit;
        aiSearchers[_aiSearcher].lastActivityAt = block.timestamp;
        
        emit AISearcherUpdated(_aiSearcher, _name, _description, _apiEndpoint);
    }
    
    function addPrepaidBalance(address _aiSearcher, uint256 _amount) external {
        require(
            accessControl.hasRole(accessControl.PREPAYMENT_MANAGER_ROLE(), msg.sender),
            "AISearcherRegistry: only prepayment manager can add balance"
        );
        require(aiSearchers[_aiSearcher].isActive, "AISearcherRegistry: AI searcher not active");
        require(_amount > 0, "AISearcherRegistry: amount must be greater than 0");
        
        uint256 oldBalance = aiSearchers[_aiSearcher].prepaidBalance;
        aiSearchers[_aiSearcher].prepaidBalance += _amount;
        aiSearchers[_aiSearcher].lastActivityAt = block.timestamp;
        
        emit PrepaidBalanceUpdated(_aiSearcher, oldBalance, aiSearchers[_aiSearcher].prepaidBalance, "deposit");
    }
    
    function deductPrepaidBalance(address _aiSearcher, uint256 _amount) external {
        require(
            accessControl.hasRole(accessControl.CHARGE_MANAGER_ROLE(), msg.sender),
            "AISearcherRegistry: only charge manager can deduct balance"
        );
        require(aiSearchers[_aiSearcher].prepaidBalance >= _amount, "AISearcherRegistry: insufficient prepaid balance");
        
        uint256 oldBalance = aiSearchers[_aiSearcher].prepaidBalance;
        aiSearchers[_aiSearcher].prepaidBalance -= _amount;
        aiSearchers[_aiSearcher].totalSpent += _amount;
        aiSearchers[_aiSearcher].lastActivityAt = block.timestamp;
        
        emit PrepaidBalanceUpdated(_aiSearcher, oldBalance, aiSearchers[_aiSearcher].prepaidBalance, "charge");
    }
    
    function createAPIKey(
        address _aiSearcher,
        string calldata _keyHash,
        string calldata _name,
        uint256 _dailyLimit,
        uint256 _monthlyLimit,
        uint256 _rateLimit,
        uint256 _expiresAt
    ) external onlySearcherOrManager(_aiSearcher) returns (uint256) {
        require(aiSearchers[_aiSearcher].isActive, "AISearcherRegistry: AI searcher not active");
        require(bytes(_name).length > 0, "AISearcherRegistry: API key name cannot be empty");
        require(bytes(_keyHash).length > 0, "AISearcherRegistry: key hash cannot be empty");
        require(keyHashToId[_keyHash] == 0, "AISearcherRegistry: key hash already exists");
        require(_dailyLimit > 0 && _monthlyLimit > 0, "AISearcherRegistry: limits must be positive");
        
        apiKeyCounter++;
        
        apiKeys[apiKeyCounter] = APIKey({
            keyId: apiKeyCounter,
            aiSearcher: _aiSearcher,
            keyHash: _keyHash,
            name: _name,
            dailyLimit: _dailyLimit,
            monthlyLimit: _monthlyLimit,
            rateLimit: _rateLimit,
            isActive: true,
            createdAt: block.timestamp,
            expiresAt: _expiresAt,
            usageToday: 0,
            usageThisMonth: 0,
            lastUsageReset: block.timestamp
        });
        
        keyHashToId[_keyHash] = apiKeyCounter;
        searcherApiKeys[_aiSearcher].push(apiKeyCounter);
        
        emit APIKeyCreated(apiKeyCounter, _aiSearcher, _name, _dailyLimit, _monthlyLimit);
        
        return apiKeyCounter;
    }
    
    function updateAPIKeyStatus(uint256 _keyId, bool _isActive) external {
        require(_keyId <= apiKeyCounter && _keyId > 0, "AISearcherRegistry: invalid API key ID");
        require(
            msg.sender == apiKeys[_keyId].aiSearcher ||
            accessControl.hasRole(accessControl.AI_SEARCHER_MANAGER_ROLE(), msg.sender) ||
            msg.sender == accessControl.owner(),
            "AISearcherRegistry: unauthorized"
        );
        
        bool oldStatus = apiKeys[_keyId].isActive;
        apiKeys[_keyId].isActive = _isActive;
        
        emit APIKeyStatusChanged(_keyId, oldStatus, _isActive);
    }
    
    function recordUsage(
        uint256 _keyId,
        uint256 _requestCount,
        uint256 _bytesProcessed,
        uint256 _cost
    ) external {
        require(
            accessControl.hasRole(accessControl.CHARGE_MANAGER_ROLE(), msg.sender),
            "AISearcherRegistry: only charge manager can record usage"
        );
        require(_keyId <= apiKeyCounter && _keyId > 0, "AISearcherRegistry: invalid API key ID");
        require(apiKeys[_keyId].isActive, "AISearcherRegistry: API key not active");
        
        // Reset daily/monthly counters if needed
        _resetUsageCountersIfNeeded(_keyId);
        
        // Check limits
        require(
            apiKeys[_keyId].usageToday + _requestCount <= apiKeys[_keyId].dailyLimit,
            "AISearcherRegistry: daily limit exceeded"
        );
        require(
            apiKeys[_keyId].usageThisMonth + _requestCount <= apiKeys[_keyId].monthlyLimit,
            "AISearcherRegistry: monthly limit exceeded"
        );
        
        // Update usage counters
        apiKeys[_keyId].usageToday += _requestCount;
        apiKeys[_keyId].usageThisMonth += _requestCount;
        
        // Update AI searcher stats
        address aiSearcher = apiKeys[_keyId].aiSearcher;
        aiSearchers[aiSearcher].totalCrawlRequests += _requestCount;
        aiSearchers[aiSearcher].lastActivityAt = block.timestamp;
        
        emit UsageRecorded(_keyId, aiSearcher, _requestCount, _bytesProcessed, _cost);
    }
    
    function _resetUsageCountersIfNeeded(uint256 _keyId) internal {
        // Reset daily counter (every 24 hours)
        if (block.timestamp >= apiKeys[_keyId].lastUsageReset + 86400) {
            apiKeys[_keyId].usageToday = 0;
            apiKeys[_keyId].lastUsageReset = block.timestamp;
        }
        
        // Reset monthly counter (approximately every 30 days)
        if (block.timestamp >= apiKeys[_keyId].lastUsageReset + (86400 * 30)) {
            apiKeys[_keyId].usageThisMonth = 0;
        }
    }
    
    function getAISearcherStats(address _aiSearcher)
        external
        view
        returns (
            string memory name,
            string memory description,
            string memory apiEndpoint,
            uint256 totalCrawlRequests,
            uint256 totalSpent,
            uint256 prepaidBalance,
            bool isActive,
            uint256 registeredAt,
            uint256 lastActivityAt,
            string[] memory supportedFormats,
            uint256 creditLimit,
            string memory status
        )
    {
        AISearcher memory searcher = aiSearchers[_aiSearcher];
        return (
            searcher.name,
            searcher.description,
            searcher.apiEndpoint,
            searcher.totalCrawlRequests,
            searcher.totalSpent,
            searcher.prepaidBalance,
            searcher.isActive,
            searcher.registeredAt,
            searcher.lastActivityAt,
            searcher.supportedFormats,
            searcher.creditLimit,
            searcher.status
        );
    }
    
    function getAPIKeyDetails(uint256 _keyId)
        external
        view
        returns (
            address aiSearcher,
            string memory keyHash,
            string memory name,
            uint256 dailyLimit,
            uint256 monthlyLimit,
            uint256 rateLimit,
            bool isActive,
            uint256 createdAt,
            uint256 expiresAt,
            uint256 usageToday,
            uint256 usageThisMonth
        )
    {
        require(_keyId <= apiKeyCounter && _keyId > 0, "AISearcherRegistry: invalid API key ID");
        APIKey memory key = apiKeys[_keyId];
        return (
            key.aiSearcher,
            key.keyHash,
            key.name,
            key.dailyLimit,
            key.monthlyLimit,
            key.rateLimit,
            key.isActive,
            key.createdAt,
            key.expiresAt,
            key.usageToday,
            key.usageThisMonth
        );
    }
    
    function getAPIKeyByHash(string calldata _keyHash) external view returns (uint256) {
        return keyHashToId[_keyHash];
    }
    
    function getSearcherAPIKeys(address _aiSearcher) external view returns (uint256[] memory) {
        return searcherApiKeys[_aiSearcher];
    }
    
    function isAISearcher(address _aiSearcher) external view returns (bool) {
        return aiSearchers[_aiSearcher].walletAddress != address(0);
    }
    
    function isActiveAISearcher(address _aiSearcher) external view returns (bool) {
        return aiSearchers[_aiSearcher].isActive;
    }
    
    function getActiveAISearchers() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < aiSearcherList.length; i++) {
            if (aiSearchers[aiSearcherList[i]].isActive) {
                activeCount++;
            }
        }
        
        address[] memory activeSearchers = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < aiSearcherList.length; i++) {
            if (aiSearchers[aiSearcherList[i]].isActive) {
                activeSearchers[index] = aiSearcherList[i];
                index++;
            }
        }
        
        return activeSearchers;
    }
    
    function getAISearcherCount() external view returns (uint256) {
        return aiSearcherList.length;
    }
    
    function getAPIKeyCount() external view returns (uint256) {
        return apiKeyCounter;
    }
}