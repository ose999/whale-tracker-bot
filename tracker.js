const fs = require('fs');
const { Connection, PublicKey } = require('@solana/web3.js');

// ============ FILE CONFIGURATION ============
// File to store tracked wallets
const WALLETS_FILE = './tracked_wallets.json';
const PREMIUM_FILE = './premium_users.json';

// Set up Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// ============ WALLET TRACKING ============

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

// ============ PREMIUM TIER SYSTEM ============

// Load premium users from file
function loadPremiumUsers() {
    try {
        if (fs.existsSync(PREMIUM_FILE)) {
            const data = fs.readFileSync(PREMIUM_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading premium users:', error.message);
    }
    return {};
}

// Save premium users to file
function savePremiumUsers(users) {
    try {
        fs.writeFileSync(PREMIUM_FILE, JSON.stringify(users, null, 2));
        console.log(`💾 Saved premium users to file`);
    } catch (error) {
        console.error('Error saving premium users:', error.message);
    }
}

// Initialize premium users
let PREMIUM_USERS = loadPremiumUsers();

// Tier definitions with features and limits
const TIERS = {
    FREE: {
        name: 'Free',
        maxWallets: 3,
        features: ['Basic alerts', '3 tracked wallets']
    },
    PREMIUM: {
        name: 'Premium',
        maxWallets: 100,
        features: ['Instant alerts', 'Unlimited wallets', 'Early signals']
    },
    PRO: {
        name: 'Pro',
        maxWallets: 999,
        features: ['Copy trading signals', 'Advanced analytics', 'Priority support', 'Multi-chain support']
    }
};

// Get user's current tier with expiration check
function getUserTier(userId) {
    const userData = PREMIUM_USERS[userId];
    if (!userData) {
        return { tier: 'FREE', expires: null, ...TIERS.FREE };
    }
    // Check if expired
    if (userData.expires && Date.now() > userData.expires) {
        delete PREMIUM_USERS[userId];
        savePremiumUsers(PREMIUM_USERS);
        return { tier: 'FREE', expires: null, ...TIERS.FREE };
    }
    return {
        tier: userData.tier,
        expires: userData.expires,
        ...TIERS[userData.tier]
    };
}

// Set user tier with expiration (default 30 days)
function setUserTier(userId, tier, durationDays = 30) {
    const expires = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
    PREMIUM_USERS[userId] = {
        tier: tier,
        expires: expires,
        activatedAt: Date.now()
    };
    savePremiumUsers(PREMIUM_USERS);
    return true;
}

// ============ WALLET FUNCTIONS ============

// Track a wallet and get its balance
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
        saveWallets(SMART_WALLETS);
        return true;
    }
    return false;
}

// Remove a wallet from tracked list
function removeTrackedWallet(address) {
    const index = SMART_WALLETS.indexOf(address);
    if (index > -1) {
        SMART_WALLETS.splice(index, 1);
        saveWallets(SMART_WALLETS);
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

// Get user's tracked wallets (currently returns all wallets)
function getUserWallets(userId) {
    // Note: For per-user wallet tracking, this function would need to be extended
    // Currently returns all shared wallets
    return SMART_WALLETS;
}

// ============ EXPORTS ============
module.exports = {
    trackWallet,
    isTrackedWallet,
    addTrackedWallet,
    removeTrackedWallet,
    getTrackedWallets,
    getTrackedCount,
    getUserWallets,
    // Premium functions
    getUserTier,
    setUserTier,
    TIERS
};