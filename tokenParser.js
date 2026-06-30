const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// ============ CONFIGURATION ============
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC);

// Known token mints (add more as needed)
const KNOWN_TOKENS = {
    // Solana meme coins (add actual mint addresses)
    // Format: 'mint_address': { symbol: 'TICKER', name: 'Token Name' }
    // Example:
    // '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': { symbol: 'BONK', name: 'Bonk' },
};

// ============ HELPER FUNCTIONS ============

// Get token metadata from mint address
async function getTokenInfo(mintAddress) {
    try {
        // Check if we have it in our known tokens
        if (KNOWN_TOKENS[mintAddress]) {
            return KNOWN_TOKENS[mintAddress];
        }
        
        // Could add an API call here to fetch token info
        // For now, just return the mint address
        return {
            symbol: 'Unknown',
            name: 'Unknown Token',
            mint: mintAddress
        };
    } catch (error) {
        return { symbol: 'Unknown', name: 'Unknown Token', mint: mintAddress };
    }
}

// Decode token transfer data (simplified)
function decodeTokenTransferData(data) {
    try {
        // This is a simplified version - actual decoding requires more complex parsing
        // For a full implementation, you'd need to parse the instruction data properly
        return {
            amount: 'Unknown amount',
            source: 'Unknown source',
            destination: 'Unknown destination'
        };
    } catch (error) {
        return null;
    }
}

// ============ MAIN PARSER ============

// Parse transaction to find token transfers
async function parseTransaction(signature) {
    try {
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });
        
        if (!tx) return null;
        
        // Get transaction details
        const message = tx.transaction.message;
        const instructions = message.instructions;
        const accountKeys = message.accountKeys;
        
        let tokenTransfers = [];
        let solTransfer = 0;
        let summary = [];
        
        // Parse each instruction
        for (const instruction of instructions) {
            try {
                const programId = instruction.programId.toString();
                
                // Check if it's a token transfer
                if (programId === TOKEN_PROGRAM_ID.toString()) {
                    // This is a token program instruction
                    // For a more detailed parse, you'd decode the instruction data
                    const transferData = decodeTokenTransferData(instruction.data);
                    
                    // Get token info if available
                    let tokenInfo = null;
                    for (const accountKey of accountKeys) {
                        try {
                            const tokenAccountInfo = await connection.getTokenAccountBalance(accountKey);
                            if (tokenAccountInfo && tokenAccountInfo.value && tokenAccountInfo.value.amount) {
                                // Found a token account
                                tokenInfo = await getTokenInfo(accountKey.toString());
                                break;
                            }
                        } catch (e) {
                            // Not a token account, skip
                        }
                    }
                    
                    tokenTransfers.push({
                        type: 'Token Transfer',
                        programId: programId,
                        data: instruction.data ? instruction.data.toString('hex') : 'No data',
                        tokenInfo: tokenInfo || { symbol: 'Unknown' }
                    });
                    
                    summary.push(`Token transfer detected`);
                }
                
                // Check for SOL transfer (System program)
                if (programId === '11111111111111111111111111111111') {
                    // System program - likely a SOL transfer
                    solTransfer += 1; // Simplified
                    summary.push('SOL transfer detected');
                }
            } catch (e) {
                // Skip instructions that can't be parsed
            }
        }
        
        // Calculate total SOL transferred (simplified)
        const totalSol = tx.meta?.postBalances && tx.meta?.preBalances 
            ? (tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 1e9
            : 0;
        
        return {
            signature: signature,
            slot: tx.slot,
            blockTime: tx.blockTime,
            solTransferred: Math.abs(totalSol),
            tokenTransfers: tokenTransfers,
            summary: summary,
            transferCount: tokenTransfers.length + (totalSol !== 0 ? 1 : 0)
        };
    } catch (error) {
        console.error('Error parsing transaction:', error.message);
        return null;
    }
}

// ============ FORMATTED ALERT ============

// Generate a formatted alert message from parsed transaction
function formatAlertMessage(wallet, signature, parsedData) {
    if (!parsedData) {
        return `🐋 **WHALE ALERT!** 🚨\n\nWallet: ${wallet.slice(0, 8)}...${wallet.slice(-6)}\nTransaction: [View on Solscan](https://solscan.io/tx/${signature})\nTime: ${new Date().toLocaleTimeString()}`;
    }
    
    let message = `🐋 **WHALE ALERT!** 🚨\n\nWallet: ${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
    
    if (parsedData.solTransferred > 0) {
        message += `\n💰 SOL: ${parsedData.solTransferred.toFixed(4)} SOL`;
    }
    
    if (parsedData.tokenTransfers.length > 0) {
        message += `\n🪙 Token Transfers: ${parsedData.tokenTransfers.length}`;
        // Add token details if available
        for (const transfer of parsedData.tokenTransfers) {
            if (transfer.tokenInfo && transfer.tokenInfo.symbol !== 'Unknown') {
                message += `\n   - ${transfer.tokenInfo.symbol}`;
            }
        }
    }
    
    message += `\n\n🔗 [View on Solscan](https://solscan.io/tx/${signature})`;
    message += `\n🕐 ${new Date().toLocaleTimeString()}`;
    
    return message;
}

// ============ EXPORTS ============
module.exports = { 
    parseTransaction,
    formatAlertMessage,
    getTokenInfo,
    KNOWN_TOKENS
};