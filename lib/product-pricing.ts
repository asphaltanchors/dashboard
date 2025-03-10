import { prisma } from './prisma'

/**
 * Updates a product's cost and/or list price and creates a historical record
 * 
 * @param productId The ID of the product to update
 * @param data Object containing cost and/or listPrice to update
 * @param notes Optional notes about the price change
 * @returns The updated product
 */
export async function updateProductPricing(
  productId: string,
  data: { cost?: number | null; listPrice?: number | null },
  notes?: string
) {
  // Start a transaction to ensure both the product update and history creation succeed or fail together
  return await prisma.$transaction(async (tx) => {
    // Update the product with new pricing
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.listPrice !== undefined && { listPrice: data.listPrice }),
      },
    })

    // Only create history record if either cost or listPrice is being updated
    if (data.cost !== undefined || data.listPrice !== undefined) {
      // Get current values for any fields not being updated
      const currentCost = data.cost !== undefined ? data.cost : updatedProduct.cost
      const currentListPrice = data.listPrice !== undefined ? data.listPrice : updatedProduct.listPrice

      // Create a price history record
      await tx.productPriceHistory.create({
        data: {
          productId,
          cost: currentCost || 0, // Default to 0 if null
          listPrice: currentListPrice || 0, // Default to 0 if null
          effectiveDate: new Date(),
          notes,
        },
      })
    }

    return updatedProduct
  })
}

/**
 * Gets the product pricing that was effective at a specific date
 * Useful for historical margin calculations
 * 
 * @param productId The ID of the product
 * @param date The date to get pricing for (defaults to current date)
 * @returns The pricing effective at the specified date
 */
export async function getProductPricingAtDate(
  productId: string,
  date: Date = new Date()
) {
  // Find the most recent price history record before or equal to the given date
  const priceHistory = await prisma.productPriceHistory.findFirst({
    where: {
      productId,
      effectiveDate: {
        lte: date,
      },
    },
    orderBy: {
      effectiveDate: 'desc',
    },
  })

  if (priceHistory) {
    return {
      cost: priceHistory.cost,
      listPrice: priceHistory.listPrice,
      effectiveDate: priceHistory.effectiveDate,
    }
  }

  // If no historical price found, return the current product pricing
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { cost: true, listPrice: true },
  })

  return {
    cost: product?.cost || null,
    listPrice: product?.listPrice || null,
    effectiveDate: null, // No historical record found
  }
}

/**
 * Gets the complete price history for a product
 * 
 * @param productId The ID of the product
 * @returns Array of price history records, sorted by date (newest first)
 */
export async function getProductPriceHistory(productId: string) {
  return await prisma.productPriceHistory.findMany({
    where: { productId },
    orderBy: { effectiveDate: 'desc' },
  })
}
