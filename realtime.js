const WebSocket = require('ws');
const { Connection, PublicKey } = require('@solana/web3.js');
const Tracker = require('./tracker');

// Setup Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Store bot instance
let botInstance = null;
let wsConnections = [];
let isShuttingDown = false;

// Set the bot instance
function setBot(bot) {
    botInstance = bot;
}

// Send alert to Telegram
async function sendAlert(wallet, signature) {
    if (!botInstance || isShuttingDown) return;
    
    const walletShort = `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
    const alertMessage = `🐋 **WHALE ALERT!** 🚨
    
Wallet: ${walletShort}
Transaction: [View on Solscan](https://solscan.io/tx/${signature})
Time: ${new Date().toLocaleTimeString()}`;

    try {
        await botInstance.telegram.sendMessage(
            process.env.CHAT_ID || 'YOUR_CHAT_ID_HERE',
            alertMessage,
            { parse_mode: 'Markdown' }
        );
        console.log(`📤 Alert sent for ${walletShort}`);
    } catch (error) {
        console.error('Error sending alert:', error.message);
    }
}

// Monitor a single wallet
async function monitorWallet(wallet, index, total) {
    if (isShuttingDown) return;
    
    try {
        const pubKey = new PublicKey(wallet);
        const shortWallet = wallet.slice(0, 8);
        
        console.log(`🔗 [${index + 1}/${total}] Connecting to ${shortWallet}...`);
        
        const ws = new WebSocket('wss://api.mainnet-beta.solana.com', {
            // Add these options to prevent aggressive reconnection
            handshakeTimeout: 10000,
            timeout: 30000
        });
        
        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 5;
        
        ws.on('open', function open() {
            console.log(`✅ [${shortWallet}] Connected!`);
            reconnectAttempts = 0;
            
            // Subscribe to transactions
            const subscribeMessage = {
                jsonrpc: '2.0',
                id: 1,
                method: 'transactionSubscribe',
                params: [
                    {
                        vote: false,
                        failed: false,
                        accountInclude: [pubKey.toString()]
                    },
                    {
                        commitment: 'confirmed',
                        encoding: 'jsonParsed',
                        transactionDetails: 'full',
                        showRewards: false
                    }
                ]
            };
            
            ws.send(JSON.stringify(subscribeMessage));
        });
        
        ws.on('message', function incoming(data) {
            try {
                const response = JSON.parse(data);
                
                if (response.method === 'transactionNotification') {
                    const result = response.params?.result;
                    if (result?.signature) {
                        const signature = result.signature;
                        console.log(`💥 [${shortWallet}] New transaction: ${signature.slice(0, 12)}...`);
                        sendAlert(wallet, signature);
                    }
                }
            } catch (error) {
                // Ignore parse errors
            }
        });
        
        ws.on('error', function error(err) {
            console.log(`⚠️ [${shortWallet}] Error: ${err.message}`);
        });
        
        ws.on('close', function close() {
            if (!isShuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`🔄 [${shortWallet}] Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                setTimeout(() => {
                    if (!isShuttingDown) {
                        monitorWallet(wallet, index, total);
                    }
                }, 5000 * reconnectAttempts); // Exponential backoff
            } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.log(`❌ [${shortWallet}] Max reconnection attempts reached. Stopping.`);
            }
        });
        
        wsConnections.push(ws);
        
    } catch (error) {
        console.error(`❌ Error setting up ${wallet.slice(0, 8)}:`, error.message);
    }
}

// Start monitoring all tracked wallets
async function startRealTimeMonitoring() {
    console.log('🔌 Starting Real-Time WebSocket Monitoring...');
    
    const wallets = Tracker.getTrackedWallets();
    
    if (wallets.length === 0) {
        console.log('⚠️ No wallets to monitor');
        return;
    }
    
    console.log(`📊 Monitoring ${wallets.length} wallets`);
    
    // Monitor each wallet with a small delay to avoid rate limits
    for (let i = 0; i < wallets.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between connections
        monitorWallet(wallets[i], i, wallets.length);
    }
}

// Stop all monitoring
function stopMonitoring() {
    isShuttingDown = true;
    console.log('🛑 Stopping all WebSocket connections...');
    wsConnections.forEach(ws => {
        try {
            ws.close();
        } catch (e) {}
    });
    wsConnections = [];
}

module.exports = {
    startRealTimeMonitoring,
    setBot,
    stopMonitoring
};