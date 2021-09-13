const { migrateContract } = require("../test/utils/migrate.helper");

async function main() {
    const IslandsContract = await ethers.getContract("Islands");
    const ShipsContract = await ethers.getContract("Ships");
    const SettlementsContract = await ethers.getContract("SettlementsV2");
    const LegacyContract = await ethers.getContractAt(
        "SettlementsLegacy",
        hre.network.config.SettlementsLegacyAddress
    );

    const islandsId = 1;
    const shipsId = 1;

    console.log("Minting Island...");
    let tx = await IslandsContract.mint(islandsId, { gasLimit: 500_000 });
    await tx.wait();

    console.log("Minting Ship...");
    tx = await ShipsContract.mint(shipsId, { gasLimit: 500_000 });
    await tx.wait();

    // console.log("Creating paths...");
    // const { route } = await ShipsContract.getShipInfo(shipsId);
    // console.log(route);
    // for (const { tokenContract, tokenId } of route) {
    //     if (tokenContract == SettlementsContract.address) {
    //         console.log("Settling ", tokenId.toString());
    //         tx = await LegacyContract.settle(tokenId.toString());
    //         await tx.wait();
    //         console.log("Migrating ", tokenId.toString());
    //         await migrateContract(tokenId.toString(), LegacyContract, SettlementsContract);
    //         continue;
    //     }

    //     await IslandsContract.mint(tokenId);
    // }

    const { deployer } = await ethers.getNamedSigners();

    // console.log("Transferring to user...");
    // await IslandsContract.transferFrom(
    //     deployer.address,
    //     "0x89324327750e10A040A05e5286A5fB66A9Ba71C4",
    //     islandsId,
    //     { gasLimit: 1_000_000 }
    // );

    // await ShipsContract.transferFrom(
    //     deployer.address,
    //     "0x89324327750e10A040A05e5286A5fB66A9Ba71C4",
    //     shipsId
    // );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
