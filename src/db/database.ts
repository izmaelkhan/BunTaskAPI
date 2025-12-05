// src/database.ts
// ---------------------------------------------------------
// RESPONSIBILITY:
// Provides SQLite DB access and CRUD operations for tasks.
// Tasks now include `summary` field + search + pagination.
// ---------------------------------------------------------

import { Database } from "bun:sqlite";

// Open or create database
export const db = new Database("database.db");

// Create table with summary column if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    created_at TEXT NOT NULL
  )
`);

// Insert a new task
export function createTask(title: string, description: string, summary: string | null = null) {
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, summary, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(title, description, summary);
  return result.lastInsertRowid;
}

// Get all tasks (not paginated)
export function getTasks() {
  return db
    .query("SELECT id, title, description, summary, created_at FROM tasks ORDER BY id DESC")
    .all();
}

// Get a single task by ID
export function getTask(id: number) {
  const stmt = db.prepare(`
      SELECT id, title, description, summary, created_at
      FROM tasks WHERE id = ?
  `);
  return stmt.get(id);
}

// SEARCH tasks by title, description, summary
export function searchTasks(query: string) {
  const like = `%${query}%`;

  return db
    .query(
      `
      SELECT id, title, description, summary, created_at
      FROM tasks
      WHERE title LIKE ?
         OR description LIKE ?
         OR summary LIKE ?
      ORDER BY id DESC
    `
    )
    .all(like, like, like);
}

/* ------------------------------------------------------
   PAGINATION — NEW
------------------------------------------------------ */

// Get paginated tasks
export function getTasksPaginated(page: number, limit: number) {
  const offset = (page - 1) * limit;

  return db
    .query(
      `
      SELECT id, title, description, summary, created_at
      FROM tasks
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `
    )
    .all(limit, offset);
}

// Search + pagination
export function searchTasksPaginated(query: string, page: number, limit: number) {
  const like = `%${query}%`;
  const offset = (page - 1) * limit;

  return db
    .query(
      `
      SELECT id, title, description, summary, created_at
      FROM tasks
      WHERE title LIKE ?
         OR description LIKE ?
         OR summary LIKE ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `
    )
    .all(like, like, like, limit, offset);
}

// Update a task (including summary)
export function updateTask(id: number, title: string, description: string, summary?: string) {
  const stmt = db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, summary = ?
    WHERE id = ?
  `);
  return stmt.run(title, description, summary ?? null, id);
}

// Delete a task
export function deleteTask(id: number) {
  const stmt = db.prepare(`DELETE FROM tasks WHERE id = ?`);
  return stmt.run(id);
}
