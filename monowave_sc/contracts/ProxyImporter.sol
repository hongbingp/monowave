// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Simple wrapper to make OZ's ERC1967Proxy available as a named artifact for tests/scripts
contract ProxyImporter is ERC1967Proxy {
    constructor(address implementation, bytes memory data) ERC1967Proxy(implementation, data) {}
}


