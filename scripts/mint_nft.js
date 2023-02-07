require("dotenv").config();

const { ethers, upgrades } = require("hardhat");

async function main() {
  const Lamp = ethers.getContractFactory("LAMPNFT");
  const lamp = await (await Lamp).attach(process.env.LAMP_ADDRESS);

  const recipients = process.env.NFT_RECIPIENTS.split(",");
  for (let i = 0; i < recipients.length; i++) {
    let res = await lamp.safeMint(recipients[i]);
    console.log("mint success, tx hash: ", res.hash);
  }
}

main();
