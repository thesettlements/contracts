// test/Settlements.test.js
// Load dependencies
const {
    buildMigrationPayload,
    migrateContract,
    _governments,
    _spirits,
    _sizes,
    _morales,
    _resources,
    _ages,
    _realms,
} = require("./utils/migrate.helper");
const { decodeTokenURI } = require("./utils/decode.helper");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const { parseEther } = require("ethers/lib/utils");
const { realmMultipliers, civMultipliers } = require("./utils/params");

const ONE = BigNumber.from(parseEther("1"));

describe("SettlementsV2", function () {
    let LegacyContract, V2Contract;

    beforeEach(async function () {
        await deployments.fixture();
        const [account1] = await getUnnamedAccounts();

        LegacyContract = await ethers.getContract("SettlementsLegacy", account1);
        V2Contract = await ethers.getContract("SettlementsV2", account1);
    });

    it("claim & resettle token with existing attributes", async function () {
        await LegacyContract.settle(1001);
        const tokenURI = await LegacyContract.tokenURI(1001);
        const dto = await buildMigrationPayload(1001, LegacyContract);

        await LegacyContract.approve(V2Contract.address, 1001);
        await V2Contract.claim(
            1001,
            dto.size,
            dto.spirit,
            dto.age,
            dto.resource,
            dto.morale,
            dto.government,
            dto.turns
        );

        const newURI = await V2Contract.tokenURI(1001);
        expect(newURI).to.be.eq(tokenURI);
    });

    it("fail to resettle invalid token", async function () {
        try {
            await LegacyContract.settle(1001);
            await LegacyContract.approve(V2Contract.address, 1001);
            await V2Contract.claim(1001, 0, 0, 0, 0, 0, 0, 0);
        } catch (e) {
            expect(e.message).to.eq(
                "VM Exception while processing transaction: reverted with reason string 'Attributes don't match legacy contract'"
            );
        }
    });

    it("randomise all after migration", async function () {
        await LegacyContract.settle(1001);
        await migrateContract(1001, LegacyContract, V2Contract);
        await V2Contract.randomise(1001);
        const newURI = await V2Contract.tokenURI(1001);

        const newJson = Buffer.from(newURI.substring(29), "base64").toString();
        const newResult = JSON.parse(newJson);

        expect(newResult.attributes[0].value).to.be.oneOf(_sizes);
        expect(newResult.attributes[1].value).to.be.oneOf(_spirits);
        expect(newResult.attributes[2].value).to.be.oneOf(_ages);
        expect(newResult.attributes[3].value).to.be.oneOf(_resources);
        expect(newResult.attributes[4].value).to.be.oneOf(_morales);
        expect(newResult.attributes[5].value).to.be.oneOf(_governments);
        expect(newResult.attributes[6].value).to.eq("Valhalla");
    });

    it("fetch attribute values via getters chain", async function () {
        await LegacyContract.settle(1001);
        await migrateContract(1001, LegacyContract, V2Contract);
        const uri = await V2Contract.tokenURI(1001);

        const size = await V2Contract.getSettlementSize(1001);
        const spirit = await V2Contract.getSettlementSpirit(1001);
        const age = await V2Contract.getSettlementAge(1001);
        const resource = await V2Contract.getSettlementResource(1001);
        const morale = await V2Contract.getSettlementMorale(1001);
        const government = await V2Contract.getSettlementGovernment(1001);
        const realm = await V2Contract.getSettlementRealm(1001);

        const result = await decodeTokenURI(uri);

        expect(result.attributes[0].value).to.eq(size);
        expect(result.attributes[1].value).to.eq(spirit);
        expect(result.attributes[2].value).to.eq(age);
        expect(result.attributes[3].value).to.eq(resource);
        expect(result.attributes[4].value).to.eq(morale);
        expect(result.attributes[5].value).to.eq(government);
        expect(result.attributes[6].value).to.eq(realm);
    });

    it("fetch attribute indexes via mapping on chain", async function () {
        await LegacyContract.settle(1001);
        await migrateContract(1001, LegacyContract, V2Contract);

        const attrForToken = await V2Contract.attrIndex(1001);
        const dto = await buildMigrationPayload(1001, V2Contract);

        expect(dto.size).to.eq(attrForToken.size);
        expect(dto.spirit).to.eq(attrForToken.spirit);
        expect(dto.age).to.eq(attrForToken.age);
        expect(dto.resource).to.eq(attrForToken.resource);
        expect(dto.morale).to.eq(attrForToken.morale);
        expect(dto.government).to.eq(attrForToken.government);
        expect(dto.realm).to.eq(attrForToken.realm);
    });

    it("Should predict tokens to harvest", async function () {
        await LegacyContract.settle(254);
        await migrateContract(254, LegacyContract, V2Contract);

        await V2Contract.harvest(254);

        const tokenURI = await V2Contract.tokenURI(254);
        const json = Buffer.from(tokenURI.substring(29), "base64").toString();
        const result = JSON.parse(json);

        console.log(result);

        const prevBlockNumber = await ethers.provider.getBlockNumber();

        const civMultiplier = BigNumber.from(
            civMultipliers[_sizes.indexOf(result.attributes[0].value)]
        );
        const realmMultiplier = BigNumber.from(
            realmMultipliers[_realms.indexOf(result.attributes[6].value)]
        );

        await ethers.provider.send("evm_mine");
        await ethers.provider.send("evm_mine");

        const [contractAddress, unharvestedTokens] = await V2Contract.getUnharvestedTokens(254);
        const newBlockNumber = await ethers.provider.getBlockNumber();

        expect(unharvestedTokens.toString()).to.be.equal(
            civMultiplier
                .mul(realmMultiplier)
                .mul(newBlockNumber - prevBlockNumber)
                .mul(ONE)
                .toString()
        );

        const tokenContract = await ethers.getContractAt("ERC20Mintable", contractAddress);

        const resourceToSymbol = {
            Iron: "IRON",
            Gold: "SGLD",
            Silver: "SLVR",
            Wood: "WOOD",
            Wool: "WOOL",
            Water: "WATR",
            Grass: "GRSS",
            Grain: "GRN",
        };

        expect(await tokenContract.symbol()).to.equal(resourceToSymbol[result.attributes[3].value]);
    });
});
