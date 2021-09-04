const { migrateContract } = require("../test/utils/migrate.helper");

// scripts/deploy.js
async function main() {
    // We get the contract to deploy

    const { deployer } = await getNamedAccounts();

    console.log("Legacy", hre.network.config.SettlementsLegacyAddress);
    const SettlementsLegacy = await ethers.getContractAt(
        "SettlementsLegacy",
        hre.network.config.SettlementsLegacyAddress
    );

    const SettlementsV2 = await ethers.getContract("SettlementsV2");

    const tx = await SettlementsLegacy.settle(901, { gasLimit: 1_000_000 });
    console.log(tx);
    await tx.wait();

    await migrateContract(901, SettlementsLegacy, SettlementsV2);

    console.log(await SettlementsV2.ownerOf(901, { gasLimit: 2_000_000 }));
    console.log(await SettlementsV2.tokenURI(901));
    const tx1 = await SettlementsV2.transferFrom(
        deployer,
        "0x89324327750e10A040A05e5286A5fB66A9Ba71C4s",
        901
    );
    console.log(tx1);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
