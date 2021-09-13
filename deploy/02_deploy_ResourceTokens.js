const deployFunc = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const tokens = [
        // { name: "Iron Settlements Token", symbol: "IRON", deploymentName: "IronToken" },
        // { name: "Gold Settlements Token", symbol: "GOLD", deploymentName: "GoldToken" },
        // { name: "Silver Settlements Token", symbol: "SLVR", deploymentName: "SilverToken" },
        // { name: "Wood Settlements Token", symbol: "WOOD", deploymentName: "WoodToken" },
        // { name: "Wool Settlements Token", symbol: "WOOL", deploymentName: "WoolToken" },
        // { name: "Water Settlements Token", symbol: "WATR", deploymentName: "WaterToken" },
        // { name: "Grass Settlements Token", symbol: "GRSS", deploymentName: "GrassToken" },
        // { name: "Grain Settlements Token", symbol: "GRN", deploymentName: "GrainToken" },
        { name: "Fish Settlements Token", symbol: "FISH", deploymentName: "FishToken" },
        { name: "Pearl Settlements Token", symbol: "PRL", deploymentName: "PearlToken" },
        { name: "Oil Settlements Token", symbol: "OIL", deploymentName: "OilToken" },
        { name: "Diamond Settlements Token", symbol: "DMND", deploymentName: "DiamondToken" },
        {
            name: "Settlements Experience",
            symbol: "SETL",
            deploymentName: "SettlementsExperienceToken",
        },
    ];

    for (const { name, symbol, deploymentName } of tokens) {
        await deploy(deploymentName, {
            from: deployer,
            contract: "ERC20Mintable",
            args: [name, symbol],
            log: true,
        });
    }
};

module.exports = deployFunc;
