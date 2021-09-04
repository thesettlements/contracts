const deployFunc = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const LegacyContract = await ethers.getContract("SettlementsLegacy");
    const GoldTokenContract = await ethers.getContract("GoldToken");

    await deploy("SettlementsV2", {
        from: deployer,
        args: [
            LegacyContract.address,
            GoldTokenContract.address,
            GoldTokenContract.address,
            GoldTokenContract.address,
            GoldTokenContract.address,
            GoldTokenContract.address,
            GoldTokenContract.address,
            GoldTokenContract.address,
            GoldTokenContract.address,
        ],
        log: true,
    });

    const SettlementsV2Contract = await ethers.getContract("SettlementsV2");
    await GoldTokenContract.addMinter(SettlementsV2Contract.address);
};

deployFunc.skip = async (hre) => Boolean(hre.network.config.SettlementsLegacyAddress);

module.exports = deployFunc;
