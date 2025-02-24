#!/usr/bin/env node

import { Command } from 'commander';
import { enrichCompany } from '../lib/enrichment';
import { prisma } from '../lib/prisma';

// Create a new command
const program = new Command();

program
  .name('enrich')
  .description('Enrich company data by domain')
  .argument('<domain>', 'Domain of the company to enrich (e.g., tesla.com)')
  .action(async (domain: string) => {
    try {
      console.log(`Enriching company data for domain: ${domain}`);
      
      // Check if the company exists in the database
      const existingCompany = await prisma.company.findUnique({
        where: { domain }
      });
      
      if (!existingCompany) {
        // Create a new company record if it doesn't exist
        console.log(`Company with domain ${domain} not found. Creating new record...`);
        await prisma.company.create({
          data: {
            domain,
            createdAt: new Date()
          }
        });
        console.log(`Created new company record for ${domain}`);
      }
      
      // Perform enrichment
      console.log('Starting enrichment process...');
      const result = await enrichCompany(domain);
      
      if (result.success) {
        // Check if this was a "not found" success case
        if (result.error && result.error.includes('not found')) {
          console.log(`✅ Processed: ${result.error}`);
        } else {
          console.log('✅ Enrichment successful!');
        }
      } else {
        console.error('❌ Enrichment failed:', result.error);
      }
    } catch (error) {
      console.error('Error during enrichment:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      // Close the Prisma client connection
      await prisma.$disconnect();
    }
  });

// Parse command line arguments
program.parse(process.argv);
