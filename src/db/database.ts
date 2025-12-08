// -----------------------------------------------------------------------------
// DATABASE MODULE WITH updated_at SUPPORT
// -----------------------------------------------------------------------------

import { Database } from "bun:sqlite";

export const db = new Database("database.db");

// -----------------------------------------------------------------------------
// Create tasks table (initial columns only).
// No updated_at here because old installations already have this table.
// -----------------------------------------------------------------------------
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    created_at TEXT NOT NULL
  )
`);



// -----------------------------------------------------------------------------
// SAFE MIGRATION: Add updated_at column if it does not exist.
// This does NOT destroy any existing data.
// -----------------------------------------------------------------------------
const columns = db.query(`PRAGMA table_info(tasks)`).all();
const hasUpdatedAt = columns.some((c: any) => c.name === "updated_at");

if (!hasUpdatedAt) {
  db.run(`ALTER TABLE tasks ADD COLUMN updated_at TEXT`);
  console.log("Database migrated: added updated_at column.");
}

// -----------------------------------------------------------------------------
// createTask() — when creating a new task, updated_at stays NULL.
// -----------------------------------------------------------------------------
export function nowPakistanTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })).toISOString();
}
export function createTask(title: string, description: string, summary: string | null = null) {
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, summary, created_at, updated_at)
    VALUES (?, ?, ?, ? , ?)
  `);
  const now=nowPakistanTime();
  const result = stmt.run(title, description, summary, now, null);
  return result.lastInsertRowid;
}

// -----------------------------------------------------------------------------
// getTasks() — return created_at + updated_at
// -----------------------------------------------------------------------------
export function getTasks() {
  return db
    .query(`
      SELECT id, title, description, summary, created_at, updated_at
      FROM tasks
      ORDER BY id DESC
    `)
    .all();
}

// -----------------------------------------------------------------------------
// getTask(id)
// -----------------------------------------------------------------------------
export function getTask(id: number) {
  return db
    .query(`
      SELECT id, title, description, summary, created_at, updated_at
      FROM tasks WHERE id = ?
    `)
    .get(id);
}

// -----------------------------------------------------------------------------
// searchTasks()
// -----------------------------------------------------------------------------
export function searchTasks(query: string) {
  const like = `%${query}%`;
  return db
    .query(`
      SELECT id, title, description, summary, created_at, updated_at
      FROM tasks
      WHERE title LIKE ?
         OR description LIKE ?
         OR summary LIKE ?
      ORDER BY id DESC
    `)
    .all(like, like, like);
}

// -----------------------------------------------------------------------------
// Pagination
// -----------------------------------------------------------------------------
export function getTasksPaginated(page: number, limit: number) {
  const offset = (page - 1) * limit;

  return db
    .query(`
      SELECT id, title, description, summary, created_at, updated_at
      FROM tasks
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset);
}

export function searchTasksPaginated(query: string, page: number, limit: number) {
  const like = `%${query}%`;
  const offset = (page - 1) * limit;

  return db
    .query(`
      SELECT id, title, description, summary, created_at, updated_at
      FROM tasks
      WHERE title LIKE ?
         OR description LIKE ?
         OR summary LIKE ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `)
    .all(like, like, like, limit, offset);
}

// -----------------------------------------------------------------------------
// updateTask() — IMPORTANT
// Automatically sets updated_at = NOW.
// -----------------------------------------------------------------------------
export function updateTask(id: number, title: string, description: string, summary?: string) {
  const stmt = db.prepare(`
    UPDATE tasks
    SET title = ?, 
        description = ?, 
        summary = ?, 
        updated_at = ?
    WHERE id = ?
  `);
  const now=nowPakistanTime();

  return stmt.run(title, description, summary ?? null, now, id);
}

// -----------------------------------------------------------------------------
// deleteTask()
// -----------------------------------------------------------------------------
export function deleteTask(id: number) {
  return db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
}
