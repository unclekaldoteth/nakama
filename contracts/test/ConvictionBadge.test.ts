import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("ConvictionBadge", function () {
    let vault: any;
    let badge: any;
    let token: any;
    let owner: any;
    let user1: any;
    let user2: any;

    const INITIAL_BALANCE = ethers.parseEther("10000");
    const STAKE_AMOUNT = ethers.parseEther("1000");
    const DAY = 24 * 60 * 60;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy mock token
        const MockToken = await ethers.getContractFactory("MockERC20");
        token = await MockToken.deploy("Creator Coin", "CC");
        await token.waitForDeployment();

        // Mint tokens to users
        await token.mint(user1.address, INITIAL_BALANCE);
        await token.mint(user2.address, INITIAL_BALANCE);

        // Deploy vault
        const ConvictionVault = await ethers.getContractFactory("ConvictionVault");
        vault = await ConvictionVault.deploy();
        await vault.waitForDeployment();

        // Deploy badge
        const ConvictionBadge = await ethers.getContractFactory("ConvictionBadge");
        badge = await ConvictionBadge.deploy(await vault.getAddress());
        await badge.waitForDeployment();

        // Approve vault
        const vaultAddress = await vault.getAddress();
        await token.connect(user1).approve(vaultAddress, ethers.MaxUint256);
        await token.connect(user2).approve(vaultAddress, ethers.MaxUint256);
    });

    describe("claimOrRefresh()", function () {
        it("should revert without staked position", async function () {
            const tokenAddress = await token.getAddress();
            await expect(
                badge.connect(user1).claimOrRefresh(tokenAddress)
            ).to.be.revertedWith("No staked position");
        });

        it("should mint new badge for staker", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);

            await badge.connect(user1).claimOrRefresh(tokenAddress);

            expect(await badge.balanceOf(user1.address)).to.equal(1);
        });

        it("should refresh existing badge", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);
            await badge.connect(user1).claimOrRefresh(tokenAddress);

            // Extend lock to upgrade tier
            await vault.connect(user1).extendLock(tokenAddress, 100);

            // Refresh badge
            await badge.connect(user1).claimOrRefresh(tokenAddress);

            // Should still be 1 badge (same tokenId)
            expect(await badge.balanceOf(user1.address)).to.equal(1);
        });

        it("should track correct tier", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 100);
            await badge.connect(user1).claimOrRefresh(tokenAddress);

            const [tokenId, tier, , isValid] = await badge.getBadge(user1.address, tokenAddress);
            expect(tier).to.equal(4); // Legend
            expect(isValid).to.be.true;
        });
    });

    describe("Soulbound behavior", function () {
        beforeEach(async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);
            await badge.connect(user1).claimOrRefresh(tokenAddress);
        });

        it("should revert on transfer", async function () {
            await expect(
                badge.connect(user1).transferFrom(user1.address, user2.address, 1)
            ).to.be.revertedWith("Soulbound: non-transferable");
        });

        it("should revert on safeTransferFrom", async function () {
            await expect(
                badge.connect(user1)["safeTransferFrom(address,address,uint256)"](
                    user1.address,
                    user2.address,
                    1
                )
            ).to.be.revertedWith("Soulbound: non-transferable");
        });

        it("should revert on approve", async function () {
            await expect(
                badge.connect(user1).approve(user2.address, 1)
            ).to.be.revertedWith("Soulbound: approvals disabled");
        });

        it("should revert on setApprovalForAll", async function () {
            await expect(
                badge.connect(user1).setApprovalForAll(user2.address, true)
            ).to.be.revertedWith("Soulbound: approvals disabled");
        });
    });

    describe("hasValidBadge()", function () {
        it("should return false for no badge", async function () {
            const tokenAddress = await token.getAddress();
            expect(await badge.hasValidBadge(user1.address, tokenAddress, 1)).to.be.false;
        });

        it("should return true for valid badge meeting tier", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);
            await badge.connect(user1).claimOrRefresh(tokenAddress);

            expect(await badge.hasValidBadge(user1.address, tokenAddress, 1)).to.be.true;
            expect(await badge.hasValidBadge(user1.address, tokenAddress, 2)).to.be.true;
            expect(await badge.hasValidBadge(user1.address, tokenAddress, 3)).to.be.true;
        });

        it("should return false if tier requirement not met", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 10);
            await badge.connect(user1).claimOrRefresh(tokenAddress);

            // Silver tier (2), shouldn't meet Gold (3)
            expect(await badge.hasValidBadge(user1.address, tokenAddress, 3)).to.be.false;
        });

        it("should return false after expiry", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);
            await badge.connect(user1).claimOrRefresh(tokenAddress);

            // Fast forward past lock end
            await time.increase(35 * DAY);

            expect(await badge.hasValidBadge(user1.address, tokenAddress, 1)).to.be.false;
        });
    });

    describe("tokenURI()", function () {
        it("should return valid base64 JSON", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);
            await badge.connect(user1).claimOrRefresh(tokenAddress);

            const uri = await badge.tokenURI(1);
            expect(uri).to.include("data:application/json;base64,");

            // Decode and verify JSON structure
            const json = Buffer.from(uri.split(",")[1], "base64").toString();
            const metadata = JSON.parse(json);

            expect(metadata.name).to.include("Conviction Badge");
            expect(metadata.attributes).to.be.an("array");
        });

        it("should revert for non-existent token", async function () {
            await expect(badge.tokenURI(999)).to.be.revertedWith("Badge does not exist");
        });
    });
});
