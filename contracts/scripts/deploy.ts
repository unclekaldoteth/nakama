import { ethers, run, network } from "hardhat";
import * as fs from "fs";

async function main() {
    console.log("Deploying Conviction Vault contracts...\n");
    console.log(`Network: ${network.name}`);

    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Deploy ConvictionVault
    console.log("Deploying ConvictionVault...");
    const ConvictionVault = await ethers.getContractFactory("ConvictionVault");
    const vault = await ConvictionVault.deploy();
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log(`ConvictionVault deployed to: ${vaultAddress}\n`);

    // Deploy ConvictionBadge with vault address
    console.log("Deploying ConvictionBadge...");
    const ConvictionBadge = await ethers.getContractFactory("ConvictionBadge");
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
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("\nWaiting for block confirmations before verification...");
        const vaultTx = vault.deploymentTransaction();
        const badgeTx = badge.deploymentTransaction();
        if (vaultTx) await vaultTx.wait(5);
        if (badgeTx) await badgeTx.wait(5);

        console.log("Verifying ConvictionVault...");
        try {
            await run("verify:verify", {
                address: vaultAddress,
                constructorArguments: [],
            });
            console.log("ConvictionVault verified!");
        } catch (err) {
            const error = err as Error;
            if (error.message.includes("Already Verified")) {
                console.log("ConvictionVault already verified");
            } else {
                console.log("ConvictionVault verification failed:", error.message);
            }
        }

        console.log("Verifying ConvictionBadge...");
        try {
            await run("verify:verify", {
                address: badgeAddress,
                constructorArguments: [vaultAddress],
            });
            console.log("ConvictionBadge verified!");
        } catch (err) {
            const error = err as Error;
            if (error.message.includes("Already Verified")) {
                console.log("ConvictionBadge already verified");
            } else {
                console.log("ConvictionBadge verification failed:", error.message);
            }
        }
    }

    // Save deployment addresses
    const deployments = {
        network: network.name,
        chainId: network.config.chainId,
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
    const deploymentsPath = `${deploymentsDir}/${network.name}.json`;
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`\nDeployment saved to ${deploymentsPath}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
