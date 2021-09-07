// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20Mintable.sol";
import "./IslandsHelper.sol";

// The islands
// Travel to diff islands and harvest shit.
// @author 1929

contract Islands is ERC721, ERC721Enumerable, Ownable {
    struct Attributes {
        uint8 resource;
        uint8 climate;
        uint8 terrain;
        uint32 area;
        uint8 taxRate;
    }

    struct Island {
        uint256 tokenId;
        ERC20Mintable resourceTokenContract;
        string resource;
        string climate;
        string terrain;
        uint32 area;
        uint32 maxPopulation;
        uint32 basePopulation;
        uint8 taxRate;
    }

    string[] public resources = ["Fish", "Wood", "Iron", "Silver", "Pearl", "Oil", "Diamond"];
    string[] public climates = ["Humid", "Arid", "Rainy", "Tropical", "Temperate", "Icy"];
    string[] public terrains = ["Canyons", "Hilly", "Mountainous", "Flatlands"];

    ERC20Mintable[] public resourcesToTokenContracts;

    uint256 constant MAX_AREA = 5_000;
    uint32 constant MAX_POPULATION_PER_SQ_MI = 2000;

    IslandsHelper public helperContract;

    mapping(uint256 => Attributes) public tokenIdToAttributes;

    constructor(
        ERC20Mintable fishToken,
        ERC20Mintable woodToken,
        ERC20Mintable ironToken,
        ERC20Mintable silverToken,
        ERC20Mintable pearlToken,
        ERC20Mintable oilToken,
        ERC20Mintable diamondToken
    ) ERC721("Islands", "ILND") {
        resourcesToTokenContracts = [
            fishToken,
            woodToken,
            ironToken,
            silverToken,
            pearlToken,
            oilToken,
            diamondToken
        ];
    }

    function mint(uint256 tokenId) public {
        require(!_exists(tokenId), "Island with that id already exists");
        require(
            (tokenId <= 9900) || (tokenId <= 10_000 && tokenId > 9900 && msg.sender == owner()),
            "Island id is invalid"
        );

        Attributes memory attr;

        uint256 value = getRandomNumber(abi.encode(tokenId, "r", block.timestamp), 1000);
        attr.resource = uint8(value < 700 ? value % 3 : value % 7);

        value = getRandomNumber(abi.encode(tokenId, "c", block.timestamp), 1000);
        attr.resource = uint8(value % 6);

        value = getRandomNumber(abi.encode(tokenId, "t", block.timestamp), 1000);
        attr.terrain = uint8(value % 4);

        value = getRandomNumber(abi.encode(tokenId, "ta", block.timestamp), 1000);
        attr.taxRate = uint8(value % 50);

        attr.area = uint32(getRandomNumber(abi.encode(tokenId, "a", block.timestamp), MAX_AREA));

        tokenIdToAttributes[tokenId] = attr;
        _safeMint(msg.sender, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return helperContract.tokenURI(tokenId);
    }

    function getIslandInfo(uint256 tokenId) public view returns (Island memory) {
        require(_exists(tokenId), "Island with that tokenId doesn't exist");

        Attributes memory attr = tokenIdToAttributes[tokenId];

        uint32 populationPerSqMi = uint32(getRandomNumber(abi.encode(tokenId), 2000));
        uint32 maxPopulation = populationPerSqMi * attr.area;
        uint32 basePopulation = uint32(maxPopulation * getRandomNumber(abi.encode(tokenId), 100)) /
            100;

        return
            Island({
                tokenId: tokenId,
                resource: resources[attr.resource],
                resourceTokenContract: resourcesToTokenContracts[attr.resource],
                climate: climates[attr.climate],
                terrain: terrains[attr.terrain],
                area: attr.area,
                maxPopulation: maxPopulation,
                basePopulation: basePopulation,
                taxRate: attr.taxRate
            });
    }

    function setHelperContract(IslandsHelper helperContract_) public {
        helperContract = helperContract_;
    }

    function getRandomNumber(bytes memory seed, uint256 maxValue) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed))) % maxValue;
    }

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
