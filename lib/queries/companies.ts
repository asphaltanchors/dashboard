// ABOUTME: Company analysis and customer relationship management queries
// ABOUTME: Handles company listings, detailed company profiles, and advanced company analytics
import { db, fctCompaniesInAnalyticsMart, bridgeCustomerCompanyInAnalyticsMart, fctCompanyOrdersInAnalyticsMart, fctCompanyProductsInAnalyticsMart, dimCompanyHealthInAnalyticsMart, fctCompanyOrdersTimeSeriesInAnalyticsMart, martProductCompanyPeriodSpendingInAnalyticsMart, martCompanyPeriodMetricsInAnalyticsMart } from '@/lib/db';
import { desc, asc, sql, count } from 'drizzle-orm';
import { ProductDetailFilters } from '@/lib/filter-utils';

export interface TopCompany {
  companyDomainKey: string;
  companyName: string;
  domainType: string;
  businessSizeCategory: string;
  revenueCategory: string;
  totalRevenue: string;
  totalOrders: string;
  customerCount: number;
  firstOrderDate: string;
  latestOrderDate: string;
}

export interface CompanyWithHealth {
  companyDomainKey: string;
  companyName: string;
  domainType: string;
  businessSizeCategory: string;
  revenueCategory: string;
  totalRevenue: string;
  totalOrders: string;
  customerCount: number;
  firstOrderDate: string;
  latestOrderDate: string;
  healthScore: string;
  activityStatus: string;
  healthCategory: string;
  growthTrendDirection: string;
  daysSinceLastOrder: number;
  atRiskFlag: boolean;
  growthOpportunityFlag: boolean;
  primaryCountry: string;
}

export interface CompanyDetail {
  companyDomainKey: string;
  companyName: string;
  domainType: string;
  businessSizeCategory: string;
  revenueCategory: string;
  totalRevenue: string;
  totalOrders: string;
  customerCount: number;
  firstOrderDate: string;
  latestOrderDate: string;
  primaryEmail: string;
  primaryPhone: string;
  primaryBillingAddressLine1: string;
  primaryBillingCity: string;
  primaryBillingState: string;
  primaryBillingPostalCode: string;
  primaryCountry: string;
  region: string;
  healthScore: string;
  customerArchetype: string;
  activityStatus: string;
  engagementLevel: string;
  growthTrendDirection: string;
  healthCategory: string;
  atRiskFlag: boolean;
  growthOpportunityFlag: boolean;
  ordersLast90Days: number;
  revenueLast90Days: string;
  revenuePercentile: number;
  daysSinceLastOrder: number;
  // Enrichment data
  enrichedIndustry: string;
  enrichedEmployeeCount: number;
  enrichedAnnualRevenue: number;
  enrichedDescription: string;
  enrichedFoundedYear: number;
  enrichmentSource: string;
  enrichmentDate: string;
}

export interface CompanyCustomer {
  customerId: string;
  customerName: string;
  customerTotalRevenue: string;
  customerTotalOrders: string;
  customerValueTier: string;
  customerActivityStatus: string;
  billingAddressCity: string;
  billingAddressState: string;
  salesRep: string;
  isIndividualCustomer: boolean;
}

export interface CompanyOrder {
  orderNumber: string;
  orderDate: string;
  calculatedOrderTotal: string;
  lineItemCount: number;
  uniqueProducts: number;
  orderType: string;
  recencyCategory: string;
  orderSizeCategory: string;
  daysSinceOrder: number;
}

export interface CompanyProduct {
  productService: string;
  productServiceDescription: string;
  productFamily: string;
  materialType: string;
  totalTransactions: number;
  totalQuantityPurchased: string;
  totalAmountSpent: string;
  avgUnitPrice: string;
  buyerStatus: string;
  purchaseVolumeCategory: string;
  daysSinceLastPurchase: number;
}

export interface CompanyHealthBasic {
  daysSinceLastOrder: number;
  activityStatus: string;
  totalOrders: number;
  orderFrequency: string;
  avgOrderValue: string;
}

export interface CompanyTimeSeriesQuarter {
  quarterLabel: string;
  orderYear: string;
  orderQuarter: string;
  totalRevenue: string;
  orderCount: number;
  avgOrderValue: string;
  yoyRevenueGrowthPct: string;
  yoyOrderGrowthPct: string;
  quarterlyRevenueTier: string;
  quarterlyActivityLevel: string;
  exceptionalGrowthFlag: boolean;
  concerningDeclineFlag: boolean;
  isCurrentQuarter: boolean;
}

export interface ProductTopCompany {
  companyDomainKey: string;
  companyName: string;
  totalAmountSpent: string;
  totalTransactions: number;
  totalQuantityPurchased: string;
  avgUnitPrice: string;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  buyerStatus: string;
  purchaseVolumeCategory: string;
}

