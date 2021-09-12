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
    expeditions,
    nameToMaxRouteLength,
    expeditionMultipliers,
    setlExpeditionMultipliers,
    setlNameMultipliers,
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
        SettlementsExperienceTokenContract = await ethers.getContract(
            "SettlementsExperienceToken",
            account1
        );
        LegacyContract = await ethers.getContract("SettlementsLegacy", account1);
    });

    it("Should only allow owner to use setters", async function () {
        const [account1] = await getUnnamedAccounts();
        await expect(ShipsContract.setHelperContract(account1)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );

        const { deployer } = await ethers.getNamedSigners();
        await ShipsContract.connect(deployer).setHelperContract(account1);

        expect(await ShipsContract.helperContract()).to.be.equal(account1);
    });

    it("Should get ship info", async function () {
        await ShipsContract.mint(1980);

        // Ensure idempotency
        expect(await ShipsContract.getShipInfo(1980)).to.eql(await ShipsContract.getShipInfo(1980));

        const attr = await ShipsContract.tokenIdToAttributes(1980);
        const info = await ShipsContract.getShipInfo(1980);

        expect(info.name).to.eq(names[attr.name]);
        expect(info.expedition).to.eq(expeditions[attr.expedition]);
        expect(info.length).to.gt(4);
        expect(info.speed).to.gt(4);
        expect(info.route.length).to.eq(nameToMaxRouteLength[attr.name]);
    });

    it("Should return correct tokenURI", async function () {
        await ShipsContract.mint(1873);

        let i = 0;
        while (i < 20) {
            i++;
            await ethers.provider.send("evm_mine");
        }

        const attr = await ShipsContract.tokenIdToAttributes(1873);
        const tokenURI = await ShipsContract.tokenURI(1873);
        console.log(tokenURI);
        const result = JSON.parse(Buffer.from(tokenURI.substring(29), "base64").toString());

        expect(result.attributes.length).to.eq(5);
        expect(result.attributes[0].value).to.eq(names[attr.name]);
        expect(result.attributes[1].value).to.eq(expeditions[attr.expedition]);
        expect(result.attributes[2].value).to.gte(5);
        expect(result.attributes[3].value).to.gte(5);
        expect(result.attributes[4].value.length).to.eq(nameToMaxRouteLength[attr.name]);
    });

    it("Should get tokenId to attributes", async function () {
        await ShipsContract.mint(1873);
        const attributes = await ShipsContract.getTokenIdToAttributes(1873);

        expect(attributes._length).to.gte(5);
        expect(attributes.speed).to.gte(5);
    });

    it("Should get random number in range", async function () {
        expect(await ShipsContract.getRandomNumber("0x1203", 10)).to.be.lt(10);
        expect(await ShipsContract.getRandomNumber("0x1206", 10)).to.be.lt(10);
        expect(await ShipsContract.getRandomNumber("0x1207", 10)).to.be.lt(10);
        expect(await ShipsContract.getRandomNumber("0x1201", 10)).to.be.lt(10);
        expect(await ShipsContract.getRandomNumber("0x1208", 10)).to.be.lt(10);
        expect(await ShipsContract.getRandomNumber("0x1276", 10)).to.be.lt(10);
        expect(await ShipsContract.getRandomNumber("0x1232", 10)).to.be.lt(10);
        expect(await ShipsContract.getRandomNumber("0x1224", 10)).to.be.lt(10);

        // Small prob of failing this test but should be fine
        expect(await ShipsContract.getRandomNumber("0x1224", 500000)).to.be.gt(10);
    });

    it("Should get unharvested tokens", async function () {
        await ShipsContract.mint(1029);

        const { route } = await ShipsContract.getShipInfo(1029);
        const beforeBlockNumber = await ethers.provider.getBlockNumber();
        for (const { tokenContract, tokenId } of route) {
            if (tokenContract == SettlementsContract.address) {
                await LegacyContract.settle(tokenId.toString());
                await migrateContract(tokenId.toString(), LegacyContract, SettlementsContract);
                continue;
            }

            const contract = await ethers.getContractAt("Islands", tokenContract);
            await contract.mint(tokenId);
        }
        const afterBlockNumber = await ethers.provider.getBlockNumber();

        let blockDelta = afterBlockNumber - beforeBlockNumber;
        let unharvestedTokens = await ShipsContract.getUnharvestedTokens(1029);

        expect(unharvestedTokens.length).to.eq(1);
        expect(unharvestedTokens[unharvestedTokens.length - 1].amount).to.gt(0);
        expect(unharvestedTokens[unharvestedTokens.length - 1].resourceTokenContract).to.eq(
            SettlementsExperienceTokenContract.address
        );

        const sailingDuration = await ShipsContract.getSailingDuration(1029);
        const harvestDuration = 120;
        let blocksUntilHarvestFinish =
            Number(sailingDuration.toString()) + harvestDuration - blockDelta;
        for (let i = 0; i < blocksUntilHarvestFinish; i++) {
            if (blocksUntilHarvestFinish - 10 < i) {
                unharvestedTokens = await ShipsContract.getUnharvestedTokens(1029);
                expect(unharvestedTokens.length).to.eq(1);
            }

            await ethers.provider.send("evm_mine");
        }

        let attributes = await ShipsContract.getTokenIdToAttributes(1029);
        let expectedHarvestAtSingleTarget = ONE.mul(
            BigNumber.from(expeditionMultipliers[attributes.expedition])
        );

        unharvestedTokens = await ShipsContract.getUnharvestedTokens(1029);
        expect(unharvestedTokens[0].amount).to.eq(expectedHarvestAtSingleTarget);
        expect(unharvestedTokens.length).to.eq(2);
        expect(unharvestedTokens[unharvestedTokens.length - 1].amount).to.gt(0);

        // TODO: Have tested single path,
        // now need to test going to the 2nd, 3rd path
        // need to test rolling back over to the start too

        blocksUntilHarvestFinish = Number(sailingDuration.toString()) + harvestDuration;
        for (let i = 0; i < blocksUntilHarvestFinish; i++) {
            if (blocksUntilHarvestFinish - 10 < i) {
                unharvestedTokens = await ShipsContract.getUnharvestedTokens(1029);
                expect(unharvestedTokens.length).to.eq(2);
            }

            await ethers.provider.send("evm_mine");
        }

        if (route.length === 3) {
            attributes = await ShipsContract.getTokenIdToAttributes(1029);
            expectedHarvestAtSingleTarget = ONE.mul(
                BigNumber.from(expeditionMultipliers[attributes.expedition])
            ).div(300);

            unharvestedTokens = await ShipsContract.getUnharvestedTokens(1029);
            expect(unharvestedTokens[1].amount).to.eq(expectedHarvestAtSingleTarget);
            expect(unharvestedTokens[0].amount).to.eq(expectedHarvestAtSingleTarget);
            expect(unharvestedTokens.length).to.eq(3);
            expect(unharvestedTokens[unharvestedTokens.length - 1].amount).to.gt(0);

            // We should be at the settlement point now
            blocksUntilHarvestFinish = Number(sailingDuration.toString()) + harvestDuration;
            for (let i = 0; i < blocksUntilHarvestFinish; i++) {
                if (blocksUntilHarvestFinish - 10 < i) {
                    unharvestedTokens = await ShipsContract.getUnharvestedTokens(1029);
                    expect(unharvestedTokens.length).to.eq(3);
                }

                await ethers.provider.send("evm_mine");
            }

            unharvestedTokens = await ShipsContract.getUnharvestedTokens(1029);
            expect(unharvestedTokens[1].amount).to.eq(expectedHarvestAtSingleTarget);
            expect(unharvestedTokens[0].amount).to.eq(expectedHarvestAtSingleTarget);

            // We should be at the next harvest now
            blocksUntilHarvestFinish = Number(sailingDuration.toString()) + harvestDuration;
            for (let i = 0; i < blocksUntilHarvestFinish; i++) {
                if (blocksUntilHarvestFinish - 10 < i) {
                    unharvestedTokens = await ShipsContract.getUnharvestedTokens(1029);
                    expect(unharvestedTokens.length).to.eq(3);
                    expect(unharvestedTokens[0].amount).to.eq(expectedHarvestAtSingleTarget);
                }

                await ethers.provider.send("evm_mine");
            }

            unharvestedTokens = await ShipsContract.getUnharvestedTokens(1029);
            expect(unharvestedTokens[1].amount).to.eq(expectedHarvestAtSingleTarget);
            expect(unharvestedTokens[0].amount).to.eq(expectedHarvestAtSingleTarget.mul(2));
        }
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

    it("Should harvest tokens", async function () {
        await ShipsContract.mint(1234);

        const { route } = await ShipsContract.getShipInfo(1234);
        for (const { tokenContract, tokenId } of route) {
            if (tokenContract == SettlementsContract.address) {
                await LegacyContract.settle(tokenId.toString());
                await migrateContract(tokenId.toString(), LegacyContract, SettlementsContract);
                continue;
            }

            const contract = await ethers.getContractAt("Islands", tokenContract);
            await contract.mint(tokenId);
        }

        const [account1] = await getUnnamedAccounts();

        let i = 0;
        while (i < 500) {
            i++;
            await ethers.provider.send("evm_mine");
        }

        const unharvestedTokens = await ShipsContract.getUnharvestedTokens(1234);
        const balancesBefore = await Promise.all(
            unharvestedTokens.map(async ({ resourceTokenContract, amount }) => {
                const contract = await ethers.getContractAt("ERC20Mintable", resourceTokenContract);
                const balance = await contract.balanceOf(account1);
                return balance;
            })
        );

        await ShipsContract.harvest(1234);

        const balancesAfter = await Promise.all(
            unharvestedTokens.map(async ({ resourceTokenContract, amount }) => {
                const contract = await ethers.getContractAt("ERC20Mintable", resourceTokenContract);
                const balance = await contract.balanceOf(account1);
                return balance;
            })
        );

        for (let i in balancesBefore) {
            expect(balancesBefore[i]).to.be.lt(balancesAfter[i]);
        }
    });

    it("Should harvest single token", async function () {
        await ShipsContract.mint(1234);
        const [account1, account2] = await getUnnamedAccounts();

        let i = 0;
        while (i < 1000) {
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

        await ShipsContract.harvestSingleToken(1234, resourceTokenContract);
        const balanceAfterAfter = await TokenContract.balanceOf(account1);
        expect(balanceAfterAfter).to.eq(balanceAfter);
    });

    it("Should not allow anyone to update the route", async function () {
        await ShipsContract.mint(1234);
        await expect(ShipsContract.updateRoute([], 1234)).to.be.revertedWith("Invalid route");
    });

    it("Should purchase ship", async function () {
        const { deployer } = await ethers.getNamedSigners();
        const [account1, account2] = await ethers.getSigners();

        const WoodTokenContract = await ethers.getContract("WoodToken", account1);
        await WoodTokenContract.connect(deployer).addMinter(account1.address);
        await WoodTokenContract.mint(account1.address, parseEther("100000"));
        await WoodTokenContract.approve(ShipsContract.address, parseEther("1000000000"));

        let balanceBefore = await WoodTokenContract.balanceOf(account1.address);
        await ShipsContract.connect(account1).purchaseShip(0);
        let balanceAfter = await WoodTokenContract.balanceOf(account1.address);

        expect(await ShipsContract.ownerOf(3001)).to.eq(account1.address);
        expect(balanceAfter).to.eq(balanceBefore.sub(parseEther("1000")));

        const GoldTokenContract = await ethers.getContract("GoldToken", account1);
        await GoldTokenContract.connect(deployer).addMinter(account1.address);
        await GoldTokenContract.mint(account1.address, parseEther("100000"));
        await GoldTokenContract.approve(ShipsContract.address, parseEther("1000000000"));

        const woodBalanceBefore = await WoodTokenContract.balanceOf(account1.address);
        const goldBalanceBefore = await GoldTokenContract.balanceOf(account1.address);
        await ShipsContract.connect(account1).purchaseShip(2);
        const woodBalanceAfter = await WoodTokenContract.balanceOf(account1.address);
        const goldBalanceAfter = await GoldTokenContract.balanceOf(account1.address);

        expect(await ShipsContract.ownerOf(3002)).to.eq(account1.address);
        expect(woodBalanceAfter).to.eq(woodBalanceBefore.sub(parseEther("3000")));
        expect(goldBalanceAfter).to.eq(goldBalanceBefore.sub(parseEther("5000")));

        const shipInfo = await ShipsContract.getShipInfo(3002);
        expect(shipInfo.name).to.eq("Clipper");
    });

    describe("ShipsHelper", async function () {
        it("Should only allow owner to use setters", async function () {
            const [account1, account2] = await getUnnamedAccounts();
            const { deployer } = await ethers.getNamedSigners();

            await expect(ShipsHelperContract.setShipsContract(account2)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(ShipsHelperContract.setSettlementsContract(account2)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(ShipsHelperContract.setIslandsContract(account2)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );

            await ShipsHelperContract.connect(deployer).setShipsContract(account2);
            await ShipsHelperContract.connect(deployer).setSettlementsContract(account2);
            await ShipsHelperContract.connect(deployer).setIslandsContract(account2);

            expect(await ShipsHelperContract.shipsContract()).to.eq(account2);
            expect(await ShipsHelperContract.settlementsContract()).to.eq(account2);
            expect(await ShipsHelperContract.islandsContract()).to.eq(account2);
        });

        // Takes too long to run this test so commented out
        // it("Should get correct status", async function () {
        //     await ShipsContract.mint(1234);
        //     const shipInfo = await ShipsContract.getShipInfo(1234);

        //     const sailingDuration = Number(
        //         (await ShipsContract.getSailingDuration(1234)).toString()
        //     );

        //     const [resting, sailing, harvesting] = [0, 1, 2];
        //     for (let s = 0; s < 1; s++) {
        //         for (let i = 0; i < shipInfo.route.length - 1; i++) {
        //             for (let i = 0; i < sailingDuration; i++) {
        //                 const status = await ShipsHelperContract.getStatus(1234);
        //                 await ethers.provider.send("evm_mine");
        //                 expect(status).to.eq(sailing);
        //             }

        //             const harvestDuration = 120;
        //             for (let i = 0; i < harvestDuration; i++) {
        //                 const status = await ShipsHelperContract.getStatus(1234);
        //                 await ethers.provider.send("evm_mine");
        //                 expect(status).to.eq(harvesting);
        //             }
        //         }

        //         for (let i = 0; i < sailingDuration; i++) {
        //             const status = await ShipsHelperContract.getStatus(1234);
        //             await ethers.provider.send("evm_mine");
        //             expect(status).to.eq(sailing);
        //         }

        //         const harvestDuration = 120;
        //         for (let i = 0; i < harvestDuration; i++) {
        //             const status = await ShipsHelperContract.getStatus(1234);
        //             await ethers.provider.send("evm_mine");
        //             expect(status).to.eq(resting);
        //         }
        //     }

        //     console.log("duration", sailingDuration);
        //     // for block in sailing duration, status == sailing
        //     // for block in harvest duration, status == harvest
        //     // if total length % round trip length > (single trip * (route length - 1)) + sailing duratiion
        // });

        // Takes too long to test this so commented
        // it("Should get current target of ship", async function () {
        //     await ShipsContract.mint(2222);
        //     const shipInfo = await ShipsContract.getShipInfo(2222);

        //     const harvestDuration = 120;
        //     const sailingDuration = Number(
        //         (await ShipsContract.getSailingDuration(2222)).toString()
        //     );

        //     // TODO: Test modulo overflow
        //     for (let s = 0; s < shipInfo.route.length; s++) {
        //         const expectedTarget = (s + 1) % shipInfo.route.length;
        //         const path = shipInfo.route[expectedTarget];

        //         for (let i = 0; i < harvestDuration + sailingDuration; i++) {
        //             const currentTarget = await ShipsHelperContract.getCurrentTarget(2222);
        //             expect(currentTarget.tokenId).to.eq(path.tokenId);
        //             await ethers.provider.send("evm_mine");
        //         }
        //     }
        // });

        // Takes too long
        // it("Should get blocks until next phase", async function () {
        //     await ShipsContract.mint(2222);
        //     const shipInfo = await ShipsContract.getShipInfo(2222);

        //     const harvestDuration = 120;
        //     const sailingDuration = Number(
        //         (await ShipsContract.getSailingDuration(2222)).toString()
        //     );

        //     // TODO: Test modulo overflow
        //     for (let s = 0; s < shipInfo.route.length; s++) {
        //         for (let i = 0; i < sailingDuration; i++) {
        //             const blocksUntilNextPhase = await ShipsHelperContract.getBlocksUntilNextPhase(
        //                 2222
        //             );
        //             expect(blocksUntilNextPhase).to.eq(sailingDuration - i);
        //             await ethers.provider.send("evm_mine");
        //         }

        //         for (let i = 0; i < harvestDuration; i++) {
        //             const blocksUntilNextPhase = await ShipsHelperContract.getBlocksUntilNextPhase(
        //                 2222
        //             );
        //             expect(blocksUntilNextPhase).to.eq(harvestDuration - i);
        //             await ethers.provider.send("evm_mine");
        //         }
        //     }
        // });

        // Takes too long
        // it("Should get unharvested settlement tokens", async function () {
        //     await ShipsContract.mint(1980);
        //     const attributes = await ShipsContract.tokenIdToAttributes(1980);

        //     const { route } = await ShipsContract.getShipInfo(1980);
        //     const beforeBlockNumber = await ethers.provider.getBlockNumber();
        //     for (const { tokenContract, tokenId } of route) {
        //         if (tokenContract == SettlementsContract.address) {
        //             await LegacyContract.settle(tokenId.toString());
        //             await migrateContract(tokenId.toString(), LegacyContract, SettlementsContract);
        //             continue;
        //         }

        //         const contract = await ethers.getContractAt("Islands", tokenContract);
        //         await contract.mint(tokenId);
        //     }

        //     let i = 0;
        //     while (i < 50) {
        //         await ethers.provider.send("evm_mine");
        //         i += 1;
        //     }
        //     const afterBlockNumber = await ethers.provider.getBlockNumber();

        //     const expected = BigNumber.from(afterBlockNumber - beforeBlockNumber)
        //         .mul(setlExpeditionMultipliers[attributes.expedition])
        //         .mul(setlNameMultipliers[attributes.name])
        //         .mul(ONE);

        //     let unharvestedSetlTokens = await ShipsHelperContract.getUnharvestedSettlementTokens(
        //         1980
        //     );

        //     expect(unharvestedSetlTokens).to.eq(expected);

        //     await ShipsContract.harvest(1980);
        //     unharvestedSetlTokens = await ShipsHelperContract.getUnharvestedSettlementTokens(1980);
        //     expect(unharvestedSetlTokens).to.eq(0);
        // });

        it("Should get tax destination", async function () {
            await ShipsContract.mint(999);
            const { route } = await ShipsContract.getShipInfo(999);
            const { tokenId } = route[0];

            for (const { tokenContract, tokenId } of route) {
                if (tokenContract == SettlementsContract.address) {
                    await LegacyContract.settle(tokenId.toString());
                    await migrateContract(tokenId.toString(), LegacyContract, SettlementsContract);
                    continue;
                }

                const contract = await ethers.getContractAt("Islands", tokenContract);
                await contract.mint(tokenId);
            }

            expect(await ShipsHelperContract.getTaxDestination(999)).to.eq(
                await SettlementsContract.ownerOf(tokenId)
            );
        });

        it("Should generate initial route", async function () {
            const name = 3;
            const route = await ShipsHelperContract.getInitialRoute(100, name);

            expect(route.length).to.eq(nameToMaxRouteLength[name]);
            expect(route[0].tokenContract).to.eq(SettlementsContract.address);
            expect(route[1].tokenContract).to.eq(IslandsContract.address);

            route.forEach(({ tokenId }) => expect(tokenId).to.lt(10_000));
        });
    });
});
