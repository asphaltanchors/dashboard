import { prisma } from "./prisma"

export async function getCustomers() {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      customerName: true,
      company: {
        select: {
          name: true,
        },
      },
      emails: {
        where: {
          isPrimary: true,
        },
        select: {
          email: true,
        },
        take: 1,
      },
      phones: {
        where: {
          isPrimary: true,
        },
        select: {
          phone: true,
        },
        take: 1,
      },
      status: true,
      createdAt: true,
    },
    orderBy: {
      customerName: 'asc',
    },
  })

  return customers.map(customer => ({
    id: customer.id,
    name: customer.customerName,
    company: customer.company?.name ?? '',
    email: customer.emails[0]?.email ?? '',
    phone: customer.phones[0]?.phone ?? '',
    status: customer.status,
    createdAt: customer.createdAt,
  }))
}

export type Customer = Awaited<ReturnType<typeof getCustomers>>[number]