export async function getAllCompanies(
  page: number = 1,
  pageSize: number = 50,
  searchTerm: string = '',
  sortBy: string = 'totalRevenue',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ companies: TopCompany[], totalCount: number }> {
  
  // Build WHERE clause for search
  let whereClause = sql`${fctCompaniesInAnalyticsMart.domainType} = 'corporate'`;
  
  if (searchTerm) {
    whereClause = sql`${whereClause} AND (
      LOWER(${fctCompaniesInAnalyticsMart.companyName}) LIKE LOWER(${'%' + searchTerm + '%'}) OR
      LOWER(${fctCompaniesInAnalyticsMart.companyDomainKey}) LIKE LOWER(${'%' + searchTerm + '%'})
    )`;
  }

  // Build ORDER BY clause
  const sortColumn = {
    'companyName': fctCompaniesInAnalyticsMart.companyName,
    'totalRevenue': fctCompaniesInAnalyticsMart.totalRevenue,
    'totalOrders': fctCompaniesInAnalyticsMart.totalOrders,
    'customerCount': fctCompaniesInAnalyticsMart.customerCount,
    'latestOrderDate': fctCompaniesInAnalyticsMart.latestOrderDate,
  }[sortBy] || fctCompaniesInAnalyticsMart.totalRevenue;

  const orderByClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Get total count
  const totalCountResult = await db
    .select({ count: count() })
    .from(fctCompaniesInAnalyticsMart)
    .where(whereClause);
  
  const totalCount = totalCountResult[0]?.count || 0;

  // Get paginated results
  const companies = await db
    .select({
      companyDomainKey: fctCompaniesInAnalyticsMart.companyDomainKey,
      companyName: fctCompaniesInAnalyticsMart.companyName,
      domainType: fctCompaniesInAnalyticsMart.domainType,
      businessSizeCategory: fctCompaniesInAnalyticsMart.businessSizeCategory,
      revenueCategory: fctCompaniesInAnalyticsMart.revenueCategory,
      totalRevenue: fctCompaniesInAnalyticsMart.totalRevenue,
      totalOrders: fctCompaniesInAnalyticsMart.totalOrders,
      customerCount: fctCompaniesInAnalyticsMart.customerCount,
      firstOrderDate: fctCompaniesInAnalyticsMart.firstOrderDate,
      latestOrderDate: fctCompaniesInAnalyticsMart.latestOrderDate,
    })
    .from(fctCompaniesInAnalyticsMart)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    companies: companies.map(company => ({
      companyDomainKey: company.companyDomainKey || '',
      companyName: company.companyName || 'Unknown Company',
      domainType: company.domainType || 'unknown',
      businessSizeCategory: company.businessSizeCategory || 'Unknown',
      revenueCategory: company.revenueCategory || 'Unknown',
      totalRevenue: Number(company.totalRevenue).toFixed(2),
      totalOrders: Number(company.totalOrders).toFixed(0),
      customerCount: Number(company.customerCount),
      firstOrderDate: company.firstOrderDate as string || '',
      latestOrderDate: company.latestOrderDate as string || '',
    })),
    totalCount: Number(totalCount)
  };
}

