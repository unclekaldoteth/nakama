/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require("ts-node/register");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

// Only include accounts if a valid private key is provided (64 hex chars or 66 with 0x prefix)
const hasValidKey = PRIVATE_KEY && (PRIVATE_KEY.length === 64 || (PRIVATE_KEY.startsWith("0x") && PRIVATE_KEY.length === 66));

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            viaIR: true,
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    paths: {
        sources: "./src",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        baseSepolia: {
            url: "https://sepolia.base.org",
            chainId: 84532,
            ...(hasValidKey ? { accounts: [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`] } : {}),
        },
        base: {
            url: "https://mainnet.base.org",
            chainId: 8453,
            ...(hasValidKey ? { accounts: [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`] } : {}),
        },
    },
    etherscan: {
        // V2 API: Use a single Etherscan.io API key for all chains
        // Get your API key from https://etherscan.io/apidashboard
        apiKey: BASESCAN_API_KEY,
    },
};
