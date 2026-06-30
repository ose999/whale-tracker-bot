const { Telegraf } = require('telegraf');
const { Connection, PublicKey } = require('@solana/web3.js');
const Tracker = require('./tracker');
const Monitor = require('./monitor');
const RealTime = require('./realtime');

// ============ KEEP-ALIVE SERVER FOR RENDER ============
// This is REQUIRED for Render Web Services
const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🐋 Whale Tracker Bot is running!');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Keep-alive server listening on port ${port}`);
});
// =====================================================

// REPLACE WITH YOUR ACTUAL BOT TOKEN
const bot = new Telegraf(process.env.BOT_TOKEN);

// Setup Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Set bot instance for monitoring
Monitor.setBot(bot);
RealTime.setBot(bot);

// ============ COMMANDS ============

// START
bot.start((ctx) => {
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📊 Menu', callback_data: 'menu' },
                    { text: '❓ Help', callback_data: 'menu_help' }
                ],
                [
                    { text: '💰 Balance', callback_data: 'menu_balance' },
                    { text: '📋 Tracked', callback_data: 'menu_tracked' }
                ],
                [
                    { text: '➕ Track', callback_data: 'menu_track' },
                    { text: '❌ Remove', callback_data: 'menu_remove' }
                ],
                [
                    { text: '🔁 Copy Trade', callback_data: 'menu_copy' },
                    { text: '🔌 Realtime', callback_data: 'menu_realtime' }
                ],
                [
                    { text: '👑 My Tier', callback_data: 'menu_mytier' },
                    { text: '💎 Pricing', callback_data: 'menu_pricing' }
                ],
                [
                    { text: '💎 Premium', callback_data: 'menu_premium' },
                    { text: '🛒 Buy', callback_data: 'menu_buy' }
                ]
            ]
        }
    };
    
    ctx.reply('🚀 **MEME COIN WHALE TRACKER**\n\nI monitor crypto wallets and alert you instantly when whales trade!\n\nSelect a button below to get started 👇', { ...inlineKeyboard, parse_mode: 'Markdown' });
});

// ============ INLINE MENU ============

// Menu button handler
bot.action('menu', (ctx) => {
    ctx.answerCbQuery();
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💰 Balance', callback_data: 'menu_balance' },
                    { text: '📋 Tracked', callback_data: 'menu_tracked' }
                ],
                [
                    { text: '➕ Track', callback_data: 'menu_track' },
                    { text: '❌ Remove', callback_data: 'menu_remove' }
                ],
                [
                    { text: '🔁 Copy Trade', callback_data: 'menu_copy' },
                    { text: '🔌 Realtime', callback_data: 'menu_realtime' }
                ],
                [
                    { text: '👑 My Tier', callback_data: 'menu_mytier' },
                    { text: '💎 Pricing', callback_data: 'menu_pricing' }
                ],
                [
                    { text: '🆔 My ID', callback_data: 'menu_id' },
                    { text: '🏓 Ping', callback_data: 'menu_ping' }
                ],
                [
                    { text: '💎 Premium', callback_data: 'menu_premium' },
                    { text: '🛒 Buy', callback_data: 'menu_buy' }
                ],
                [
                    { text: '❓ Help', callback_data: 'menu_help' }
                ]
            ]
        }
    };
    
    ctx.reply('📊 **COMMAND MENU**\n\nSelect a command:', { ...inlineKeyboard, parse_mode: 'Markdown' });
});

// Menu button actions
bot.action('menu_balance', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('💰 **Balance Command**\n\nType: `/balance WALLET_ADDRESS`\n\nExample: `/balance 7RYJ6L67UZx4HZvNvpK4gUvL4VpBqkZxmXJkXbY7nLqA`', { parse_mode: 'Markdown' });
});

bot.action('menu_tracked', (ctx) => {
    ctx.answerCbQuery();
    const wallets = Tracker.getTrackedWallets();
    const count = Tracker.getTrackedCount();
    
    if (wallets.length === 0) {
        ctx.reply('📋 No wallets are currently being tracked.\n\nUse /track to add one.');
        return;
    }
    
    let message = `📋 **TRACKED WALLETS** (${count} total)\n\n`;
    const displayWallets = wallets.slice(0, 15);
    for (let i = 0; i < displayWallets.length; i++) {
        message += `${i + 1}. ${displayWallets[i].slice(0, 8)}...${displayWallets[i].slice(-6)}\n`;
    }
    if (wallets.length > 15) {
        message += `\n... and ${wallets.length - 15} more`;
    }
    ctx.reply(message);
});

