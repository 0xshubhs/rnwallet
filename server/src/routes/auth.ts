import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// In-memory store for nonces (in production, use Redis or database)
const nonceStore: Map<string, string> = new Map();

/**
 * GET /api/nonce
 * Generate a unique nonce for login authentication
 */
router.get('/nonce', (req: Request, res: Response) => {
  try {
    const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(16));
    const sessionId = ethers.utils.hexlify(ethers.utils.randomBytes(8));
    
    // Store nonce with session ID
    nonceStore.set(sessionId, nonce);
    
    res.json({ nonce, sessionId });
  } catch (error) {
    console.error('Error generating nonce:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

/**
 * POST /api/verify
 * Verify the signature and authenticate the user
 * Body: { address: string, signature: string, nonce: string, sessionId: string }
 */
router.post('/verify', (req: Request, res: Response) => {
  try {
    const { address, signature, nonce, sessionId } = req.body;

    // Validate input
    if (!address || !signature || !nonce) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify nonce matches stored value
    const storedNonce = nonceStore.get(sessionId);
    if (!storedNonce || storedNonce !== nonce) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }

    // Construct the message that was signed
    const message = `Login nonce: ${nonce}`;

    // Recover the address from the signature
    const signerAddr = ethers.utils.verifyMessage(message, signature);

    // Compare addresses (case-insensitive)
    if (signerAddr.toLowerCase() === address.toLowerCase()) {
      // Clear the nonce after successful verification
      nonceStore.delete(sessionId);
      
      res.json({ 
        success: true, 
        address: signerAddr,
        message: 'Authentication successful'
      });
    } else {
      res.status(401).json({ 
        error: 'Invalid signature',
        expected: signerAddr,
        received: address
      });
    }
  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(400).json({ error: 'Verification failed' });
  }
});

export default router;
