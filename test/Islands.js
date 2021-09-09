const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { parseEther } = require("ethers/lib/utils");

const { resources, climates, terrains } = require("./utils/IslandParams.js");
const { climateMultipliers, terrainMultipliers } = require("./utils/params.js");

const ONE = BigNumber.from(parseEther("1"));

describe("Islands", function () {
    let IslandsContract;

    beforeEach(async function () {
        await deployments.fixture();
        const [account1] = await getUnnamedAccounts();

        IslandsContract = await ethers.getContract("Islands", account1);
        IslandsHelperContract = await ethers.getContract("IslandsHelper", account1);
    });

    it("Should init", async function () {
        expect(await IslandsContract.resourcesToTokenContracts(0)).to.eql(
            (await ethers.getContract("FishToken")).address
        );
        expect(await IslandsContract.resourcesToTokenContracts(1)).to.eql(
            (await ethers.getContract("WoodToken")).address
        );
        expect(await IslandsContract.resourcesToTokenContracts(2)).to.eql(
            (await ethers.getContract("IronToken")).address
        );
        expect(await IslandsContract.resourcesToTokenContracts(3)).to.eql(
            (await ethers.getContract("SilverToken")).address
        );
        expect(await IslandsContract.resourcesToTokenContracts(4)).to.eql(
            (await ethers.getContract("PearlToken")).address
        );
        expect(await IslandsContract.resourcesToTokenContracts(5)).to.eql(
            (await ethers.getContract("OilToken")).address
        );
        expect(await IslandsContract.resourcesToTokenContracts(6)).to.eql(
            (await ethers.getContract("DiamondToken")).address
        );
    });

    it("Should only allow admin to use setters", async function () {
        const [account1] = await getUnnamedAccounts();
        await expect(IslandsContract.addPopulationEditor(account1)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
        await expect(IslandsContract.removePopulationEditor(account1)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
        await expect(IslandsContract.setHelperContract(account1)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );

        const { deployer } = await ethers.getNamedSigners();

        await IslandsContract.connect(deployer).addPopulationEditor(account1);
        expect(await IslandsContract.populationEditors(account1)).to.eql(true);

        await IslandsContract.connect(deployer).removePopulationEditor(account1);
        expect(await IslandsContract.populationEditors(account1)).to.eql(false);

        await IslandsContract.connect(deployer).setHelperContract(account1);
        expect(await IslandsContract.helperContract()).to.eql(account1);
    });

    it("Should only let populationEditors to set the population", async function () {
        const [account1] = await getUnnamedAccounts();
        const [_, account2] = await ethers.getSigners();
        const { deployer } = await ethers.getNamedSigners();

        await expect(IslandsContract.connect(account2).setPopulation(1023, 500)).to.be.revertedWith(
            "You don't have permission to edit the population"
        );

        await IslandsContract.mint(1023);

        await IslandsContract.connect(deployer).addPopulationEditor(account2.address);
        await expect(
            IslandsContract.connect(account2).setPopulation(1023, 100_000_000)
        ).to.be.revertedWith("Population is over max");

        await IslandsContract.connect(account2).setPopulation(1023, 500);

        expect((await IslandsContract.getIslandInfo(1023)).population).to.be.eq(500);
    });

    it("Should get tokenId to attributes", async function () {
        await IslandsContract.mint(2950);
        const attributes = await IslandsContract.getTokenIdToAttributes(2950);
        expect(attributes.taxRate).to.be.gt(0);
        expect(attributes.area).to.be.gt(0);
        expect(attributes.population).to.be.gt(0);
    });

    it("Should mint token", async function () {
        await expect(IslandsContract.ownerOf(1)).to.be.revertedWith(
            "ERC721: owner query for nonexistent token"
        );

        await IslandsContract.mint(1);

        const [account1] = await getUnnamedAccounts();
        expect(await IslandsContract.ownerOf(1)).to.equal(account1);
        expect(await IslandsContract.balanceOf(account1)).to.equal(1);

        await IslandsContract.mint(57);
        expect(await IslandsContract.ownerOf(57)).to.equal(account1);
        expect(await IslandsContract.balanceOf(account1)).to.equal(2);
    });

    it("Should not mint token if already minted", async function () {
        await IslandsContract.mint(1);
        await expect(IslandsContract.mint(1)).to.be.revertedWith(
            "Island with that id already exists"
        );

        await IslandsContract.mint(512);
        await expect(IslandsContract.mint(512)).to.be.revertedWith(
            "Island with that id already exists"
        );
    });

    it("Should only allow owner to mint over 9900 and under 10_000", async function () {
        await expect(IslandsContract.mint(9901)).to.be.revertedWith("Island id is invalid");

        const { deployer } = await ethers.getNamedSigners();
        await IslandsContract.connect(deployer).mint(9901);

        expect(await IslandsContract.ownerOf(9901)).to.equal(deployer.address);
        expect(await IslandsContract.balanceOf(deployer.address)).to.equal(1);

        await expect(IslandsContract.connect(deployer).mint(10_001)).to.be.revertedWith(
            "Island id is invalid"
        );
    });

    it("Should get random number in range", async function () {
        expect(await IslandsContract.getRandomNumber("0x1203", 10)).to.be.lt(10);
        expect(await IslandsContract.getRandomNumber("0x1206", 10)).to.be.lt(10);
        expect(await IslandsContract.getRandomNumber("0x1207", 10)).to.be.lt(10);
        expect(await IslandsContract.getRandomNumber("0x1201", 10)).to.be.lt(10);
        expect(await IslandsContract.getRandomNumber("0x1208", 10)).to.be.lt(10);
        expect(await IslandsContract.getRandomNumber("0x1276", 10)).to.be.lt(10);
        expect(await IslandsContract.getRandomNumber("0x1232", 10)).to.be.lt(10);
        expect(await IslandsContract.getRandomNumber("0x1224", 10)).to.be.lt(10);

        // Small prob of failing this test but should be fine
        expect(await IslandsContract.getRandomNumber("0x1224", 500000)).to.be.gt(10);
    });

    it("Should get island info", async function () {
        await IslandsContract.mint(1980);

        // Ensure idempotency
        expect(await IslandsContract.getIslandInfo(1980)).to.eql(
            await IslandsContract.getIslandInfo(1980)
        );

        const attr = await IslandsContract.tokenIdToAttributes(1980);
        const info = await IslandsContract.getIslandInfo(1980);

        expect(info.resource).to.eq(resources[attr.resource]);
        expect(info.climate).to.eq(climates[attr.climate]);
        expect(info.terrain).to.eq(terrains[attr.terrain]);
        expect(info.area).to.eq(attr.area);
    });

    it("Should return correct tokenURI", async function () {
        await IslandsContract.mint(1873);

        const islandInfo = await IslandsContract.getIslandInfo(1873);

        const tokenURI = await IslandsContract.tokenURI(1873);
        const result = JSON.parse(Buffer.from(tokenURI.substring(29), "base64").toString());

        expect(result.attributes.length).to.eq(8);
        expect(result.attributes[0].value).to.eq(islandInfo.climate);
        expect(result.attributes[1].value).to.eq(islandInfo.terrain);
        expect(result.attributes[2].value).to.eq(islandInfo.resource);
        expect(result.attributes[3].value).to.eq(islandInfo.area);
        expect(result.attributes[4].value).to.eq(islandInfo.population);
        expect(result.attributes[5].value).to.eq(islandInfo.taxRate);
        expect(result.attributes[6].value).to.eq(islandInfo.maxPopulation);
    });

    it("Should only allow owner to add and remove population editors", async function () {
        const { deployer } = await ethers.getNamedSigners();

        await expect(IslandsContract.addPopulationEditor(deployer.address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );

        expect(await IslandsContract.populationEditors(deployer.address)).to.be.equal(false);
        await IslandsContract.connect(deployer).addPopulationEditor(deployer.address);
        expect(await IslandsContract.populationEditors(deployer.address)).to.be.equal(true);

        await IslandsContract.connect(deployer).removePopulationEditor(deployer.address);
        expect(await IslandsContract.populationEditors(deployer.address)).to.be.equal(false);
    });

    it("Should allow population editor to increase and decrease population", async function () {
        const { deployer } = await ethers.getNamedSigners();

        await IslandsContract.connect(deployer).addPopulationEditor(deployer.address);

        await IslandsContract.mint(100);
        await IslandsContract.connect(deployer).setPopulation(100, 15_000);

        expect((await IslandsContract.getIslandInfo(100)).population).to.eql(15_000);

        await expect(
            IslandsContract.connect(deployer).setPopulation(100, 1_000_000)
        ).to.be.revertedWith("Population is over max");
    });

    it("Should harvest tokens", async function () {
        await IslandsContract.mint(9878);

        const prevBlockNumber = await ethers.provider.getBlockNumber();
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");
        const currBlockNumber = await ethers.provider.getBlockNumber();

        const blockDelta = BigNumber.from(currBlockNumber - prevBlockNumber);
        const islandInfo = await IslandsContract.getIslandInfo(9878);

        const climates = ["Temperate", "Rainy", "Humid", "Arid", "Tropical", "Icy"];
        const terrains = ["Flatlands", "Hilly", "Canyons", "Mountainous"];

        const [resourceContractAddress, taxIncome] = await IslandsContract.getTaxIncome(9878);

        expect(taxIncome).to.eql(
            blockDelta
                .mul(BigNumber.from(climateMultipliers[climates.indexOf(islandInfo.climate)]))
                .mul(BigNumber.from(terrainMultipliers[terrains.indexOf(islandInfo.terrain)]))
                .mul(BigNumber.from(islandInfo.taxRate))
                .mul(BigNumber.from(islandInfo.population))
                .mul(ONE)
                .div(BigNumber.from("5000000000"))
        );

        const [account1] = await getUnnamedAccounts();
        const resourceContract = await ethers.getContractAt(
            "ERC20Mintable",
            resourceContractAddress
        );
        const balanceBefore = await resourceContract.balanceOf(account1);

        await IslandsContract.harvest(9878);

        expect(await resourceContract.balanceOf(account1)).to.be.eql(
            balanceBefore.add(
                blockDelta
                    .add(1)
                    .mul(BigNumber.from(climateMultipliers[climates.indexOf(islandInfo.climate)]))
                    .mul(BigNumber.from(terrainMultipliers[terrains.indexOf(islandInfo.terrain)]))
                    .mul(BigNumber.from(islandInfo.taxRate))
                    .mul(BigNumber.from(islandInfo.population))
                    .mul(ONE)
                    .div(BigNumber.from("5000000000"))
            )
        );
    });

    describe("Islands Helper", async function () {
        it("Should only allow owner to use setters", async function () {
            const [account1] = await getUnnamedAccounts();
            const { deployer } = await ethers.getNamedSigners();

            await expect(IslandsHelperContract.setIslandsContract(account1)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );

            await expect(IslandsHelperContract.setMultipliers([4, 5], [2, 3])).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );

            IslandsHelperContract.connect(deployer).setIslandsContract(account1);
            expect(await IslandsHelperContract.islandContract()).to.be.equal(account1);

            await IslandsHelperContract.connect(deployer).setMultipliers([4, 5], [2, 3]);
            expect(await IslandsHelperContract.climateMultipliers(0)).to.be.equal(4);
            expect(await IslandsHelperContract.terrainMultipliers(1)).to.be.equal(3);
        });
    });
});