bot.action('menu_track', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('➕ **Track a Wallet**\n\nType: `/track WALLET_ADDRESS`\n\nExample: `/track 7RYJ6L67UZx4HZvNvpK4gUvL4VpBqkZxmXJkXbY7nLqA`', { parse_mode: 'Markdown' });
});

bot.action('menu_remove', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('❌ **Remove a Wallet**\n\nType: `/remove WALLET_ADDRESS`\n\nExample: `/remove 7RYJ6L67UZx4HZvNvpK4gUvL4VpBqkZxmXJkXbY7nLqA`', { parse_mode: 'Markdown' });
});

bot.action('menu_copy', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🔁 **Copy Trade**\n\nType: `/copy WALLET_ADDRESS`\n\nExample: `/copy 7RYJ6L67UZx4HZvNvpK4gUvL4VpBqkZxmXJkXbY7nLqA`\n\n⚠️ I will alert you instantly when this wallet trades!', { parse_mode: 'Markdown' });
});

bot.action('menu_realtime', (ctx) => {
    ctx.answerCbQuery();
    const count = Tracker.getTrackedCount();
    ctx.reply(`🔌 **REAL-TIME WebSocket Monitoring**\n\nTracking ${count} wallets\n⚡ Instant alerts via WebSocket\n📡 No delay - real-time notifications!\n\nWhen whales trade, you'll know instantly!`);
});

bot.action('menu_mytier', (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id.toString();
    const tierInfo = Tracker.getUserTier(userId);
    
    let message = `👑 **Your Tier: ${tierInfo.name}**\n\n`;
    message += `📊 **Features:**\n`;
    tierInfo.features.forEach(f => {
        message += `✅ ${f}\n`;
    });
    message += `\n📈 **Max Wallets:** ${tierInfo.maxWallets}`;
    
    if (tierInfo.expires) {
        const daysLeft = Math.ceil((tierInfo.expires - Date.now()) / (1000 * 60 * 60 * 24));
        message += `\n⏳ **Days Left:** ${daysLeft}`;
    } else {
        message += `\n📅 **Status:** Active (No expiration)`;
    }
    
    ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.action('menu_pricing', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply(
        `💎 **PREMIUM TIERS**\n\n` +
        `🔹 **FREE**\n` +
        `- Basic alerts\n` +
        `- 3 tracked wallets\n` +
        `- Price: $0\n\n` +
        `🔹 **PREMIUM**\n` +
        `- Instant alerts\n` +
        `- Unlimited wallets\n` +
        `- Early signals\n` +
        `- Price: $20/month\n\n` +
        `🔹 **PRO**\n` +
        `- Copy trading signals\n` +
        `- Advanced analytics\n` +
        `- Priority support\n` +
        `- Multi-chain support\n` +
        `- Price: $100/month\n\n` +
        `To upgrade, contact @krooksos`,
        { parse_mode: 'Markdown' }
    );
});

bot.action('menu_id', (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id;
    ctx.reply(`🆔 Your Telegram ID: ${userId}\n\nGive this to @krooksos for premium access!`);
});

bot.action('menu_ping', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🏓 Pong! Bot is working!');
});

bot.action('menu_premium', (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id.toString();
    const tierInfo = Tracker.getUserTier(userId);
    
    if (tierInfo.tier !== 'FREE') {
        ctx.reply(`💎 **${tierInfo.name} ACCESS GRANTED!**\n\nYou have access to all ${tierInfo.name} features! 🚀`);
    } else {
        ctx.reply(`💎 **PREMIUM FEATURES**\n\nUpgrade to Premium or Pro:\n✅ Instant whale alerts (no delay)\n✅ Unlimited tracked wallets\n✅ Copy trading signals\n✅ Advanced analytics\n\n💳 Subscribe: $20/month (Premium) or $100/month (Pro)\n\nYour ID: ${userId}\nContact @krooksos to subscribe.`);
    }
});

bot.action('menu_buy', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🛒 **BUY CRYPTO**\n\n💰 [Binance](https://www.binance.com/en/register?ref=YOUR_REFERRAL_CODE) - Best for beginners\n🔥 [Jupiter](https://jup.ag/) - Best Solana swaps\n📊 [DexScreener](https://dexscreener.com/solana) - Track meme coins\n\n⚠️ Always DYOR!', { parse_mode: 'Markdown' });
});

