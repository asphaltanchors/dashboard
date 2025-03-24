import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if we're in a production environment
const connectionString = process.env.DATABASE_URL!;

// Create a postgres connection
const client = postgres(connectionString);

// Create a drizzle instance
export const db = drizzle(client, { schema });
