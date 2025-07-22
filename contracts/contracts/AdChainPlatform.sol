// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AccessControl.sol";
import "./PublisherRegistry.sol";
import "./ChargeManager.sol";
import "./RevenueDistributor.sol";
import "./AdvertiserRegistry.sol";
import "./AISearcherRegistry.sol";
import "./PrepaymentManager.sol";
import "./AdTransactionRecorder.sol";

contract AdChainPlatform is ReentrancyGuard {
    // Module contracts
    AccessControl public accessControl;
    PublisherRegistry public publisherRegistry;
    ChargeManager public chargeManager;
    RevenueDistributor public revenueDistributor;
    AdvertiserRegistry public advertiserRegistry;
    AISearcherRegistry public aiSearcherRegistry;
    PrepaymentManager public prepaymentManager;
    AdTransactionRecorder public adTransactionRecorder;
    
    IERC20 public stablecoin;
    
    // Platform state
    bool public platformActive;
    uint256 public platformVersion;
    uint256 public launchTimestamp;
    address public platformOwner;
    
    // Events
    event PlatformInitialized(
        uint256 version,
        uint256 timestamp,
        address indexed owner
    );
    event PlatformStatusChanged(bool active, uint256 timestamp);
    event ModuleUpgraded(string moduleName, address oldAddress, address newAddress);
    event CrawlRequestProcessed(
        uint256 indexed chargeId,
        address indexed aiSearcher,
        uint256 apiKeyId,
        string url,
        uint256 cost
    );
    event AdTransactionCompleted(
        uint256 indexed transactionId,
        uint256 indexed distributionId,
        address indexed publisher,
        address advertiser,
        address aiSearcher,
        uint256 totalAmount
    );
    
    modifier onlyOwner() {
        require(msg.sender == platformOwner, "AdChainPlatform: only owner");
        _;
    }
    
    modifier onlyWhenActive() {
        require(platformActive, "AdChainPlatform: platform not active");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            accessControl.hasRole(accessControl.CHARGE_MANAGER_ROLE(), msg.sender) ||
            accessControl.hasRole(accessControl.REVENUE_DISTRIBUTOR_ROLE(), msg.sender) ||
            msg.sender == accessControl.owner(),
            "AdChainPlatform: unauthorized"
        );
        _;
    }
    
    constructor(
        address _stablecoin,
        uint256 _version
    ) {
        require(_stablecoin != address(0), "AdChainPlatform: invalid stablecoin address");
        
        stablecoin = IERC20(_stablecoin);
        platformVersion = _version;
        launchTimestamp = block.timestamp;
        platformActive = false;
        platformOwner = msg.sender;
        
        // Deploy AccessControl first - make this contract the owner to manage roles
        accessControl = new AccessControl(address(this));
        
        emit PlatformInitialized(_version, block.timestamp, msg.sender);
    }
    
    function initializeModules() external onlyOwner {
        require(address(publisherRegistry) == address(0), "AdChainPlatform: modules already initialized");
        
        // Deploy all module contracts
        publisherRegistry = new PublisherRegistry(address(accessControl));
        chargeManager = new ChargeManager(address(accessControl));
        revenueDistributor = new RevenueDistributor(
            address(accessControl),
            address(publisherRegistry),
            address(stablecoin)
        );
        advertiserRegistry = new AdvertiserRegistry(address(accessControl));
        aiSearcherRegistry = new AISearcherRegistry(address(accessControl));
        prepaymentManager = new PrepaymentManager(
            address(accessControl),
            address(aiSearcherRegistry),
            address(advertiserRegistry),
            address(stablecoin)
        );
        adTransactionRecorder = new AdTransactionRecorder(
            address(accessControl),
            address(publisherRegistry),
            address(advertiserRegistry),
            address(aiSearcherRegistry)
        );
        
        // Grant roles to this contract to orchestrate operations
        accessControl.grantRole(accessControl.PUBLISHER_MANAGER_ROLE(), address(this));
        accessControl.grantRole(accessControl.CHARGE_MANAGER_ROLE(), address(this));
        accessControl.grantRole(accessControl.REVENUE_DISTRIBUTOR_ROLE(), address(this));
        accessControl.grantRole(accessControl.ADVERTISER_MANAGER_ROLE(), address(this));
        accessControl.grantRole(accessControl.AI_SEARCHER_MANAGER_ROLE(), address(this));
        accessControl.grantRole(accessControl.PREPAYMENT_MANAGER_ROLE(), address(this));
        accessControl.grantRole(accessControl.AD_TRANSACTION_RECORDER_ROLE(), address(this));
        
        platformActive = true;
        emit PlatformStatusChanged(true, block.timestamp);
    }
    
    function processCrawlRequest(
        uint256 _apiKeyId,
        address _aiSearcher,
        string calldata _url,
        uint256 _cost,
        string calldata _chargeType
    ) external onlyAuthorized onlyWhenActive returns (uint256) {
        return _processCrawlRequestInternal(_apiKeyId, _aiSearcher, _url, _cost, _chargeType);
    }
    
    function processAdTransaction(
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
    ) external onlyAuthorized onlyWhenActive returns (uint256, uint256) {
        // Verify advertiser has sufficient escrow balance
        (, , , , uint256 escrowBalance, , , , , ) = advertiserRegistry.getAdvertiserStats(_advertiser);
        require(escrowBalance >= _adAmount, "AdChainPlatform: insufficient advertiser escrow");
        
        // Record ad transaction
        uint256 transactionId = adTransactionRecorder.recordAdTransaction(
            _publisher,
            _advertiser,
            _aiSearcher,
            _campaignId,
            _adAmount,
            _adId,
            _creativeUrl,
            _landingPageUrl,
            _targetAudience,
            _contentUrl,
            _transactionType
        );
        
        // Get transaction details for distribution
        (
            , , , , uint256 adAmount, uint256 publisherShare, uint256 aiSearcherShare, ,
            , , , , ,
        ) = adTransactionRecorder.getAdTransactionDetails(transactionId);
        
        // Distribute revenue
        uint256 distributionId = revenueDistributor.distributeAdRevenue(_publisher, _aiSearcher, adAmount);
        
        // Settle the transaction
        bytes32 settlementHash = keccak256(abi.encodePacked(transactionId, distributionId, block.timestamp));
        adTransactionRecorder.settleAdTransaction(transactionId, settlementHash);
        
        emit AdTransactionCompleted(transactionId, distributionId, _publisher, _advertiser, _aiSearcher, adAmount);
        
        return (transactionId, distributionId);
    }
    
    function batchProcessCrawlRequests(
        uint256[] calldata _apiKeyIds,
        address[] calldata _aiSearchers,
        string[] calldata _urls,
        uint256[] calldata _costs,
        string[] calldata _chargeTypes
    ) external onlyAuthorized onlyWhenActive returns (uint256[] memory) {
        require(
            _apiKeyIds.length == _aiSearchers.length &&
            _apiKeyIds.length == _urls.length &&
            _apiKeyIds.length == _costs.length &&
            _apiKeyIds.length == _chargeTypes.length,
            "AdChainPlatform: array length mismatch"
        );
        
        uint256[] memory chargeIds = new uint256[](_apiKeyIds.length);
        
        for (uint256 i = 0; i < _apiKeyIds.length; i++) {
            chargeIds[i] = _processCrawlRequestInternal(
                _apiKeyIds[i],
                _aiSearchers[i],
                _urls[i],
                _costs[i],
                _chargeTypes[i]
            );
        }
        
        return chargeIds;
    }
    
    function _processCrawlRequestInternal(
        uint256 _apiKeyId,
        address _aiSearcher,
        string memory _url,
        uint256 _cost,
        string memory _chargeType
    ) internal returns (uint256) {
        // Verify AI searcher has sufficient balance
        (, , , , , uint256 prepaidBalance, , , , , , ) = aiSearcherRegistry.getAISearcherStats(_aiSearcher);
        require(prepaidBalance >= _cost, "AdChainPlatform: insufficient prepaid balance");
        
        // Process charge
        uint256 chargeId = chargeManager.processCharge(_apiKeyId, _aiSearcher, _url, _cost, _chargeType);
        
        // Deduct from AI searcher balance
        aiSearcherRegistry.deductPrepaidBalance(_aiSearcher, _cost);
        
        // Record usage in AI searcher registry
        aiSearcherRegistry.recordUsage(_apiKeyId, 1, 0, _cost);
        
        // Mark charge as processed
        chargeManager.markChargeProcessed(chargeId, keccak256(abi.encodePacked(block.timestamp, chargeId)));
        
        emit CrawlRequestProcessed(chargeId, _aiSearcher, _apiKeyId, _url, _cost);
        
        return chargeId;
    }
    
    // Admin functions for entity registration
    function registerPublisher(
        address _publisher,
        string calldata _name,
        string calldata _website
    ) external onlyOwner {
        publisherRegistry.registerPublisher(_publisher, _name, _website);
    }
    
    function registerAdvertiser(
        address _advertiser,
        string calldata _companyName,
        string calldata _website,
        string[] calldata _categories,
        uint256 _creditLimit
    ) external onlyOwner {
        advertiserRegistry.registerAdvertiser(_advertiser, _companyName, _website, _categories, _creditLimit);
    }
    
    function registerAISearcher(
        address _aiSearcher,
        string calldata _name,
        string calldata _description,
        string calldata _apiEndpoint,
        string[] calldata _supportedFormats,
        uint256 _creditLimit
    ) external onlyOwner {
        aiSearcherRegistry.registerAISearcher(_aiSearcher, _name, _description, _apiEndpoint, _supportedFormats, _creditLimit);
    }
    
    // Platform management functions
    function setPlatformStatus(bool _active) external onlyOwner {
        platformActive = _active;
        emit PlatformStatusChanged(_active, block.timestamp);
    }
    
    function upgradeModule(
        string calldata _moduleName,
        address _newModuleAddress
    ) external onlyOwner {
        require(_newModuleAddress != address(0), "AdChainPlatform: invalid module address");
        
        address oldAddress;
        
        if (keccak256(bytes(_moduleName)) == keccak256(bytes("PublisherRegistry"))) {
            oldAddress = address(publisherRegistry);
            publisherRegistry = PublisherRegistry(_newModuleAddress);
        } else if (keccak256(bytes(_moduleName)) == keccak256(bytes("ChargeManager"))) {
            oldAddress = address(chargeManager);
            chargeManager = ChargeManager(_newModuleAddress);
        } else if (keccak256(bytes(_moduleName)) == keccak256(bytes("RevenueDistributor"))) {
            oldAddress = address(revenueDistributor);
            revenueDistributor = RevenueDistributor(_newModuleAddress);
        } else if (keccak256(bytes(_moduleName)) == keccak256(bytes("AdvertiserRegistry"))) {
            oldAddress = address(advertiserRegistry);
            advertiserRegistry = AdvertiserRegistry(_newModuleAddress);
        } else if (keccak256(bytes(_moduleName)) == keccak256(bytes("AISearcherRegistry"))) {
            oldAddress = address(aiSearcherRegistry);
            aiSearcherRegistry = AISearcherRegistry(_newModuleAddress);
        } else if (keccak256(bytes(_moduleName)) == keccak256(bytes("PrepaymentManager"))) {
            oldAddress = address(prepaymentManager);
            prepaymentManager = PrepaymentManager(_newModuleAddress);
        } else if (keccak256(bytes(_moduleName)) == keccak256(bytes("AdTransactionRecorder"))) {
            oldAddress = address(adTransactionRecorder);
            adTransactionRecorder = AdTransactionRecorder(_newModuleAddress);
        } else {
            revert("AdChainPlatform: invalid module name");
        }
        
        emit ModuleUpgraded(_moduleName, oldAddress, _newModuleAddress);
    }
    
    // View functions
    function getModuleAddresses() 
        external 
        view 
        returns (
            address _accessControl,
            address _publisherRegistry,
            address _chargeManager,
            address _revenueDistributor,
            address _advertiserRegistry,
            address _aiSearcherRegistry,
            address _prepaymentManager,
            address _adTransactionRecorder
        ) 
    {
        return (
            address(accessControl),
            address(publisherRegistry),
            address(chargeManager),
            address(revenueDistributor),
            address(advertiserRegistry),
            address(aiSearcherRegistry),
            address(prepaymentManager),
            address(adTransactionRecorder)
        );
    }
    
    function getPlatformInfo() 
        external 
        view 
        returns (
            bool _platformActive,
            uint256 _platformVersion,
            uint256 _launchTimestamp,
            address _stablecoin,
            address _owner
        ) 
    {
        return (
            platformActive,
            platformVersion,
            launchTimestamp,
            address(stablecoin),
            platformOwner
        );
    }
    
    function getPlatformStats()
        external
        view
        returns (
            uint256 totalPublishers,
            uint256 totalAdvertisers,
            uint256 totalAISearchers,
            uint256 totalCharges,
            uint256 totalDistributions,
            uint256 totalAdTransactions
        )
    {
        totalPublishers = publisherRegistry.getPublisherCount();
        totalAdvertisers = advertiserRegistry.getAdvertiserCount();
        totalAISearchers = aiSearcherRegistry.getAISearcherCount();
        
        (, , uint256 chargeCounter, ) = chargeManager.getTotalStats();
        totalCharges = chargeCounter;
        
        (, uint256 distributionCounter, ) = revenueDistributor.getTotalStats();
        totalDistributions = distributionCounter;
        
        (uint256 transactionCounter, , , ) = adTransactionRecorder.getPlatformStats();
        totalAdTransactions = transactionCounter;
    }
    
    // Emergency functions
    function emergencyPause() external onlyOwner {
        platformActive = false;
        emit PlatformStatusChanged(false, block.timestamp);
    }
    
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        require(_amount <= stablecoin.balanceOf(address(this)), "AdChainPlatform: insufficient balance");
        require(stablecoin.transfer(platformOwner, _amount), "AdChainPlatform: emergency withdraw failed");
    }
}