bot.action('menu_help', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('📊 **ALL COMMANDS**\n\n' +
              '/start - Start the bot\n' +
              '/help - Show this menu\n' +
              '/balance <address> - Check wallet balance\n' +
              '/track <address> - Track a wallet\n' +
              '/tracked - List tracked wallets\n' +
              '/remove <address> - Remove a wallet\n' +
              '/copy <address> - Copy trade a wallet\n' +
              '/realtime - Show real-time status\n' +
              '/testalert - Test alert notification\n' +
              '/premium - Premium features\n' +
              '/mytier - Check your tier\n' +
              '/pricing - Show pricing\n' +
              '/id - Get your user ID\n' +
              '/buy - Buy crypto\n' +
              '/ping - Test if bot is working\n\n' +
              '📊 Click the Menu button below!');
});

// ============ REGULAR COMMANDS ============

// HELP
bot.command('help', (ctx) => {
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📊 Menu', callback_data: 'menu' }]
            ]
        }
    };
    ctx.reply('📊 Send /menu or click the button below:', inlineKeyboard);
});

// ID - Get user ID
bot.command('id', (ctx) => {
    const userId = ctx.from.id;
    ctx.reply(`🆔 Your Telegram ID: ${userId}\n\nGive this to @krooksos for premium access!`);
});

// PING
bot.command('ping', (ctx) => {
    ctx.reply('🏓 Pong!');
});

// BALANCE
bot.command('balance', async (ctx) => {
    try {
        const parts = ctx.message.text.split(' ');
        if (parts.length < 2) {
            ctx.reply('❌ Please provide a wallet address.\n\nExample: /balance 7RYJ6L67UZx4HZvNvpK4gUvL4VpBqkZxmXJkXbY7nLqA');
            return;
        }
        
        const walletAddress = parts[1];
        const pubKey = new PublicKey(walletAddress);
        const balance = await connection.getBalance(pubKey);
        const solBalance = balance / 1e9;
        
        ctx.reply(`💰 Wallet Balance\n\nAddress: ${walletAddress}\nBalance: ${solBalance.toFixed(4)} SOL`);
    } catch (error) {
        ctx.reply('❌ Invalid wallet address.');
    }
});

// TRACK - With tier limits
bot.command('track', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const parts = ctx.message.text.split(' ');
        
        if (parts.length < 2) {
            ctx.reply('❌ Please provide a wallet address.\n\nExample: /track 7RYJ6L67UZx4HZvNvpK4gUvL4VpBqkZxmXJkXbY7nLqA');
            return;
        }
        
        const walletAddress = parts[1];
        try { new PublicKey(walletAddress); } catch { ctx.reply('❌ Invalid wallet address.'); return; }
        
        // Check user tier
        const tierInfo = Tracker.getUserTier(userId);
        const currentCount = Tracker.getTrackedCount();
        
        if (currentCount >= tierInfo.maxWallets) {
            ctx.reply(
                `❌ You've reached your tier limit.\n\n` +
                `Your tier: ${tierInfo.name}\n` +
                `Max wallets: ${tierInfo.maxWallets}\n` +
                `Currently tracking: ${currentCount}\n\n` +
                `Use /mytier to check your tier.\n` +
                `Use /pricing to see upgrade options.\n` +
                `Contact @krooksos to upgrade.`
            );
            return;
        }
        
        const added = Tracker.addTrackedWallet(walletAddress);
        if (added) {
            const count = Tracker.getTrackedCount();
            ctx.reply(`✅ Wallet added!\n\nNow tracking ${count} wallets.\nYour tier: ${tierInfo.name} (${tierInfo.maxWallets} max)`);
        } else {
            ctx.reply(`ℹ️ Wallet already tracked.`);
        }
    } catch (error) {
        ctx.reply('❌ Something went wrong.');
        console.error(error);
    }
});

// TRACKED
bot.command('tracked', async (ctx) => {
    const wallets = Tracker.getTrackedWallets();
    const count = Tracker.getTrackedCount();
    
    if (wallets.length === 0) {
        ctx.reply('📋 No wallets tracked.');
        return;
    }
    
    let message = `📋 TRACKED WALLETS (${count} total)\n\n`;
    for (let i = 0; i < Math.min(wallets.length, 15); i++) {
        message += `${i + 1}. ${wallets[i].slice(0, 8)}...${wallets[i].slice(-6)}\n`;
    }
    if (wallets.length > 15) message += `\n... and ${wallets.length - 15} more`;
    ctx.reply(message);
});

