import { createTask, getTasks, getTask, updateTask, deleteTask } from "./db/database";
import { generateSummary } from "./gemini";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const server = Bun.serve({
  port: 3000, 
  idleTimeout: 120, // 120 seconds
  async fetch(req) { // Handle incoming requests
    const url = new URL(req.url);
    const pathname = url.pathname;
    const id = Number(url.searchParams.get("id"));

    try {
      // Serve index.html
      if (pathname === "/") {
        return new Response(Bun.file("public/index.html"));
      }

      // GET all tasks
      if (req.method === "GET" && pathname === "/tasks") {
        return new Response(JSON.stringify(getTasks()), { status: 200 });
      }

      // POST create new task
      if (req.method === "POST" && pathname === "/task") {
        const { title, description } = await req.json();
        let summary = "— summary unavailable —";
        try {
          summary = await generateSummary(title, description);
        } catch (err) {
          console.error("Gemini error:", err);
        }
        const newId = createTask(title, description, summary);
        return new Response(JSON.stringify({ id: newId, summary }), { status: 201 });
      }

      // POST refresh summary for a task
      if (req.method === "POST" && pathname.startsWith("/task/") && pathname.endsWith("/refresh-summary")) {
        const taskId = Number(pathname.split("/")[2]);
        const task = getTask(taskId) as { title: string; description: string } | null;
        if (!task) return new Response("Task not found", { status: 404 });

        let summary = "— summary unavailable —";
        try {
          summary = await generateSummary(task.title, task.description);
        } catch (err) {
          console.error("Gemini error:", err);
        }

        updateTask(taskId, task.title, task.description, summary);
        return new Response(JSON.stringify({ id: taskId, summary }), { status: 200 });
      }

      // PUT update task
      if (req.method === "PUT" && pathname === "/task" && id) {
        const { title, description } = await req.json();
        let summary = "— summary unavailable —";
        try {
          summary = await generateSummary(title, description);
        } catch (err) {
          console.error("Gemini error:", err);
        }
        updateTask(id, title, description, summary);
        return new Response(JSON.stringify({ updated: id, summary }), { status: 200 });
      }

      // DELETE task
      if (req.method === "DELETE" && pathname === "/task" && id) {
        deleteTask(id);
        return new Response(JSON.stringify({ deleted: id }), { status: 200 });
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
  },
});

console.log("Server running on http://localhost:3000");
