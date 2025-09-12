/**
 * GelDB Client - Direct EdgeQL Access
 * Bypasses GraphQL due to cfg::AbstractConfig bug in GraphQL extension
 */

import { createClient } from 'edgedb';
import type { Client } from 'edgedb';
import { GEL_DSN } from '$env/static/private';

class GelDBClient {
  private client: Client | null = null;

  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = createClient({
        dsn: GEL_DSN,
      });
    }
    return this.client;
  }

  /**
   * Execute an EdgeQL query
   */
  async query<T = any>(query: string, args?: Record<string, any>): Promise<T> {
    const client = await this.getClient();
    return client.query(query, args);
  }

  /**
   * Execute a single EdgeQL query that returns one result
   */
  async querySingle<T = any>(query: string, args?: Record<string, any>): Promise<T | null> {
    const client = await this.getClient();
    return client.querySingle(query, args);
  }

  /**
   * Execute an EdgeQL query in a transaction
   */
  async transaction<T>(
    action: (tx: any) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    return client.transaction(action);
  }

  /**
   * Close the client connection
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}

// Export singleton instance
export const geldb = new GelDBClient();

// Export types for convenience
export type { Client as GelDBClientType };