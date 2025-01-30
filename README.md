# Running Scripts in Docker

The Docker container includes a script runner that allows you to execute TypeScript scripts without conflicts with Next.js. To run a script:

```bash
# General format
docker exec <container_name> run-script <script-name>.ts [arguments]

# Examples:
docker exec my-container run-script import-customer.ts --file customers.csv
docker exec my-container run-script process-daily-imports.ts
```

The scripts are executed using `tsx` and have access to their own isolated `node_modules` directory, preventing any conflicts with the Next.js runtime.
