
  let currentPage = 1;
  const limit = 10;
  let loading = false;

  async function fetchTasks(query = "", page = 1) {
    loading = true;

    const url = `/tasks?page=${page}&limit=${limit}` +
      (query ? `&query=${encodeURIComponent(query)}` : "");

    const res = await fetch(url);
    const json = await res.json();

    const container = document.getElementById("tasks");
    if (page === 1) container.innerHTML = ""; 

    json.forEach(t => {
      const el = document.createElement("div");
      el.className = "task";

     el.innerHTML = `
  <div class="task-header">
    <div>
      <strong>#${t.id}</strong>
      <span class="task-title">${t.title}</span>
    </div>

    <div style="display:flex;align-items:center;gap:12px;">
      <div class="task-date">${new Date(t.created_at).toLocaleDateString()}</div>

      <div class="task-actions">
        <button class="refresh-summary" data-id="${t.id}" title="Refresh Summary">↻</button>
        <button class="edit-task" data-id="${t.id}" title="Edit Task">✏️</button>
        <button class="delete-task" data-id="${t.id}" title="Delete Task">🗑</button>
      </div>
    </div>
  </div>

  <div class="description task-desc">${t.description || ""}</div>

  <div class="summary" id="summary-${t.id}">
    ${t.summary ?? "— awaiting summary —"}
  </div>
`;


      container.appendChild(el);
    });

    attachRefreshHandlers();
    attachDeleteHandlers();
    attachEditHandlers();

    loading = false;
  }

  // ======================
  // REFRESH SUMMARY
  // ======================
  function attachRefreshHandlers() {
  document.querySelectorAll(".refresh-summary").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const summaryDiv = document.getElementById(`summary-${id}`);
      summaryDiv.innerHTML = '<span class="loading">Refreshing summary...</span>';

      try {
        const res = await fetch(`/task/${id}/refresh-summary`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to refresh summary");
        const data = await res.json();

        summaryDiv.textContent = data.summary; // update summary in-place
      } catch (err) {
        summaryDiv.textContent = "— summary unavailable —";
        console.error(err);
      }
    };
  });
}


  // ======================
  // DELETE
  // ======================
  function attachDeleteHandlers() {
  document.querySelectorAll(".delete-task").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");

      if (!confirm("Are you sure you want to delete this task?")) return;

      try {
        const res = await fetch(`/task/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete task");

        // Remove the task element from DOM
        const taskElement = btn.closest(".task");
        taskElement.remove();

        showNotification("Task deleted");
      } catch (err) {
        console.error(err);
        alert("Failed to delete task");
      }
    };
  });
}


  // ======================
  // EDIT MODE
  // ======================
 function attachEditHandlers() {
  document.querySelectorAll(".edit-task").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-id");
      const task = btn.closest(".task");

      const titleEl = task.querySelector(".task-title");
      const descEl = task.querySelector(".task-desc");
      const actions = task.querySelector(".task-actions");

      const oldTitle = titleEl.textContent;
      const oldDesc = descEl.textContent;

      // Replace title + description with editable fields
      titleEl.innerHTML = `<input id="edit-title-${id}" value="${oldTitle}">`;
      descEl.innerHTML = `<textarea id="edit-desc-${id}" rows="3">${oldDesc}</textarea>`;

      // Hide original buttons
      actions.style.display = "none";

      // Create Save + Cancel (small buttons)
      const saveBtn = document.createElement("button");
      saveBtn.className = "save-task";
      saveBtn.innerHTML = "✔";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cancel-task";
      cancelBtn.innerHTML = "✖";

      // Insert them EXACTLY in the action area
      const newActions = document.createElement("div");
      newActions.className = "task-actions";
      newActions.appendChild(saveBtn);
      newActions.appendChild(cancelBtn);

      actions.parentNode.appendChild(newActions);

      // Save action
      saveBtn.onclick = async () => {
        const updatedTitle = document.getElementById(`edit-title-${id}`).value.trim();
        const updatedDesc = document.getElementById(`edit-desc-${id}`).value.trim();

        const oldScroll = window.scrollY;            // 1. Remember scroll

        // Update task
        await fetch(`/task/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: updatedTitle, description: updatedDesc })
        });

        // Refresh summary
        await fetch(`/task/${id}/refresh-summary`, { method: "POST" });

        showNotification("Task updated");

        // 2. Reload tasks up to the currentPage
        document.getElementById("tasks").innerHTML = "";

        for (let p = 1; p <= currentPage; p++) {
          await fetchTasks(document.getElementById("search").value, p);
        }

        // 3. Restore scroll
        window.scrollTo(0, oldScroll);

      };


    // Cancel action
    cancelBtn.onclick = () => {
        // Restore old values
        titleEl.textContent = oldTitle;
        descEl.textContent = oldDesc;

        // Remove Save + Cancel buttons
        newActions.remove();

        // Show original actions again
        actions.style.display = "flex";
    };


    };
  });
}

  // Search
  document.getElementById("search").addEventListener("input", e => {
    currentPage = 1;
    fetchTasks(e.target.value.trim(), currentPage);
  });

  // Create Task
  document.getElementById("create").onclick = async () => {
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!title) return alert("Enter a title");

    await fetch("/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description })
    });

    document.getElementById("title").value = "";
    document.getElementById("description").value = "";

    currentPage = 1;
    fetchTasks();
  };

  window.addEventListener("scroll", () => {
    if (loading) return;

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 150) {
      currentPage++;
      fetchTasks(document.getElementById("search").value, currentPage);
    }
  });

  function showNotification(msg) {
    const n = document.getElementById("notification");
    n.innerText = msg;
    n.style.display = "block";
    setTimeout(() => n.style.display = "none", 2000);
  }

  fetchTasks();
