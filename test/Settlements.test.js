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
  _ages
} = require("./utils/migrate.helper");
const {
  decodeTokenURI
} = require('./utils/decode.helper');
const {expect} = require('chai');

describe('SettlementsV2', function () {

  before(async function () {
    this.LegacyContract = await ethers.getContractFactory('SettlementsLegacy');
    this.V2Contract = await ethers.getContractFactory('SettlementsV2');
  });

  beforeEach(async function () {
    this.settlementsLegacy = await this.LegacyContract.deploy();
    const address = this.settlementsLegacy.address;
    await this.settlementsLegacy.deployed();
    this.settlementsV2 = await this.V2Contract.deploy(address);
    await this.settlementsV2.deployed();
  });

  it('claim & resettle token with existing attributes', async function () {

    await this.settlementsLegacy.settle(1001)
    const tokenURI = await this.settlementsLegacy.tokenURI(1001)
    const dto = await buildMigrationPayload(1001, this.settlementsLegacy)

    await this.settlementsLegacy.approve(this.settlementsV2.address, 1001);
    await this.settlementsV2.claim(
      1001,
      dto.size,
      dto.spirit,
      dto.age,
      dto.resource,
      dto.morale,
      dto.government,
      dto.turns
    )

    const newURI = await this.settlementsV2.tokenURI(1001)
    expect(newURI).to.be.eq(tokenURI);
  });

  it('fail to resettle invalid token', async function () {
    try {
      await this.settlementsLegacy.settle(1001)
      await this.settlementsLegacy.approve(this.settlementsV2.address, 1001);
      await this.settlementsV2.claim(1001, 0, 0, 0, 0, 0, 0, 0);
    } catch (e) {
      expect(e.message).to.eq('VM Exception while processing transaction: reverted with reason string \'Attributes don\'t match legacy contract\'')
    }
  })

  it('randomise all after migration', async function () {

    await this.settlementsLegacy.settle(1001)
    await migrateContract(1001, this.settlementsLegacy, this.settlementsV2);
    await this.settlementsV2.randomise(1001)
    const newURI = await this.settlementsV2.tokenURI(1001)

    const newJson = Buffer.from(newURI.substring(29), "base64").toString();
    const newResult = JSON.parse(newJson);

    expect(newResult.attributes[0].value).to.be.oneOf(_sizes);
    expect(newResult.attributes[1].value).to.be.oneOf(_spirits);
    expect(newResult.attributes[2].value).to.be.oneOf(_ages);
    expect(newResult.attributes[3].value).to.be.oneOf(_resources);
    expect(newResult.attributes[4].value).to.be.oneOf(_morales);
    expect(newResult.attributes[5].value).to.be.oneOf(_governments);
    expect(newResult.attributes[6].value).to.eq('Valhalla')
  });

  it('fetch attribute values via getters chain', async function () {

    await this.settlementsLegacy.settle(1001)
    await migrateContract(1001, this.settlementsLegacy, this.settlementsV2);
    const uri = await this.settlementsV2.tokenURI(1001)

    const size = await this.settlementsV2.getSettlementSize(1001)
    const spirit = await this.settlementsV2.getSettlementSpirit(1001)
    const age = await this.settlementsV2.getSettlementAge(1001)
    const resource = await this.settlementsV2.getSettlementResource(1001)
    const morale = await this.settlementsV2.getSettlementMorale(1001)
    const government = await this.settlementsV2.getSettlementGovernment(1001)
    const realm = await this.settlementsV2.getSettlementRealm(1001)

    const result = await decodeTokenURI(uri)

    expect(result.attributes[0].value).to.eq(size)
    expect(result.attributes[1].value).to.eq(spirit);
    expect(result.attributes[2].value).to.eq(age);
    expect(result.attributes[3].value).to.eq(resource);
    expect(result.attributes[4].value).to.eq(morale);
    expect(result.attributes[5].value).to.eq(government);
    expect(result.attributes[6].value).to.eq(realm)

  });

  it('fetch attribute indexes via mapping on chain', async function () {

    await this.settlementsLegacy.settle(1001)
    await migrateContract(1001, this.settlementsLegacy, this.settlementsV2);

    const attrForToken = await this.settlementsV2.attrIndex(1001);
    const dto = await buildMigrationPayload(1001, this.settlementsV2)

    expect(dto.size).to.eq(attrForToken.size)
    expect(dto.spirit).to.eq(attrForToken.spirit);
    expect(dto.age).to.eq(attrForToken.age);
    expect(dto.resource).to.eq(attrForToken.resource);
    expect(dto.morale).to.eq(attrForToken.morale);
    expect(dto.government).to.eq(attrForToken.government);
    expect(dto.realm).to.eq(attrForToken.realm)

  });


});
