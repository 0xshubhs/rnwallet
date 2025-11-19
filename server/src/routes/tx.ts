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
  try {
    const { to, value, data, gasLimit } = req.body;

    // Validate input
    if (!to || !value) {
      return res.status(400).json({ error: 'Missing required fields: to, value' });
    }

    // Validate address
    if (!ethers.utils.isAddress(to)) {
      return res.status(400).json({ error: 'Invalid to address' });
    }

    // Create provider to get current gas prices
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    // Get gas price
    const gasPrice = await provider.getGasPrice();

    // Construct transaction object
    const tx = {
      to,
      value: ethers.BigNumber.from(value),
      data: data || '0x',
      gasLimit: gasLimit ? ethers.BigNumber.from(gasLimit) : ethers.BigNumber.from(21000),
      gasPrice: gasPrice,
      chainId: (await provider.getNetwork()).chainId
    };

    res.json({ 
      tx,
      estimatedGas: tx.gasLimit.toString(),
      gasPrice: gasPrice.toString()
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * POST /api/broadcast
 * Broadcast a signed transaction to the Ethereum network
 * Body: { rawTx: string }
 */
router.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { rawTx } = req.body;

    // Validate input
    if (!rawTx) {
      return res.status(400).json({ error: 'Missing rawTx field' });
    }

    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    // Parse the transaction to inspect it
    const parsed = ethers.utils.parseTransaction(rawTx);
    console.log('Broadcasting transaction from:', parsed.from);
    console.log('To:', parsed.to);
    console.log('Value:', ethers.utils.formatEther(parsed.value || 0), 'ETH');

    // Broadcast the transaction
    const txResponse = await provider.sendTransaction(rawTx);
    
    console.log('Transaction hash:', txResponse.hash);

    res.json({ 
      success: true,
      txHash: txResponse.hash,
      from: parsed.from,
      to: parsed.to,
      value: ethers.utils.formatEther(parsed.value || 0)
    });
  } catch (error: any) {
    console.error('Error broadcasting transaction:', error);
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
  try {
    const { hash } = req.params;

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    const tx = await provider.getTransaction(hash);
    
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get receipt if transaction is mined
    const receipt = await provider.getTransactionReceipt(hash);

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
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

export default router;
