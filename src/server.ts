// -----------------------------------------------------------------------------
// SERVER MODULE
// Responsibilities:
// - Serve frontend files
// - Provide Task CRUD API
// - Provide Summary Refresh API
// - Fully supports created_at + updated_at timestamps
// -----------------------------------------------------------------------------

import {
  createTask,
  getTasksPaginated,
  searchTasksPaginated,
  getTask,
  updateTask,
  deleteTask
} from "./db/database";

import { generateSummary } from "./gemini";

// -----------------------------------------------------------------------------
// HTTP SERVER
// -----------------------------------------------------------------------------

const server = Bun.serve({
  port: 3000,
  idleTimeout: 120,

  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    try {
      // -----------------------------------------------------------------------
      // Serve static frontend (index.html, CSS, JS)
      // -----------------------------------------------------------------------
      if (url.pathname === "/" || url.pathname.startsWith("/public/") === false) {
        try {
          const file = Bun.file(
            `./public${url.pathname === "/" ? "/index.html" : url.pathname}`
          );
          if (await file.exists()) return new Response(file);
        } catch {}
      }

      // -----------------------------------------------------------------------
      // GET /tasks?page=1&limit=20&query=abc
      // Returns paginated tasks WITH created_at + updated_at
      // -----------------------------------------------------------------------
      if (req.method === "GET" && pathname === "/tasks") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const limit = Number(url.searchParams.get("limit") ?? "20");
        const query = url.searchParams.get("query") ?? "";

        const tasks = query.trim()
          ? searchTasksPaginated(query, page, limit)
          : getTasksPaginated(page, limit);

        return new Response(JSON.stringify(tasks), { status: 200 });
      }

      // -----------------------------------------------------------------------
      // POST /task — Create Task
      // Creates created_at automatically, updated_at stays NULL.
      // -----------------------------------------------------------------------
      if (req.method === "POST" && pathname === "/task") {
        const { title, description } = await req.json();
        let summary = "— summary unavailable —";

        try {
          summary = await generateSummary(title, description);
        } catch (err) {
          console.error("Gemini error:", err);
        }

        const id = createTask(title, description, summary);

        return new Response(
          JSON.stringify({
            id,
            summary,
            created_at: new Date().toISOString(),
            updated_at: null
          }),
          { status: 201 }
        );
      }

      // -----------------------------------------------------------------------
      // POST /task/:id/refresh-summary
      // Refreshes summary AND updates updated_at timestamp
      // -----------------------------------------------------------------------
      if (req.method === "POST" && pathname.endsWith("/refresh-summary")) {
        const id = Number(pathname.split("/")[2]);
        const task = getTask(id) as {
          title: string;
          description: string;
          created_at: string;
          updated_at: string | null;
          summary: string;
        } | null;

        if (!task) return new Response("Not Found", { status: 404 });

        let newSummary = "— summary unavailable —";
        try {
          newSummary = await generateSummary(task.title, task.description);
        } catch (err) {
          console.error(err);
        }

        updateTask(id, task.title, task.description, newSummary);

        const updatedTask = getTask(id) as {
          created_at: string;
          updated_at: string | null;
        };

        return new Response(
          JSON.stringify({
            id,
            summary: newSummary,
            created_at: updatedTask.created_at,
            updated_at: updatedTask.updated_at
          }),
          { status: 200 }
        );
      }

      // -----------------------------------------------------------------------
      // PUT /task/:id — Update Task (title/description)
      // Automatically updates updated_at timestamp
      // -----------------------------------------------------------------------
      if (req.method === "PUT" && pathname.startsWith("/task/")) {
        const id = Number(pathname.split("/")[2]);
        const data = await req.json();

        const existing = getTask(id) as {
          title: string;
          description: string;
          summary: string;
          created_at: string;
          updated_at: string | null;
        } | null;

        if (!existing) return new Response("Not Found", { status: 404 });

        updateTask(
          id,
          data.title ?? existing.title,
          data.description ?? existing.description,
          existing.summary
        );

        const updated = getTask(id) as {
          created_at: string;
          updated_at: string | null;
        };

        return new Response(
          JSON.stringify({
            updated: true,
            id,
            created_at: updated.created_at,
            updated_at: updated.updated_at
          }),
          { status: 200 }
        );
      }

      // -----------------------------------------------------------------------
      // DELETE /task/:id
      // -----------------------------------------------------------------------
      if (req.method === "DELETE" && pathname.startsWith("/task/")) {
        const id = Number(pathname.split("/")[2]);
        deleteTask(id);
        return new Response("Deleted", { status: 200 });
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: (err as Error).message }),
        { status: 500 }
      );
    }
  }
});

console.log("Server running on http://localhost:3000");
