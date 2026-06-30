// tradingBot.js
const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');

// ============ CONFIGURATION ============
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const JUPITER_API = 'https://quote-api.jup.ag/v6';
const JUPITER_API_V7 = 'https://quote-api.jup.ag/v7';

// ============ TRADING BOT CLASS ============

class TradingBot {
  constructor() {
    // Initialize Solana connection
    this.connection = new Connection(SOLANA_RPC);
  }

  // ============ JUPITER SWAP ============
  
  // Get quote from Jupiter
  async getQuote(sourceToken, destinationToken, amount, slippageBps = 100) {
    try {
      const response = await axios.get(`${JUPITER_API_V7}/quote`, {
        params: {
          inputMint: sourceToken,
          outputMint: destinationToken,
          amount: amount,
          slippageBps: slippageBps,
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting Jupiter quote:', error.response?.data || error.message);
      throw new Error(`Jupiter quote failed: ${error.message}`);
    }
  }

  // Swap using Jupiter API v7 (recommended)
  async swapUsingJupiter(sourceToken, destinationToken, amount, slippageBps = 100) {
    try {
      console.log(`🔄 Jupiter swap: ${sourceToken} -> ${destinationToken}, Amount: ${amount}`);
      
      // Get quote first
      const quote = await this.getQuote(sourceToken, destinationToken, amount, slippageBps);
      
      if (!quote || !quote.routes || quote.routes.length === 0) {
        throw new Error('No routes found for this swap');
      }

      // Build swap transaction
      const swapResponse = await axios.post(`${JUPITER_API_V7}/swap`, {
        quoteResponse: quote,
        userPublicKey: process.env.WALLET_PUBLIC_KEY || 'YOUR_WALLET_PUBLIC_KEY_HERE',
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      });

      // The response contains the transaction to sign and send
      return {
        success: true,
        quote: quote,
        swapData: swapResponse.data,
        route: quote.routes[0],
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct,
      };
      
    } catch (error) {
      console.error('Error performing Jupiter swap:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // ============ RAYDIUM SWAP (Simplified) ============
  
  // Swap using Raydium (using their API)
  async swapUsingRaydium(sourceToken, destinationToken, amount, slippage = 1) {
    try {
      console.log(`🔄 Raydium swap: ${sourceToken} -> ${destinationToken}, Amount: ${amount}`);
      
      // Note: Raydium's API endpoints have changed - update if needed
      const response = await axios.post('https://api.raydium.io/v2/swap', {
        inputMint: sourceToken,
        outputMint: destinationToken,
        amount: amount,
        slippage: slippage,
        walletPublicKey: process.env.WALLET_PUBLIC_KEY || 'YOUR_WALLET_PUBLIC_KEY_HERE',
      });

      return {
        success: true,
        data: response.data,
      };
      
    } catch (error) {
      console.error('Error performing Raydium swap:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // ============ HELPER FUNCTIONS ============
  
  // Validate wallet address
  validateAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get SOL balance
  async getBalance(walletAddress) {
    try {
      const pubKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(pubKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting balance:', error.message);
      return 0;
    }
  }

  // Check if token is SOL (native)
  isSOL(mintAddress) {
    return mintAddress === 'So11111111111111111111111111111111111111112' || 
           mintAddress === 'SOL' ||
           mintAddress === 'sol';
  }
}

// ============ EXPORTS ============
module.exports = TradingBot;