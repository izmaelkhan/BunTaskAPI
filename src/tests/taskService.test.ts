// src/taskService.test.ts
// ---------------------------------------------------------
// RESPONSIBILITY:
// Unit tests for task operations in database.ts
// ---------------------------------------------------------

import { createTask, getTasks, getTask, updateTask, deleteTask } from "../db/database";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error("Test failed: " + message);
}

function runTests() {
  console.log("Running taskService tests...");

  // Create a task
  const id = createTask("Test Task", "This is a test");
  assert(typeof id === "number", "createTask should return an ID");

  // Get all tasks
  const allTasks = getTasks();
  assert(allTasks.length > 0, "getTasks should return tasks");

  // Get single task
  const task = getTask(Number(id)) as any;
  assert(task.title === "Test Task", "getTask should return correct task");

  // Update task
  updateTask(Number(id), "Updated Task", "Updated description");
  const updatedTask = getTask(Number(id)) as any;
  assert(updatedTask.title === "Updated Task", "updateTask should update title");

  // Delete task
  deleteTask(Number(id));
  const deletedTask = getTask(Number(id));
  assert(deletedTask === null, "deleteTask should remove task");

  console.log("All tests passed!");
}

runTests();