export async function getCompaniesWithHealth(
  page: number = 1,
  pageSize: number = 50,
  searchTerm: string = '',
  sortBy: string = 'totalRevenue',
  sortOrder: 'asc' | 'desc' = 'desc',
  filters: {
    activityStatus?: string
    businessSize?: string
    revenueCategory?: string
    healthCategory?: string
    country?: string
    period?: string
  } = {}
): Promise<{ companies: CompanyWithHealth[], totalCount: number }> {
  
  // Map frontend period values to DBT period types
  const periodMapping: Record<string, string> = {
    '7d': 'trailing_7d',
    '30d': 'trailing_30d',
    '90d': 'trailing_90d', 
    '1y': 'trailing_1y',
    'all': 'all_time'
  };
  
  const period = filters.period || 'all';
  const periodType = periodMapping[period] || 'all_time';

  // Build WHERE clause for search on the main companies table
  let whereClause = sql`${fctCompaniesInAnalyticsMart.domainType} = 'corporate'`;
  
  if (searchTerm) {
    whereClause = sql`${whereClause} AND (
      LOWER(${fctCompaniesInAnalyticsMart.companyName}) LIKE LOWER(${'%' + searchTerm + '%'}) OR
      LOWER(${fctCompaniesInAnalyticsMart.companyDomainKey}) LIKE LOWER(${'%' + searchTerm + '%'})
    )`;
  }

  // Apply filters
  if (filters.activityStatus) {
    whereClause = sql`${whereClause} AND ${dimCompanyHealthInAnalyticsMart.activityStatus} = ${filters.activityStatus}`;
  }

  if (filters.businessSize) {
    whereClause = sql`${whereClause} AND ${fctCompaniesInAnalyticsMart.businessSizeCategory} = ${filters.businessSize}`;
  }

  if (filters.revenueCategory) {
    whereClause = sql`${whereClause} AND ${fctCompaniesInAnalyticsMart.revenueCategory} = ${filters.revenueCategory}`;
  }

  if (filters.healthCategory) {
    whereClause = sql`${whereClause} AND ${dimCompanyHealthInAnalyticsMart.healthCategory} = ${filters.healthCategory}`;
  }

  if (filters.country) {
    whereClause = sql`${whereClause} AND ${fctCompaniesInAnalyticsMart.primaryCountry} = ${filters.country}`;
  }

  // For period filtering, we only include companies that have activity in the selected period
  // (this replaces the previous latestOrderDate filtering)
  if (period !== 'all') {
    whereClause = sql`${whereClause} AND EXISTS (
      SELECT 1 FROM ${martCompanyPeriodMetricsInAnalyticsMart} 
      WHERE ${martCompanyPeriodMetricsInAnalyticsMart.companyDomainKey} = ${fctCompaniesInAnalyticsMart.companyDomainKey}
      AND ${martCompanyPeriodMetricsInAnalyticsMart.periodType} = ${periodType}
      AND ${martCompanyPeriodMetricsInAnalyticsMart.totalRevenue} > 0
    )`;
  }

  // Get total count
  const totalCountResult = await db
    .select({ count: count() })
    .from(fctCompaniesInAnalyticsMart)
    .innerJoin(dimCompanyHealthInAnalyticsMart, sql`${fctCompaniesInAnalyticsMart.companyDomainKey} = ${dimCompanyHealthInAnalyticsMart.companyDomainKey}`)
    .where(whereClause);
  
  const totalCount = totalCountResult[0]?.count || 0;

  // Main query using the period metrics mart for fast lookups
  const companiesQuery = db
    .select({
      companyDomainKey: fctCompaniesInAnalyticsMart.companyDomainKey,
      companyName: fctCompaniesInAnalyticsMart.companyName,
      domainType: fctCompaniesInAnalyticsMart.domainType,
      businessSizeCategory: fctCompaniesInAnalyticsMart.businessSizeCategory,
      revenueCategory: fctCompaniesInAnalyticsMart.revenueCategory,
      // Use period-specific metrics from the mart, fallback to lifetime totals for 'all'
      totalRevenue: period === 'all' 
        ? fctCompaniesInAnalyticsMart.totalRevenue
        : sql<string>`COALESCE(${martCompanyPeriodMetricsInAnalyticsMart.totalRevenue}::text, '0')`,
      totalOrders: period === 'all'
        ? fctCompaniesInAnalyticsMart.totalOrders
        : sql<string>`COALESCE(${martCompanyPeriodMetricsInAnalyticsMart.totalOrders}::text, '0')`,
      customerCount: period === 'all'
        ? fctCompaniesInAnalyticsMart.customerCount
        : sql<number>`COALESCE(${martCompanyPeriodMetricsInAnalyticsMart.customerCount}, 0)`,
      firstOrderDate: period === 'all'
        ? fctCompaniesInAnalyticsMart.firstOrderDate
        : martCompanyPeriodMetricsInAnalyticsMart.firstOrderDate,
      latestOrderDate: period === 'all'
        ? fctCompaniesInAnalyticsMart.latestOrderDate
        : martCompanyPeriodMetricsInAnalyticsMart.latestOrderDate,
      healthScore: dimCompanyHealthInAnalyticsMart.healthScore,
      activityStatus: dimCompanyHealthInAnalyticsMart.activityStatus,
      healthCategory: dimCompanyHealthInAnalyticsMart.healthCategory,
      growthTrendDirection: dimCompanyHealthInAnalyticsMart.growthTrendDirection,
      daysSinceLastOrder: dimCompanyHealthInAnalyticsMart.daysSinceLastOrder,
      atRiskFlag: dimCompanyHealthInAnalyticsMart.atRiskFlag,
      growthOpportunityFlag: dimCompanyHealthInAnalyticsMart.growthOpportunityFlag,
      primaryCountry: fctCompaniesInAnalyticsMart.primaryCountry,
    })
    .from(fctCompaniesInAnalyticsMart)
    .innerJoin(dimCompanyHealthInAnalyticsMart, sql`${fctCompaniesInAnalyticsMart.companyDomainKey} = ${dimCompanyHealthInAnalyticsMart.companyDomainKey}`)
    // Left join with period metrics - for 'all' period, this will be null but we use lifetime values
    .leftJoin(martCompanyPeriodMetricsInAnalyticsMart, sql`
      ${fctCompaniesInAnalyticsMart.companyDomainKey} = ${martCompanyPeriodMetricsInAnalyticsMart.companyDomainKey}
      AND ${martCompanyPeriodMetricsInAnalyticsMart.periodType} = ${periodType}
    `)
    .where(whereClause);

  // Handle sorting with period-aware columns
  const sortColumn = {
    'companyName': fctCompaniesInAnalyticsMart.companyName,
    'totalRevenue': period === 'all' 
      ? fctCompaniesInAnalyticsMart.totalRevenue
      : sql`COALESCE(${martCompanyPeriodMetricsInAnalyticsMart.totalRevenue}, 0)`,
    'totalOrders': period === 'all'
      ? fctCompaniesInAnalyticsMart.totalOrders
      : sql`COALESCE(${martCompanyPeriodMetricsInAnalyticsMart.totalOrders}, 0)`,
    'customerCount': period === 'all'
      ? fctCompaniesInAnalyticsMart.customerCount
      : sql`COALESCE(${martCompanyPeriodMetricsInAnalyticsMart.customerCount}, 0)`,
    'latestOrderDate': period === 'all'
      ? fctCompaniesInAnalyticsMart.latestOrderDate
      : martCompanyPeriodMetricsInAnalyticsMart.latestOrderDate,
    'healthScore': dimCompanyHealthInAnalyticsMart.healthScore,
    'activityStatus': dimCompanyHealthInAnalyticsMart.activityStatus,
    'daysSinceLastOrder': dimCompanyHealthInAnalyticsMart.daysSinceLastOrder,
  }[sortBy] || (period === 'all' ? fctCompaniesInAnalyticsMart.totalRevenue : sql`COALESCE(${martCompanyPeriodMetricsInAnalyticsMart.totalRevenue}, 0)`);

  const orderByClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  companiesQuery.orderBy(orderByClause);

  const companies = await companiesQuery
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    companies: companies.map(company => ({
      companyDomainKey: company.companyDomainKey || '',
      companyName: company.companyName || 'Unknown Company',
      domainType: company.domainType || 'unknown',
      businessSizeCategory: company.businessSizeCategory || 'Unknown',
      revenueCategory: company.revenueCategory || 'Unknown',
      totalRevenue: Number(company.totalRevenue || 0).toFixed(2),
      totalOrders: Number(company.totalOrders || 0).toFixed(0),
      customerCount: Number(company.customerCount || 0),
      firstOrderDate: company.firstOrderDate as string || '',
      latestOrderDate: company.latestOrderDate as string || '',
      healthScore: Number(company.healthScore || 0).toFixed(0),
      activityStatus: company.activityStatus || 'Unknown',
      healthCategory: company.healthCategory || 'Unknown',
      growthTrendDirection: company.growthTrendDirection || 'Unknown',
      daysSinceLastOrder: Number(company.daysSinceLastOrder || 0),
      atRiskFlag: Boolean(company.atRiskFlag),
      growthOpportunityFlag: Boolean(company.growthOpportunityFlag),
      primaryCountry: company.primaryCountry || 'Unknown',
    })),
    totalCount: Number(totalCount)
  };
}

