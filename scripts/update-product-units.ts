import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting product units update...')

  // Get all products
  const products = await prisma.product.findMany()
  console.log(`Found ${products.length} products to update`)

  // Update each product with the appropriate unitsPerPackage value
  for (const product of products) {
    let unitsPerPackage = 6 // Default value
    
    // Apply the same logic from the reports queries
    if (
      product.productCode === '01-7011.PST' ||
      product.productCode === '01-7014' ||
      product.productCode === '01-7014-FBA' ||
      product.productCode === '01-7010-FBA' ||
      product.productCode === '01-7010' ||
      product.productCode === '01-7013'
    ) {
      unitsPerPackage = 4
    } else if (product.productCode === '01-6310.72L') {
      unitsPerPackage = 72
    } else if (product.productCode.startsWith('01-')) {
      // All other products with 01- prefix default to 6
      unitsPerPackage = 6
    } else {
      // For any other products, default to 1 (each)
      unitsPerPackage = 1
    }

    // Update the product
    await prisma.product.update({
      where: { id: product.id },
      data: { unitsPerPackage }
    })

    console.log(`Updated ${product.productCode} with unitsPerPackage = ${unitsPerPackage}`)
  }

  console.log('Product units update completed successfully')
}

main()
  .catch((e) => {
    console.error('Error updating product units:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
