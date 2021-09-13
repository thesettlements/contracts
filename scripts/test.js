<<<<<<< HEAD
// const { migrateContract } = require("../test/utils/migrate.helper");

// // scripts/deploy.js
// async function main() {
//     // We get the contract to deploy

//     const { deployer } = await getNamedAccounts();

//     console.log("Legacy", hre.network.config.SettlementsLegacyAddress);
//     const SettlementsLegacy = await ethers.getContractAt(
//         "SettlementsLegacy",
//         hre.network.config.SettlementsLegacyAddress
//     );

//     const SettlementsV2 = await ethers.getContract("SettlementsV2");

//     const tx = await SettlementsLegacy.settle(878);
//     console.log(tx);
//     await tx.wait();

//     await migrateContract(878, SettlementsLegacy, SettlementsV2);

//     console.log(await SettlementsV2.ownerOf(878));
//     console.log(await SettlementsV2.tokenURI(878));
//     // const tx1 = await SettlementsV2.transferFrom(
//     //     deployer,
//     //     "0x83299c2ee1B74041dffcF56ff0a653DBD7e0cD40",
//     //     512
//     // );
//     console.log(tx1);
// }

// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error);
//         process.exit(1);
//     });
=======
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

    const tx = await SettlementsLegacy.settle(657);
    console.log(tx);
    await tx.wait();

    await migrateContract(657, SettlementsLegacy, SettlementsV2);

    console.log(await SettlementsV2.ownerOf(657));
    console.log(await SettlementsV2.tokenURI(657));
    // const tx1 = await SettlementsV2.transferFrom(
    //     deployer,
    //     "0x83299c2ee1B74041dffcF56ff0a653DBD7e0cD40",
    //     512
    // );
    console.log(tx1);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
>>>>>>> 3b35395ecca6abd7a9c5484621b1e9b8607a1671