// REMOVE
bot.command('remove', async (ctx) => {
    try {
        const parts = ctx.message.text.split(' ');
        if (parts.length < 2) {
            ctx.reply('❌ Please provide a wallet address.\n\nExample: /remove 7RYJ6L67UZx4HZvNvpK4gUvL4VpBqkZxmXJkXbY7nLqA');
            return;
        }
        
        const walletAddress = parts[1];
        const removed = Tracker.removeTrackedWallet(walletAddress);
        if (removed) {
            ctx.reply(`🗑️ Wallet removed!\n\nNow tracking ${Tracker.getTrackedCount()} wallets.`);
        } else {
            ctx.reply(`ℹ️ Wallet not found.`);
        }
    } catch (error) {
        ctx.reply('❌ Something went wrong.');
    }
});

// COPY
bot.command('copy', async (ctx) => {
    try {
        const parts = ctx.message.text.split(' ');
        if (parts.length < 2) {
            ctx.reply('❌ Please provide a wallet address.\n\nExample: /copy 7RYJ6L67UZx4HZvNvpK4gUvL4VpBqkZxmXJkXbY7nLqA');
            return;
        }
        
        const walletAddress = parts[1];
        try { new PublicKey(walletAddress); } catch { ctx.reply('❌ Invalid wallet address.'); return; }
        
        Tracker.addTrackedWallet(walletAddress);
        ctx.reply(`🔁 COPY TRADE SETUP\n\nWallet tracked!\n\nYou'll get instant alerts when this whale trades!`);
    } catch (error) {
        ctx.reply('❌ Something went wrong.');
    }
});

// REALTIME
bot.command('realtime', (ctx) => {
    const count = Tracker.getTrackedCount();
    ctx.reply(`🔌 REAL-TIME WebSocket\n\nTracking ${count} wallets\n⚡ Instant alerts!`);
});

// TESTALERT
bot.command('testalert', (ctx) => {
    ctx.reply('🔔 TEST ALERT!\n\nAlert system is working! ✅');
});

// PREMIUM
bot.command('premium', (ctx) => {
    const userId = ctx.from.id.toString();
    const tierInfo = Tracker.getUserTier(userId);
    
    if (tierInfo.tier !== 'FREE') {
        ctx.reply(`💎 ${tierInfo.name} access granted! 🚀\n\nYou have access to all ${tierInfo.name} features.`);
    } else {
        ctx.reply(`💎 **PREMIUM SUBSCRIPTION**\n\n` +
                  `💰 Premium: $20/month\n` +
                  `👑 Pro: $100/month\n\n` +
                  `**Features:**\n` +
                  `✅ Instant whale alerts\n` +
                  `✅ Unlimited tracked wallets\n` +
                  `✅ Copy trading signals\n` +
                  `✅ Advanced analytics\n\n` +
                  `Contact @krooksos to subscribe.\n\n` +
                  `Your ID: ${ctx.from.id}`, { parse_mode: 'Markdown' });
    }
});

// MYTIER - Check current tier
bot.command('mytier', (ctx) => {
    const userId = ctx.from.id.toString();
    const tierInfo = Tracker.getUserTier(userId);
    
    let message = `👑 **Your Tier: ${tierInfo.name}**\n\n`;
    message += `📊 **Features:**\n`;
    tierInfo.features.forEach(f => {
        message += `✅ ${f}\n`;
    });
    message += `\n📈 **Max Wallets:** ${tierInfo.maxWallets}`;
    
    if (tierInfo.expires) {
        const daysLeft = Math.ceil((tierInfo.expires - Date.now()) / (1000 * 60 * 60 * 24));
        message += `\n⏳ **Days Left:** ${daysLeft}`;
    } else {
        message += `\n📅 **Status:** Active (No expiration)`;
    }
    
    ctx.reply(message, { parse_mode: 'Markdown' });
});

