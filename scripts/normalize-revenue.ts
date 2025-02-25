#!/usr/bin/env node

import { Command } from 'commander';
import { prisma } from '../lib/prisma';
import { extractAndNormalizeRevenue } from '../lib/enrichment';
import { Prisma } from '@prisma/client';

// Create a new command
const program = new Command();

program
  .name('normalize-revenue')
  .description('Update existing enriched companies with normalized revenue data')
  .option('-d, --domain <domain>', 'Process a specific domain only')
  .option('-l, --limit <number>', 'Limit the number of companies to process', parseInt)
  .option('-f, --force', 'Force re-normalization even if already normalized')
  .action(async (options) => {
    try {
      // Build the query
      const whereClause: Prisma.CompanyWhereInput = {
        enriched: true,
        enrichmentData: {
          not: Prisma.JsonNull
        }
      };
      
      // Add domain filter if provided
      if (options.domain) {
        whereClause.domain = options.domain;
      }
      
      // Get enriched companies
      const companies = await prisma.company.findMany({
        where: whereClause,
        take: options.limit
      });
      
      console.log(`Found ${companies.length} enriched companies to process`);
      
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      
      // Process each company
      for (const [index, company] of companies.entries()) {
        if (!company.enrichmentData) {
          skipped++;
          continue;
        }
        
        // Skip if already normalized and not forcing re-normalization
        if ((company.enrichmentData as any).normalized_revenue && !options.force) {
          console.log(`[${index + 1}/${companies.length}] Skipping ${company.domain} - already normalized`);
          skipped++;
          continue;
        }
        
        try {
          console.log(`[${index + 1}/${companies.length}] Processing ${company.domain}...`);
          
          // Extract and normalize revenue
          // Add domain to the enrichment data for better logging
          const enrichmentDataWithDomain = {
            ...(company.enrichmentData as Record<string, unknown>),
            domain: company.domain
          };
          const normalizedRevenue = extractAndNormalizeRevenue(enrichmentDataWithDomain);
          
          if (normalizedRevenue) {
            // Update the company with normalized revenue
            const enrichmentData = {
              ...(company.enrichmentData as Record<string, unknown>),
              normalized_revenue: normalizedRevenue
            };
            
            await prisma.company.update({
              where: { id: company.id },
              data: {
                enrichmentData: enrichmentData as unknown as Prisma.InputJsonValue
              }
            });
            
            console.log(`  ✅ Updated ${company.domain} with normalized revenue: ${normalizedRevenue.range || 'N/A'}`);
            updated++;
          } else {
            console.log(`  ⚠️ No revenue data found for ${company.domain}`);
            skipped++;
          }
        } catch (error) {
          console.error(`  ❌ Error processing ${company.domain}:`, error);
          failed++;
        }
      }
      
      // Print summary
      console.log('\n--- Normalization Summary ---');
      console.log(`Total processed: ${companies.length}`);
      console.log(`Updated: ${updated}`);
      console.log(`Skipped: ${skipped}`);
      console.log(`Failed: ${failed}`);
      
    } catch (error) {
      console.error('Error during normalization process:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      // Close the Prisma client connection
      await prisma.$disconnect();
    }
  });

// Parse command line arguments
program.parse(process.argv);
