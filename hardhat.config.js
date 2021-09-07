const { BigNumber } = require("ethers");
const { parseUnits } = require("ethers/lib/utils");

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        version: "0.8.4",
        settings: {
            optimizer: {
                enabled: true,
                runs: 600,
            },
        },
    },
    namedAccounts: {
        deployer: 0,
    },
    networks: {
        rinkeby: {
            url: process.env.RINKEBY_URL,
            accounts: [process.env.DEPLOYER_PRIVATE_KEY],
            gasPrice: 10 * parseUnits("1", "gwei"),
            SettlementsLegacyAddress: "0x71482Da8ec9ACa79b699c37fD1F7eAC5833221b5",
        },
        mainnet: {
            url: process.env.MAINNET_URL,
            accounts: [process.env.DEPLOYER_PRIVATE_KEY],
            gasPrice: 1 * parseUnits("100", "gwei"),
            SettlementsLegacyAddress: "0xdEcC60000ba66700a009b8F9F7D82676B5cfA88A",
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },

    contractSizer: {
        alphaSort: false,
        runOnCompile: false,
        disambiguatePaths: false,
    },

    gasReporter: {
        enabled: true,
    },
};

// hardhat.config.js
