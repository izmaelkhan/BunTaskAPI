// ============================================================================
// GLOBAL STATE
// ============================================================================

// Current pagination page
let currentPage = 1;

// Number of tasks per page
const limit = 5;

// Prevent duplicate auto-load calls during scroll
let loading = false;


// ============================================================================
// FETCH TASKS FROM SERVER (CORE RENDER FUNCTION)
// ============================================================================

async function fetchTasks(query = "", page = 1) {
  loading = true;

  // Build URL with pagination + text search
  const url =
    `/tasks?page=${page}&limit=${limit}` +
    (query ? `&query=${encodeURIComponent(query)}` : "");

  // Fetch from backend
  const res = await fetch(url);
  const json = await res.json();

  const container = document.getElementById("tasks");

  // If fresh load (page=1) → clear existing tasks
  if (page === 1) container.innerHTML = "";

  // Render each task
  json.forEach(t => {
    const el = document.createElement("div");
    el.className = "task";

    // NOTE:
    // A more scalable UI should use templating or Vue/React SSG,
    // but for now innerHTML is acceptable for small projects.
    el.innerHTML = `
      <div class="task-header">
        <div>
          <strong>#${t.id}</strong>
          <span class="task-title">${t.title}</span>
        </div>

        <div style="display:flex;align-items:center;gap:12px;">
          <div class="task-date-group">
            <div class="task-date" id="created-${t.id}">
              Created: ${formatDate(t.created_at)}
            </div>
            ${
              t.updated_at
                ? `<div class="task-date ${isRecentlyUpdated(t.updated_at) ? "highlight" : ""}" id="updated-${t.id}">
                    Updated: ${formatDate(t.updated_at)}
                  </div>`
                : `<div class="task-date" id="updated-${t.id}" style="display:none;"></div>`
            }
          </div>
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

  // Re-attach handlers since DOM elements were re-created
  attachRefreshHandlers();
  attachDeleteHandlers();
  attachEditHandlers();

  loading = false;
}


// ============================================================================
// REFRESH SUMMARY
// ============================================================================
// NOTE to future developer:
// This refresh updates ONLY the summary div (in-place) without re-rendering
// the full task list. This is good practice: reduces flicker + preserves scroll.
function attachRefreshHandlers() {
  // -------------------------------------------------------
// GLOBAL COOLDOWN MAP — prevents repeat refresh per task
// Keys: task IDs | Values: cooldown expiration timestamps
// -------------------------------------------------------
  const refreshCooldown = new Map();
  const COOLDOWN_MS = 5000; // 5 seconds per task cooldown

  document.querySelectorAll(".refresh-summary").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const summaryDiv = document.getElementById(`summary-${id}`);

      // ---- 1. Per-task cooldown ----
      const now = Date.now();
      const expiry = refreshCooldown.get(id);

      if (expiry && now < expiry) {
        const waitSec = Math.ceil((expiry - now) / 1000);
        alert(`Please wait ${waitSec}s before refreshing this summary again.`);
        return;
      }

      refreshCooldown.set(id, now + COOLDOWN_MS);

      // ---- 2. Spam protection: disable button ----
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";

      summaryDiv.innerHTML = '<span class="loading">Refreshing summary...</span>';

      try {
        const res = await fetch(`/task/${id}/refresh-summary`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to refresh summary");
        const data = await res.json();

        // Update summary text
        summaryDiv.textContent = data.summary;

        // Update updated_at UI
        const updatedEl = document.getElementById(`updated-${id}`);
        if (updatedEl) {
          updatedEl.style.display = "block";
          updatedEl.textContent = `Updated: ${formatDate(data.updated_at)}`;
          updatedEl.classList.add("highlight");
        }

      } catch (err) {
        console.error(err);
        summaryDiv.textContent = "— summary unavailable —";
      }

      // ---- 3. Re-enable button ----
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    };
  });


}


// ============================================================================
// DELETE TASK
// ============================================================================
// NOTE:
// Much better UX now — deletes DOM element only, avoiding full reload.
function attachDeleteHandlers() {
  document.querySelectorAll(".delete-task").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");

      if (!confirm("Are you sure you want to delete this task?")) return;

      try {
        const res = await fetch(`/task/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete task");

        // Remove item from DOM only — avoids flickering
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


// ============================================================================
// EDIT MODE: INLINE EDITING (title + description)
// ============================================================================

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

      // Swap text → input fields
      titleEl.innerHTML = `<input id="edit-title-${id}" value="${oldTitle}">`;
      descEl.innerHTML = `<textarea id="edit-desc-${id}" rows="3">${oldDesc}</textarea>`;

      // Hide original action buttons
      actions.style.display = "none";

      // Create Save / Cancel buttons in same position
      const saveBtn = document.createElement("button");
      saveBtn.className = "save-task";
      saveBtn.innerHTML = "✔";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cancel-task";
      cancelBtn.innerHTML = "✖";

      const newActions = document.createElement("div");
      newActions.className = "task-actions";
      newActions.appendChild(saveBtn);
      newActions.appendChild(cancelBtn);

      // Append editing buttons into actions container
      actions.parentNode.appendChild(newActions);


      // --------------------------------------------------
      // SAVE TASK EDIT
      // --------------------------------------------------
      saveBtn.onclick = async () => {
        const updatedTitle = document.getElementById(`edit-title-${id}`).value.trim();
        const updatedDesc  = document.getElementById(`edit-desc-${id}`).value.trim();

        const oldScroll = window.scrollY;

        // Send correct field names to backend
        const res = await fetch(`/task/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: updatedTitle,
            description: updatedDesc
          })
        });

        if (!res.ok) {
          showNotification("Update failed");
          return;
        }

        // Reload tasks to get updated_at
        currentPage = 1;
        await fetchTasks(document.getElementById("search").value, 1);

        // Auto-refresh summary after editing
        await fetch(`/task/${id}/refresh-summary`, { method: "POST" });

        showNotification(`Task #${id} updated`);

        // Restore scroll (avoid flicker / screen jump)
        window.scrollTo(0, oldScroll);
      };



      // --------------------------------------------------
      // CANCEL EDIT
      // --------------------------------------------------
      cancelBtn.onclick = () => {
        // Restore old text (soft cancel)
        titleEl.textContent = oldTitle;
        descEl.textContent = oldDesc;

        // Remove new buttons
        newActions.remove();

        // Restore original action buttons
        actions.style.display = "flex";
      };
    };
  });
}


  // ============================================================================
  // SEARCH BAR (LIVE FILTER)
  // ============================================================================

  document.getElementById("search").addEventListener("input", e => {
    currentPage = 1;
    fetchTasks(e.target.value.trim(), currentPage);
  });


  // ============================================================================
  // CREATE NEW TASK
  // ============================================================================

  document.getElementById("create").onclick = async () => {
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!title) return alert("Enter a title");

    await fetch("/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description })
    });

    // Clear fields
    document.getElementById("title").value = "";
    document.getElementById("description").value = "";

    // Reload fresh
    currentPage = 1;
    fetchTasks();
  };


// ============================================================================
// INFINITE SCROLL LOADER
// ============================================================================

window.addEventListener("scroll", () => {
  if (loading) return;

  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 150) {
    currentPage++;
    fetchTasks(document.getElementById("search").value, currentPage);
  }
});


// ============================================================================
// SMALL NOTIFICATION POPUP
// ============================================================================

function showNotification(msg) {
  const n = document.getElementById("notification");
  n.innerText = msg;
  n.style.display = "block";
  setTimeout(() => (n.style.display = "none"), 2000);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString();
}

function isRecentlyUpdated(updatedAt) {
  const updated = new Date(updatedAt).getTime();
  const now = Date.now();
  const diff = now - updated;

  // highlight if updated in the last 24 hours
  return diff < 24 * 60 * 60 * 1000;
}

// Initial load
fetchTasks();
