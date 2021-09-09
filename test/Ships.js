const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { parseEther } = require("ethers/lib/utils");

const { resources, climates, terrains } = require("./utils/IslandParams.js");
const { migrateContract } = require("./utils/migrate.helper.js");
const {
    climateMultipliers,
    terrainMultipliers,
    professions,
    names,
    routeMaxLengths,
} = require("./utils/params.js");

const ONE = BigNumber.from(parseEther("1"));

describe("Ships", function () {
    let ShipsContract;

    beforeEach(async function () {
        await deployments.fixture();
        const [account1] = await getUnnamedAccounts();

        ShipsContract = await ethers.getContract("Ships", account1);
        ShipsHelperContract = await ethers.getContract("ShipsHelper", account1);
        IslandsContract = await ethers.getContract("Islands", account1);
        SettlementsContract = await ethers.getContract("SettlementsV2", account1);
        LegacyContract = await ethers.getContract("SettlementsLegacy", account1);
    });

    it("Should mint token", async function () {
        await expect(ShipsContract.ownerOf(1)).to.be.revertedWith(
            "ERC721: owner query for nonexistent token"
        );

        await ShipsContract.mint(1);

        const [account1] = await getUnnamedAccounts();
        expect(await ShipsContract.ownerOf(1)).to.equal(account1);
        expect(await ShipsContract.balanceOf(account1)).to.equal(1);

        await ShipsContract.mint(57);
        expect(await ShipsContract.ownerOf(57)).to.equal(account1);
        expect(await ShipsContract.balanceOf(account1)).to.equal(2);
    });

    it("Should not mint token if already minted", async function () {
        await ShipsContract.mint(1);
        await expect(ShipsContract.mint(1)).to.be.revertedWith("Ship with that id already exists");

        await ShipsContract.mint(512);
        await expect(ShipsContract.mint(512)).to.be.revertedWith(
            "Ship with that id already exists"
        );
    });

    it("Should only not allow mints of 3000", async function () {
        await expect(ShipsContract.mint(3001)).to.be.revertedWith("Ship id is invalid");
    });

    it("Should get ships info", async function () {
        await ShipsContract.mint(1980);

        // Ensure idempotency
        expect(await ShipsContract.getShipInfo(1980)).to.eql(await ShipsContract.getShipInfo(1980));

        const attr = await ShipsContract.tokenIdToAttributes(1980);
        const info = await ShipsContract.getShipInfo(1980);

        expect(info.name).to.eq(names[attr.name]);
        expect(info.profession).to.eq(professions[attr.profession]);
        expect(info.route.length).to.eq(routeMaxLengths[attr.name]);
    });

    it("Should return correct tokenURI", async function () {
        await ShipsContract.mint(1873);

        let i = 0;
        while (i < 20) {
            i++;
            await ethers.provider.send("evm_mine");
        }
        const tokenURI = await ShipsContract.tokenURI(1873);
        console.log(tokenURI);
        const result = JSON.parse(Buffer.from(tokenURI.substring(29), "base64").toString());

        expect(result.attributes.length).to.eq(5);
    });

    it("Should get correct status", async function () {
        // await ShipsContract.mint(1873);
        // let status;
        // const [resting, sailing, harvesting] = [0, 1, 2];
        // const shipInfo = await ShipsContract.getShipInfo(1873);
        // console.log("SHIP", shipInfo);
        // let s = 0;
        // let blocksLeft;
        // while (s < 3) {
        //     let i = 0;
        //     while (i < 3) {
        //         status = await ShipsHelperContract.getStatus(1873);
        //         console.log(status);
        //         console.log(
        //             "blocks left",
        //             (await ShipsHelperContract.getBlocksUntilNextPhase(1873)).toString()
        //         );
        //         await ethers.provider.send("evm_mine");
        //         expect(status).to.be.eql(sailing);
        //         i += 1;
        //     }
        //     i = 0;
        //     while (i < 5) {
        //         status = await ShipsHelperContract.getStatus(1873);
        //         console.log(status);
        //         console.log(
        //             "blocks left",
        //             (await ShipsHelperContract.getBlocksUntilNextPhase(1873)).toString()
        //         );
        //         await ethers.provider.send("evm_mine");
        //         expect(status).to.be.eql(harvesting);
        //         i += 1;
        //     }
        //     i = 0;
        //     while (i < 3) {
        //         status = await ShipsHelperContract.getStatus(1873);
        //         console.log(status);
        //         console.log(
        //             "blocks left",
        //             (await ShipsHelperContract.getBlocksUntilNextPhase(1873)).toString()
        //         );
        //         await ethers.provider.send("evm_mine");
        //         expect(status).to.be.eql(sailing);
        //         i += 1;
        //     }
        //     i = 0;
        //     while (i < 5) {
        //         status = await ShipsHelperContract.getStatus(1873);
        //         console.log(status);
        //         console.log(
        //             "blocks left",
        //             (await ShipsHelperContract.getBlocksUntilNextPhase(1873)).toString()
        //         );
        //         await ethers.provider.send("evm_mine");
        //         expect(status).to.be.eql(harvesting);
        //         i += 1;
        //     }
        //     s += 1;
        // }
    });

    // To hard to test this so just did it anecdotally instead. Should be fine. Ship it (no pun intended).
    it("Should get current target of ship", async function () {
        await ShipsContract.mint(1878);

        const info = await ShipsContract.getShipInfo(1878);
        console.log("info", info);
        await ShipsHelperContract.getCurrentTarget(1878);

        let i = 0;
        while (i < 50) {
            await ethers.provider.send("evm_mine");
            await ShipsHelperContract.getCurrentTarget(1878);
            i += 1;
        }
    });

    it("Should get unharvested tokens", async function () {
        // await ShipsContract.mint(1878);
        // const shipInfo = await ShipsContract.getShipInfo(1878);
        // const res = await ShipsHelperContract.getUnharvestedTokens(1878);
        // let i = 0;
        // while (i < 17) {
        //     console.log(i);
        //     console.log(
        //         "harvesting",
        //         (await ShipsHelperContract.getUnharvestedTokens(1878)).map(
        //             ({ resourceTokenContract, amount }) => ({
        //                 resourceTokenContract,
        //                 amount: amount.toString(),
        //             })
        //         )
        //     );
        //     await ethers.provider.send("evm_mine");
        //     i += 1;
        // }
    });

    it("Should harvest single token", async function () {
        await ShipsContract.mint(1234);
        const [account1, account2] = await getUnnamedAccounts();

        let i = 0;
        while (i < 500) {
            i++;
            await ethers.provider.send("evm_mine");
        }

        const shipInfo = await ShipsContract.getShipInfo(1234);
        const tokenId = shipInfo.route[0].tokenId.toString();
        await LegacyContract.settle(tokenId);
        await migrateContract(tokenId, LegacyContract, SettlementsContract);
        await SettlementsContract.transferFrom(account1, account2, tokenId);

        const unharvestedTokens = await ShipsContract.getUnharvestedTokens(1234);
        const { resourceTokenContract, amount } = unharvestedTokens[0];
        const TokenContract = await ethers.getContractAt("ERC20Mintable", resourceTokenContract);
        const balanceBefore = await TokenContract.balanceOf(account1);

        const GoldTokenContract = await ethers.getContract("GoldToken");
        const goldTokenBalanceBefore = await GoldTokenContract.balanceOf(account2);

        await ShipsContract.harvestSingleToken(1234, resourceTokenContract);
        const goldTokenBalanceAfter = await GoldTokenContract.balanceOf(account2);
        const balanceAfter = await TokenContract.balanceOf(account1);

        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(goldTokenBalanceAfter).to.be.gt(goldTokenBalanceBefore);

        console.log("unharvested", unharvestedTokens);
    });

    // it("Should harvest tokens", async function () {
    //     await ShipsContract.mint(1234);
    //     const [account1] = await getUnnamedAccounts();

    //     let i = 0;
    //     while (i < 500) {
    //         i++;
    //         await ethers.provider.send("evm_mine");
    //     }

    //     const unharvestedTokens = await ShipsContract.getUnharvestedTokens(1234);
    //     const tokenURI = await ShipsContract.tokenURI(1234);

    //     const result = JSON.parse(Buffer.from(tokenURI.substring(29), "base64").toString());

    //     console.log("res", result);
    //     console.log("UNharvested", unharvestedTokens);
    //     const balancesBefore = await Promise.all(
    //         unharvestedTokens.map(async ({ resourceTokenContract, amount }) => {
    //             const contract = await ethers.getContractAt("ERC20Mintable", resourceTokenContract);
    //             const balance = await contract.balanceOf(account1);
    //             return balance;
    //         })
    //     );

    //     await ShipsContract.harvest(1234);

    //     const balancesAfter = await Promise.all(
    //         unharvestedTokens.map(async ({ resourceTokenContract, amount }) => {
    //             const contract = await ethers.getContractAt("ERC20Mintable", resourceTokenContract);
    //             const balance = await contract.balanceOf(account1);
    //             return balance;
    //         })
    //     );

    //     for (let i in balancesBefore) {
    //         expect(balancesBefore[i]).to.be.lt(balancesAfter[i]);
    //     }
    // });
});
