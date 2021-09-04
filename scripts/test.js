const { migrateContract } = require("../test/utils/migrate.helper");

// scripts/deploy.js
async function main() {
    // We get the contract to deploy
    console.log("Legacy", hre.network.config.SettlementsLegacyAddress);
    const SettlementsLegacy = await ethers.getContractAt(
        "SettlementsLegacy",
        hre.network.config.SettlementsLegacyAddress
    );

    const SettlementsV2 = await ethers.getContract("SettlementsV2");

    const tx = await SettlementsLegacy.settle(129);
    console.log(tx);
    await tx.wait();

    await migrateContract(129, SettlementsLegacy, SettlementsV2);

    // console.log("Deploying Settlements...");
    // const stl = await Settlements.deploy();
    // console.log(stl.address);
    // console.log(stl.deployTransaction);
    // await stl.deployed();
    // console.log("Settlements Settlements to:", stl.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
