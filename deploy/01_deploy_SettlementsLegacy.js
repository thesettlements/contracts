const deployFunc = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    console.log(deployer);

    await deploy("SettlementsLegacy", {
        from: deployer,
        args: [],
        log: true,
    });
};

deployFunc.skip = async (hre) => Boolean(hre.network.config.SettlementsLegacyAddress);

module.exports = deployFunc;
