const { parseEther } = require("ethers/lib/utils");
const { climateMultipliers, terrainMultipliers } = require("../test/utils/params");

const deployFunc = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const SettlementsExperienceTokenContract = await ethers.getContract(
        "SettlementsExperienceToken"
    );
    const GoldTokenContract = await ethers.getContract("GoldToken");

    await deploy("Ships", {
        from: deployer,
        log: true,
        args: [GoldTokenContract.address],
    });

    await deploy("ShipsHelper", {
        from: deployer,
        log: true,
        args: [SettlementsExperienceTokenContract.address],
    });

    const ShipsHelperContract = await ethers.getContract("ShipsHelper");
    const ShipsContract = await ethers.getContract("Ships");
    const SettlementsContract = await ethers.getContract("SettlementsV2");
    const IslandsContract = await ethers.getContract("Islands");

    await ShipsContract.setHelperContract(ShipsHelperContract.address);

    await ShipsHelperContract.setShipsContract(ShipsContract.address);
    await ShipsHelperContract.setSettlementsContract(SettlementsContract.address);
    await ShipsHelperContract.setIslandsContract(IslandsContract.address);

    await ShipsHelperContract.setCosts([
        [
            {
                resourceTokenContract: (await ethers.getContract("WoodToken")).address,
                amount: parseEther("3000"),
            },
        ],
        [
            {
                resourceTokenContract: (await ethers.getContract("WoodToken")).address,
                amount: parseEther("10000"),
            },
        ],
        [
            {
                resourceTokenContract: (await ethers.getContract("WoodToken")).address,
                amount: parseEther("10000"),
            },
            {
                resourceTokenContract: (await ethers.getContract("GoldToken")).address,
                amount: parseEther("5000"),
            },
        ],
        [
            {
                resourceTokenContract: (await ethers.getContract("WoodToken")).address,
                amount: parseEther("20000"),
            },
            {
                resourceTokenContract: (await ethers.getContract("GoldToken")).address,
                amount: parseEther("20000"),
            },
            {
                resourceTokenContract: (await ethers.getContract("IronToken")).address,
                amount: parseEther("10000"),
            },
        ],
        [
            {
                resourceTokenContract: (await ethers.getContract("WoodToken")).address,
                amount: parseEther("30000"),
            },
            {
                resourceTokenContract: (await ethers.getContract("GoldToken")).address,
                amount: parseEther("30000"),
            },
            {
                resourceTokenContract: (await ethers.getContract("IronToken")).address,
                amount: parseEther("30000"),
            },
        ],
    ]);

    await SettlementsExperienceTokenContract.addMinter(ShipsContract.address);
    // await GoldTokenContract.addMinter(ShipsContract.address);
};

module.exports = deployFunc;
