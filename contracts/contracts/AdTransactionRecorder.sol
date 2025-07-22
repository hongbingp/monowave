// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";
import "./PublisherRegistry.sol";
import "./AdvertiserRegistry.sol";
import "./AISearcherRegistry.sol";

contract AdTransactionRecorder {
    AccessControl private accessControl;
    PublisherRegistry private publisherRegistry;
    AdvertiserRegistry private advertiserRegistry;
    AISearcherRegistry private aiSearcherRegistry;
    
    struct AdTransaction {
        uint256 transactionId;
        address publisher;
        address advertiser;
        address aiSearcher;
        uint256 campaignId;
        uint256 adAmount;
        uint256 publisherShare;
        uint256 aiSearcherShare;
        uint256 platformFee;
        uint256 timestamp;
        string adId;
        string creativeUrl;
        string landingPageUrl;
        string targetAudience;
        string contentUrl;
        string transactionType; // "impression", "click", "conversion"
        bytes32 settlementHash;
        bool settled;
        string status; // "pending", "completed", "disputed", "refunded"
    }
    
    struct AdMetrics {
        uint256 impressions;
        uint256 clicks;
        uint256 conversions;
        uint256 totalRevenue;
        uint256 averageCPM; // Cost per mille (thousand impressions)
        uint256 averageCPC; // Cost per click
        uint256 averageCPA; // Cost per acquisition/conversion
    }
    
    mapping(uint256 => AdTransaction) public adTransactions;
    mapping(address => uint256[]) public publisherTransactions;
    mapping(address => uint256[]) public advertiserTransactions;
    mapping(address => uint256[]) public aiSearcherTransactions;
    mapping(uint256 => uint256[]) public campaignTransactions;
    mapping(string => uint256[]) public adIdTransactions;
    
    // Metrics tracking
    mapping(address => AdMetrics) public publisherMetrics;
    mapping(address => AdMetrics) public advertiserMetrics;
    mapping(uint256 => AdMetrics) public campaignMetrics;
    
    uint256 public transactionCounter;
    uint256 public totalTransactionVolume;
    uint256 public totalPlatformFees;
    
    // Platform fee configuration (in basis points, 10000 = 100%)
    uint256 public platformFeeRate = 200; // 2% platform fee
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max platform fee
    
    // Events
    event AdTransactionRecorded(
        uint256 indexed transactionId,
        address indexed publisher,
        address indexed advertiser,
        address aiSearcher,
        uint256 campaignId,
        uint256 adAmount,
        string transactionType,
        string adId
    );
    event AdTransactionSettled(
        uint256 indexed transactionId,
        bytes32 settlementHash,
        uint256 publisherShare,
        uint256 aiSearcherShare,
        uint256 platformFee
    );
    event AdTransactionStatusChanged(
        uint256 indexed transactionId,
        string oldStatus,
        string newStatus,
        string reason
    );
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event MetricsUpdated(
        address indexed entity,
        string entityType,
        uint256 impressions,
        uint256 clicks,
        uint256 conversions,
        uint256 totalRevenue
    );
    
    modifier onlyAdTransactionRecorder() {
        require(
            accessControl.hasRole(accessControl.AD_TRANSACTION_RECORDER_ROLE(), msg.sender) || 
            msg.sender == accessControl.owner(),
            "AdTransactionRecorder: unauthorized"
        );
        _;
    }
    
    constructor(
        address _accessControl,
        address _publisherRegistry,
        address _advertiserRegistry,
        address _aiSearcherRegistry
    ) {
        require(_accessControl != address(0), "AdTransactionRecorder: invalid access control address");
        require(_publisherRegistry != address(0), "AdTransactionRecorder: invalid publisher registry address");
        require(_advertiserRegistry != address(0), "AdTransactionRecorder: invalid advertiser registry address");
        require(_aiSearcherRegistry != address(0), "AdTransactionRecorder: invalid AI searcher registry address");
        
        accessControl = AccessControl(_accessControl);
        publisherRegistry = PublisherRegistry(_publisherRegistry);
        advertiserRegistry = AdvertiserRegistry(_advertiserRegistry);
        aiSearcherRegistry = AISearcherRegistry(_aiSearcherRegistry);
    }
    
    function recordAdTransaction(
        address _publisher,
        address _advertiser,
        address _aiSearcher,
        uint256 _campaignId,
        uint256 _adAmount,
        string calldata _adId,
        string calldata _creativeUrl,
        string calldata _landingPageUrl,
        string calldata _targetAudience,
        string calldata _contentUrl,
        string calldata _transactionType
    ) external onlyAdTransactionRecorder returns (uint256) {
        require(_publisher != address(0), "AdTransactionRecorder: invalid publisher address");
        require(_advertiser != address(0), "AdTransactionRecorder: invalid advertiser address");
        require(_aiSearcher != address(0), "AdTransactionRecorder: invalid AI searcher address");
        require(_adAmount > 0, "AdTransactionRecorder: amount must be greater than 0");
        require(bytes(_adId).length > 0, "AdTransactionRecorder: ad ID cannot be empty");
        
        // Verify participants are active
        require(publisherRegistry.isActivePublisher(_publisher), "AdTransactionRecorder: publisher not active");
        require(advertiserRegistry.isActiveAdvertiser(_advertiser), "AdTransactionRecorder: advertiser not active");
        require(aiSearcherRegistry.isActiveAISearcher(_aiSearcher), "AdTransactionRecorder: AI searcher not active");
        
        // Calculate shares
        uint256 platformFee = (_adAmount * platformFeeRate) / 10000;
        uint256 remainingAmount = _adAmount - platformFee;
        
        // Get revenue share configuration from RevenueDistributor
        uint256 publisherShare = (remainingAmount * 70) / 100; // 70% to publisher
        uint256 aiSearcherShare = remainingAmount - publisherShare; // 30% to AI searcher
        
        transactionCounter++;
        
        adTransactions[transactionCounter] = AdTransaction({
            transactionId: transactionCounter,
            publisher: _publisher,
            advertiser: _advertiser,
            aiSearcher: _aiSearcher,
            campaignId: _campaignId,
            adAmount: _adAmount,
            publisherShare: publisherShare,
            aiSearcherShare: aiSearcherShare,
            platformFee: platformFee,
            timestamp: block.timestamp,
            adId: _adId,
            creativeUrl: _creativeUrl,
            landingPageUrl: _landingPageUrl,
            targetAudience: _targetAudience,
            contentUrl: _contentUrl,
            transactionType: _transactionType,
            settlementHash: bytes32(0),
            settled: false,
            status: "pending"
        });
        
        // Add to tracking arrays
        publisherTransactions[_publisher].push(transactionCounter);
        advertiserTransactions[_advertiser].push(transactionCounter);
        aiSearcherTransactions[_aiSearcher].push(transactionCounter);
        campaignTransactions[_campaignId].push(transactionCounter);
        adIdTransactions[_adId].push(transactionCounter);
        
        totalTransactionVolume += _adAmount;
        totalPlatformFees += platformFee;
        
        // Update metrics
        _updateMetrics(_publisher, _advertiser, _campaignId, _adAmount, _transactionType);
        
        // Record campaign spend
        advertiserRegistry.recordCampaignSpend(_campaignId, _adAmount);
        
        // Deduct from advertiser escrow
        advertiserRegistry.spendFromEscrow(_advertiser, _adAmount);
        
        emit AdTransactionRecorded(
            transactionCounter,
            _publisher,
            _advertiser,
            _aiSearcher,
            _campaignId,
            _adAmount,
            _transactionType,
            _adId
        );
        
        return transactionCounter;
    }
    
    function settleAdTransaction(
        uint256 _transactionId,
        bytes32 _settlementHash
    ) external onlyAdTransactionRecorder {
        require(_transactionId <= transactionCounter && _transactionId > 0, "AdTransactionRecorder: invalid transaction ID");
        require(!adTransactions[_transactionId].settled, "AdTransactionRecorder: transaction already settled");
        
        AdTransaction storage transaction = adTransactions[_transactionId];
        
        transaction.settlementHash = _settlementHash;
        transaction.settled = true;
        transaction.status = "completed";
        
        emit AdTransactionSettled(
            _transactionId,
            _settlementHash,
            transaction.publisherShare,
            transaction.aiSearcherShare,
            transaction.platformFee
        );
    }
    
    function updateTransactionStatus(
        uint256 _transactionId,
        string calldata _newStatus,
        string calldata _reason
    ) external onlyAdTransactionRecorder {
        require(_transactionId <= transactionCounter && _transactionId > 0, "AdTransactionRecorder: invalid transaction ID");
        
        string memory oldStatus = adTransactions[_transactionId].status;
        adTransactions[_transactionId].status = _newStatus;
        
        emit AdTransactionStatusChanged(_transactionId, oldStatus, _newStatus, _reason);
    }
    
    function disputeTransaction(
        uint256 _transactionId,
        string calldata _reason
    ) external {
        require(_transactionId <= transactionCounter && _transactionId > 0, "AdTransactionRecorder: invalid transaction ID");
        
        AdTransaction memory transaction = adTransactions[_transactionId];
        require(
            msg.sender == transaction.publisher ||
            msg.sender == transaction.advertiser ||
            msg.sender == transaction.aiSearcher ||
            accessControl.hasRole(accessControl.AD_TRANSACTION_RECORDER_ROLE(), msg.sender) ||
            msg.sender == accessControl.owner(),
            "AdTransactionRecorder: unauthorized to dispute"
        );
        
        adTransactions[_transactionId].status = "disputed";
        
        emit AdTransactionStatusChanged(_transactionId, transaction.status, "disputed", _reason);
    }
    
    function _updateMetrics(
        address _publisher,
        address _advertiser,
        uint256 _campaignId,
        uint256 _amount,
        string memory _transactionType
    ) internal {
        // Update publisher metrics
        AdMetrics storage pubMetrics = publisherMetrics[_publisher];
        pubMetrics.totalRevenue += _amount;
        
        // Update advertiser metrics
        AdMetrics storage advMetrics = advertiserMetrics[_advertiser];
        advMetrics.totalRevenue += _amount;
        
        // Update campaign metrics
        AdMetrics storage campMetrics = campaignMetrics[_campaignId];
        campMetrics.totalRevenue += _amount;
        
        // Update specific metrics based on transaction type
        if (keccak256(bytes(_transactionType)) == keccak256(bytes("impression"))) {
            pubMetrics.impressions++;
            advMetrics.impressions++;
            campMetrics.impressions++;
            
            // Update CPM (Cost per 1000 impressions)
            if (pubMetrics.impressions > 0) {
                pubMetrics.averageCPM = (pubMetrics.totalRevenue * 1000) / pubMetrics.impressions;
            }
            if (advMetrics.impressions > 0) {
                advMetrics.averageCPM = (advMetrics.totalRevenue * 1000) / advMetrics.impressions;
            }
            if (campMetrics.impressions > 0) {
                campMetrics.averageCPM = (campMetrics.totalRevenue * 1000) / campMetrics.impressions;
            }
        } else if (keccak256(bytes(_transactionType)) == keccak256(bytes("click"))) {
            pubMetrics.clicks++;
            advMetrics.clicks++;
            campMetrics.clicks++;
            
            // Update CPC (Cost per click)
            if (pubMetrics.clicks > 0) {
                pubMetrics.averageCPC = pubMetrics.totalRevenue / pubMetrics.clicks;
            }
            if (advMetrics.clicks > 0) {
                advMetrics.averageCPC = advMetrics.totalRevenue / advMetrics.clicks;
            }
            if (campMetrics.clicks > 0) {
                campMetrics.averageCPC = campMetrics.totalRevenue / campMetrics.clicks;
            }
        } else if (keccak256(bytes(_transactionType)) == keccak256(bytes("conversion"))) {
            pubMetrics.conversions++;
            advMetrics.conversions++;
            campMetrics.conversions++;
            
            // Update CPA (Cost per acquisition)
            if (pubMetrics.conversions > 0) {
                pubMetrics.averageCPA = pubMetrics.totalRevenue / pubMetrics.conversions;
            }
            if (advMetrics.conversions > 0) {
                advMetrics.averageCPA = advMetrics.totalRevenue / advMetrics.conversions;
            }
            if (campMetrics.conversions > 0) {
                campMetrics.averageCPA = campMetrics.totalRevenue / campMetrics.conversions;
            }
        }
        
        emit MetricsUpdated(_publisher, "publisher", pubMetrics.impressions, pubMetrics.clicks, pubMetrics.conversions, pubMetrics.totalRevenue);
        emit MetricsUpdated(_advertiser, "advertiser", advMetrics.impressions, advMetrics.clicks, advMetrics.conversions, advMetrics.totalRevenue);
    }
    
    function updatePlatformFee(uint256 _newFeeRate) external {
        require(
            msg.sender == accessControl.owner(),
            "AdTransactionRecorder: only owner can update platform fee"
        );
        require(_newFeeRate <= MAX_PLATFORM_FEE, "AdTransactionRecorder: fee rate too high");
        
        uint256 oldFee = platformFeeRate;
        platformFeeRate = _newFeeRate;
        
        emit PlatformFeeUpdated(oldFee, _newFeeRate);
    }
    
    function getAdTransactionDetails(uint256 _transactionId)
        external
        view
        returns (
            address publisher,
            address advertiser,
            address aiSearcher,
            uint256 campaignId,
            uint256 adAmount,
            uint256 publisherShare,
            uint256 aiSearcherShare,
            uint256 platformFee,
            uint256 timestamp,
            string memory adId,
            string memory transactionType,
            bytes32 settlementHash,
            bool settled,
            string memory status
        )
    {
        require(_transactionId <= transactionCounter && _transactionId > 0, "AdTransactionRecorder: invalid transaction ID");
        AdTransaction memory transaction = adTransactions[_transactionId];
        return (
            transaction.publisher,
            transaction.advertiser,
            transaction.aiSearcher,
            transaction.campaignId,
            transaction.adAmount,
            transaction.publisherShare,
            transaction.aiSearcherShare,
            transaction.platformFee,
            transaction.timestamp,
            transaction.adId,
            transaction.transactionType,
            transaction.settlementHash,
            transaction.settled,
            transaction.status
        );
    }
    
    function getEntityTransactions(address _entity, string calldata _entityType) 
        external 
        view 
        returns (uint256[] memory) 
    {
        if (keccak256(bytes(_entityType)) == keccak256(bytes("publisher"))) {
            return publisherTransactions[_entity];
        } else if (keccak256(bytes(_entityType)) == keccak256(bytes("advertiser"))) {
            return advertiserTransactions[_entity];
        } else if (keccak256(bytes(_entityType)) == keccak256(bytes("ai_searcher"))) {
            return aiSearcherTransactions[_entity];
        }
        revert("AdTransactionRecorder: invalid entity type");
    }
    
    function getCampaignTransactions(uint256 _campaignId) external view returns (uint256[] memory) {
        return campaignTransactions[_campaignId];
    }
    
    function getAdIdTransactions(string calldata _adId) external view returns (uint256[] memory) {
        return adIdTransactions[_adId];
    }
    
    function getEntityMetrics(address _entity, string calldata _entityType) 
        external 
        view 
        returns (
            uint256 impressions,
            uint256 clicks,
            uint256 conversions,
            uint256 totalRevenue,
            uint256 averageCPM,
            uint256 averageCPC,
            uint256 averageCPA
        ) 
    {
        AdMetrics memory metrics;
        if (keccak256(bytes(_entityType)) == keccak256(bytes("publisher"))) {
            metrics = publisherMetrics[_entity];
        } else if (keccak256(bytes(_entityType)) == keccak256(bytes("advertiser"))) {
            metrics = advertiserMetrics[_entity];
        } else {
            revert("AdTransactionRecorder: invalid entity type");
        }
        
        return (
            metrics.impressions,
            metrics.clicks,
            metrics.conversions,
            metrics.totalRevenue,
            metrics.averageCPM,
            metrics.averageCPC,
            metrics.averageCPA
        );
    }
    
    function getCampaignMetrics(uint256 _campaignId) 
        external 
        view 
        returns (
            uint256 impressions,
            uint256 clicks,
            uint256 conversions,
            uint256 totalRevenue,
            uint256 averageCPM,
            uint256 averageCPC,
            uint256 averageCPA
        ) 
    {
        AdMetrics memory metrics = campaignMetrics[_campaignId];
        return (
            metrics.impressions,
            metrics.clicks,
            metrics.conversions,
            metrics.totalRevenue,
            metrics.averageCPM,
            metrics.averageCPC,
            metrics.averageCPA
        );
    }
    
    function getPlatformStats()
        external
        view
        returns (
            uint256 _transactionCounter,
            uint256 _totalTransactionVolume,
            uint256 _totalPlatformFees,
            uint256 _platformFeeRate
        )
    {
        return (transactionCounter, totalTransactionVolume, totalPlatformFees, platformFeeRate);
    }
}