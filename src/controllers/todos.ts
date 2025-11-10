import { Collection } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { TodoSchema } from "../models/todo.ts";
import { z } from "../deps.ts";

const todoInput = z.object({
  title: z.string().min(1),
  completed: z.boolean().optional().default(false),
});

async function collection(): Promise<Collection<TodoSchema>> {
  const db = await getDb();
  return db.collection<TodoSchema>("todos");
}

export async function listTodos() {
  const col = await collection();
  return await col.find({}, { noCursorTimeout: false }).toArray();
}

export async function getTodo(id: string) {
  const col = await collection();
  return await col.findOne({ _id: { $oid: id } });
}

export async function createTodo(data: unknown) {
  const parsed = todoInput.parse(data);
  const col = await collection();
  const createdAt = new Date();
  const insertedId = await col.insertOne({
    title: parsed.title,
    completed: parsed.completed ?? false,
    createdAt,
  });
  return await getTodo(insertedId.$oid);
}

export async function updateTodo(id: string, data: unknown) {
  const parsed = todoInput.partial().parse(data);
  const col = await collection();
  await col.updateOne(
    { _id: { $oid: id } },
    { $set: { ...parsed } },
  );
  return await getTodo(id);
}

export async function deleteTodo(id: string) {
  const col = await collection();
  await col.deleteOne({ _id: { $oid: id } });
  return { deleted: true };
}
