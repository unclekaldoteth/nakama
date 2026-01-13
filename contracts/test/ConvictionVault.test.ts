import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("ConvictionVault", function () {
    let vault: any;
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

        // Approve vault
        const vaultAddress = await vault.getAddress();
        await token.connect(user1).approve(vaultAddress, ethers.MaxUint256);
        await token.connect(user2).approve(vaultAddress, ethers.MaxUint256);
    });

    describe("stake()", function () {
        it("should stake tokens with valid parameters", async function () {
            const lockDays = 30;
            const tokenAddress = await token.getAddress();
            const tx = await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, lockDays);

            const receipt = await tx.wait();
            expect(receipt).to.not.be.null;

            const [amount, lockEnd] = await vault.getPosition(user1.address, tokenAddress);
            expect(amount).to.equal(STAKE_AMOUNT);

            const expectedLockEnd = (await time.latest()) + lockDays * DAY;
            expect(lockEnd).to.be.closeTo(expectedLockEnd, 10);
        });

        it("should revert with zero amount", async function () {
            const tokenAddress = await token.getAddress();
            await expect(
                vault.connect(user1).stake(tokenAddress, 0, 30)
            ).to.be.revertedWith("Amount must be > 0");
        });

        it("should revert with lock too short", async function () {
            const tokenAddress = await token.getAddress();
            await expect(
                vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 0)
            ).to.be.revertedWith("Lock too short");
        });

        it("should revert with lock too long", async function () {
            const tokenAddress = await token.getAddress();
            await expect(
                vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 400)
            ).to.be.revertedWith("Lock too long");
        });

        it("should revert if position already exists", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);
            await expect(
                vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30)
            ).to.be.revertedWith("Position exists, use increaseStake");
        });
    });

    describe("increaseStake()", function () {
        beforeEach(async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);
        });

        it("should add to existing stake", async function () {
            const tokenAddress = await token.getAddress();
            const addAmount = ethers.parseEther("500");
            await vault.connect(user1).increaseStake(tokenAddress, addAmount);

            const [amount] = await vault.getPosition(user1.address, tokenAddress);
            expect(amount).to.equal(STAKE_AMOUNT + addAmount);
        });

        it("should revert with no existing position", async function () {
            const tokenAddress = await token.getAddress();
            await expect(
                vault.connect(user2).increaseStake(tokenAddress, STAKE_AMOUNT)
            ).to.be.revertedWith("No existing position");
        });
    });

    describe("extendLock()", function () {
        beforeEach(async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);
        });

        it("should extend lock period", async function () {
            const tokenAddress = await token.getAddress();
            const [, originalLockEnd] = await vault.getPosition(user1.address, tokenAddress);

            await vault.connect(user1).extendLock(tokenAddress, 60);

            const [, newLockEnd] = await vault.getPosition(user1.address, tokenAddress);
            expect(newLockEnd).to.be.gt(originalLockEnd);
        });

        it("should allow extending with a shorter duration if lockEnd increases", async function () {
            const tokenAddress = await token.getAddress();
            await time.increase(25 * DAY);

            const [, originalLockEnd] = await vault.getPosition(user1.address, tokenAddress);
            await vault.connect(user1).extendLock(tokenAddress, 7);
            const [, newLockEnd] = await vault.getPosition(user1.address, tokenAddress);

            expect(newLockEnd).to.be.gt(originalLockEnd);
            expect(await vault.getTier(user1.address, tokenAddress)).to.equal(2);
        });

        it("should revert if position is expired", async function () {
            const tokenAddress = await token.getAddress();
            await time.increase(31 * DAY);

            await expect(
                vault.connect(user1).extendLock(tokenAddress, 7)
            ).to.be.revertedWith("Position expired");
        });
    });

    describe("withdraw()", function () {
        beforeEach(async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 30);
        });

        it("should revert while still locked", async function () {
            const tokenAddress = await token.getAddress();
            await expect(
                vault.connect(user1).withdraw(tokenAddress)
            ).to.be.revertedWith("Still locked");
        });

        it("should allow withdrawal after lock expires", async function () {
            const tokenAddress = await token.getAddress();
            await time.increase(31 * DAY);

            const balanceBefore = await token.balanceOf(user1.address);
            await vault.connect(user1).withdraw(tokenAddress);
            const balanceAfter = await token.balanceOf(user1.address);

            expect(balanceAfter - balanceBefore).to.equal(STAKE_AMOUNT);
        });

        it("should clear position after withdrawal", async function () {
            const tokenAddress = await token.getAddress();
            await time.increase(31 * DAY);
            await vault.connect(user1).withdraw(tokenAddress);

            const [amount] = await vault.getPosition(user1.address, tokenAddress);
            expect(amount).to.equal(0);
        });
    });

    describe("getTier()", function () {
        it("should return 0 for no stake", async function () {
            const tokenAddress = await token.getAddress();
            const tier = await vault.getTier(user1.address, tokenAddress);
            expect(tier).to.equal(0);
        });

        it("should return Bronze (1) for any stake", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 1);
            const tier = await vault.getTier(user1.address, tokenAddress);
            expect(tier).to.equal(1);
        });

        it("should return Silver (2) for 7+ days lock", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 10);
            const tier = await vault.getTier(user1.address, tokenAddress);
            expect(tier).to.equal(2);
        });

        it("should return Gold (3) for 30+ days lock", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 35);
            const tier = await vault.getTier(user1.address, tokenAddress);
            expect(tier).to.equal(3);
        });

        it("should return Legend (4) for 90+ days lock", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 100);
            const tier = await vault.getTier(user1.address, tokenAddress);
            expect(tier).to.equal(4);
        });

        it("should keep tier based on lock duration", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, STAKE_AMOUNT, 95);

            // Initially Legend
            expect(await vault.getTier(user1.address, tokenAddress)).to.equal(4);

            // Tier should remain Legend as time passes
            await time.increase(70 * DAY);
            expect(await vault.getTier(user1.address, tokenAddress)).to.equal(4);
        });
    });

    describe("getConvictionScore()", function () {
        it("should return sqrt of amount", async function () {
            const tokenAddress = await token.getAddress();
            await vault.connect(user1).stake(tokenAddress, ethers.parseEther("100"), 30);
            const score = await vault.getConvictionScore(user1.address, tokenAddress);

            // sqrt(100 * 10^18) ≈ 10 * 10^9
            expect(score).to.be.closeTo(ethers.parseUnits("10", 9), ethers.parseUnits("1", 8));
        });
    });
});