// PRICING - Show all tiers
bot.command('pricing', (ctx) => {
    ctx.reply(
        `💎 **PREMIUM TIERS**\n\n` +
        `🔹 **FREE**\n` +
        `- Basic alerts\n` +
        `- 3 tracked wallets\n` +
        `- Price: $0\n\n` +
        `🔹 **PREMIUM**\n` +
        `- Instant alerts\n` +
        `- Unlimited wallets\n` +
        `- Early signals\n` +
        `- Price: $20/month\n\n` +
        `🔹 **PRO**\n` +
        `- Copy trading signals\n` +
        `- Advanced analytics\n` +
        `- Priority support\n` +
        `- Multi-chain support\n` +
        `- Price: $100/month\n\n` +
        `To upgrade, contact @krooksos`,
        { parse_mode: 'Markdown' }
    );
});

// BUY
bot.command('buy', (ctx) => {
    ctx.reply('🛒 BUY CRYPTO\n\n💰 [Binance](https://www.binance.com/)\n🔥 [Jupiter](https://jup.ag/)', { parse_mode: 'Markdown' });
});

// CATCH ALL
bot.on('text', (ctx) => {
    ctx.reply('Send /start or /menu');
});

// ============ SET COMMANDS ============
bot.telegram.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'menu', description: 'Open the menu' },
    { command: 'balance', description: 'Check wallet balance' },
    { command: 'track', description: 'Track a wallet' },
    { command: 'tracked', description: 'List tracked wallets' },
    { command: 'remove', description: 'Remove a wallet' },
    { command: 'copy', description: 'Copy trade a wallet' },
    { command: 'realtime', description: 'Show real-time status' },
    { command: 'testalert', description: 'Test alert notification' },
    { command: 'premium', description: 'Premium features' },
    { command: 'mytier', description: 'Check your tier' },
    { command: 'pricing', description: 'Show pricing' },
    { command: 'id', description: 'Get your user ID' },
    { command: 'buy', description: 'Buy crypto' },
    { command: 'ping', description: 'Test if bot is working' },
]);

// ============ ADMIN COMMANDS ============
// Your Telegram ID for admin access
const BOT_OWNER_ID = '8477891454';

// Admin: Upgrade a user
bot.command('upgrade', (ctx) => {
    if (ctx.from.id.toString() !== BOT_OWNER_ID) {
        ctx.reply('❌ You are not authorized to use this command.');
        return;
    }
    
    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) {
        ctx.reply('❌ Usage: /upgrade USER_ID TIER (FREE, PREMIUM, or PRO)\n\nExample: /upgrade 123456789 PREMIUM');
        return;
    }
    
    const userId = parts[1];
    const tier = parts[2].toUpperCase();
    
    if (!['FREE', 'PREMIUM', 'PRO'].includes(tier)) {
        ctx.reply('❌ Invalid tier. Use FREE, PREMIUM, or PRO.');
        return;
    }
    
    Tracker.setUserTier(userId, tier, 30);
    ctx.reply(`✅ User ${userId} upgraded to ${tier} for 30 days!`);
});

// Admin: Check user tier
bot.command('checkuser', (ctx) => {
    if (ctx.from.id.toString() !== BOT_OWNER_ID) {
        ctx.reply('❌ You are not authorized to use this command.');
        return;
    }
    
    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) {
        ctx.reply('❌ Usage: /checkuser USER_ID');
        return;
    }
    
    const userId = parts[1];
    const tierInfo = Tracker.getUserTier(userId);
    ctx.reply(`User ${userId} is on tier: ${tierInfo.name}\nMax wallets: ${tierInfo.maxWallets}`);
});

// ============ START BOT ============
console.log('✅ Meme Coin Whale Tracker is running!');
console.log(`📊 Tracking ${Tracker.getTrackedCount()} wallets`);

console.log('🔌 Starting Real-Time WebSocket Monitoring...');
RealTime.startRealTimeMonitoring();

bot.launch();

// ============ GRACEFUL SHUTDOWN ============
// This properly stops WebSocket connections when you Ctrl+C

process.once('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
    console.log('🔌 Closing WebSocket connections...');
    RealTime.stopMonitoring();
    console.log('🤖 Stopping bot...');
    bot.stop('SIGINT');
    setTimeout(() => {
        console.log('✅ Shutdown complete.');
        process.exit(0);
    }, 3000);
});

process.once('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
    console.log('🔌 Closing WebSocket connections...');
    RealTime.stopMonitoring();
    console.log('🤖 Stopping bot...');
    bot.stop('SIGTERM');
    setTimeout(() => {
        console.log('✅ Shutdown complete.');
        process.exit(0);
    }, 3000);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
});