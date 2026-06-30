const { Connection, PublicKey } = require('@solana/web3.js');
const Tracker = require('./tracker');

// ============ CONFIGURATION ============
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const POLLING_INTERVAL = 30000; // 30 seconds
const ALERT_WINDOW_MINUTES = 5; // Only alert for transactions within last 5 minutes

// ============ SETUP ============
const connection = new Connection(SOLANA_RPC);

// Store bot instance for sending alerts
let botInstance = null;

// Set the bot instance
function setBot(bot) {
    botInstance = bot;
}

// ============ TRANSACTION CHECKING ============

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
        
        // Only alert if it's recent and confirmed
        if (timeDiff < (ALERT_WINDOW_MINUTES * 60) && latestTx.confirmationStatus === 'confirmed') {
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

// ============ MONITORING LOOP ============

// Start monitoring all tracked wallets (fallback polling)
async function startMonitoring() {
    console.log('🔍 Starting fallback monitoring (polling)...');
    console.log(`⏱️ Checking every ${POLLING_INTERVAL / 1000} seconds`);
    console.log(`⏰ Alert window: ${ALERT_WINDOW_MINUTES} minutes`);
    
    // Check every X seconds
    setInterval(async () => {
        const wallets = Tracker.getTrackedWallets();
        
        if (wallets.length === 0) {
            // No wallets to monitor
            return;
        }
        
        for (const wallet of wallets) {
            try {
                const activity = await checkWalletActivity(wallet);
                if (activity && botInstance) {
                    // Send alert to Telegram
                    await botInstance.telegram.sendMessage(
                        process.env.CHAT_ID || 'YOUR_CHAT_ID_HERE',
                        `🐋 **WHALE ALERT!** (Fallback)\n\nWallet: ${wallet.slice(0, 8)}...${wallet.slice(-6)}\nTransaction: [View on Solscan](https://solscan.io/tx/${activity.signature})\nTime: ${new Date(activity.time * 1000).toLocaleTimeString()}`,
                        { parse_mode: 'Markdown' }
                    );
                    console.log(`📤 Fallback alert sent for ${wallet.slice(0, 8)}...`);
                }
            } catch (error) {
                console.error('Monitoring error:', error.message);
            }
        }
    }, POLLING_INTERVAL);
    
    // Get wallets for the console log
    const trackedWallets = Tracker.getTrackedWallets();
    console.log(`✅ Fallback monitoring: ${trackedWallets.length} wallets`);
    console.log(`⚠️ Note: Real-time WebSocket monitoring is the primary method`);
}

// ============ EXPORTS ============
module.exports = {
    startMonitoring,
    setBot
};