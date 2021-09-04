const deployFunc = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const tokens = [{ name: "Gold Settlements Token", symbol: "SGLD" }];

    await deploy("GoldToken", {
        from: deployer,
        contract: "ERC20Mintable",
        args: ["Gold Token", "SGLD"],
        log: true,
    });
};

module.exports = deployFunc;
