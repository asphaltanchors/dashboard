#!/bin/bash

# Apply migrations
pnpx prisma migrate deploy

exec "$@"
