const deployFunc = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    console.log(deployer);

    await deploy("TokenURI", {
        from: deployer,
        args: [],
        log: true,
    });
};

module.exports = deployFunc;
