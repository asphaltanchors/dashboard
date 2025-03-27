# Dash - Ecommerce BI Reporting Dashboard

A business intelligence reporting dashboard for ecommerce data analysis, built with Next.js and powered by QuickBooks data.

## Overview

Dash is a comprehensive business intelligence platform designed specifically for ecommerce businesses. It provides powerful analytics and visualization tools to help you understand your sales performance, product trends, customer behavior, and more. The dashboard imports data from QuickBooks using the [asphaltanchors/mqi](https://github.com/asphaltanchors/mqi) data integration tool.

## Features

- **Product Analytics**: Track product performance, sales trends, and inventory metrics
- **Product Family Analysis**: Group and analyze products by family/category
- **Material Type Insights**: Visualize revenue distribution by material type
- **Order Management**: View and analyze order data with detailed breakdowns
- **Company/Customer Insights**: Track customer relationships and purchasing patterns
- **Interactive Data Visualization**: Rich charts and graphs for data analysis
- **Searchable Tables**: Quickly find and filter data across the platform
- **Responsive Design**: Optimized for both desktop and mobile viewing

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: TailwindCSS 4
- **UI Components**: Radix UI, shadcn/ui
- **Data Visualization**: Recharts, Chart.js
- **Database**: PostgreSQL with Drizzle ORM
- **Data Import**: asphaltanchors/mqi for QuickBooks integration

## Data Import

This dashboard uses the [asphaltanchors/mqi](https://github.com/asphaltanchors/mqi) repository to import data from QuickBooks. The imported data includes:

- Orders and order items
- Products and product families
- Customers and companies
- Sales and revenue metrics
- Material types and inventory data

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- QuickBooks data imported via asphaltanchors/mqi

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dash.git
   cd dash
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/your_database
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## Usage

The dashboard provides several key sections:

- **Dashboard**: Overview of key metrics and performance indicators
- **Products**: Detailed product performance analysis and search
- **Product Families**: Analysis grouped by product categories
- **Orders**: Order history and detailed order information
- **Companies**: Customer and company relationship data

Each section offers interactive charts, searchable tables, and detailed drill-down views for comprehensive data analysis.

## Project Structure

```
dash/
├── app/                  # Next.js app directory
│   ├── components/       # Reusable UI components
│   ├── dashboard/        # Dashboard overview page
│   ├── products/         # Product analysis pages
│   ├── product-families/ # Product family analysis
│   ├── orders/           # Order management
│   ├── companies/        # Company/customer data
│   └── utils/            # Utility functions
├── components/           # Global UI components
│   └── ui/               # shadcn/ui components
├── db/                   # Database schema and connections
│   ├── schema.ts         # Drizzle ORM schema definitions
│   └── index.ts          # Database connection setup
├── lib/                  # Shared utilities and helpers
└── public/               # Static assets
```

## Data Integration

The dashboard connects to a PostgreSQL database populated by the [asphaltanchors/mqi](https://github.com/asphaltanchors/mqi) QuickBooks data import tool. This integration provides a seamless flow of financial and operational data from QuickBooks into the dashboard for analysis.

## License

[MIT](LICENSE)
