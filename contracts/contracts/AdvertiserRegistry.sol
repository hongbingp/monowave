// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

contract AdvertiserRegistry {
    AccessControl private accessControl;
    
    struct Advertiser {
        address walletAddress;
        string companyName;
        string website;
        string[] categories; // e.g., ["tech", "finance", "healthcare"]
        uint256 totalSpent;
        uint256 escrowBalance;
        bool isActive;
        uint256 registeredAt;
        uint256 lastActivityAt;
        uint256 creditLimit;
        string status; // "active", "suspended", "pending_approval"
    }
    
    struct AdCampaign {
        uint256 campaignId;
        address advertiser;
        string name;
        string description;
        uint256 budget;
        uint256 spent;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        string[] targetCategories;
        uint256 maxBidAmount;
        string creativeUrl;
        string landingPageUrl;
    }
    
    mapping(address => Advertiser) public advertisers;
    mapping(uint256 => AdCampaign) public campaigns;
    mapping(address => uint256[]) public advertiserCampaigns;
    
    address[] public advertiserList;
    uint256 public advertiserCounter;
    uint256 public campaignCounter;
    
    // Events
    event AdvertiserRegistered(
        address indexed advertiser,
        string companyName,
        string website,
        uint256 timestamp
    );
    event AdvertiserStatusChanged(
        address indexed advertiser,
        string oldStatus,
        string newStatus,
        uint256 timestamp
    );
    event AdvertiserUpdated(
        address indexed advertiser,
        string companyName,
        string website
    );
    event EscrowDeposited(
        address indexed advertiser,
        uint256 amount,
        uint256 newBalance
    );
    event EscrowWithdrawn(
        address indexed advertiser,
        uint256 amount,
        uint256 newBalance
    );
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed advertiser,
        string name,
        uint256 budget
    );
    event CampaignUpdated(
        uint256 indexed campaignId,
        string name,
        uint256 budget,
        bool isActive
    );
    event CampaignSpent(
        uint256 indexed campaignId,
        address indexed advertiser,
        uint256 amount,
        uint256 totalSpent
    );
    
    modifier onlyAdvertiserManager() {
        require(
            accessControl.hasRole(accessControl.ADVERTISER_MANAGER_ROLE(), msg.sender) || 
            msg.sender == accessControl.owner(),
            "AdvertiserRegistry: unauthorized"
        );
        _;
    }
    
    modifier onlyAdvertiserOrManager(address _advertiser) {
        require(
            msg.sender == _advertiser ||
            accessControl.hasRole(accessControl.ADVERTISER_MANAGER_ROLE(), msg.sender) ||
            msg.sender == accessControl.owner(),
            "AdvertiserRegistry: unauthorized"
        );
        _;
    }
    
    constructor(address _accessControl) {
        require(_accessControl != address(0), "AdvertiserRegistry: invalid access control address");
        accessControl = AccessControl(_accessControl);
    }
    
    function registerAdvertiser(
        address _advertiser,
        string calldata _companyName,
        string calldata _website,
        string[] calldata _categories,
        uint256 _creditLimit
    ) external onlyAdvertiserManager {
        require(_advertiser != address(0), "AdvertiserRegistry: invalid advertiser address");
        require(bytes(_companyName).length > 0, "AdvertiserRegistry: company name cannot be empty");
        require(!advertisers[_advertiser].isActive, "AdvertiserRegistry: advertiser already registered");
        
        advertiserCounter++;
        
        advertisers[_advertiser] = Advertiser({
            walletAddress: _advertiser,
            companyName: _companyName,
            website: _website,
            categories: _categories,
            totalSpent: 0,
            escrowBalance: 0,
            isActive: true,
            registeredAt: block.timestamp,
            lastActivityAt: block.timestamp,
            creditLimit: _creditLimit,
            status: "pending_approval"
        });
        
        advertiserList.push(_advertiser);
        
        emit AdvertiserRegistered(_advertiser, _companyName, _website, block.timestamp);
    }
    
    function updateAdvertiserStatus(
        address _advertiser,
        string calldata _newStatus
    ) external onlyAdvertiserManager {
        require(advertisers[_advertiser].walletAddress != address(0), "AdvertiserRegistry: advertiser not found");
        
        string memory oldStatus = advertisers[_advertiser].status;
        advertisers[_advertiser].status = _newStatus;
        advertisers[_advertiser].lastActivityAt = block.timestamp;
        
        // Update active status based on new status
        advertisers[_advertiser].isActive = 
            keccak256(bytes(_newStatus)) == keccak256(bytes("active"));
        
        emit AdvertiserStatusChanged(_advertiser, oldStatus, _newStatus, block.timestamp);
    }
    
    function updateAdvertiser(
        address _advertiser,
        string calldata _companyName,
        string calldata _website,
        string[] calldata _categories,
        uint256 _creditLimit
    ) external onlyAdvertiserOrManager(_advertiser) {
        require(advertisers[_advertiser].walletAddress != address(0), "AdvertiserRegistry: advertiser not found");
        require(bytes(_companyName).length > 0, "AdvertiserRegistry: company name cannot be empty");
        
        advertisers[_advertiser].companyName = _companyName;
        advertisers[_advertiser].website = _website;
        advertisers[_advertiser].categories = _categories;
        advertisers[_advertiser].creditLimit = _creditLimit;
        advertisers[_advertiser].lastActivityAt = block.timestamp;
        
        emit AdvertiserUpdated(_advertiser, _companyName, _website);
    }
    
    function depositEscrow(address _advertiser, uint256 _amount) external {
        require(
            accessControl.hasRole(accessControl.PREPAYMENT_MANAGER_ROLE(), msg.sender),
            "AdvertiserRegistry: only prepayment manager can deposit escrow"
        );
        require(advertisers[_advertiser].isActive, "AdvertiserRegistry: advertiser not active");
        require(_amount > 0, "AdvertiserRegistry: amount must be greater than 0");
        
        advertisers[_advertiser].escrowBalance += _amount;
        advertisers[_advertiser].lastActivityAt = block.timestamp;
        
        emit EscrowDeposited(_advertiser, _amount, advertisers[_advertiser].escrowBalance);
    }
    
    function withdrawEscrow(address _advertiser, uint256 _amount) external {
        require(
            accessControl.hasRole(accessControl.PREPAYMENT_MANAGER_ROLE(), msg.sender),
            "AdvertiserRegistry: only prepayment manager can withdraw escrow"
        );
        require(advertisers[_advertiser].escrowBalance >= _amount, "AdvertiserRegistry: insufficient escrow balance");
        
        advertisers[_advertiser].escrowBalance -= _amount;
        advertisers[_advertiser].lastActivityAt = block.timestamp;
        
        emit EscrowWithdrawn(_advertiser, _amount, advertisers[_advertiser].escrowBalance);
    }
    
    function spendFromEscrow(address _advertiser, uint256 _amount) external {
        require(
            accessControl.hasRole(accessControl.AD_TRANSACTION_RECORDER_ROLE(), msg.sender),
            "AdvertiserRegistry: only ad transaction recorder can spend escrow"
        );
        require(advertisers[_advertiser].escrowBalance >= _amount, "AdvertiserRegistry: insufficient escrow balance");
        
        advertisers[_advertiser].escrowBalance -= _amount;
        advertisers[_advertiser].totalSpent += _amount;
        advertisers[_advertiser].lastActivityAt = block.timestamp;
    }
    
    function createCampaign(
        address _advertiser,
        string calldata _name,
        string calldata _description,
        uint256 _budget,
        uint256 _startTime,
        uint256 _endTime,
        string[] calldata _targetCategories,
        uint256 _maxBidAmount,
        string calldata _creativeUrl,
        string calldata _landingPageUrl
    ) external onlyAdvertiserOrManager(_advertiser) returns (uint256) {
        require(advertisers[_advertiser].isActive, "AdvertiserRegistry: advertiser not active");
        require(bytes(_name).length > 0, "AdvertiserRegistry: campaign name cannot be empty");
        require(_budget > 0, "AdvertiserRegistry: budget must be greater than 0");
        require(_endTime > _startTime, "AdvertiserRegistry: invalid time range");
        require(_maxBidAmount > 0, "AdvertiserRegistry: max bid amount must be greater than 0");
        
        campaignCounter++;
        
        campaigns[campaignCounter] = AdCampaign({
            campaignId: campaignCounter,
            advertiser: _advertiser,
            name: _name,
            description: _description,
            budget: _budget,
            spent: 0,
            startTime: _startTime,
            endTime: _endTime,
            isActive: true,
            targetCategories: _targetCategories,
            maxBidAmount: _maxBidAmount,
            creativeUrl: _creativeUrl,
            landingPageUrl: _landingPageUrl
        });
        
        advertiserCampaigns[_advertiser].push(campaignCounter);
        
        emit CampaignCreated(campaignCounter, _advertiser, _name, _budget);
        
        return campaignCounter;
    }
    
    function updateCampaign(
        uint256 _campaignId,
        string calldata _name,
        uint256 _budget,
        bool _isActive,
        uint256 _maxBidAmount,
        string calldata _creativeUrl,
        string calldata _landingPageUrl
    ) external {
        require(_campaignId <= campaignCounter && _campaignId > 0, "AdvertiserRegistry: invalid campaign ID");
        require(
            msg.sender == campaigns[_campaignId].advertiser ||
            accessControl.hasRole(accessControl.ADVERTISER_MANAGER_ROLE(), msg.sender) ||
            msg.sender == accessControl.owner(),
            "AdvertiserRegistry: unauthorized"
        );
        
        campaigns[_campaignId].name = _name;
        campaigns[_campaignId].budget = _budget;
        campaigns[_campaignId].isActive = _isActive;
        campaigns[_campaignId].maxBidAmount = _maxBidAmount;
        campaigns[_campaignId].creativeUrl = _creativeUrl;
        campaigns[_campaignId].landingPageUrl = _landingPageUrl;
        
        emit CampaignUpdated(_campaignId, _name, _budget, _isActive);
    }
    
    function recordCampaignSpend(uint256 _campaignId, uint256 _amount) external {
        require(
            accessControl.hasRole(accessControl.AD_TRANSACTION_RECORDER_ROLE(), msg.sender),
            "AdvertiserRegistry: only ad transaction recorder can record spend"
        );
        require(_campaignId <= campaignCounter && _campaignId > 0, "AdvertiserRegistry: invalid campaign ID");
        require(campaigns[_campaignId].isActive, "AdvertiserRegistry: campaign not active");
        require(campaigns[_campaignId].spent + _amount <= campaigns[_campaignId].budget, "AdvertiserRegistry: exceeds budget");
        
        campaigns[_campaignId].spent += _amount;
        
        emit CampaignSpent(_campaignId, campaigns[_campaignId].advertiser, _amount, campaigns[_campaignId].spent);
    }
    
    function getAdvertiserStats(address _advertiser)
        external
        view
        returns (
            string memory companyName,
            string memory website,
            string[] memory categories,
            uint256 totalSpent,
            uint256 escrowBalance,
            bool isActive,
            uint256 registeredAt,
            uint256 lastActivityAt,
            uint256 creditLimit,
            string memory status
        )
    {
        Advertiser memory advertiser = advertisers[_advertiser];
        return (
            advertiser.companyName,
            advertiser.website,
            advertiser.categories,
            advertiser.totalSpent,
            advertiser.escrowBalance,
            advertiser.isActive,
            advertiser.registeredAt,
            advertiser.lastActivityAt,
            advertiser.creditLimit,
            advertiser.status
        );
    }
    
    function getCampaignDetails(uint256 _campaignId)
        external
        view
        returns (
            address advertiser,
            string memory name,
            string memory description,
            uint256 budget,
            uint256 spent,
            uint256 startTime,
            uint256 endTime,
            bool isActive,
            string[] memory targetCategories,
            uint256 maxBidAmount,
            string memory creativeUrl,
            string memory landingPageUrl
        )
    {
        require(_campaignId <= campaignCounter && _campaignId > 0, "AdvertiserRegistry: invalid campaign ID");
        AdCampaign memory campaign = campaigns[_campaignId];
        return (
            campaign.advertiser,
            campaign.name,
            campaign.description,
            campaign.budget,
            campaign.spent,
            campaign.startTime,
            campaign.endTime,
            campaign.isActive,
            campaign.targetCategories,
            campaign.maxBidAmount,
            campaign.creativeUrl,
            campaign.landingPageUrl
        );
    }
    
    function getAdvertiserCampaigns(address _advertiser) external view returns (uint256[] memory) {
        return advertiserCampaigns[_advertiser];
    }
    
    function isAdvertiser(address _advertiser) external view returns (bool) {
        return advertisers[_advertiser].walletAddress != address(0);
    }
    
    function isActiveAdvertiser(address _advertiser) external view returns (bool) {
        return advertisers[_advertiser].isActive;
    }
    
    function getActiveAdvertisers() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < advertiserList.length; i++) {
            if (advertisers[advertiserList[i]].isActive) {
                activeCount++;
            }
        }
        
        address[] memory activeAdvertisers = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < advertiserList.length; i++) {
            if (advertisers[advertiserList[i]].isActive) {
                activeAdvertisers[index] = advertiserList[i];
                index++;
            }
        }
        
        return activeAdvertisers;
    }
    
    function getAdvertiserCount() external view returns (uint256) {
        return advertiserList.length;
    }
    
    function getCampaignCount() external view returns (uint256) {
        return campaignCounter;
    }
}