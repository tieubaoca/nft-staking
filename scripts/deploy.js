const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const lampNft = await hre.ethers.getContractFactory("LAMPNFT");
  const NftStaking = await hre.ethers.getContractFactory("NFTStaking");
  const RemnToken = await hre.ethers.getContractFactory("REMNToken");

  const token = await RemnToken.deploy();
  const nft = await lampNft.deploy();
  const staking = await NftStaking.deploy(nft.address, token.address);

  console.log('Remn Token: "' + token.address + '"');
  console.log('Lamp NFT: "' + nft.address + '"');
  console.log('Staking contract: "' + staking.address + '"');

  await token.deployed();
  await token.grantRole(await token.MINTER_ROLE(), staking.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
