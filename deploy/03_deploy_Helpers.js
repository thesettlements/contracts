const deployFunc = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    console.log(deployer);

    await deploy("Helpers", {
        from: deployer,
        args: [],
        log: true,
    });

    const HelpersContract = await ethers.getContract("Helpers");

    console.log("Updating multipliers...");
    const civMultipliers = [1, 2, 3, 4, 5, 6, 7, 8];
    const realmMultipliers = [6, 5, 4, 3, 2, 1];
    const moraleMultipliers = [2, 3, 1, 1, 3, 2, 1, 1, 1, 2];
    const tx = await HelpersContract.setMultipliers(
        civMultipliers,
        realmMultipliers,
        moraleMultipliers
    );

    await tx.wait();
};

module.exports = deployFunc;
