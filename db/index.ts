import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if we're in a production environment
const connectionString = process.env.DATABASE_URL!;

// Configure connection pooling
const client = postgres(connectionString, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Max seconds a client can be idle before being removed
  connect_timeout: 10, // Max seconds to wait for a connection
});

// Create a drizzle instance
export const db = drizzle(client, { schema });
