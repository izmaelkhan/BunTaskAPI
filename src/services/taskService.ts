import { db } from "../db/database";

export type Task = {
  id: number;
  title: string;
  summary?: string | null;
  createdAt: string;
};

export function createTask(title: string): Task {
  const stmt = db.prepare("INSERT INTO tasks (title) VALUES (?)");
  const info = stmt.run(title);
  const id = Number(info.lastInsertRowid);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task;
  return task;
}

export function listTasks(): Task[] {
  return db.prepare("SELECT * FROM tasks ORDER BY id DESC").all() as Task[];
}

export function updateTaskSummary(id: number, summary: string): Task {
  db.prepare("UPDATE tasks SET summary = ? WHERE id = ?").run(summary, id);
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task;
}
