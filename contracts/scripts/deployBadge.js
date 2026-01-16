"use strict";

const { ethers, run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadVaultAddress() {
    const deploymentsPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error(
            `Missing deployments file at ${deploymentsPath}. ` +
            `Deploy ConvictionVault first or provide a deployments file for ${network.name}.`
        );
    }

    const deploymentsRaw = fs.readFileSync(deploymentsPath, "utf8");
    const deployments = JSON.parse(deploymentsRaw);
    const vaultAddress = deployments?.contracts?.ConvictionVault;

    if (!vaultAddress) {
        throw new Error(`ConvictionVault address not found in ${deploymentsPath}.`);
    }

    return vaultAddress;
}

async function main() {
    console.log("Redeploying ConvictionBadge...\n");
    console.log(`Network: ${network.name}`);

    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

    const vaultAddress = loadVaultAddress();
    console.log(`Using ConvictionVault: ${vaultAddress}\n`);

    const ConvictionBadge = await ethers.getContractFactory("ConvictionBadge");
    const badge = await ConvictionBadge.deploy(vaultAddress);
    await badge.waitForDeployment();
    const badgeAddress = await badge.getAddress();
    console.log(`ConvictionBadge deployed to: ${badgeAddress}\n`);

    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("Waiting for block confirmations before verification...");
        const badgeTx = badge.deploymentTransaction();
        if (badgeTx) await badgeTx.wait(5);

        console.log("Verifying ConvictionBadge...");
        try {
            await run("verify:verify", {
                address: badgeAddress,
                constructorArguments: [vaultAddress],
            });
            console.log("ConvictionBadge verified!");
        } catch (err) {
            const error = err;
            if (error && error.message && error.message.includes("Already Verified")) {
                console.log("ConvictionBadge already verified");
            } else {
                console.log("ConvictionBadge verification failed:", error?.message || error);
            }
        }
    }

    const deploymentsPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
    const deploymentsRaw = fs.readFileSync(deploymentsPath, "utf8");
    const deployments = JSON.parse(deploymentsRaw);

    deployments.network = network.name;
    deployments.chainId = network.config.chainId;
    deployments.timestamp = new Date().toISOString();
    deployments.contracts = {
        ConvictionVault: vaultAddress,
        ConvictionBadge: badgeAddress,
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`\nDeployment updated at ${deploymentsPath}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
