// ships can sail to islands and collect resources there
// once you've been away from a settlement for too long you have to sail back
// you can only sail to an island if there is enough population room
// each time you go back to a settlement you have to recharge for 15 blocks
// you can buy a ship for 3000 $WOOD or 10000 $GOLD
// every x blocks of sailing you discover SETL tokens
// When you sail away from an island you send % of the tokens you minted depending on the island's tax rate

// Canoe, Longship, Clipper, Galleon, Man-of-war
// Trader, Explorer, Pirate, Military, Diplomat
// strength multiplier: 1,2,3,8,10
// capacity multiplier: 1,2,3,8,8

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20Mintable.sol";
import "./ShipsHelper.sol";

// The ships
// Sweet dreams are made of this
// Who am I to disagree
// I travel the world and the seven seas :pepe jamming:
// (srsly when will emojis be allowed in the sol compiler tho nocap)
// @author 1929

contract Ships is ERC721, ERC721Enumerable, Ownable {
    struct Attributes {
        uint8 name;
        uint8 profession;
        uint32 length;
        uint32 speed;
    }

    struct Ship {
        uint256 tokenId;
        string name;
        string profession;
        uint32 length;
        uint32 speed;
    }

    string[] public names = ["Canoe", "Longship", "Clipper", "Galleon", "Man-of-war"];
    string[] public professions = ["Trader", "Explorer", "Pirate", "Military", "Diplomat"];

    ShipsHelper public helperContract;

    mapping(uint256 => Attributes) public tokenIdToAttributes;
    mapping(uint256 => uint256) public tokenIdToLastHarvest;

    function mint(uint256 tokenId) public {
        require(!_exists(tokenId), "Ship with that id already exists");
        require(tokenId <= 3000, "Ship id is invalid");

        Attributes memory attr;

        uint256 value = getRandomNumber(abi.encode(tokenId, "n", block.timestamp), 1000);
        attr.name = uint8(value < 700 ? value % 3 : value < 950 ? value % 4 : value % 5);

        value = getRandomNumber(abi.encode(tokenId, "c", block.timestamp), 1000);
        attr.profession = uint8(value % 6);

        value = getRandomNumber(abi.encode(tokenId, "l", block.timestamp), 50);
        attr.length = uint32(value * uint256(attr.name));

        value = getRandomNumber(abi.encode(tokenId, "l", block.timestamp), 50);

        attr.speed = 1;

        tokenIdToAttributes[tokenId] = attr;
        tokenIdToLastHarvest[tokenId] = block.number;

        _safeMint(msg.sender, tokenId);
    }

    function getRandomNumber(bytes memory seed, uint256 maxValue) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed))) % maxValue;
    }
}
