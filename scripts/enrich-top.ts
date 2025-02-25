#!/usr/bin/env node

import { Command } from 'commander';
import { enrichCompany } from '../lib/enrichment';
import { prisma } from '../lib/prisma';
import { getCompanies } from '../lib/companies';

// Create a new command
const program = new Command();

program
  .name('enrich-top')
  .description('Enrich top N companies by sales that have not been enriched yet')
  .argument('<count>', 'Number of top companies to enrich')
  .action(async (countArg: string) => {
    try {
      const count = parseInt(countArg, 10);
      if (isNaN(count) || count <= 0) {
        console.error('Error: Count must be a positive number');
        process.exit(1);
      }

      console.log(`Finding top ${count} unenriched companies by sales...`);
      
      // Get top companies by sales
      const { companies } = await getCompanies({
        pageSize: 10000, // Get a larger set to filter from
        sortColumn: 'totalOrders',
        sortDirection: 'desc',
        filterConsumer: true
      });
      
      // Filter to only include unenriched companies
      const unenrichedCompanies = companies
        .filter(company => !company.enriched)
        .slice(0, count);
      
      if (unenrichedCompanies.length === 0) {
        console.log('No unenriched companies found.');
        return;
      }
      
      console.log(`Found ${unenrichedCompanies.length} unenriched companies to process.`);
      
      // Track detailed counts
      let successCount = 0;
      let notFoundCount = 0;
      let failureCount = 0;
      
      // Process each company
      for (const [index, company] of unenrichedCompanies.entries()) {
        console.log(`[${index + 1}/${unenrichedCompanies.length}] Enriching ${company.domain}...`);
        
        const result = await enrichCompany(company.domain);
        
        if (result.success) {
          // Check if this was a "not found" success case
          if (result.error && result.error.includes('not found')) {
            console.log(`  ✅ Processed: ${company.domain} - ${result.error}`);
            notFoundCount++;
          } else {
            console.log(`  ✅ Success: ${company.domain}`);
            successCount++;
          }
        } else {
          console.log(`  ❌ Failed: ${company.domain} - ${result.error}`);
          failureCount++;
        }
      }
      
      // Print summary
      console.log('\n--- Enrichment Summary ---');
      console.log(`Total processed: ${unenrichedCompanies.length}`);
      console.log(`Successful: ${successCount}`);
      console.log(`Not found (processed): ${notFoundCount}`);
      console.log(`Failed: ${failureCount}`);
      console.log(`Total completed: ${successCount + notFoundCount} (${((successCount + notFoundCount) / unenrichedCompanies.length * 100).toFixed(1)}%)`);
      
    } catch (error) {
      console.error('Error during enrichment process:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      // Close the Prisma client connection
      await prisma.$disconnect();
    }
  });

// Parse command line arguments
program.parse(process.argv);
