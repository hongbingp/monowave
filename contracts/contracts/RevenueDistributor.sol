// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AccessControl.sol";
import "./PublisherRegistry.sol";

contract RevenueDistributor is ReentrancyGuard {
    AccessControl private accessControl;
    PublisherRegistry private publisherRegistry;
    IERC20 public stablecoin;
    
    struct Distribution {
        uint256 distributionId;
        address[] recipients;
        uint256[] amounts;
        uint256 totalAmount;
        uint256 timestamp;
        bool completed;
        string distributionType; // "ad_revenue", "crawl_refund", "bonus"
        bytes32 transactionHash;
    }
    
    mapping(uint256 => Distribution) public distributions;
    mapping(address => uint256[]) public recipientDistributions;
    
    uint256 public distributionCounter;
    uint256 public totalDistributed;
    uint256 public totalPendingDistributions;
    
    // Revenue share configuration (in basis points, 10000 = 100%)
    uint256 public publisherShare = 7000; // 70%
    uint256 public aiSearcherShare = 3000; // 30%
    uint256 public constant MAX_SHARE = 10000; // 100%
    
    // Events
    event RevenueDistributed(
        uint256 indexed distributionId,
        address indexed recipient,
        uint256 amount,
        string distributionType
    );
    event BatchDistributionCompleted(
        uint256 indexed distributionId,
        uint256 totalAmount,
        uint256 recipientCount,
        string distributionType
    );
    event ShareConfigUpdated(uint256 publisherShare, uint256 aiSearcherShare);
    event DistributionFailed(uint256 indexed distributionId, string reason);
    
    modifier onlyRevenueDistributor() {
        require(
            accessControl.hasRole(accessControl.REVENUE_DISTRIBUTOR_ROLE(), msg.sender) || 
            msg.sender == accessControl.owner(),
            "RevenueDistributor: unauthorized"
        );
        _;
    }
    
    constructor(
        address _accessControl,
        address _publisherRegistry,
        address _stablecoin
    ) {
        require(_accessControl != address(0), "RevenueDistributor: invalid access control address");
        require(_publisherRegistry != address(0), "RevenueDistributor: invalid publisher registry address");
        require(_stablecoin != address(0), "RevenueDistributor: invalid stablecoin address");
        
        accessControl = AccessControl(_accessControl);
        publisherRegistry = PublisherRegistry(_publisherRegistry);
        stablecoin = IERC20(_stablecoin);
    }
    
    function distribute(
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        string calldata _distributionType
    ) external onlyRevenueDistributor nonReentrant returns (uint256) {
        // Convert calldata to memory for internal function
        address[] memory recipients = new address[](_recipients.length);
        uint256[] memory amounts = new uint256[](_amounts.length);
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            recipients[i] = _recipients[i];
            amounts[i] = _amounts[i];
        }
        
        return _distributeInternal(recipients, amounts, _distributionType);
    }
    
    function distributeAdRevenue(
        address _publisher,
        address _aiSearcher,
        uint256 _totalRevenue
    ) external onlyRevenueDistributor nonReentrant returns (uint256) {
        require(_publisher != address(0), "RevenueDistributor: invalid publisher address");
        require(_aiSearcher != address(0), "RevenueDistributor: invalid AI searcher address");
        require(_totalRevenue > 0, "RevenueDistributor: revenue must be greater than 0");
        require(
            publisherRegistry.isActivePublisher(_publisher),
            "RevenueDistributor: publisher must be active"
        );
        
        uint256 publisherAmount = (_totalRevenue * publisherShare) / MAX_SHARE;
        uint256 aiSearcherAmount = _totalRevenue - publisherAmount; // Remainder goes to AI searcher
        
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        
        recipients[0] = _publisher;
        recipients[1] = _aiSearcher;
        amounts[0] = publisherAmount;
        amounts[1] = aiSearcherAmount;
        
        return _distributeInternal(recipients, amounts, "ad_revenue");
    }
    
    function _distributeInternal(
        address[] memory _recipients,
        uint256[] memory _amounts,
        string memory _distributionType
    ) internal returns (uint256) {
        require(_recipients.length == _amounts.length, "RevenueDistributor: arrays length mismatch");
        require(_recipients.length > 0, "RevenueDistributor: no recipients provided");
        
        uint256 totalAmount = 0;
        
        // Validate recipients and calculate total
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "RevenueDistributor: invalid recipient address");
            require(_amounts[i] > 0, "RevenueDistributor: amount must be greater than 0");
            
            // For publisher distributions, ensure recipient is active publisher
            if (keccak256(bytes(_distributionType)) == keccak256(bytes("ad_revenue"))) {
                require(
                    publisherRegistry.isActivePublisher(_recipients[i]),
                    "RevenueDistributor: recipient must be active publisher"
                );
            }
            
            totalAmount += _amounts[i];
        }
        
        distributionCounter++;
        
        // Create distribution record
        distributions[distributionCounter] = Distribution({
            distributionId: distributionCounter,
            recipients: _recipients,
            amounts: _amounts,
            totalAmount: totalAmount,
            timestamp: block.timestamp,
            completed: false,
            distributionType: _distributionType,
            transactionHash: bytes32(0)
        });
        
        // Check allowance and transfer tokens to this contract
        require(
            stablecoin.allowance(msg.sender, address(this)) >= totalAmount,
            "RevenueDistributor: insufficient allowance"
        );
        require(
            stablecoin.transferFrom(msg.sender, address(this), totalAmount),
            "RevenueDistributor: transfer to distributor failed"
        );
        
        // Distribute to recipients
        bool allTransfersSuccessful = true;
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (stablecoin.transfer(_recipients[i], _amounts[i])) {
                // Update publisher registry if this is ad revenue
                if (keccak256(bytes(_distributionType)) == keccak256(bytes("ad_revenue"))) {
                    publisherRegistry.addRevenue(_recipients[i], _amounts[i]);
                }
                
                // Track recipient distributions
                recipientDistributions[_recipients[i]].push(distributionCounter);
                
                emit RevenueDistributed(distributionCounter, _recipients[i], _amounts[i], _distributionType);
            } else {
                allTransfersSuccessful = false;
                break;
            }
        }
        
        if (allTransfersSuccessful) {
            distributions[distributionCounter].completed = true;
            totalDistributed += totalAmount;
            
            emit BatchDistributionCompleted(distributionCounter, totalAmount, _recipients.length, _distributionType);
        } else {
            emit DistributionFailed(distributionCounter, "Transfer failed");
        }
        
        return distributionCounter;
    }
    
    function updateShareConfiguration(
        uint256 _publisherShare,
        uint256 _aiSearcherShare
    ) external {
        require(
            msg.sender == accessControl.owner(),
            "RevenueDistributor: only owner can update shares"
        );
        require(
            _publisherShare + _aiSearcherShare == MAX_SHARE,
            "RevenueDistributor: shares must sum to 100%"
        );
        require(_publisherShare > 0 && _aiSearcherShare > 0, "RevenueDistributor: shares must be positive");
        
        publisherShare = _publisherShare;
        aiSearcherShare = _aiSearcherShare;
        
        emit ShareConfigUpdated(_publisherShare, _aiSearcherShare);
    }
    
    function markDistributionProcessed(
        uint256 _distributionId,
        bytes32 _transactionHash
    ) external onlyRevenueDistributor {
        require(
            _distributionId <= distributionCounter && _distributionId > 0,
            "RevenueDistributor: invalid distribution ID"
        );
        require(
            distributions[_distributionId].completed,
            "RevenueDistributor: distribution not completed"
        );
        
        distributions[_distributionId].transactionHash = _transactionHash;
    }
    
    function getDistributionDetails(uint256 _distributionId)
        external
        view
        returns (
            address[] memory recipients,
            uint256[] memory amounts,
            uint256 totalAmount,
            uint256 timestamp,
            bool completed,
            string memory distributionType,
            bytes32 transactionHash
        )
    {
        require(
            _distributionId <= distributionCounter && _distributionId > 0,
            "RevenueDistributor: invalid distribution ID"
        );
        
        Distribution memory dist = distributions[_distributionId];
        return (
            dist.recipients,
            dist.amounts,
            dist.totalAmount,
            dist.timestamp,
            dist.completed,
            dist.distributionType,
            dist.transactionHash
        );
    }
    
    function getRecipientDistributions(address _recipient) external view returns (uint256[] memory) {
        return recipientDistributions[_recipient];
    }
    
    function getRecipientTotalReceived(address _recipient) external view returns (uint256) {
        uint256[] memory distIds = recipientDistributions[_recipient];
        uint256 total = 0;
        
        for (uint256 i = 0; i < distIds.length; i++) {
            Distribution memory dist = distributions[distIds[i]];
            if (dist.completed) {
                // Find recipient amount in this distribution
                for (uint256 j = 0; j < dist.recipients.length; j++) {
                    if (dist.recipients[j] == _recipient) {
                        total += dist.amounts[j];
                        break;
                    }
                }
            }
        }
        
        return total;
    }
    
    function getShareConfiguration() external view returns (uint256, uint256) {
        return (publisherShare, aiSearcherShare);
    }
    
    function getTotalStats()
        external
        view
        returns (
            uint256 _totalDistributed,
            uint256 _distributionCounter,
            uint256 _totalPendingDistributions
        )
    {
        return (totalDistributed, distributionCounter, totalPendingDistributions);
    }
    
    function emergencyWithdraw(uint256 _amount) external {
        require(
            msg.sender == accessControl.owner(),
            "RevenueDistributor: only owner can emergency withdraw"
        );
        require(_amount <= stablecoin.balanceOf(address(this)), "RevenueDistributor: insufficient balance");
        
        require(stablecoin.transfer(accessControl.owner(), _amount), "RevenueDistributor: emergency withdraw failed");
    }
}