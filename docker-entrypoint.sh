#!/bin/sh

# Apply migrations
pnpx prisma migrate deploy

exec "$@"
