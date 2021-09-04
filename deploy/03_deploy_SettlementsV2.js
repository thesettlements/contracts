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
        proxy: {
            proxyContract: "TransparentUpgradeableProxy",
            viaAdminContract: {
                name: "ProxyAdmin",
                args: [],
            },
        },
    });

    const SettlementsV2Contract = await ethers.getContract("SettlementsV2");
    await SettlementsV2Contract.initialize(
        LegacyContractAddress,
        resourceTokens[0].address,
        resourceTokens[1].address,
        resourceTokens[2].address,
        resourceTokens[3].address,
        resourceTokens[4].address,
        resourceTokens[5].address,
        resourceTokens[6].address,
        resourceTokens[7].address
    );

    console.log("Updating multipliers...");
    const tx = await SettlementsV2Contract.setCivMultipliers([1, 2, 3, 4, 5, 6, 7, 8]);
    const tx1 = await SettlementsV2Contract.setRealmMultipliers([6, 5, 4, 3, 2, 1]);
    const tx2 = await SettlementsV2Contract.setMoralMultipliers([2, 3, 1, 1, 3, 2, 1, 1, 1, 2]);

    console.log("Updating attributes");
    const tx3 = await SettlementsV2Contract.setAttributeOptions(
        _sizes,
        _spirits,
        _ages,
        _resources,
        _morales,
        _governments,
        _realms
    );

    for (const resourceToken of resourceTokens) {
        await resourceToken.addMinter(SettlementsV2Contract.address);
    }
};

module.exports = deployFunc;
