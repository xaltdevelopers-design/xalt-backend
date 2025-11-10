import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { listTodos } from "../controllers/todos.ts";

Deno.test("listTodos returns array", async () => {
  const todos = await listTodos();
  assertEquals(Array.isArray(todos), true);
});
