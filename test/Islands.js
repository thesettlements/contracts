const { expect } = require("chai");

const { resources, climates, terrains } = require("./utils/IslandParams.js");

describe("Islands", function () {
    let IslandsContract;

    beforeEach(async function () {
        await deployments.fixture();
        const [account1] = await getUnnamedAccounts();

        IslandsContract = await ethers.getContract("Islands", account1);
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
        IslandsContract.connect(deployer).mint(9901);

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

        const tokenURI = await IslandsContract.tokenURI(1873);
        console.log(tokenURI);
    });
});