export async function getCompanyByDomain(domainKey: string): Promise<CompanyDetail | null> {
  const companies = await db
    .select({
      companyDomainKey: fctCompaniesInAnalyticsMart.companyDomainKey,
      companyName: fctCompaniesInAnalyticsMart.companyName,
      domainType: fctCompaniesInAnalyticsMart.domainType,
      businessSizeCategory: fctCompaniesInAnalyticsMart.businessSizeCategory,
      revenueCategory: fctCompaniesInAnalyticsMart.revenueCategory,
      totalRevenue: fctCompaniesInAnalyticsMart.totalRevenue,
      totalOrders: fctCompaniesInAnalyticsMart.totalOrders,
      customerCount: fctCompaniesInAnalyticsMart.customerCount,
      firstOrderDate: fctCompaniesInAnalyticsMart.firstOrderDate,
      latestOrderDate: fctCompaniesInAnalyticsMart.latestOrderDate,
      primaryEmail: fctCompaniesInAnalyticsMart.primaryEmail,
      primaryPhone: fctCompaniesInAnalyticsMart.primaryPhone,
      primaryBillingAddressLine1: fctCompaniesInAnalyticsMart.primaryBillingAddressLine1,
      primaryBillingCity: fctCompaniesInAnalyticsMart.primaryBillingCity,
      primaryBillingState: fctCompaniesInAnalyticsMart.primaryBillingState,
      primaryBillingPostalCode: fctCompaniesInAnalyticsMart.primaryBillingPostalCode,
      // Add health data
      healthScore: dimCompanyHealthInAnalyticsMart.healthScore,
      customerArchetype: dimCompanyHealthInAnalyticsMart.customerArchetype,
      activityStatus: dimCompanyHealthInAnalyticsMart.activityStatus,
      engagementLevel: dimCompanyHealthInAnalyticsMart.engagementLevel,
      growthTrendDirection: dimCompanyHealthInAnalyticsMart.growthTrendDirection,
      healthCategory: dimCompanyHealthInAnalyticsMart.healthCategory,
      atRiskFlag: dimCompanyHealthInAnalyticsMart.atRiskFlag,
      growthOpportunityFlag: dimCompanyHealthInAnalyticsMart.growthOpportunityFlag,
      ordersLast90Days: dimCompanyHealthInAnalyticsMart.ordersLast90Days,
      revenueLast90Days: dimCompanyHealthInAnalyticsMart.revenueLast90Days,
      revenuePercentile: dimCompanyHealthInAnalyticsMart.revenuePercentile,
      daysSinceLastOrder: dimCompanyHealthInAnalyticsMart.daysSinceLastOrder,
      // Country data is now directly in the companies table
      primaryCountry: fctCompaniesInAnalyticsMart.primaryCountry,
      region: fctCompaniesInAnalyticsMart.region,
      // Add enrichment data
      enrichedIndustry: fctCompaniesInAnalyticsMart.enrichedIndustry,
      enrichedEmployeeCount: fctCompaniesInAnalyticsMart.enrichedEmployeeCount,
      enrichedAnnualRevenue: fctCompaniesInAnalyticsMart.enrichedAnnualRevenue,
      enrichedDescription: fctCompaniesInAnalyticsMart.enrichedDescription,
      enrichedFoundedYear: fctCompaniesInAnalyticsMart.enrichedFoundedYear,
      enrichmentSource: fctCompaniesInAnalyticsMart.enrichmentSource,
      enrichmentDate: fctCompaniesInAnalyticsMart.enrichmentDate,
    })
    .from(fctCompaniesInAnalyticsMart)
    .leftJoin(dimCompanyHealthInAnalyticsMart, sql`${fctCompaniesInAnalyticsMart.companyDomainKey} = ${dimCompanyHealthInAnalyticsMart.companyDomainKey}`)
    .where(sql`${fctCompaniesInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .limit(1);

  if (companies.length === 0) {
    return null;
  }

  const company = companies[0];
  return {
    companyDomainKey: company.companyDomainKey || '',
    companyName: company.companyName || 'Unknown Company',
    domainType: company.domainType || 'unknown',
    businessSizeCategory: company.businessSizeCategory || 'Unknown',
    revenueCategory: company.revenueCategory || 'Unknown',
    totalRevenue: Number(company.totalRevenue).toFixed(2),
    totalOrders: Number(company.totalOrders).toFixed(0),
    customerCount: Number(company.customerCount),
    firstOrderDate: company.firstOrderDate as string || '',
    latestOrderDate: company.latestOrderDate as string || '',
    primaryEmail: company.primaryEmail || '',
    primaryPhone: company.primaryPhone || '',
    primaryBillingAddressLine1: company.primaryBillingAddressLine1 || '',
    primaryBillingCity: company.primaryBillingCity || '',
    primaryBillingState: company.primaryBillingState || '',
    primaryBillingPostalCode: company.primaryBillingPostalCode || '',
    primaryCountry: company.primaryCountry || 'Unknown',
    region: company.region || 'Unknown',
    healthScore: Number(company.healthScore || 0).toFixed(0),
    customerArchetype: company.customerArchetype || 'Unknown',
    activityStatus: company.activityStatus || 'Unknown',
    engagementLevel: company.engagementLevel || 'Unknown',
    growthTrendDirection: company.growthTrendDirection || 'Unknown',
    healthCategory: company.healthCategory || 'Unknown',
    atRiskFlag: Boolean(company.atRiskFlag),
    growthOpportunityFlag: Boolean(company.growthOpportunityFlag),
    ordersLast90Days: Number(company.ordersLast90Days || 0),
    revenueLast90Days: Number(company.revenueLast90Days || 0).toFixed(2),
    revenuePercentile: Number(company.revenuePercentile || 0),
    daysSinceLastOrder: Number(company.daysSinceLastOrder || 0),
    enrichedIndustry: company.enrichedIndustry || '',
    enrichedEmployeeCount: Number(company.enrichedEmployeeCount || 0),
    enrichedAnnualRevenue: Number(company.enrichedAnnualRevenue || 0),
    enrichedDescription: company.enrichedDescription || '',
    enrichedFoundedYear: Number(company.enrichedFoundedYear || 0),
    enrichmentSource: company.enrichmentSource || '',
    enrichmentDate: company.enrichmentDate as string || '',
  };
}

export async function getCompanyCustomers(domainKey: string): Promise<CompanyCustomer[]> {
  const customers = await db
    .select({
      customerId: bridgeCustomerCompanyInAnalyticsMart.customerId,
      customerName: bridgeCustomerCompanyInAnalyticsMart.customerName,
      customerTotalRevenue: bridgeCustomerCompanyInAnalyticsMart.customerTotalRevenue,
      customerTotalOrders: bridgeCustomerCompanyInAnalyticsMart.customerTotalOrders,
      customerValueTier: bridgeCustomerCompanyInAnalyticsMart.customerValueTier,
      customerActivityStatus: bridgeCustomerCompanyInAnalyticsMart.customerActivityStatus,
      billingAddressCity: bridgeCustomerCompanyInAnalyticsMart.billingAddressCity,
      billingAddressState: bridgeCustomerCompanyInAnalyticsMart.billingAddressState,
      salesRep: bridgeCustomerCompanyInAnalyticsMart.salesRep,
      isIndividualCustomer: bridgeCustomerCompanyInAnalyticsMart.isIndividualCustomer,
    })
    .from(bridgeCustomerCompanyInAnalyticsMart)
    .where(sql`${bridgeCustomerCompanyInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .orderBy(desc(bridgeCustomerCompanyInAnalyticsMart.customerTotalRevenue));

  return customers.map(customer => ({
    customerId: customer.customerId || '',
    customerName: customer.customerName || 'Unknown Customer',
    customerTotalRevenue: Number(customer.customerTotalRevenue).toFixed(2),
    customerTotalOrders: Number(customer.customerTotalOrders).toFixed(0),
    customerValueTier: customer.customerValueTier || 'Unknown',
    customerActivityStatus: customer.customerActivityStatus || 'Unknown',
    billingAddressCity: customer.billingAddressCity || '',
    billingAddressState: customer.billingAddressState || '',
    salesRep: customer.salesRep || '',
    isIndividualCustomer: customer.isIndividualCustomer || false,
  }));
}

export async function getCompanyOrderTimeline(domainKey: string): Promise<CompanyOrder[]> {
  const orders = await db
    .select({
      orderNumber: fctCompanyOrdersInAnalyticsMart.orderNumber,
      orderDate: fctCompanyOrdersInAnalyticsMart.orderDate,
      calculatedOrderTotal: fctCompanyOrdersInAnalyticsMart.calculatedOrderTotal,
      lineItemCount: fctCompanyOrdersInAnalyticsMart.lineItemCount,
      uniqueProducts: fctCompanyOrdersInAnalyticsMart.uniqueProducts,
      orderType: fctCompanyOrdersInAnalyticsMart.orderType,
      recencyCategory: fctCompanyOrdersInAnalyticsMart.recencyCategory,
      orderSizeCategory: fctCompanyOrdersInAnalyticsMart.orderSizeCategory,
      daysSinceOrder: fctCompanyOrdersInAnalyticsMart.daysSinceOrder,
    })
    .from(fctCompanyOrdersInAnalyticsMart)
    .where(sql`${fctCompanyOrdersInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .orderBy(desc(fctCompanyOrdersInAnalyticsMart.orderDate))
    .limit(50);

  return orders.map(order => ({
    orderNumber: order.orderNumber || '',
    orderDate: order.orderDate as string || '',
    calculatedOrderTotal: Number(order.calculatedOrderTotal).toFixed(2),
    lineItemCount: Number(order.lineItemCount || 0),
    uniqueProducts: Number(order.uniqueProducts || 0),
    orderType: order.orderType || 'Unknown',
    recencyCategory: order.recencyCategory || 'Unknown',
    orderSizeCategory: order.orderSizeCategory || 'Unknown',
    daysSinceOrder: Number(order.daysSinceOrder || 0),
  }));
}

export async function getCompanyProductAnalysis(domainKey: string): Promise<CompanyProduct[]> {
  const products = await db
    .select({
      productService: fctCompanyProductsInAnalyticsMart.productService,
      productServiceDescription: fctCompanyProductsInAnalyticsMart.productServiceDescription,
      productFamily: fctCompanyProductsInAnalyticsMart.productFamily,
      materialType: fctCompanyProductsInAnalyticsMart.materialType,
      totalTransactions: fctCompanyProductsInAnalyticsMart.totalTransactions,
      totalQuantityPurchased: fctCompanyProductsInAnalyticsMart.totalQuantityPurchased,
      totalAmountSpent: fctCompanyProductsInAnalyticsMart.totalAmountSpent,
      avgUnitPrice: fctCompanyProductsInAnalyticsMart.avgUnitPrice,
      buyerStatus: fctCompanyProductsInAnalyticsMart.buyerStatus,
      purchaseVolumeCategory: fctCompanyProductsInAnalyticsMart.purchaseVolumeCategory,
      daysSinceLastPurchase: fctCompanyProductsInAnalyticsMart.daysSinceLastPurchase,
    })
    .from(fctCompanyProductsInAnalyticsMart)
    .where(sql`${fctCompanyProductsInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .orderBy(desc(fctCompanyProductsInAnalyticsMart.totalAmountSpent))
    .limit(20);

  return products.map(product => ({
    productService: product.productService || '',
    productServiceDescription: product.productServiceDescription || '',
    productFamily: product.productFamily || 'Unknown',
    materialType: product.materialType || 'Unknown',
    totalTransactions: Number(product.totalTransactions || 0),
    totalQuantityPurchased: Number(product.totalQuantityPurchased || 0).toFixed(2),
    totalAmountSpent: Number(product.totalAmountSpent).toFixed(2),
    avgUnitPrice: Number(product.avgUnitPrice || 0).toFixed(2),
    buyerStatus: product.buyerStatus || 'Unknown',
    purchaseVolumeCategory: product.purchaseVolumeCategory || 'Unknown',
    daysSinceLastPurchase: Number(product.daysSinceLastPurchase || 0),
  }));
}

export async function getCompanyHealthBasic(domainKey: string): Promise<CompanyHealthBasic | null> {
  const orders = await db
    .select({
      orderDate: fctCompanyOrdersInAnalyticsMart.orderDate,
      calculatedOrderTotal: fctCompanyOrdersInAnalyticsMart.calculatedOrderTotal,
    })
    .from(fctCompanyOrdersInAnalyticsMart)
    .where(sql`${fctCompanyOrdersInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .orderBy(desc(fctCompanyOrdersInAnalyticsMart.orderDate));

  if (orders.length === 0) {
    return null;
  }

  const latestOrder = orders[0];
  const daysSinceLastOrder = Math.floor(
    (new Date().getTime() - new Date(latestOrder.orderDate as string).getTime()) / (1000 * 60 * 60 * 24)
  );

  let activityStatus = 'Inactive';
  if (daysSinceLastOrder <= 30) activityStatus = 'Active (30 days)';
  else if (daysSinceLastOrder <= 90) activityStatus = 'Recent (90 days)';
  else if (daysSinceLastOrder <= 365) activityStatus = 'Dormant (1 year)';

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.calculatedOrderTotal), 0);
  const avgOrderValue = totalRevenue / orders.length;

  // Calculate simple order frequency (orders per month over active period)
  const oldestOrder = orders[orders.length - 1];
  const daysBetween = Math.floor(
    (new Date(latestOrder.orderDate as string).getTime() - new Date(oldestOrder.orderDate as string).getTime()) / (1000 * 60 * 60 * 24)
  );
  const monthsBetween = Math.max(daysBetween / 30, 1);
  const ordersPerMonth = orders.length / monthsBetween;

  let orderFrequency = 'Low';
  if (ordersPerMonth >= 4) orderFrequency = 'High (4+/month)';
  else if (ordersPerMonth >= 1) orderFrequency = 'Medium (1-4/month)';
  else if (ordersPerMonth >= 0.25) orderFrequency = 'Low (1/quarter)';
  else orderFrequency = 'Very Low (<1/quarter)';

  return {
    daysSinceLastOrder,
    activityStatus,
    totalOrders: orders.length,
    orderFrequency,
    avgOrderValue: avgOrderValue.toFixed(2),
  };
}

export async function getCompanyTimeSeriesData(domainKey: string): Promise<CompanyTimeSeriesQuarter[]> {
  const timeSeries = await db
    .select({
      quarterLabel: fctCompanyOrdersTimeSeriesInAnalyticsMart.quarterLabel,
      orderYear: fctCompanyOrdersTimeSeriesInAnalyticsMart.orderYear,
      orderQuarter: fctCompanyOrdersTimeSeriesInAnalyticsMart.orderQuarter,
      totalRevenue: fctCompanyOrdersTimeSeriesInAnalyticsMart.totalRevenue,
      orderCount: fctCompanyOrdersTimeSeriesInAnalyticsMart.orderCount,
      avgOrderValue: fctCompanyOrdersTimeSeriesInAnalyticsMart.avgOrderValue,
      yoyRevenueGrowthPct: fctCompanyOrdersTimeSeriesInAnalyticsMart.yoyRevenueGrowthPct,
      yoyOrderGrowthPct: fctCompanyOrdersTimeSeriesInAnalyticsMart.yoyOrderGrowthPct,
      quarterlyRevenueTier: fctCompanyOrdersTimeSeriesInAnalyticsMart.quarterlyRevenueTier,
      quarterlyActivityLevel: fctCompanyOrdersTimeSeriesInAnalyticsMart.quarterlyActivityLevel,
      exceptionalGrowthFlag: fctCompanyOrdersTimeSeriesInAnalyticsMart.exceptionalGrowthFlag,
      concerningDeclineFlag: fctCompanyOrdersTimeSeriesInAnalyticsMart.concerningDeclineFlag,
      isCurrentQuarter: fctCompanyOrdersTimeSeriesInAnalyticsMart.isCurrentQuarter,
    })
    .from(fctCompanyOrdersTimeSeriesInAnalyticsMart)
    .where(sql`${fctCompanyOrdersTimeSeriesInAnalyticsMart.companyDomainKey} = ${domainKey}`)
    .orderBy(desc(fctCompanyOrdersTimeSeriesInAnalyticsMart.orderYear), desc(fctCompanyOrdersTimeSeriesInAnalyticsMart.orderQuarter))
    .limit(12); // Last 3 years of quarterly data

  return timeSeries.map(quarter => ({
    quarterLabel: quarter.quarterLabel || '',
    orderYear: Number(quarter.orderYear || 0).toFixed(0),
    orderQuarter: Number(quarter.orderQuarter || 0).toFixed(0),
    totalRevenue: Number(quarter.totalRevenue || 0).toFixed(2),
    orderCount: Number(quarter.orderCount || 0),
    avgOrderValue: Number(quarter.avgOrderValue || 0).toFixed(2),
    yoyRevenueGrowthPct: Number(quarter.yoyRevenueGrowthPct || 0).toFixed(1),
    yoyOrderGrowthPct: Number(quarter.yoyOrderGrowthPct || 0).toFixed(1),
    quarterlyRevenueTier: quarter.quarterlyRevenueTier || 'Unknown',
    quarterlyActivityLevel: quarter.quarterlyActivityLevel || 'Unknown',
    exceptionalGrowthFlag: Boolean(quarter.exceptionalGrowthFlag),
    concerningDeclineFlag: Boolean(quarter.concerningDeclineFlag),
    isCurrentQuarter: Boolean(quarter.isCurrentQuarter),
  }));
}

export async function getTopCompaniesForProduct(productName: string, limit: number = 10, filters?: ProductDetailFilters): Promise<ProductTopCompany[]> {
  // Map period filter to DBT period types
  const periodMapping: Record<string, string> = {
    '7d': 'trailing_30d',    // Use 30d as closest available
    '30d': 'trailing_30d',
    '90d': 'trailing_90d', 
    '1y': 'trailing_1y',
    'all': 'all_time'
  };
  
  const period = filters?.period || '1y';
  const periodType = periodMapping[period] || 'trailing_1y';

  // Query the pre-aggregated DBT mart table
  const companies = await db
    .select({
      companyDomainKey: martProductCompanyPeriodSpendingInAnalyticsMart.companyDomainKey,
      companyName: martProductCompanyPeriodSpendingInAnalyticsMart.companyName,
      totalAmountSpent: martProductCompanyPeriodSpendingInAnalyticsMart.totalAmountSpent,
      totalTransactions: martProductCompanyPeriodSpendingInAnalyticsMart.totalTransactions,
      totalQuantityPurchased: martProductCompanyPeriodSpendingInAnalyticsMart.totalQuantityPurchased,
      avgUnitPrice: martProductCompanyPeriodSpendingInAnalyticsMart.avgUnitPrice,
      firstPurchaseDate: martProductCompanyPeriodSpendingInAnalyticsMart.firstPurchaseDate,
      lastPurchaseDate: martProductCompanyPeriodSpendingInAnalyticsMart.lastPurchaseDate,
      buyerStatus: martProductCompanyPeriodSpendingInAnalyticsMart.lifetimeBuyerStatus,
      purchaseVolumeCategory: martProductCompanyPeriodSpendingInAnalyticsMart.lifetimeVolumeCategory,
    })
    .from(martProductCompanyPeriodSpendingInAnalyticsMart)
    .where(sql`${martProductCompanyPeriodSpendingInAnalyticsMart.productService} = ${productName} 
               AND ${martProductCompanyPeriodSpendingInAnalyticsMart.periodType} = ${periodType}
               AND ${martProductCompanyPeriodSpendingInAnalyticsMart.totalAmountSpent} > 0`)
    .orderBy(desc(martProductCompanyPeriodSpendingInAnalyticsMart.totalAmountSpent))
    .limit(limit);

  return companies.map(company => ({
    companyDomainKey: company.companyDomainKey || '',
    companyName: company.companyName || 'Unknown Company',
    totalAmountSpent: Number(company.totalAmountSpent || 0).toFixed(2),
    totalTransactions: Number(company.totalTransactions || 0),
    totalQuantityPurchased: Number(company.totalQuantityPurchased || 0).toFixed(2),
    avgUnitPrice: Number(company.avgUnitPrice || 0).toFixed(2),
    firstPurchaseDate: company.firstPurchaseDate ? company.firstPurchaseDate.toString() : '',
    lastPurchaseDate: company.lastPurchaseDate ? company.lastPurchaseDate.toString() : '',
    buyerStatus: company.buyerStatus || 'Unknown',
    purchaseVolumeCategory: company.purchaseVolumeCategory || 'Unknown',
  }));
}