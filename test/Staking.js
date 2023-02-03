const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

const plan = [
  {
    duration: 86400,
    reward: "10000000000000000000",
  },
  {
    duration: 86400 * 7,
    reward: "100000000000000000000",
  },
  {
    duration: 86400 * 30,
    reward: "500000000000000000000",
  },
];

async function deployStakingFixture() {
  // Contracts are deployed using the first signer/account by default
  const [owner, other] = await ethers.getSigners();
  const Remn = await ethers.getContractFactory("REMNToken");
  const Lamp = await ethers.getContractFactory("LAMPNFT");
  const Staking = await ethers.getContractFactory("NFTStaking");

  const remn = await Remn.deploy();
  const lamp = await Lamp.deploy();
  const staking = await Staking.deploy(lamp.address, remn.address);

  await remn.deployed();
  await remn.grantRole(await remn.MINTER_ROLE(), staking.address);

  return { remn, lamp, staking, other };
}

async function mintNftFixture(lampNft, owner) {
  for (let i = 0; i < 3; i++) {
    await lampNft.safeMint(owner.address);
  }
}

describe("Deployment", function () {
  it("Should set the right address", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );
    expect(await staking.lampNft()).to.equal(lamp.address);
    expect(await staking.remnToken()).to.equal(remn.address);
  });

  it("Should set MINTER_ROLE", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );
    expect(
      await remn.hasRole(await remn.MINTER_ROLE(), staking.address)
    ).to.equal(true);
  });
});

describe("Staking", function () {
  it("Should revert: Invalid stakeId", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );
    await mintNftFixture(lamp, other);
    await lamp.connect(other).setApprovalForAll(staking.address, true);
    await expect(staking.connect(other).stake(0, 3)).to.be.revertedWith(
      "NFTStaking: Invalid plan"
    );
  });

  it("Should revert: Not approved", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );
    await mintNftFixture(lamp, other);
    await expect(staking.connect(other).stake(0, 0)).to.be.revertedWith(
      "ERC721: caller is not token owner or approved"
    );
  });

  it("Should revert: Not owner of NFT", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );
    const [owner] = await ethers.getSigners();
    await mintNftFixture(lamp, other);
    await mintNftFixture(lamp, owner);
    await lamp.connect(other).setApprovalForAll(staking.address, true);
    await expect(staking.connect(other).stake(4, 0)).to.be.revertedWith(
      "NFTStaking: Not owner of NFT"
    );
  });

  it("Should pass", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );
    await mintNftFixture(lamp, other);
    await lamp.connect(other).setApprovalForAll(staking.address, true);
    await expect(staking.connect(other).stake(0, 0)).to.emit(
      staking,
      "StakeCreated"
    );
    expect((await staking.stakes(0))[4]).to.equal(await time.latest());
    await expect(staking.connect(other).stake(1, 1)).to.emit(
      staking,
      "StakeCreated"
    );
    await expect(staking.connect(other).stake(2, 2)).to.emit(
      staking,
      "StakeCreated"
    );

    expect(await lamp.ownerOf(0)).to.equal(staking.address);
    expect(await lamp.ownerOf(1)).to.equal(staking.address);
    expect(await lamp.ownerOf(2)).to.equal(staking.address);
  });
});

describe("Unstaking", function () {
  it("Should revert: Stake not matured", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );
    await mintNftFixture(lamp, other);
    await lamp.connect(other).setApprovalForAll(staking.address, true);
    await staking.connect(other).stake(0, 0);
    await expect(staking.connect(other).unstake(0)).to.be.revertedWith(
      "NFTStaking: Stake not matured"
    );
  });

  it("Should revert: Not owner of NFT", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );
    const [owner] = await ethers.getSigners();
    await mintNftFixture(lamp, other); // id: 0, 1, 2
    await lamp.connect(other).setApprovalForAll(staking.address, true);
    await staking.connect(other).stake(0, 0);

    await expect(staking.unstake(0)).to.be.revertedWith(
      "NFTStaking: Not owner of stake"
    );
  });

  it("Should pass", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );

    await mintNftFixture(lamp, other); // id: 0, 1, 2
    await lamp.connect(other).setApprovalForAll(staking.address, true);
    await staking.connect(other).stake(0, 0);

    await time.increase(plan[0].duration); // 1 day
    await expect(staking.connect(other).unstake(0)).to.emit(
      staking,
      "StakeClaimed"
    );
    await expect((await remn.balanceOf(other.address)).toString()).equal(
      plan[0].reward
    );
  });

  it("Should revert: Already claimed", async function () {
    const { remn, lamp, staking, other } = await loadFixture(
      deployStakingFixture
    );

    await mintNftFixture(lamp, other); // id: 0, 1, 2
    await lamp.connect(other).setApprovalForAll(staking.address, true);
    await staking.connect(other).stake(0, 0);

    await time.increase(plan[0].duration); // 1 day
    await staking.connect(other).unstake(0);
    await expect(staking.connect(other).unstake(0)).to.be.revertedWith(
      "NFTStaking: Stake already claimed"
    );
  });
});
