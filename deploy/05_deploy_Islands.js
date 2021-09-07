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

    await deploy("Islands", {
        from: deployer,
        log: true,
        args: [...resourceTokens.map(({ address }) => address)],
    });

    await deploy("IslandsHelper", {
        from: deployer,
        log: true,
        args: [],
    });

    const IslandsHelperContract = await ethers.getContract("IslandsHelper");
    const IslandsContract = await ethers.getContract("Islands");

    await IslandsContract.setHelperContract(IslandsHelperContract.address);
    await IslandsHelperContract.setIslandsContract(IslandsContract.address);
};

module.exports = deployFunc;
