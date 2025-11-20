import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Configure your Ethereum provider
const RPC_URL = process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/W5kdNoY0HYZTWzVCZFK9IVezgogvROws';

/**
 * POST /api/createTx
 * Prepare a transaction object for signing
 * Body: { to: string, value: string, data?: string, gasLimit?: string }
 */
router.post('/createTx', async (req: Request, res: Response) => {
  console.log('\n📝 [TX] Creating transaction...');
  try {
    const { to, value, data, gasLimit } = req.body;
    console.log(`  To: ${to}`);
    console.log(`  Value: ${value}`);
    console.log(`  Data: ${data || '0x'}`);
    console.log(`  Gas Limit: ${gasLimit || '21000'}`);

    // Validate input
    if (!to || !value) {
      console.log('❌ [TX] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: to, value' });
    }

    // Validate address
    if (!ethers.utils.isAddress(to)) {
      console.log(`❌ [TX] Invalid address: ${to}`);
      return res.status(400).json({ error: 'Invalid to address' });
    }

    // Create provider to get current gas prices
    console.log(`  Connecting to RPC: ${RPC_URL}`);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    // Get gas price
    const gasPrice = await provider.getGasPrice();
    console.log(`  Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);

    // Construct transaction object
    const network = await provider.getNetwork();
    console.log(`  Network: ${network.name} (chainId: ${network.chainId})`);
    
    const tx = {
      to,
      value: ethers.BigNumber.from(value),
      data: data || '0x',
      gasLimit: gasLimit ? ethers.BigNumber.from(gasLimit) : ethers.BigNumber.from(21000),
      gasPrice: gasPrice,
      chainId: network.chainId
    };

    console.log('✅ [TX] Transaction created successfully');
    console.log(`  Value: ${ethers.utils.formatEther(tx.value)} ETH`);
    console.log(`  Gas Limit: ${tx.gasLimit.toString()}`);

    res.json({ 
      tx,
      estimatedGas: tx.gasLimit.toString(),
      gasPrice: gasPrice.toString()
    });
  } catch (error: any) {
    console.error('❌ [TX] Error creating transaction:', error.message || error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * POST /api/broadcast
 * Broadcast a signed transaction to the Ethereum network
 * Body: { rawTx: string }
 */
router.post('/broadcast', async (req: Request, res: Response) => {
  console.log('\n📡 [TX] Broadcasting transaction...');
  try {
    const { rawTx } = req.body;
    console.log(`  Raw TX length: ${rawTx?.length || 0} chars`);

    // Validate input
    if (!rawTx) {
      console.log('❌ [TX] Missing rawTx field');
      return res.status(400).json({ error: 'Missing rawTx field' });
    }

    // Create provider
    console.log(`  Connecting to RPC: ${RPC_URL}`);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    // Parse the transaction to inspect it
    const parsed = ethers.utils.parseTransaction(rawTx);
    console.log('  Transaction Details:');
    console.log(`    From: ${parsed.from}`);
    console.log(`    To: ${parsed.to}`);
    console.log(`    Value: ${ethers.utils.formatEther(parsed.value || 0)} ETH`);
    console.log(`    Gas Limit: ${parsed.gasLimit?.toString()}`);
    console.log(`    Gas Price: ${parsed.gasPrice ? ethers.utils.formatUnits(parsed.gasPrice, 'gwei') + ' gwei' : 'N/A'}`);
    console.log(`    Nonce: ${parsed.nonce}`);
    console.log(`    Chain ID: ${parsed.chainId}`);

    // Broadcast the transaction
    console.log('  Broadcasting to network...');
    const txResponse = await provider.sendTransaction(rawTx);
    
    console.log('✅ [TX] Transaction broadcasted successfully');
    console.log(`  Transaction Hash: ${txResponse.hash}`);
    console.log(`  Confirmations: ${txResponse.confirmations}`);

    res.json({ 
      success: true,
      txHash: txResponse.hash,
      from: parsed.from,
      to: parsed.to,
      value: ethers.utils.formatEther(parsed.value || 0)
    });
  } catch (error: any) {
    console.error('❌ [TX] Error broadcasting transaction:');
    console.error(`  Error message: ${error.message}`);
    console.error(`  Error code: ${error.code}`);
    if (error.reason) {
      console.error(`  Reason: ${error.reason}`);
    }
    res.status(400).json({ 
      error: 'Broadcast failed',
      message: error.message 
    });
  }
});

/**
 * GET /api/tx/:hash
 * Get transaction details by hash
 */
router.get('/tx/:hash', async (req: Request, res: Response) => {
  console.log('\n🔍 [TX] Fetching transaction details...');
  try {
    const { hash } = req.params;
    console.log(`  Transaction Hash: ${hash}`);

    console.log(`  Connecting to RPC: ${RPC_URL}`);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    console.log('  Querying transaction...');
    const tx = await provider.getTransaction(hash);
    
    if (!tx) {
      console.log(`❌ [TX] Transaction not found: ${hash}`);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    console.log('  Transaction found:');
    console.log(`    From: ${tx.from}`);
    console.log(`    To: ${tx.to}`);
    console.log(`    Value: ${ethers.utils.formatEther(tx.value)} ETH`);
    console.log(`    Block: ${tx.blockNumber || 'pending'}`);
    console.log(`    Confirmations: ${tx.confirmations}`);

    // Get receipt if transaction is mined
    console.log('  Fetching receipt...');
    const receipt = await provider.getTransactionReceipt(hash);
    
    if (receipt) {
      console.log('  Receipt found:');
      console.log(`    Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
      console.log(`    Gas Used: ${receipt.gasUsed.toString()}`);
    } else {
      console.log('  Receipt: Transaction not yet mined');
    }

    console.log('✅ [TX] Transaction details retrieved successfully');

    res.json({
      transaction: {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.utils.formatEther(tx.value),
        gasPrice: tx.gasPrice?.toString(),
        gasLimit: tx.gasLimit.toString(),
        nonce: tx.nonce,
        blockNumber: tx.blockNumber,
        confirmations: tx.confirmations
      },
      receipt: receipt ? {
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      } : null
    });
  } catch (error: any) {
    console.error('❌ [TX] Error fetching transaction:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

export default router;
