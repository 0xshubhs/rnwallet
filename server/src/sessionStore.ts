import Redis from 'ioredis';

interface Session {
  nonce: string;
  connected?: boolean;
  address?: string;
}

class SessionStore {
  private redis: Redis | null = null;
  private memoryStore: Map<string, Session> = new Map();
  private useRedis: boolean = false;
  private SESSION_TTL = 3600; // 1 hour in seconds

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      // Try to connect to Redis
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.log('⚠️ [REDIS] Failed to connect, falling back to in-memory store');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false
      });

      // Handle errors to prevent unhandled error events
      this.redis.on('error', (err) => {
        // Silently ignore connection errors during initialization
        if (!this.useRedis) {
          return;
        }
        console.error('❌ [REDIS] Connection error:', err.message);
      });

      await this.redis.connect();
      this.useRedis = true;
      console.log('✅ [REDIS] Connected successfully - using Redis for session persistence');
    } catch (error) {
      console.log('⚠️ [REDIS] Not available, using in-memory store (sessions will be lost on restart)');
      if (this.redis) {
        this.redis.disconnect();
      }
      this.redis = null;
      this.useRedis = false;
    }
  }

  async set(sessionId: string, session: Session): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(
          `session:${sessionId}`,
          this.SESSION_TTL,
          JSON.stringify(session)
        );
        return;
      } catch (error) {
        console.error('❌ [REDIS] Error setting session, falling back to memory:', error);
        this.useRedis = false;
      }
    }
    
    // Fallback to memory
    this.memoryStore.set(sessionId, session);
  }

  async get(sessionId: string): Promise<Session | undefined> {
    if (this.useRedis && this.redis) {
      try {
        const data = await this.redis.get(`session:${sessionId}`);
        if (data) {
          return JSON.parse(data);
        }
        return undefined;
      } catch (error) {
        console.error('❌ [REDIS] Error getting session, falling back to memory:', error);
        this.useRedis = false;
      }
    }
    
    // Fallback to memory
    return this.memoryStore.get(sessionId);
  }

  async has(sessionId: string): Promise<boolean> {
    if (this.useRedis && this.redis) {
      try {
        const exists = await this.redis.exists(`session:${sessionId}`);
        return exists === 1;
      } catch (error) {
        console.error('❌ [REDIS] Error checking session, falling back to memory:', error);
        this.useRedis = false;
      }
    }
    
    // Fallback to memory
    return this.memoryStore.has(sessionId);
  }

  async delete(sessionId: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(`session:${sessionId}`);
        return;
      } catch (error) {
        console.error('❌ [REDIS] Error deleting session, falling back to memory:', error);
        this.useRedis = false;
      }
    }
    
    // Fallback to memory
    this.memoryStore.delete(sessionId);
  }

  async size(): Promise<number> {
    if (this.useRedis && this.redis) {
      try {
        const keys = await this.redis.keys('session:*');
        return keys.length;
      } catch (error) {
        console.error('❌ [REDIS] Error getting size, falling back to memory:', error);
        this.useRedis = false;
      }
    }
    
    // Fallback to memory
    return this.memoryStore.size;
  }

  async keys(): Promise<string[]> {
    if (this.useRedis && this.redis) {
      try {
        const keys = await this.redis.keys('session:*');
        return keys.map((key: string) => key.replace('session:', ''));
      } catch (error) {
        console.error('❌ [REDIS] Error getting keys, falling back to memory:', error);
        this.useRedis = false;
      }
    }
    
    // Fallback to memory
    return Array.from(this.memoryStore.keys());
  }

  isUsingRedis(): boolean {
    return this.useRedis;
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Singleton instance
export const sessionStore = new SessionStore();
export type { Session };
