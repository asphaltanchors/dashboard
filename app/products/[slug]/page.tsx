import { notFound } from 'next/navigation';
import { getProductByName, getProductInventoryStatus, getProductInventoryTrend, getProductMonthlyRevenue, getProductPriceDistribution } from '@/lib/queries';
import { getTopCompaniesForProduct } from '@/lib/queries/companies';
import { parseFilters, type ProductDetailFilters } from '@/lib/filter-utils';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { InventoryStatus } from '@/components/inventory/inventory-status';
import { InventoryTrendChart } from '@/components/inventory/inventory-trend-chart';
import { ProductSalesChart } from '@/components/dashboard/ProductSalesChart';
import { TopCompaniesTable } from '@/components/dashboard/TopCompaniesTable';
import { ProductPriceDistributionChart } from '@/components/dashboard/ProductPriceDistributionChart';
import { Suspense } from 'react';

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Sales trend component
async function ProductSalesSection({ productName, filters }: { productName: string; filters?: ProductDetailFilters }) {
  const salesData = await getProductMonthlyRevenue(productName, filters);
  return <ProductSalesChart data={salesData} />;
}

// Top companies component
async function ProductTopCompaniesSection({ productName, filters }: { productName: string; filters?: ProductDetailFilters }) {
  const topCompanies = await getTopCompaniesForProduct(productName, 10, filters);
  return <TopCompaniesTable data={topCompanies} productName={productName} />;
}

// Price distribution component
async function ProductPriceDistributionSection({ productName, filters }: { productName: string; filters?: ProductDetailFilters }) {
  const priceDistribution = await getProductPriceDistribution(productName, filters);
  return <ProductPriceDistributionChart data={priceDistribution} />;
}

// Inventory components
async function ProductInventorySection({ productName }: { productName: string }) {
  const [inventoryStatus, inventoryTrend] = await Promise.all([
    getProductInventoryStatus(productName),
    getProductInventoryTrend(productName)
  ]);

  if (!inventoryStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No inventory data available for this product
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <InventoryStatus inventory={inventoryStatus} />
      <InventoryTrendChart data={inventoryTrend} />
    </div>
  );
}

function SalesChartLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

function TopCompaniesLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PriceDistributionLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-5 bg-gray-200 rounded w-20 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
        <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

function InventoryLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ProductDetailPage({ params, searchParams }: ProductDetailPageProps) {
  const { slug } = await params;
  const productName = decodeURIComponent(slug);
  const product = await getProductByName(productName);
  
  if (!product) {
    notFound();
  }

  // Parse filters from URL parameters
  const searchParamsObj = await searchParams;
  const filters = parseFilters<ProductDetailFilters>(searchParamsObj);
  
  // Default to 1 year period if no period specified
  if (!filters.period) {
    filters.period = '1y';
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/products">Products</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product.itemName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto px-4">
          <PeriodSelector currentPeriod={filters.period || '1y'} filters={filters as Record<string, string | number | boolean | undefined>} />
        </div>
      </header>
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6 min-w-0">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{product.itemName}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{product.productFamily}</Badge>
              <Badge variant="outline">{product.itemType}</Badge>
              {product.isKit && (
                <Badge variant="secondary">Kit</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(product.salesPrice)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchase Cost</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(product.purchaseCost)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin %</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                Number(product.actualMarginPercentage || product.marginPercentage) >= 30
                  ? 'text-green-600'
                  : Number(product.actualMarginPercentage || product.marginPercentage) >= 15
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}>
                {product.actualMarginPercentage || product.marginPercentage}%
              </div>
              {product.actualMarginPercentage && (
                <div className="text-xs text-muted-foreground">
                  Actual margin (catalog: {product.marginPercentage}%)
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(product.actualMarginAmount || product.marginAmount)}
              </div>
              {product.actualMarginAmount && (
                <div className="text-xs text-muted-foreground">
                  Per unit actual (catalog: {formatCurrency(product.marginAmount)})
                </div>
              )}
              {product.discountPercentage && Number(product.discountPercentage) > 0 && (
                <div className="text-xs text-orange-600">
                  {Number(product.discountPercentage).toFixed(0)}% discount from catalog
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium">QuickBooks ID</h4>
                <p className="text-sm text-muted-foreground font-mono">{product.quickBooksInternalId}</p>
              </div>
              <div>
                <h4 className="font-medium">Material Type</h4>
                <p className="text-sm text-muted-foreground">{product.materialType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Suspense fallback={<SalesChartLoadingSkeleton />}>
          <ProductSalesSection productName={productName} filters={filters} />
        </Suspense>

        <Suspense fallback={<TopCompaniesLoadingSkeleton />}>
          <ProductTopCompaniesSection productName={productName} filters={filters} />
        </Suspense>

        <Suspense fallback={<PriceDistributionLoadingSkeleton />}>
          <ProductPriceDistributionSection productName={productName} filters={filters} />
        </Suspense>

        <Suspense fallback={<InventoryLoadingSkeleton />}>
          <ProductInventorySection productName={productName} />
        </Suspense>
      </div>
    </>
  );
}