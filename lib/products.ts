import { prisma } from "./prisma"
import { Prisma } from "@prisma/client"

interface GetProductsParams {
  page?: number
  pageSize?: number
  searchTerm?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

export async function getProducts({
  page = 1,
  pageSize = 10,
  searchTerm = '',
  sortColumn = 'productCode',
  sortDirection = 'asc'
}: GetProductsParams = {}) {
  // Calculate pagination
  const skip = (page - 1) * pageSize

  // Build where clause for search
  const where = {
    // Only include products with at least one order item
    orderItems: {
      some: {}
    },
    // Exclude specific product codes
    NOT: {
      productCode: {
        in: ['SUBTOTAL', 'NAN', 'SURCHARGE', 'REFURBISH']
      }
    },
    // Add search conditions if a search term is provided
    ...(searchTerm ? {
      OR: [
        { productCode: { contains: searchTerm, mode: 'insensitive' as const } },
        { name: { contains: searchTerm, mode: 'insensitive' as const } },
        { description: { contains: searchTerm, mode: 'insensitive' as const } }
      ]
    } : {})
  }

  // Build order by object
  let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = {}
  if (sortColumn === 'productCode') {
    orderBy = { productCode: sortDirection }
  } else if (sortColumn === 'name') {
    orderBy = { name: sortDirection }
  } else if (sortColumn === 'unitsPerPackage') {
    orderBy = { unitsPerPackage: sortDirection }
  } else if (sortColumn === 'cost') {
    // Handle null values for cost - place them at the end
    orderBy = [
      { cost: { sort: sortDirection, nulls: 'last' } }
    ]
  } else if (sortColumn === 'listPrice') {
    // Handle null values for listPrice - place them at the end
    orderBy = [
      { listPrice: { sort: sortDirection, nulls: 'last' } }
    ]
  } else if (sortColumn === 'createdAt') {
    orderBy = { createdAt: sortDirection }
  }

  const [productsRaw, totalCount] = await Promise.all([
    prisma.product.findMany({
      skip,
      take: pageSize,
      where,
      orderBy,
      select: {
        id: true,
        productCode: true,
        name: true,
        description: true,
        unitsPerPackage: true,
        cost: true,
        listPrice: true,
        createdAt: true,
        modifiedAt: true,
        _count: {
          select: {
            orderItems: true,
            priceHistory: true
          }
        }
      },
    }),
    prisma.product.count({
      where
    })
  ])

  // Convert Decimal objects to numbers to avoid "Decimal objects are not supported" error
  // when passing from Server Components to Client Components
  const products = productsRaw.map(product => ({
    ...product,
    cost: product.cost ? Number(product.cost) : null,
    listPrice: product.listPrice ? Number(product.listPrice) : null
  }))

  return {
    products,
    totalCount
  }
}

export type Product = Awaited<ReturnType<typeof getProducts>>['products'][number]
