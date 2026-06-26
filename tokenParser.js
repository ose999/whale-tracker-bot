const { Connection, PublicKey } = require('@solana/web3.js');

const connection = new Connection('https://api.mainnet-beta.solana.com');

// Parse transaction to find token transfers
async function parseTransaction(signature) {
    try {
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });
        
        if (!tx) return null;
        
        // Look for token transfers
        const instructions = tx.transaction.message.instructions;
        let tokenInfo = [];
        
        for (const instruction of instructions) {
            if (instruction.programId.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
                // This is a token transfer
                const data = instruction.data;
                if (data) {
                    tokenInfo.push({
                        type: 'Token Transfer',
                        data: data.toString('hex')
                    });
                }
            }
        }
        
        return {
            signature: signature,
            slot: tx.slot,
            blockTime: tx.blockTime,
            tokenTransfers: tokenInfo
        };
    } catch (error) {
        console.error('Error parsing transaction:', error.message);
        return null;
    }
}

module.exports = { parseTransaction };