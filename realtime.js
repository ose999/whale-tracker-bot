const WebSocket = require('ws');
const { Connection, PublicKey } = require('@solana/web3.js');
const Tracker = require('./tracker');

// ============ CONFIGURATION ============
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 5000; // 5 seconds
const CONNECTION_DELAY = 1000; // 1 second between wallet connections

// ============ SETUP ============
const connection = new Connection(SOLANA_RPC);

// Store bot instance
let botInstance = null;
let wsConnections = [];
let isShuttingDown = false;

// Set the bot instance
function setBot(bot) {
    botInstance = bot;
}

// ============ ALERT SYSTEM ============

// Send alert to Telegram
async function sendAlert(wallet, signature, tokenInfo = '') {
    if (!botInstance || isShuttingDown) return;
    
    const walletShort = `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
    const alertMessage = `🐋 **WHALE ALERT!** 🚨
    
Wallet: ${walletShort}
Transaction: [View on Solscan](https://solscan.io/tx/${signature})
${tokenInfo}
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

// ============ WALLET MONITORING ============

// Monitor a single wallet
async function monitorWallet(wallet, index, total) {
    if (isShuttingDown) return;
    
    try {
        const pubKey = new PublicKey(wallet);
        const shortWallet = wallet.slice(0, 8);
        
        console.log(`🔗 [${index + 1}/${total}] Connecting to ${shortWallet}...`);
        
        const ws = new WebSocket(SOLANA_RPC.replace('https://', 'wss://'), {
            handshakeTimeout: 10000,
            timeout: 30000
        });
        
        let reconnectAttempts = 0;
        
        ws.on('open', function open() {
            console.log(`✅ [${shortWallet}] Connected!`);
            reconnectAttempts = 0;
            
            // Subscribe to transactions for this wallet
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
                // Ignore parse errors for non-notification messages
            }
        });
        
        ws.on('error', function error(err) {
            console.log(`⚠️ [${shortWallet}] Error: ${err.message}`);
        });
        
        ws.on('close', function close() {
            if (!isShuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                const delay = RECONNECT_DELAY_BASE * reconnectAttempts;
                console.log(`🔄 [${shortWallet}] Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay/1000}s...`);
                setTimeout(() => {
                    if (!isShuttingDown) {
                        monitorWallet(wallet, index, total);
                    }
                }, delay);
            } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.log(`❌ [${shortWallet}] Max reconnection attempts reached. Stopping.`);
            }
        });
        
        wsConnections.push(ws);
        
    } catch (error) {
        console.error(`❌ Error setting up ${wallet.slice(0, 8)}:`, error.message);
    }
}

// ============ START/STOP ============

// Start monitoring all tracked wallets
async function startRealTimeMonitoring() {
    console.log('🔌 Starting Real-Time WebSocket Monitoring...');
    
    const wallets = Tracker.getTrackedWallets();
    
    if (wallets.length === 0) {
        console.log('⚠️ No wallets to monitor');
        return;
    }
    
    console.log(`📊 Monitoring ${wallets.length} wallets`);
    console.log(`🔗 Using RPC: ${SOLANA_RPC}`);
    
    // Monitor each wallet with a small delay to avoid rate limits
    for (let i = 0; i < wallets.length; i++) {
        await new Promise(resolve => setTimeout(resolve, CONNECTION_DELAY));
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
        } catch (e) {
            // Ignore close errors
        }
    });
    wsConnections = [];
    console.log('✅ All WebSocket connections closed');
}

module.exports = {
    startRealTimeMonitoring,
    setBot,
    stopMonitoring
};