const {
    _sizes,
    _spirits,
    _ages,
    _resources,
    _morales,
    _governments,
    _realms,
} = require("../test/utils/params");

const deployFunc = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const resourceTokens = await Promise.all([
        ethers.getContract("IronToken"),
        ethers.getContract("GoldToken"),
        ethers.getContract("SilverToken"),
        ethers.getContract("WoodToken"),
        ethers.getContract("WoolToken"),
        ethers.getContract("WaterToken"),
        ethers.getContract("GrassToken"),
        ethers.getContract("GrainToken"),
    ]);

    const LegacyContractAddress =
        hre.network.config.SettlementsLegacyAddress ||
        (await ethers.getContract("SettlementsLegacy")).address;

    await deploy("SettlementsV2", {
        from: deployer,
        log: true,
        args: [
            LegacyContractAddress,
            resourceTokens[0].address,
            resourceTokens[1].address,
            resourceTokens[2].address,
            resourceTokens[3].address,
            resourceTokens[4].address,
            resourceTokens[5].address,
            resourceTokens[6].address,
            resourceTokens[7].address,
        ],
    });

    const SettlementsV2Contract = await ethers.getContract("SettlementsV2");

    for (const resourceToken of resourceTokens) {
        const tx4 = await resourceToken.addMinter(SettlementsV2Contract.address);
    }

    const HelpersContract = await ethers.getContract("Helpers");
    await SettlementsV2Contract.setHelpersContract(HelpersContract.address, {
        gasLimit: 2_000_000,
    });
};

module.exports = deployFunc;
