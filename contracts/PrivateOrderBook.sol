// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';

interface IFHERC20 {
    function transferFrom(address from, address to, euint64 amount) external returns (euint64);
    function transferEuint64(address to, euint64 amount) external;
}

contract PrivateOrderBook {

    // ─── Data Structures ────────────────────────────────────────────────

    struct Order {
        address trader;
        euint64 encryptedPrice;   // euint64: Fhenix encrypted uint64
        euint64 encryptedAmount;  // euint64: never stored as plaintext
        bool    isBuy;
        ebool   active;           // changed to ebool to prevent unconditional cancellation DoS
    }

    // ─── State ──────────────────────────────────────────────────────────

    mapping(uint256 => Order) public orders;
    uint256 public orderCount;

    // Stores clearing price per matched pair — encrypted until claimed
    mapping(uint256 => euint64) public clearingPrices;
    uint256 public matchCount;

    IFHERC20 public baseToken;
    IFHERC20 public quoteToken;

    // ─── Events ─────────────────────────────────────────────────────────

    // Only emits non-sensitive data — prices never in events
    event OrderSubmitted(uint256 indexed orderId, address indexed trader, bool isBuy);
    event OrderMatched(uint256 indexed matchId, uint256 bidId, uint256 askId);
    event OrderCancelled(uint256 indexed orderId, address indexed trader);
    event ClearingPricePublished(uint256 indexed matchId);

    // ─── Functions ──────────────────────────────────────────────────────

    constructor(address _baseToken, address _quoteToken) {
        baseToken = IFHERC20(_baseToken);
        quoteToken = IFHERC20(_quoteToken);
    }

    /**
     * @notice Submit an encrypted limit order
     * @param encPrice  InEuint64 — encrypted price from CoFHE SDK
     * @param encAmount InEuint64 — encrypted amount from CoFHE SDK
     * @param isBuy     true for buy order, false for sell
     */
    function submitOrder(
        InEuint64 calldata encPrice,
        InEuint64 calldata encAmount,
        bool isBuy
    ) external returns (uint256 orderId) {
        // Convert incoming encrypted inputs to on-chain euint64
        euint64 price  = FHE.asEuint64(encPrice);
        euint64 amount = FHE.asEuint64(encAmount);

        // Grant contract permission to store and operate on these values
        FHE.allowThis(price);
        FHE.allowThis(amount);

        // Pull tokens
        euint64 actualAmount;
        if (isBuy) {
            euint64 totalQuote = FHE.mul(price, amount);
            FHE.allowThis(totalQuote);
            FHE.allow(totalQuote, address(quoteToken));
            euint64 pulledQuote = quoteToken.transferFrom(msg.sender, address(this), totalQuote);
            // If pulledQuote == totalQuote, then amount is fully backed
            ebool success = FHE.eq(pulledQuote, totalQuote);
            actualAmount = FHE.select(success, amount, FHE.asEuint64(0));
        } else {
            FHE.allow(amount, address(baseToken));
            euint64 pulledBase = baseToken.transferFrom(msg.sender, address(this), amount);
            ebool success = FHE.eq(pulledBase, amount);
            actualAmount = FHE.select(success, amount, FHE.asEuint64(0));
        }

        orderId = orderCount++;

        // Ensure the contract can use actualAmount in future transactions (like matchOrders)
        FHE.allowThis(actualAmount);

        orders[orderId] = Order({
            trader:          msg.sender,
            encryptedPrice:  price,
            encryptedAmount: actualAmount,
            isBuy:           isBuy,
            active:          FHE.asEbool(true)
        });

        // The contract needs to be able to operate on the active boolean too
        FHE.allowThis(orders[orderId].active);
        
        // Let the sender decrypt their own order's active status
        FHE.allowSender(orders[orderId].active);

        emit OrderSubmitted(orderId, msg.sender, isBuy);
    }

    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Not your order");
        
        // Refund if active
        euint64 refundAmount;
        if (order.isBuy) {
            euint64 totalQuote = FHE.mul(order.encryptedPrice, order.encryptedAmount);
            refundAmount = FHE.select(order.active, totalQuote, FHE.asEuint64(0));
            FHE.allowThis(refundAmount);
            FHE.allow(refundAmount, address(quoteToken));
            quoteToken.transferEuint64(msg.sender, refundAmount);
        } else {
            refundAmount = FHE.select(order.active, order.encryptedAmount, FHE.asEuint64(0));
            FHE.allowThis(refundAmount);
            FHE.allow(refundAmount, address(baseToken));
            baseToken.transferEuint64(msg.sender, refundAmount);
        }
        
        order.active = FHE.asEbool(false);
        FHE.allowThis(order.active);
        FHE.allowSender(order.active);

        emit OrderCancelled(orderId, msg.sender);
    }

    /**
     * @notice Match a bid and an ask — comparison runs entirely on ciphertext
     * @param bidId  Order ID of the buy order
     * @param askId  Order ID of the sell order
     */
    function matchOrders(uint256 bidId, uint256 askId) external {
        Order storage bid = orders[bidId];
        Order storage ask = orders[askId];

        require(bid.isBuy,  "bidId must be a buy order");
        require(!ask.isBuy, "askId must be a sell order");

        // FHE comparison — no decryption, runs inside CoFHE coprocessor
        ebool bothActive = FHE.and(bid.active, ask.active);
        ebool priceMatch = FHE.gte(bid.encryptedPrice, ask.encryptedPrice);
        
        // Exact matching amount for 'fill or kill'
        ebool amountMatch = FHE.eq(bid.encryptedAmount, ask.encryptedAmount);
        
        ebool matched = FHE.and(FHE.and(bothActive, priceMatch), amountMatch);

        // Select clearing price on ciphertext
        // If matched: use ask price as clearing price
        // If not matched: store 0 (guards against invalid matches)
        euint64 clearingPrice = FHE.select(
            matched,
            ask.encryptedPrice,
            FHE.asEuint64(0)
        );

        uint256 matchId = matchCount++;
        clearingPrices[matchId] = clearingPrice;

        FHE.allow(clearingPrice, bid.trader);
        FHE.allow(clearingPrice, ask.trader);
        FHE.allowThis(clearingPrice);

        // Token execution
        // Amount to transfer is amount if matched, 0 if not matched.
        euint64 amountToTransfer = FHE.select(matched, ask.encryptedAmount, FHE.asEuint64(0));
        FHE.allowThis(amountToTransfer);
        FHE.allow(amountToTransfer, address(baseToken));
        
        // Base tokens (WETH): from seller (ask) to buyer (bid).
        // The contract already holds the base tokens from the seller.
        baseToken.transferEuint64(bid.trader, amountToTransfer);
        
        // Quote tokens (USDC): from buyer (bid) to seller (ask).
        // Total quote value = amountToTransfer * clearingPrice
        euint64 totalQuote = FHE.mul(amountToTransfer, clearingPrice);
        FHE.allowThis(totalQuote);
        FHE.allow(totalQuote, address(quoteToken));
        quoteToken.transferEuint64(ask.trader, totalQuote);
        
        // Since it's a limit order, the buyer deposited bidPrice * amount. 
        // If clearingPrice < bidPrice, we must refund the difference.
        euint64 originalQuote = FHE.mul(amountToTransfer, bid.encryptedPrice);
        euint64 refundQuote = FHE.sub(originalQuote, totalQuote); // originalQuote >= totalQuote since priceMatch
        FHE.allowThis(refundQuote);
        FHE.allow(refundQuote, address(quoteToken));
        quoteToken.transferEuint64(bid.trader, refundQuote);

        // Mark orders settled securely without exposing match status
        ebool notMatched = FHE.not(matched);
        bid.active = FHE.and(bid.active, notMatched);
        ask.active = FHE.and(ask.active, notMatched);

        // Update permissions for active status
        FHE.allowThis(bid.active);
        FHE.allowThis(ask.active);
        FHE.allow(bid.active, bid.trader);
        FHE.allow(ask.active, ask.trader);

        // We emit the event regardless of match success to obscure true outcomes
        emit OrderMatched(matchId, bidId, askId);
    }

    /**
     * @notice Get the encrypted clearing price for a match
     * @dev Returns euint64 — readable only by authorized address via permit
     */
    function getClearingPrice(uint256 matchId) public view returns (euint64) {
        return clearingPrices[matchId];
    }

    /**
     * @notice Publish a decrypted clearing price on-chain with signature
     */
    function publishClearingPrice(
        euint64 ctHash,
        uint64  plaintext,
        bytes calldata signature
    ) external {
        FHE.publishDecryptResult(ctHash, plaintext, signature);
        emit ClearingPricePublished(uint256(euint64.unwrap(ctHash)));
    }
}
