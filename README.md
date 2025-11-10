src/
  main.ts            # Entry point
  server.ts          # App creation & middleware
  deps.ts            # Central third-party exports
  utils/env.ts       # Environment variable loading
  db/mongo.ts        # Mongo connection
  models/todo.ts     # Todo interface
  controllers/todos.ts # CRUD logic
  routes/health.ts   # Health check endpoint
  routes/todos.ts    # /api/todos CRUD routes
  routes/index.ts    # Router aggregator
deno task dev
deno task test
deno task lint
deno task fmt
# Xolt Deno + Mongo Starter

A minimal REST API boilerplate using Deno, Oak, MongoDB, and Zod.

## Features
- Deno runtime with tasks (`deno.json`)
- Oak HTTP server & routing
- MongoDB Atlas connection via official driver
- Zod validation for request bodies
- Centralized environment config loader
- Health check and Todo CRUD sample
- Example tests scaffold

## Project Structure
```
src/
  main.ts            # Entry point
  server.ts          # App creation & middleware
  deps.ts            # Central third-party exports
  utils/env.ts       # Environment variable loading
  db/mongo.ts        # Mongo connection
  models/todo.ts     # Todo interface
  controllers/todos.ts # CRUD logic
  routes/health.ts   # Health check endpoint
  routes/todos.ts    # /api/todos CRUD routes
  routes/index.ts    # Router aggregator
```

## Environment
Copy `.env.example` to `.env` and fill your MongoDB Atlas URI, DB name, JWT secret, etc.

## Development
```bash
deno task dev
```
Visit `http://localhost:8000/health`.

## Example Todo Requests
Create:
```bash
curl -X POST http://localhost:8000/api/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"First Task"}'
```

List:
```bash
curl http://localhost:8000/api/todos
```

## Tests
Add tests in `src/` and run:
```bash
deno task test
```

## Lint & Format
```bash
deno task lint
deno task fmt
```

## Future Improvements
- Auth & JWT
- Pagination & filtering
- OpenAPI spec generation
- Proper logging abstraction
```
# xalt-backend
