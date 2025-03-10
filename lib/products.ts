import { prisma } from "./prisma"

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
  const where = searchTerm ? {
    OR: [
      { productCode: { contains: searchTerm, mode: 'insensitive' as const } },
      { name: { contains: searchTerm, mode: 'insensitive' as const } },
      { description: { contains: searchTerm, mode: 'insensitive' as const } }
    ]
  } : {}

  // Build order by object
  let orderBy: Record<string, 'asc' | 'desc'> = {}
  if (sortColumn === 'productCode') {
    orderBy = { productCode: sortDirection }
  } else if (sortColumn === 'name') {
    orderBy = { name: sortDirection }
  } else if (sortColumn === 'unitsPerPackage') {
    orderBy = { unitsPerPackage: sortDirection }
  } else if (sortColumn === 'cost') {
    orderBy = { cost: sortDirection }
  } else if (sortColumn === 'listPrice') {
    orderBy = { listPrice: sortDirection }
  } else if (sortColumn === 'createdAt') {
    orderBy = { createdAt: sortDirection }
  }

  const [products, totalCount] = await Promise.all([
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

  return {
    products,
    totalCount
  }
}

export type Product = Awaited<ReturnType<typeof getProducts>>['products'][number]
