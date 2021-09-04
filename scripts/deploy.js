// scripts/deploy.js
async function main () {
  // We get the contract to deploy
  const Settlements = await ethers.getContractFactory('SettlementsV2');
  console.log('Deploying Settlements...');
  const stl = await Settlements.deploy();
  console.log(stl.address)
  console.log(stl.deployTransaction)
  await stl.deployed();
  console.log('Settlements Settlements to:', stl.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
