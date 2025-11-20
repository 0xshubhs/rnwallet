import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { sessionStore, Session } from '../sessionStore';

const router = Router();

// Legacy nonce store for backward compatibility
const nonceStore: Map<string, string> = new Map();

/**
 * POST /api/session/new
 * Create a new session with a nonce for wallet authentication
 */
router.post('/session/new', async (req: Request, res: Response) => {
  console.log('\n📝 [SESSION] Creating new session...');
  try {
    const sessionId = '0x' + ethers.utils.randomBytes(8).reduce((str, byte) => 
      str + byte.toString(16).padStart(2, '0'), '');
    const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(16));
    
    // Store session
    await sessionStore.set(sessionId, { nonce });
    
    console.log(`✅ [SESSION] Session created successfully`);
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  Nonce: ${nonce}`);
    console.log(`  Active sessions: ${await sessionStore.size()}`);
    console.log(`[DEBUG] All session IDs:`, await sessionStore.keys());
    
    res.json({ sessionId, nonce });
  } catch (error) {
    console.error('❌ [SESSION] Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/session/:sessionId
 * Get session information by session ID
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  console.log('\n🔍 [SESSION] Getting session info...');
  try {
    const { sessionId } = req.params;
    const session = await sessionStore.get(sessionId);
    
    if (!session) {
      console.log('❌ [SESSION] Session not found:', sessionId);
      return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log(`✅ [SESSION] Found session: ${sessionId}`);
    console.log(`  Connected: ${!!session.connected}`);
    console.log(`  Address: ${session.address || 'none'}`);
    
    res.json({ 
      sessionId, 
      nonce: session.nonce,
      connected: session.connected || false,
      address: session.address 
    });
  } catch (error) {
    console.error('❌ [SESSION] Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * GET /api/nonce
 * Generate a unique nonce for login authentication (legacy support)
 * DEPRECATED: Use POST /api/session/new instead
 */
router.get('/nonce', async (req: Request, res: Response) => {
  console.log('\n📝 [AUTH] Generating nonce (legacy endpoint)...');
  try {
    const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(16));
    const sessionId = '0x' + ethers.utils.randomBytes(8).reduce((str, byte) => 
      str + byte.toString(16).padStart(2, '0'), '');
    
    // Store in persistent session store
    await sessionStore.set(sessionId, { nonce });
    
    console.log(`✅ [AUTH] Nonce generated successfully`);
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  Nonce: ${nonce}`);
    console.log(`  Active sessions: ${await sessionStore.size()}`);
    
    res.json({ nonce, sessionId });
  } catch (error) {
    console.error('❌ [AUTH] Error generating nonce:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

/**
 * POST /api/verify
 * Verify the signature and authenticate the user
 * Body: { address: string, signature: string, nonce: string, sessionId: string }
 */
router.post('/verify', async (req: Request, res: Response) => {
  console.log('\n🔐 [AUTH] Verifying signature...');
  try {
    const { address, signature, nonce, sessionId } = req.body;
    console.log(`  Address: ${address}`);
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  Nonce: ${nonce}`);
    console.log(`  Signature: ${signature?.substring(0, 20)}...`);

    // Validate input
    if (!address || !signature) {
      console.log('❌ [AUTH] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Require sessionId for new flow
    const hasSession = await sessionStore.has(sessionId);
    if (!sessionId || !hasSession) {
      console.warn('⚠️ [AUTH] Invalid or missing sessionId');
      console.log(`[DEBUG] Looking up session: ${sessionId}`);
      console.log(`[DEBUG] Session store has:`, await sessionStore.keys());
      return res.status(400).json({ success: false, error: 'Invalid session' });
    }

    const session = await sessionStore.get(sessionId);
    if (!session) {
      return res.status(400).json({ success: false, error: 'Session not found' });
    }
    
    const storedNonce = session.nonce;
    
    console.log(`  Stored nonce: ${storedNonce}`);
    console.log(`  Session found in store: ✅`);
    
    if (!storedNonce || (nonce && storedNonce !== nonce)) {
      console.log('❌ [AUTH] Invalid or expired nonce');
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }

    // Construct the message that was signed
    const message = `Login nonce: ${storedNonce}`;
    console.log(`  Message to verify: "${message}"`);

    // Recover the address from the signature
    const signerAddr = ethers.utils.verifyMessage(message, signature);
    console.log(`  Recovered signer: ${signerAddr}`);
    console.log(`  Expected address: ${address}`);

    // Compare addresses (case-insensitive)
    if (signerAddr.toLowerCase() === address.toLowerCase()) {
      // Update session status
      session.connected = true;
      session.address = signerAddr;
      await sessionStore.set(sessionId, session);
      
      // Emit socket event to notify React Native client
      const io = req.app.get('io');
      if (io) {
        console.log(`📤 [SOCKET] Emitting session:connected to room: ${sessionId}`);
        
        // Get room info for debugging
        io.in(sessionId).allSockets().then((sockets: Set<string>) => {
          console.log(`📣 [SOCKET] Emitting to ${sockets.size} clients in session ${sessionId}`);
          console.log(`  Socket IDs in room:`, Array.from(sockets));
        });
        
        io.to(sessionId).emit('session:connected', { 
          sessionId, 
          address: signerAddr 
        });
        console.log(`✅ [SOCKET] Event 'session:connected' emitted successfully`);
      } else {
        console.log('⚠️ [SOCKET] Socket.IO instance not found!');
      }
      
      console.log('✅ [AUTH] Authentication successful');
      console.log(`  Active sessions: ${await sessionStore.size()}`);
      
      // Check if client wants HTML redirect response (for direct navigation)
      const acceptHeader = req.get('Accept') || '';
      if (acceptHeader.includes('text/html')) {
        // Return HTML page with deep link redirect
        const returnUri = `myapp://connected?sid=${encodeURIComponent(sessionId)}`;
        res.set('Content-Type', 'text/html');
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta http-equiv="refresh" content="0; url=${returnUri}" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Returning to App...</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 20px;
                  text-align: center;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                h2 { color: #28a745; margin-bottom: 20px; }
                p { color: #666; margin-bottom: 20px; }
                a {
                  display: inline-block;
                  padding: 16px 32px;
                  background: #4CAF50;
                  color: white;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>✅ Authentication Successful!</h2>
                <p>Returning to app...</p>
                <p>If you're not redirected automatically, tap the button below:</p>
                <a href="${returnUri}">Return to App</a>
              </div>
              <script>
                // Attempt redirect via JavaScript as well
                setTimeout(() => {
                  window.location.href = '${returnUri}';
                }, 100);
              </script>
            </body>
          </html>
        `);
      }
      
      // Default JSON response
      res.json({ 
        success: true, 
        address: signerAddr,
        message: 'Authentication successful'
      });
    } else {
      console.log('❌ [AUTH] Signature verification failed');
      console.log(`  Address mismatch: expected ${signerAddr}, received ${address}`);
      res.status(401).json({ 
        error: 'Invalid signature',
        expected: signerAddr,
        received: address
      });
    }
  } catch (error) {
    console.error('❌ [AUTH] Error verifying signature:', error);
    res.status(400).json({ error: 'Verification failed' });
  }
});

export default router;
