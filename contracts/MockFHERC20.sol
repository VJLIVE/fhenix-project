// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract MockFHERC20 {
    string public name;
    string public symbol;

    mapping(address => euint64) internal balances;
    mapping(address => mapping(address => euint64)) internal allowances;

    event Transfer(address indexed from, address indexed to);
    event Approval(address indexed owner, address indexed spender);

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint64 amount) external {
        euint64 eAmount = FHE.asEuint64(amount);
        FHE.allowThis(eAmount);
        
        if (euint64.unwrap(balances[to]) == 0) {
            balances[to] = eAmount;
        } else {
            balances[to] = FHE.add(balances[to], eAmount);
        }
        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);
        emit Transfer(address(0), to);
    }

    function deposit(InEuint64 calldata encryptedAmount) external {
        euint64 eAmount = FHE.asEuint64(encryptedAmount);
        FHE.allowThis(eAmount);
        
        if (euint64.unwrap(balances[msg.sender]) == 0) {
            balances[msg.sender] = eAmount;
        } else {
            balances[msg.sender] = FHE.add(balances[msg.sender], eAmount);
        }
        FHE.allowThis(balances[msg.sender]);
        FHE.allowSender(balances[msg.sender]);
        emit Transfer(address(0), msg.sender);
    }

    function balanceOf(address account) external view returns (euint64) {
        return balances[account];
    }

    function transfer(address to, InEuint64 calldata encryptedAmount) external {
        euint64 amount = FHE.asEuint64(encryptedAmount);
        FHE.allowThis(amount);
        _transferImpl(msg.sender, to, amount);
    }

    function transferEuint64(address to, euint64 amount) external {
        FHE.allowThis(amount);
        _transferImpl(msg.sender, to, amount);
    }

    function approve(address spender, InEuint64 calldata encryptedAmount) external {
        euint64 amount = FHE.asEuint64(encryptedAmount);
        FHE.allowThis(amount);
        allowances[msg.sender][spender] = amount;
        FHE.allowThis(allowances[msg.sender][spender]);
        emit Approval(msg.sender, spender);
    }
    
    function approveEuint64(address spender, euint64 amount) external {
        FHE.allowThis(amount);
        allowances[msg.sender][spender] = amount;
        FHE.allowThis(allowances[msg.sender][spender]);
        emit Approval(msg.sender, spender);
    }

    function transferFrom(address from, address to, euint64 amount) external returns (euint64) {
        euint64 currentAllowance = allowances[from][msg.sender];
        
        // Decrease allowance conditionally as well? For safety, standard FHERC20 decreases if allowed.
        // For Mock, we'll assume allowance is sufficient or we should check it.
        // Actually, let's just do _transferImpl logic which checks balance.
        // In a real FHERC20, we check both balance and allowance.
        ebool canTransferAllowance = FHE.gte(currentAllowance, amount);
        euint64 amountAllowed = FHE.select(canTransferAllowance, amount, FHE.asEuint64(0));

        allowances[from][msg.sender] = FHE.sub(currentAllowance, amountAllowed);
        FHE.allowThis(allowances[from][msg.sender]);

        // Actually transfer the allowed amount (which might be 0 if allowance lacked)
        return _transferImpl(from, to, amountAllowed);
    }

    function _transferImpl(address from, address to, euint64 amount) internal returns (euint64) {
        // Enforce balance >= amount
        ebool canTransfer = FHE.gte(balances[from], amount);
        
        // FHE.req is not in cofhe-contracts (or is it?). We can just subtract and if it overflows, it fails, but in FHE it wraps.
        // We do conditional updates instead.
        euint64 amountToTransfer = FHE.select(canTransfer, amount, FHE.asEuint64(0));
        
        balances[from] = FHE.sub(balances[from], amountToTransfer);
        FHE.allowThis(balances[from]);
        FHE.allow(balances[from], from);

        if (euint64.unwrap(balances[to]) == 0) {
            balances[to] = amountToTransfer;
        } else {
            balances[to] = FHE.add(balances[to], amountToTransfer);
        }
        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);

        emit Transfer(from, to);

        return amountToTransfer;
    }
}
