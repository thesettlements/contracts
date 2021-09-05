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

    const tx = await SettlementsLegacy.settle(512, { gasLimit: 1_000_000 });
    console.log(tx);
    await tx.wait();

    await migrateContract(512, SettlementsLegacy, SettlementsV2);

    console.log(await SettlementsV2.ownerOf(512, { gasLimit: 2_000_000 }));
    console.log(await SettlementsV2.tokenURI(512));
    const tx1 = await SettlementsV2.transferFrom(
        deployer,
        "0x83299c2ee1B74041dffcF56ff0a653DBD7e0cD40",
        512
    );
    console.log(tx1);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
