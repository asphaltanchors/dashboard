import { Order, Customer, CustomerEmail } from "@prisma/client"

export type OrderWithCustomer = Order & {
  customer: Pick<Customer, "customerName"> & {
    emails: Pick<CustomerEmail, "email">[]
  }
}
