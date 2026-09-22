// ---------------------------------------------------
// The Daily Ledger — to-do list logic
// Tasks persist in this browser via localStorage.
// ---------------------------------------------------

const STORAGE_KEY = "daily-ledger-tasks";

const taskList = document.getElementById("taskList");
const entryForm = document.getElementById("entryForm");
const entryInput = document.getElementById("entryInput");
const emptyState = document.getElementById("emptyState");
const openCountEl = document.getElementById("openCount");
const doneCountEl = document.getElementById("doneCount");
const taskTemplate = document.getElementById("taskTemplate");
const todayDateEl = document.getElementById("todayDate");

let tasks = loadTasks();
let dragSourceId = null;

// ---------- Init ----------

todayDateEl.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

render();

// ---------- Storage ----------

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Could not read saved tasks:", err);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error("Could not save tasks:", err);
  }
}

// ---------- Add task ----------

entryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = entryInput.value.trim();
  if (!text) return;

  tasks.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    text,
    done: false,
  });

  entryInput.value = "";
  saveTasks();
  render();
  entryInput.focus();
});

// ---------- Render ----------

function render() {
  taskList.innerHTML = "";

  tasks.forEach((task, index) => {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);

    node.dataset.id = task.id;
    node.classList.toggle("is-done", task.done);

    node.querySelector(".task__index").textContent = String(index + 1).padStart(2, "0");

    const checkbox = node.querySelector(".task__checkbox");
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveTasks();
      render();
    });

    node.querySelector(".task__text").textContent = task.text;

    const copyBtn = node.querySelector(".task__copy");
    copyBtn.addEventListener("click", () => copyTaskText(task.text, copyBtn));

    const upBtn = node.querySelector('[data-dir="up"]');
    const downBtn = node.querySelector('[data-dir="down"]');
    upBtn.disabled = index === 0;
    downBtn.disabled = index === tasks.length - 1;
    upBtn.addEventListener("click", () => moveTask(index, index - 1));
    downBtn.addEventListener("click", () => moveTask(index, index + 1));

    node.querySelector(".task__remove").addEventListener("click", () => {
      tasks = tasks.filter((t) => t.id !== task.id);
      saveTasks();
      render();
    });

    attachDragHandlers(node, task.id);

    taskList.appendChild(node);
  });

  const openCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - openCount;
  openCountEl.textContent = openCount;
  doneCountEl.textContent = doneCount;

  emptyState.classList.toggle("is-visible", tasks.length === 0);
}

// ---------- Copy ----------

function copyTaskText(text, button) {
  const onCopied = () => {
    const original = button.textContent;
    button.textContent = "✓";
    button.classList.add("is-copied");
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove("is-copied");
    }, 1200);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onCopied).catch(() => fallbackCopy(text, onCopied));
  } else {
    fallbackCopy(text, onCopied);
  }
}

function fallbackCopy(text, onDone) {
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.style.position = "fixed";
  temp.style.opacity = "0";
  document.body.appendChild(temp);
  temp.select();
  try {
    document.execCommand("copy");
    onDone();
  } catch (err) {
    console.error("Copy failed:", err);
  }
  document.body.removeChild(temp);
}

// ---------- Reorder: arrow buttons ----------

function moveTask(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= tasks.length) return;
  const [moved] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, moved);
  saveTasks();
  render();
}

// ---------- Reorder: drag and drop ----------

function attachDragHandlers(node, id) {
  node.addEventListener("dragstart", () => {
    dragSourceId = id;
    node.classList.add("is-dragging");
  });

  node.addEventListener("dragend", () => {
    node.classList.remove("is-dragging");
    document.querySelectorAll(".task.is-over").forEach((el) => el.classList.remove("is-over"));
  });

  node.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (id !== dragSourceId) node.classList.add("is-over");
  });

  node.addEventListener("dragleave", () => {
    node.classList.remove("is-over");
  });

  node.addEventListener("drop", (e) => {
    e.preventDefault();
    node.classList.remove("is-over");
    if (!dragSourceId || dragSourceId === id) return;

    const fromIndex = tasks.findIndex((t) => t.id === dragSourceId);
    const toIndex = tasks.findIndex((t) => t.id === id);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, moved);

    dragSourceId = null;
    saveTasks();
    render();
  });
}
