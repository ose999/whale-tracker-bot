const { Connection, PublicKey } = require('@solana/web3.js');
const Tracker = require('./tracker');

// Setup Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Store bot instance for sending alerts
let botInstance = null;

// Set the bot instance
function setBot(bot) {
    botInstance = bot;
}

// Monitor tracked wallets for transactions
async function checkWalletActivity(walletAddress) {
    try {
        const pubKey = new PublicKey(walletAddress);
        
        // Get recent transactions (last 5)
        const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 5 });
        
        if (signatures.length === 0) {
            return null;
        }
        
        // Get transaction details for the most recent one
        const latestTx = signatures[0];
        
        // Check if this transaction is recent (within last 5 minutes)
        const txTime = latestTx.blockTime || 0;
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = currentTime - txTime;
        
        // Only alert if it's recent (within 5 minutes)
        if (timeDiff < 300 && latestTx.confirmationStatus === 'confirmed') {
            return {
                signature: latestTx.signature,
                time: txTime,
                slot: latestTx.slot
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error checking wallet ${walletAddress}:`, error.message);
        return null;
    }
}

// Start monitoring all tracked wallets
async function startMonitoring() {
    console.log('🔍 Starting wallet monitoring...');
    
    // Check every 30 seconds
    setInterval(async () => {
        const wallets = Tracker.getTrackedWallets(); // <-- THIS WAS MISSING
        
        for (const wallet of wallets) {
            try {
                const activity = await checkWalletActivity(wallet);
                if (activity && botInstance) {
                    // Send alert to Telegram
                    botInstance.telegram.sendMessage(
                        process.env.CHAT_ID || 'YOUR_CHAT_ID_HERE',
                        `🐋 WHALE ALERT!\n\nWallet: ${wallet.slice(0, 8)}...${wallet.slice(-6)}\nTransaction: https://solscan.io/tx/${activity.signature}\nTime: ${new Date(activity.time * 1000).toLocaleTimeString()}`
                    );
                }
            } catch (error) {
                console.error('Monitoring error:', error.message);
            }
        }
    }, 30000); // Check every 30 seconds
    
    // Get wallets for the console log
    const trackedWallets = Tracker.getTrackedWallets();
    console.log(`✅ Monitoring ${trackedWallets.length} wallets`);
}

module.exports = {
    startMonitoring,
    setBot
};