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

    const LegacyContract =
        { address: hre.network.config.SettlementsLegacyAddress } ||
        (await ethers.getContract("SettlementsLegacy"));

    await deploy("SettlementsV2", {
        from: deployer,
        args: [
            LegacyContract.address,
            resourceTokens[0].address,
            resourceTokens[1].address,
            resourceTokens[2].address,
            resourceTokens[3].address,
            resourceTokens[4].address,
            resourceTokens[5].address,
            resourceTokens[6].address,
            resourceTokens[7].address,
        ],
        log: true,
    });

    const SettlementsV2Contract = await ethers.getContract("SettlementsV2");

    for (const resourceToken of resourceTokens) {
        await resourceToken.addMinter(SettlementsV2Contract.address);
    }
};

module.exports = deployFunc;
