// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

struct StakePlan {
    uint256 duration;
    uint256 reward;
}

struct Stake {
    address staker;
    uint256 stakeId;
    uint256 nftId;
    uint256 planId;
    uint256 startTime;
    bool isClaimed;
}

contract NFTStaking is AccessControl {
    using Counters for Counters.Counter;
    using SafeMath for uint256;
    IERC721 public lampNft;
    IRemn public remnToken;
    Counters.Counter private _stakeIdCounter;

    mapping(uint256 => Stake) public stakes;
    mapping(address => uint256[]) public stakesByStaker;
    mapping(uint256 => StakePlan) public stakePlans;

    event StakeCreated(
        address indexed staker,
        uint256 indexed stakeId,
        uint256 nftId,
        uint256 planId,
        uint256 startTime
    );

    event StakeClaimed(
        address indexed staker,
        uint256 indexed stakeId,
        uint256 nftId,
        uint256 planId,
        uint256 startTime,
        uint256 endTime,
        uint256 reward
    );

    constructor(address _lampNft, address _remnToken) {
        lampNft = IERC721(_lampNft);
        remnToken = IRemn(_remnToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        stakePlans[0] = StakePlan(1 days, 10 * 10**18);
        stakePlans[1] = StakePlan(7 days, 100 * 10**18);
        stakePlans[2] = StakePlan(30 days, 500 * 10**18);
    }

    function stake(uint256 nftId, uint256 planId) public {
        require(
            lampNft.ownerOf(nftId) == msg.sender,
            "NFTStaking: Not owner of NFT"
        );
        require(planId < 3, "NFTStaking: Invalid plan");
        lampNft.transferFrom(msg.sender, address(this), nftId);
        uint256 stakeId = _stakeIdCounter.current();
        _stakeIdCounter.increment();
        stakes[stakeId] = Stake(
            msg.sender,
            stakeId,
            nftId,
            planId,
            block.timestamp,
            false
        );
        stakesByStaker[msg.sender].push(stakeId);
        emit StakeCreated(msg.sender, stakeId, nftId, planId, block.timestamp);
    }

    function unstake(uint256 stakeId) public {
        Stake storage _stake = stakes[stakeId];
        require(_stake.staker == msg.sender, "NFTStaking: Not owner of stake");
        require(_stake.isClaimed == false, "NFTStaking: Stake already claimed");
        require(
            block.timestamp >
                _stake.startTime + stakePlans[_stake.planId].duration,
            "NFTStaking: Stake not matured"
        );
        lampNft.transferFrom(address(this), msg.sender, _stake.nftId);
        _stake.isClaimed = true;
        remnToken.mint(msg.sender, stakePlans[_stake.planId].reward);
        emit StakeClaimed(
            msg.sender,
            stakeId,
            _stake.nftId,
            _stake.planId,
            _stake.startTime,
            block.timestamp,
            stakePlans[_stake.planId].reward
        );
    }
}

interface IRemn {
    function mint(address to, uint256 amount) external;
}
