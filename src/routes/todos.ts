import { Router, Context } from "../deps.ts";
import {
  listTodos,
  getTodo,
  createTodo,
  updateTodo,
  deleteTodo,
} from "../controllers/todos.ts";

export const todosRouter = new Router({ prefix: "/api/todos" });

// List
todosRouter.get("/", async (ctx: Context) => {
  const items = await listTodos();
  ctx.response.body = items;
});

// Get one
todosRouter.get("/:id", async (ctx: Context) => {
  const id = ctx.params.id!;
  const item = await getTodo(id);
  if (!item) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Not found" };
    return;
  }
  ctx.response.body = item;
});

// Create
todosRouter.post("/", async (ctx: Context) => {
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  try {
    const created = await createTodo(body);
    ctx.response.status = 201;
    ctx.response.body = created;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bad Request";
    ctx.response.status = 400;
    ctx.response.body = { error: msg };
  }
});

// Update
todosRouter.put("/:id", async (ctx: Context) => {
  const id = ctx.params.id!;
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  try {
    const updated = await updateTodo(id, body);
    if (!updated) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Not found" };
      return;
    }
    ctx.response.body = updated;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bad Request";
    ctx.response.status = 400;
    ctx.response.body = { error: msg };
  }
});

// Delete
todosRouter.delete("/:id", async (ctx: Context) => {
  const id = ctx.params.id!;
  await deleteTodo(id);
  ctx.response.status = 204;
});
