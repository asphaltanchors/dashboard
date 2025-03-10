import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting price history initialization...')

  // Get all products
  const products = await prisma.product.findMany()
  console.log(`Found ${products.length} products to initialize price history for`)

  // Get current date for the initial history records
  const now = new Date()

  // Create initial price history records for each product
  for (const product of products) {
    // Skip products that don't have cost or listPrice set
    if (product.cost === null && product.listPrice === null) {
      console.log(`Skipping ${product.productCode} - no pricing data available`)
      continue
    }

    // Create a price history record with current values
    await prisma.productPriceHistory.create({
      data: {
        productId: product.id,
        cost: product.cost || 0, // Default to 0 if null
        listPrice: product.listPrice || 0, // Default to 0 if null
        effectiveDate: now,
        notes: 'Initial price history record',
      },
    })

    console.log(`Created initial price history for ${product.productCode}`)
  }

  console.log('Price history initialization completed successfully')
}

main()
  .catch((e) => {
    console.error('Error initializing price history:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
