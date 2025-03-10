import { ProductsTable } from "@/components/products/products-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { getProducts } from "@/lib/products"
import { Package, PackageCheck } from "lucide-react"
import { prisma } from "@/lib/prisma"

export default async function ProductsPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1
  const search = (searchParams.search as string) || ""
  const sort = (searchParams.sort as string) || "productCode"
  const dir = (searchParams.dir as "asc" | "desc") || "asc"

  const data = await getProducts({
    page,
    pageSize: 10,
    searchTerm: search,
    sortColumn: sort,
    sortDirection: dir,
  })

  // Get total count of products and count of products with price history
  const [totalCount, productsWithPriceHistory] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({
      where: {
        priceHistory: {
          some: {}
        }
      }
    })
  ])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Products</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Products"
          value={totalCount}
          change=""
          icon={Package}
        />
        <MetricCard
          title="Products with Price History"
          value={productsWithPriceHistory}
          change={(productsWithPriceHistory / totalCount * 100).toFixed(1)}
          icon={PackageCheck}
        />
      </div>
      <div className="mt-4">
        <ProductsTable initialProducts={data} />
      </div>
    </div>
  )
}
