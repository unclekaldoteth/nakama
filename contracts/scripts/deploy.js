"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const fs = __importStar(require("fs"));
async function main() {
    console.log("Deploying Conviction Vault contracts...\n");
    console.log(`Network: ${hardhat_1.network.name}`);
    const [deployer] = await hardhat_1.ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    const balance = await hardhat_1.ethers.provider.getBalance(deployer.address);
    console.log(`Balance: ${hardhat_1.ethers.formatEther(balance)} ETH\n`);
    // Deploy ConvictionVault
    console.log("Deploying ConvictionVault...");
    const ConvictionVault = await hardhat_1.ethers.getContractFactory("ConvictionVault");
    const vault = await ConvictionVault.deploy();
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log(`ConvictionVault deployed to: ${vaultAddress}\n`);
    // Deploy ConvictionBadge with vault address
    console.log("Deploying ConvictionBadge...");
    const ConvictionBadge = await hardhat_1.ethers.getContractFactory("ConvictionBadge");
    const badge = await ConvictionBadge.deploy(vaultAddress);
    await badge.waitForDeployment();
    const badgeAddress = await badge.getAddress();
    console.log(`ConvictionBadge deployed to: ${badgeAddress}\n`);
    // Log deployment summary
    console.log("=".repeat(50));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=".repeat(50));
    console.log(`ConvictionVault: ${vaultAddress}`);
    console.log(`ConvictionBadge: ${badgeAddress}`);
    console.log("=".repeat(50));
    // Verify contracts if not on hardhat network
    if (hardhat_1.network.name !== "hardhat" && hardhat_1.network.name !== "localhost") {
        console.log("\nWaiting for block confirmations before verification...");
        const vaultTx = vault.deploymentTransaction();
        const badgeTx = badge.deploymentTransaction();
        if (vaultTx)
            await vaultTx.wait(5);
        if (badgeTx)
            await badgeTx.wait(5);
        console.log("Verifying ConvictionVault...");
        try {
            await (0, hardhat_1.run)("verify:verify", {
                address: vaultAddress,
                constructorArguments: [],
            });
            console.log("ConvictionVault verified!");
        }
        catch (err) {
            const error = err;
            if (error.message.includes("Already Verified")) {
                console.log("ConvictionVault already verified");
            }
            else {
                console.log("ConvictionVault verification failed:", error.message);
            }
        }
        console.log("Verifying ConvictionBadge...");
        try {
            await (0, hardhat_1.run)("verify:verify", {
                address: badgeAddress,
                constructorArguments: [vaultAddress],
            });
            console.log("ConvictionBadge verified!");
        }
        catch (err) {
            const error = err;
            if (error.message.includes("Already Verified")) {
                console.log("ConvictionBadge already verified");
            }
            else {
                console.log("ConvictionBadge verification failed:", error.message);
            }
        }
    }
    // Save deployment addresses
    const deployments = {
        network: hardhat_1.network.name,
        chainId: hardhat_1.network.config.chainId,
        timestamp: new Date().toISOString(),
        contracts: {
            ConvictionVault: vaultAddress,
            ConvictionBadge: badgeAddress,
        },
    };
    const deploymentsDir = "./deployments";
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    const deploymentsPath = `${deploymentsDir}/${hardhat_1.network.name}.json`;
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`\nDeployment saved to ${deploymentsPath}`);
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
