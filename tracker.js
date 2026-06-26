const fs = require('fs');
const { Connection, PublicKey } = require('@solana/web3.js');

// File to store tracked wallets
const WALLETS_FILE = './tracked_wallets.json';

// Set up Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Load wallets from file or use defaults
function loadWallets() {
    try {
        if (fs.existsSync(WALLETS_FILE)) {
            const data = fs.readFileSync(WALLETS_FILE, 'utf8');
            const wallets = JSON.parse(data);
            console.log(`📂 Loaded ${wallets.length} wallets from file`);
            return wallets;
        }
    } catch (error) {
        console.error('Error loading wallets:', error.message);
    }
    
    // Default wallets if file doesn't exist - START WITH EMPTY LIST
    const defaults = [];
    saveWallets(defaults);
    return defaults;
}

// Save wallets to file
function saveWallets(wallets) {
    try {
        fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
        console.log(`💾 Saved ${wallets.length} wallets to file`);
    } catch (error) {
        console.error('Error saving wallets:', error.message);
    }
}

// Initialize wallets
let SMART_WALLETS = loadWallets();

// Track a wallet - this will monitor for transactions
async function trackWallet(walletAddress) {
    try {
        const pubKey = new PublicKey(walletAddress);
        const balance = await connection.getBalance(pubKey);
        const solBalance = balance / 1e9;
        
        return {
            address: walletAddress,
            balance: solBalance.toFixed(4),
            isTracked: SMART_WALLETS.includes(walletAddress)
        };
    } catch (error) {
        return { error: 'Invalid wallet address' };
    }
}

// Check if a wallet is in our tracked list
function isTrackedWallet(address) {
    return SMART_WALLETS.includes(address);
}

// Add a wallet to tracked list
function addTrackedWallet(address) {
    if (!SMART_WALLETS.includes(address)) {
        SMART_WALLETS.push(address);
        saveWallets(SMART_WALLETS); // Save to file immediately
        return true;
    }
    return false;
}

// Remove a wallet from tracked list
function removeTrackedWallet(address) {
    const index = SMART_WALLETS.indexOf(address);
    if (index > -1) {
        SMART_WALLETS.splice(index, 1);
        saveWallets(SMART_WALLETS); // Save to file immediately
        return true;
    }
    return false;
}

// Get all tracked wallets
function getTrackedWallets() {
    return SMART_WALLETS;
}

// Get count of tracked wallets
function getTrackedCount() {
    return SMART_WALLETS.length;
}

module.exports = {
    trackWallet,
    isTrackedWallet,
    addTrackedWallet,
    removeTrackedWallet,
    getTrackedWallets,
    getTrackedCount
};