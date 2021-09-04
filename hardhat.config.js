require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("dotenv").config();

console.log(process.env.DEPLOYER_PRIVATE_KEY);

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        version: "0.8.4",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
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
        },
        mainnet: {
            url: `https://eth-mainnet.alchemyapi.io/v2/`,
            accounts: [process.env.DEPLOYER_PRIVATE_KEY],
        },
    },
    etherscan: {
        // apiKey: etherscanApiKey,
    },
};

// hardhat.config.js
