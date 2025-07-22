// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AccessControl.sol";
import "./AISearcherRegistry.sol";
import "./AdvertiserRegistry.sol";

contract PrepaymentManager is ReentrancyGuard {
    AccessControl private accessControl;
    AISearcherRegistry private aiSearcherRegistry;
    AdvertiserRegistry private advertiserRegistry;
    IERC20 public stablecoin;
    
    struct Deposit {
        uint256 depositId;
        address depositor;
        string depositorType; // "ai_searcher" or "advertiser"
        uint256 amount;
        uint256 timestamp;
        bytes32 transactionHash;
        bool processed;
    }
    
    struct Withdrawal {
        uint256 withdrawalId;
        address withdrawer;
        string withdrawerType;
        uint256 amount;
        uint256 timestamp;
        bytes32 transactionHash;
        bool processed;
        string reason;
    }
    
    mapping(uint256 => Deposit) public deposits;
    mapping(uint256 => Withdrawal) public withdrawals;
    mapping(address => uint256[]) public userDeposits;
    mapping(address => uint256[]) public userWithdrawals;
    
    uint256 public depositCounter;
    uint256 public withdrawalCounter;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    
    // Minimum amounts for deposits/withdrawals
    uint256 public minDepositAmount = 1e6; // 1 USDC (6 decimals)
    uint256 public minWithdrawalAmount = 1e6; // 1 USDC (6 decimals)
    
    // Fee configuration (in basis points, 10000 = 100%)
    uint256 public depositFee = 0; // 0% deposit fee
    uint256 public withdrawalFee = 50; // 0.5% withdrawal fee
    uint256 public constant MAX_FEE = 1000; // 10% max fee
    
    // Events
    event DepositProcessed(
        uint256 indexed depositId,
        address indexed depositor,
        string depositorType,
        uint256 amount,
        uint256 fee,
        uint256 netAmount
    );
    event WithdrawalProcessed(
        uint256 indexed withdrawalId,
        address indexed withdrawer,
        string withdrawerType,
        uint256 amount,
        uint256 fee,
        uint256 netAmount,
        string reason
    );
    event DepositRefunded(
        uint256 indexed depositId,
        address indexed depositor,
        uint256 amount,
        string reason
    );
    event FeeConfigUpdated(uint256 depositFee, uint256 withdrawalFee);
    event MinAmountUpdated(uint256 minDepositAmount, uint256 minWithdrawalAmount);
    
    modifier onlyPrepaymentManager() {
        require(
            accessControl.hasRole(accessControl.PREPAYMENT_MANAGER_ROLE(), msg.sender) || 
            msg.sender == accessControl.owner(),
            "PrepaymentManager: unauthorized"
        );
        _;
    }
    
    constructor(
        address _accessControl,
        address _aiSearcherRegistry,
        address _advertiserRegistry,
        address _stablecoin
    ) {
        require(_accessControl != address(0), "PrepaymentManager: invalid access control address");
        require(_aiSearcherRegistry != address(0), "PrepaymentManager: invalid AI searcher registry address");
        require(_advertiserRegistry != address(0), "PrepaymentManager: invalid advertiser registry address");
        require(_stablecoin != address(0), "PrepaymentManager: invalid stablecoin address");
        
        accessControl = AccessControl(_accessControl);
        aiSearcherRegistry = AISearcherRegistry(_aiSearcherRegistry);
        advertiserRegistry = AdvertiserRegistry(_advertiserRegistry);
        stablecoin = IERC20(_stablecoin);
    }
    
    function depositForAISearcher(
        address _aiSearcher,
        uint256 _amount
    ) external nonReentrant returns (uint256) {
        require(_amount >= minDepositAmount, "PrepaymentManager: amount below minimum");
        require(
            aiSearcherRegistry.isActiveAISearcher(_aiSearcher),
            "PrepaymentManager: AI searcher not active"
        );
        
        uint256 fee = (_amount * depositFee) / 10000;
        uint256 netAmount = _amount - fee;
        
        // Transfer tokens from depositor to this contract
        require(
            stablecoin.transferFrom(msg.sender, address(this), _amount),
            "PrepaymentManager: transfer failed"
        );
        
        depositCounter++;
        
        deposits[depositCounter] = Deposit({
            depositId: depositCounter,
            depositor: _aiSearcher,
            depositorType: "ai_searcher",
            amount: _amount,
            timestamp: block.timestamp,
            transactionHash: bytes32(0),
            processed: true
        });
        
        userDeposits[_aiSearcher].push(depositCounter);
        totalDeposited += _amount;
        
        // Add balance to AI searcher
        aiSearcherRegistry.addPrepaidBalance(_aiSearcher, netAmount);
        
        emit DepositProcessed(depositCounter, _aiSearcher, "ai_searcher", _amount, fee, netAmount);
        
        return depositCounter;
    }
    
    function depositForAdvertiser(
        address _advertiser,
        uint256 _amount
    ) external nonReentrant returns (uint256) {
        require(_amount >= minDepositAmount, "PrepaymentManager: amount below minimum");
        require(
            advertiserRegistry.isActiveAdvertiser(_advertiser),
            "PrepaymentManager: advertiser not active"
        );
        
        uint256 fee = (_amount * depositFee) / 10000;
        uint256 netAmount = _amount - fee;
        
        // Transfer tokens from depositor to this contract
        require(
            stablecoin.transferFrom(msg.sender, address(this), _amount),
            "PrepaymentManager: transfer failed"
        );
        
        depositCounter++;
        
        deposits[depositCounter] = Deposit({
            depositId: depositCounter,
            depositor: _advertiser,
            depositorType: "advertiser",
            amount: _amount,
            timestamp: block.timestamp,
            transactionHash: bytes32(0),
            processed: true
        });
        
        userDeposits[_advertiser].push(depositCounter);
        totalDeposited += _amount;
        
        // Add balance to advertiser
        advertiserRegistry.depositEscrow(_advertiser, netAmount);
        
        emit DepositProcessed(depositCounter, _advertiser, "advertiser", _amount, fee, netAmount);
        
        return depositCounter;
    }
    
    function withdrawFromAISearcher(
        address _aiSearcher,
        uint256 _amount,
        string calldata _reason
    ) external nonReentrant returns (uint256) {
        require(_amount >= minWithdrawalAmount, "PrepaymentManager: amount below minimum");
        require(
            msg.sender == _aiSearcher ||
            accessControl.hasRole(accessControl.PREPAYMENT_MANAGER_ROLE(), msg.sender) ||
            msg.sender == accessControl.owner(),
            "PrepaymentManager: unauthorized"
        );
        
        // Check balance and deduct from AI searcher
        (, , , , , uint256 prepaidBalance, , , , , , ) = aiSearcherRegistry.getAISearcherStats(_aiSearcher);
        require(prepaidBalance >= _amount, "PrepaymentManager: insufficient balance");
        
        uint256 fee = (_amount * withdrawalFee) / 10000;
        uint256 netAmount = _amount - fee;
        
        withdrawalCounter++;
        
        withdrawals[withdrawalCounter] = Withdrawal({
            withdrawalId: withdrawalCounter,
            withdrawer: _aiSearcher,
            withdrawerType: "ai_searcher",
            amount: _amount,
            timestamp: block.timestamp,
            transactionHash: bytes32(0),
            processed: true,
            reason: _reason
        });
        
        userWithdrawals[_aiSearcher].push(withdrawalCounter);
        totalWithdrawn += _amount;
        
        // Deduct from AI searcher balance
        aiSearcherRegistry.deductPrepaidBalance(_aiSearcher, _amount);
        
        // Transfer net amount to withdrawer
        require(
            stablecoin.transfer(_aiSearcher, netAmount),
            "PrepaymentManager: withdrawal transfer failed"
        );
        
        emit WithdrawalProcessed(withdrawalCounter, _aiSearcher, "ai_searcher", _amount, fee, netAmount, _reason);
        
        return withdrawalCounter;
    }
    
    function withdrawFromAdvertiser(
        address _advertiser,
        uint256 _amount,
        string calldata _reason
    ) external nonReentrant returns (uint256) {
        require(_amount >= minWithdrawalAmount, "PrepaymentManager: amount below minimum");
        require(
            msg.sender == _advertiser ||
            accessControl.hasRole(accessControl.PREPAYMENT_MANAGER_ROLE(), msg.sender) ||
            msg.sender == accessControl.owner(),
            "PrepaymentManager: unauthorized"
        );
        
        // Check balance and deduct from advertiser
        (, , , , uint256 escrowBalance, , , , , ) = advertiserRegistry.getAdvertiserStats(_advertiser);
        require(escrowBalance >= _amount, "PrepaymentManager: insufficient balance");
        
        uint256 fee = (_amount * withdrawalFee) / 10000;
        uint256 netAmount = _amount - fee;
        
        withdrawalCounter++;
        
        withdrawals[withdrawalCounter] = Withdrawal({
            withdrawalId: withdrawalCounter,
            withdrawer: _advertiser,
            withdrawerType: "advertiser",
            amount: _amount,
            timestamp: block.timestamp,
            transactionHash: bytes32(0),
            processed: true,
            reason: _reason
        });
        
        userWithdrawals[_advertiser].push(withdrawalCounter);
        totalWithdrawn += _amount;
        
        // Deduct from advertiser balance
        advertiserRegistry.withdrawEscrow(_advertiser, _amount);
        
        // Transfer net amount to withdrawer
        require(
            stablecoin.transfer(_advertiser, netAmount),
            "PrepaymentManager: withdrawal transfer failed"
        );
        
        emit WithdrawalProcessed(withdrawalCounter, _advertiser, "advertiser", _amount, fee, netAmount, _reason);
        
        return withdrawalCounter;
    }
    
    function refundDeposit(
        uint256 _depositId,
        string calldata _reason
    ) external onlyPrepaymentManager nonReentrant {
        require(_depositId <= depositCounter && _depositId > 0, "PrepaymentManager: invalid deposit ID");
        require(deposits[_depositId].processed, "PrepaymentManager: deposit not processed");
        
        Deposit memory deposit = deposits[_depositId];
        
        // Revert the balance changes
        if (keccak256(bytes(deposit.depositorType)) == keccak256(bytes("ai_searcher"))) {
            (, , , , , uint256 prepaidBalance, , , , , , ) = aiSearcherRegistry.getAISearcherStats(deposit.depositor);
            uint256 netAmount = deposit.amount - (deposit.amount * depositFee) / 10000;
            require(prepaidBalance >= netAmount, "PrepaymentManager: insufficient balance for refund");
            aiSearcherRegistry.deductPrepaidBalance(deposit.depositor, netAmount);
        } else if (keccak256(bytes(deposit.depositorType)) == keccak256(bytes("advertiser"))) {
            (, , , , uint256 escrowBalance, , , , , ) = advertiserRegistry.getAdvertiserStats(deposit.depositor);
            uint256 netAmount = deposit.amount - (deposit.amount * depositFee) / 10000;
            require(escrowBalance >= netAmount, "PrepaymentManager: insufficient balance for refund");
            advertiserRegistry.withdrawEscrow(deposit.depositor, netAmount);
        }
        
        // Transfer original amount back to depositor
        require(
            stablecoin.transfer(deposit.depositor, deposit.amount),
            "PrepaymentManager: refund transfer failed"
        );
        
        // Mark as refunded (we can reuse the processed flag for this)
        deposits[_depositId].processed = false;
        
        emit DepositRefunded(_depositId, deposit.depositor, deposit.amount, _reason);
    }
    
    function updateFeeConfiguration(
        uint256 _depositFee,
        uint256 _withdrawalFee
    ) external {
        require(
            msg.sender == accessControl.owner(),
            "PrepaymentManager: only owner can update fees"
        );
        require(_depositFee <= MAX_FEE && _withdrawalFee <= MAX_FEE, "PrepaymentManager: fee too high");
        
        depositFee = _depositFee;
        withdrawalFee = _withdrawalFee;
        
        emit FeeConfigUpdated(_depositFee, _withdrawalFee);
    }
    
    function updateMinAmounts(
        uint256 _minDepositAmount,
        uint256 _minWithdrawalAmount
    ) external {
        require(
            msg.sender == accessControl.owner(),
            "PrepaymentManager: only owner can update min amounts"
        );
        require(_minDepositAmount > 0 && _minWithdrawalAmount > 0, "PrepaymentManager: amounts must be positive");
        
        minDepositAmount = _minDepositAmount;
        minWithdrawalAmount = _minWithdrawalAmount;
        
        emit MinAmountUpdated(_minDepositAmount, _minWithdrawalAmount);
    }
    
    function getDepositDetails(uint256 _depositId)
        external
        view
        returns (
            address depositor,
            string memory depositorType,
            uint256 amount,
            uint256 timestamp,
            bytes32 transactionHash,
            bool processed
        )
    {
        require(_depositId <= depositCounter && _depositId > 0, "PrepaymentManager: invalid deposit ID");
        Deposit memory deposit = deposits[_depositId];
        return (
            deposit.depositor,
            deposit.depositorType,
            deposit.amount,
            deposit.timestamp,
            deposit.transactionHash,
            deposit.processed
        );
    }
    
    function getWithdrawalDetails(uint256 _withdrawalId)
        external
        view
        returns (
            address withdrawer,
            string memory withdrawerType,
            uint256 amount,
            uint256 timestamp,
            bytes32 transactionHash,
            bool processed,
            string memory reason
        )
    {
        require(_withdrawalId <= withdrawalCounter && _withdrawalId > 0, "PrepaymentManager: invalid withdrawal ID");
        Withdrawal memory withdrawal = withdrawals[_withdrawalId];
        return (
            withdrawal.withdrawer,
            withdrawal.withdrawerType,
            withdrawal.amount,
            withdrawal.timestamp,
            withdrawal.transactionHash,
            withdrawal.processed,
            withdrawal.reason
        );
    }
    
    function getUserDeposits(address _user) external view returns (uint256[] memory) {
        return userDeposits[_user];
    }
    
    function getUserWithdrawals(address _user) external view returns (uint256[] memory) {
        return userWithdrawals[_user];
    }
    
    function getFeeConfiguration() external view returns (uint256, uint256) {
        return (depositFee, withdrawalFee);
    }
    
    function getMinAmounts() external view returns (uint256, uint256) {
        return (minDepositAmount, minWithdrawalAmount);
    }
    
    function getTotalStats()
        external
        view
        returns (
            uint256 _totalDeposited,
            uint256 _totalWithdrawn,
            uint256 _depositCounter,
            uint256 _withdrawalCounter
        )
    {
        return (totalDeposited, totalWithdrawn, depositCounter, withdrawalCounter);
    }
    
    function emergencyWithdraw(uint256 _amount) external {
        require(
            msg.sender == accessControl.owner(),
            "PrepaymentManager: only owner can emergency withdraw"
        );
        require(_amount <= stablecoin.balanceOf(address(this)), "PrepaymentManager: insufficient balance");
        
        require(stablecoin.transfer(accessControl.owner(), _amount), "PrepaymentManager: emergency withdraw failed");
    }
}