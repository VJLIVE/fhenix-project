// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';

contract ConfidentialVault {
    mapping(address => euint64) private _balances;

    function deposit(InEuint64 calldata encryptedAmount) external {
        euint64 amount = FHE.asEuint64(encryptedAmount);
        _balances[msg.sender] = FHE.add(_balances[msg.sender], amount);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowSender(_balances[msg.sender]);
    }

    function getBalance() public view returns (euint64) {
        return _balances[msg.sender];
    }

    function publishBalance(
        euint64 ctHash,
        uint64 plaintext,
        bytes calldata signature
    ) external {
        FHE.publishDecryptResult(ctHash, plaintext, signature);
    }
}
