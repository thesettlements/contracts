const { climateMultipliers, terrainMultipliers } = require("../test/utils/params");

const deployFunc = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const resourceTokens = await Promise.all([
        ethers.getContract("FishToken"),
        ethers.getContract("WoodToken"),
        ethers.getContract("IronToken"),
        ethers.getContract("SilverToken"),
        ethers.getContract("PearlToken"),
        ethers.getContract("OilToken"),
        ethers.getContract("DiamondToken"),
    ]);

    await deploy("Ships", {
        from: deployer,
        log: true,
        args: [],
    });

    await deploy("ShipsHelper", {
        from: deployer,
        log: true,
        args: [],
    });

    const ShipsHelperContract = await ethers.getContract("ShipsHelper");
    const ShipsContract = await ethers.getContract("Ships");
    const SettlementsContract = await ethers.getContract("SettlementsV2");
    const IslandsContract = await ethers.getContract("Islands");

    await ShipsContract.setHelperContract(ShipsHelperContract.address);

    await ShipsHelperContract.setShipsContract(ShipsContract.address);
    await ShipsHelperContract.setSettlementsContract(SettlementsContract.address);
    await ShipsHelperContract.setIslandsContract(IslandsContract.address);

    // await IslandsContract.setHelperContract(IslandsHelperContract.address);
    // await IslandsHelperContract.setIslandsContract(IslandsContract.address);

    // await IslandsHelperContract.setMultipliers(climateMultipliers, terrainMultipliers);

    // for (const resourceToken of resourceTokens) {
    //     const tx4 = await resourceToken.addMinter(IslandsContract.address);
    // }
};

module.exports = deployFunc;
