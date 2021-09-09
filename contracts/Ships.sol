// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20Mintable.sol";
import "./ShipsHelper.sol";

// The ships
// **music**
// Sweet dreams are made of this
// Who am I to disagree
// I travel the world and the seven seas :pepe jamming:
// (fr tho, when r twitch emotes gunna be added to sol natspec standard... fukin boomers man)
// @author 1929

contract Ships is ERC721, ERC721Enumerable, Ownable {
    struct Attributes {
        uint8 name;
        uint8 expedition;
        uint32 length;
        uint32 speed;
    }

    struct Path {
        address tokenContract;
        uint256 tokenId;
    }

    struct Ship {
        uint256 tokenId;
        string name;
        string expedition;
        uint32 length;
        uint32 speed;
        Path[] route;
    }

    struct TokenHarvest {
        address resourceTokenContract;
        uint256 amount;
    }

    string[] public names = ["Canoe", "Longship", "Clipper", "Galleon", "Man-of-war"];
    string[] public expeditions = ["Trader", "Explorer", "Pirate", "Military", "Diplomat"];

    uint32[] public speedMultipliers = [10, 15, 35, 25, 25];
    uint32[] public lengthMultipliers = [5, 10, 10, 30, 40];

    ShipsHelper public helperContract;
    ERC20Mintable public goldTokenContract;

    mapping(uint256 => Attributes) public tokenIdToAttributes;
    mapping(uint256 => Path[]) public tokenIdToRoute;
    mapping(uint256 => uint256) public tokenIdToLastRouteUpdate;
    mapping(uint256 => uint256) public tokenIdToLastSetlHarvest;

    constructor(ERC20Mintable goldTokenContract_) ERC721("Ships", "SHIP") {
        goldTokenContract = goldTokenContract_;
    }

    /** Setters */
    function setHelperContract(ShipsHelper helperContract_) public onlyOwner {
        helperContract = helperContract_;
    }

    /** Getters */
    function getShipInfo(uint256 tokenId) public view returns (Ship memory) {
        require(_exists(tokenId), "Ship with that tokenId doesn't exist");

        Attributes memory attr = tokenIdToAttributes[tokenId];

        return
            Ship({
                tokenId: tokenId,
                name: names[attr.name],
                expedition: expeditions[attr.expedition],
                length: attr.length,
                speed: attr.speed,
                route: tokenIdToRoute[tokenId]
            });
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return helperContract.tokenURI(tokenId);
    }

    function getTokenIdToAttributes(uint256 tokenId) public view returns (Attributes memory) {
        return tokenIdToAttributes[tokenId];
    }

    function getRandomNumber(bytes memory seed, uint256 maxValue) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed))) % maxValue;
    }

    function getUnharvestedTokens(uint256 tokenId) public view returns (TokenHarvest[] memory) {
        return helperContract.getUnharvestedTokens(tokenId);
    }

    function getSailingDuration(uint256 tokenId) public view returns (uint256) {
        Ship memory shipInfo = getShipInfo(tokenId);
        return helperContract.getSailingDuration(shipInfo);
    }

    /** State modifications */
    function mint(uint256 tokenId) public {
        require(!_exists(tokenId), "Ship with that id already exists");
        require(tokenId <= 3000, "Ship id is invalid");

        Attributes memory attr;

        uint256 value = getRandomNumber(abi.encode(tokenId, "n", block.timestamp), 1000);
        attr.name = uint8(value < 900 ? value % 3 : value < 950 ? value % 4 : value % 5);

        value = getRandomNumber(abi.encode(tokenId, "c", block.timestamp), 1000);
        attr.expedition = uint8(value % 5);

        value = getRandomNumber(abi.encode(tokenId, "l", block.timestamp), 50);
        attr.length = uint32((value + 1) * uint256(lengthMultipliers[attr.name])) / 10 + 2;
        attr.length = attr.length < 5 ? 5 : attr.length;

        value = getRandomNumber(abi.encode(tokenId, "s", block.timestamp), 100);
        attr.speed = uint32((value + 1) * uint256(speedMultipliers[attr.name])) / 100 + 2;
        attr.speed = attr.speed < 5 ? 5 : attr.speed;

        tokenIdToAttributes[tokenId] = attr;

        _updateRoute(helperContract.getInitialRoute(tokenId, attr.name), tokenId, true);
        tokenIdToLastSetlHarvest[tokenId] = block.number;
        tokenIdToLastRouteUpdate[tokenId] = block.number;

        _safeMint(msg.sender, tokenId);
    }

    function harvest(uint256 tokenId) public {
        TokenHarvest[] memory unharvestedTokens = getUnharvestedTokens(tokenId);
        address taxDestination = helperContract.getTaxDestination(tokenId);

        for (uint256 i = 0; i < unharvestedTokens.length; i++) {
            ERC20Mintable(unharvestedTokens[i].resourceTokenContract).mint(
                ownerOf(tokenId),
                unharvestedTokens[i].amount
            );

            goldTokenContract.mint(taxDestination, unharvestedTokens[i].amount / 10);
            tokenIdToLastRouteUpdate[tokenId] = block.number;
        }
    }

    function harvestSingleToken(uint256 tokenId, ERC20Mintable resourceTokenAddress) public {
        TokenHarvest[] memory unharvestedTokens = getUnharvestedTokens(tokenId);
        address taxDestination = helperContract.getTaxDestination(tokenId);

        for (uint256 i = 0; i < unharvestedTokens.length; i++) {
            if (
                address(resourceTokenAddress) != address(unharvestedTokens[i].resourceTokenContract)
            ) {
                continue;
            }

            ERC20Mintable(unharvestedTokens[i].resourceTokenContract).mint(
                ownerOf(tokenId),
                unharvestedTokens[i].amount
            );

            // 6% tax to the originating settlement
            goldTokenContract.mint(taxDestination, (unharvestedTokens[i].amount * 6) / 100);
            tokenIdToLastRouteUpdate[tokenId] = block.number;
            return;
        }
    }

    function updateRoute(Path[] memory route, uint256 tokenId) public {
        _updateRoute(route, tokenId, false);
    }

    function _updateRoute(
        Path[] memory route,
        uint256 tokenId,
        bool init
    ) internal {
        require(helperContract.isValidRoute(route, tokenId, msg.sender, init), "Invalid route");

        delete tokenIdToRoute[tokenId];
        for (uint256 i = 0; i < route.length; i++) {
            tokenIdToRoute[tokenId].push(route[i]);
        }

        tokenIdToLastRouteUpdate[tokenId] = block.number;
    }

    /** Library overrides */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
