const { BigNumber } = require("ethers");
const { parseUnits } = require("ethers/lib/utils");

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("hardhat-gas-reporter");
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
            gasPrice: 1 * parseUnits("12", "gwei"),
        },
        mainnet: {
            url: `https://eth-mainnet.alchemyapi.io/v2/`,
            accounts: [process.env.DEPLOYER_PRIVATE_KEY],
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },

    gasReporter: {
        enabled: true,
    },
};

// hardhat.config.js
