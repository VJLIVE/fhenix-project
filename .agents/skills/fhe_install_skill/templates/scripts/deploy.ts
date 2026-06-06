import { ethers } from "hardhat";

async function main() {
  const Factory = await ethers.getContractFactory("ConfidentialVault");
  const contract = await Factory.deploy();
  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
