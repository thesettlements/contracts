// test/SettlementsLegacy.test.js
// Load dependencies
const {expect} = require('chai');
const {
  _governments,
  _spirits,
  _sizes,
  _morales,
  _resources,
  _ages
} = require("./utils/migrate.helper");

// Start test block
describe('SettlementsLegacy', function () {

  before(async function () {
    this.SSA = await ethers.getContractFactory('SettlementsLegacy');
    this.minterAddress = await this.SSA.signer.getAddress();
  });

  beforeEach(async function () {
    this.settlements = await this.SSA.deploy();
    await this.settlements.deployed();
  });

  it('settle token', async function () {
    await this.settlements.settle(1001)
    const owner = await this.settlements.ownerOf(1001)
    expect(this.minterAddress).to.be.eq(owner);
  });

  it('settle token with valid attributes', async function () {
    await this.settlements.settle(1)
    const tokenURI = await this.settlements.tokenURI(1)
    const json = Buffer.from(tokenURI.substring(29), "base64").toString();
    const result = JSON.parse(json);

    expect(result.attributes[0].value).to.be.oneOf(_sizes);
    expect(result.attributes[1].value).to.be.oneOf(_spirits);
    expect(result.attributes[2].value).to.be.oneOf(_ages);
    expect(result.attributes[3].value).to.be.oneOf(_resources);
    expect(result.attributes[4].value).to.be.oneOf(_morales);
    expect(result.attributes[5].value).to.be.oneOf(_governments);
    expect(result.attributes[6].value).to.eq('Genesis')
  });

  it('randomise one turn', async function () {
    await this.settlements.settle(1)
    await this.settlements.randomise(1)
    const tokenURI = await this.settlements.tokenURI(1)
    const json = Buffer.from(tokenURI.substring(29), "base64").toString();
    const result = JSON.parse(json);
    expect(result.attributes[0].value).to.be.oneOf(_sizes);
    expect(result.attributes[1].value).to.be.oneOf(_spirits);
    expect(result.attributes[2].value).to.be.oneOf(_ages);
    expect(result.attributes[3].value).to.be.oneOf(_resources);
    expect(result.attributes[4].value).to.be.oneOf(_morales);
    expect(result.attributes[5].value).to.be.oneOf(_governments);
    expect(result.attributes[6].value).to.eq('Valhalla')
  });

  it('randomise all turns', async function () {
    await this.settlements.settle(1)
    await this.settlements.randomise(1)
    await this.settlements.randomise(1)
    await this.settlements.randomise(1)
    await this.settlements.randomise(1)
    await this.settlements.randomise(1)
    const tokenURI = await this.settlements.tokenURI(1)
    const json = Buffer.from(tokenURI.substring(29), "base64").toString();
    const result = JSON.parse(json);
    expect(result.attributes[6].value).to.eq('Ends')
  });

  it('failed to randomise all as turns over', async function () {
    try {
      await this.settlements.settle(1)
      await this.settlements.randomise(1)
      await this.settlements.randomise(1)
      await this.settlements.randomise(1)
      await this.settlements.randomise(1)
      await this.settlements.randomise(1)
    } catch (e){
      expect(e.message).to.eq('VM Exception while processing transaction: reverted with reason string \'Settlement turns over\'')
    }
  });

  it('settle user token', async function () {
    await this.settlements.settle(3001)
    const owner = await this.settlements.ownerOf(3001)
    expect(this.minterAddress).to.be.eq(owner);
  });

  it('settle owner token', async function () {
    await this.settlements.settleForOwner(9901)
    const owner = await this.settlements.ownerOf(9901)
    expect(this.minterAddress).to.be.eq(owner);
  });

});
