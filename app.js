// Splash screen: wait for load, then remove the splash div
document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('load', () => {
    const splash = document.getElementById('splash');
    if (!splash) return;

    // Wait for the splash animation (~2.2s) plus a small buffer
    setTimeout(() => {
      splash.remove(); // remove from DOM so the app is fully visible
    }, 2500);
  });
});

console.log("App Loaded", Date.now());

// Simple screen navigation
const screens = document.querySelectorAll('.screen');
const navItems = document.querySelectorAll('.nav-item');

function showScreen(id) {
  screens.forEach(s => {
    s.classList.toggle('active', s.id === id);
  });
  navItems.forEach(n => {
    n.classList.toggle('active', n.dataset.target === id);
  });
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetId = item.dataset.target;
    showScreen(targetId);
  });
});

// ===== Calendar + tasks (localStorage) =====
const monthTitle = document.getElementById('monthTitle');
const calendarGrid = document.getElementById('calendarGrid');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskListEl = document.getElementById('taskList');
const emptyTasksMsg = document.getElementById('emptyTasksMsg');

let currentYear, currentMonth; // month = 0-11
let selectedDateStr;           // "YYYY-MM-DD"

const STORAGE_KEY = 'taskTrackerTasks_v1';

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDateKey(y, m, d) {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function renderCalendar() {
  const today = new Date();
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

  monthTitle.textContent = firstDay.toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });

  calendarGrid.innerHTML = '';

  const tasks = loadTasks();

  // 6 rows * 7 columns = 42 cells
  for (let i = 0; i < 42; i++) {
    const cell = document.createElement('div');
    cell.classList.add('day-cell');

    let displayDay;
    let cellMonth = currentMonth;
    let cellYear = currentYear;
    let isOtherMonth = false;

    if (i < startWeekday) {
      // previous month
      displayDay = prevMonthLastDay - (startWeekday - 1 - i);
      isOtherMonth = true;
      if (currentMonth === 0) {
        cellMonth = 11;
        cellYear = currentYear - 1;
      } else {
        cellMonth = currentMonth - 1;
      }
    } else if (i >= startWeekday + daysInMonth) {
      // next month
      displayDay = i - (startWeekday + daysInMonth) + 1;
      isOtherMonth = true;
      if (currentMonth === 11) {
        cellMonth = 0;
        cellYear = currentYear + 1;
      } else {
        cellMonth = currentMonth + 1;
      }
    } else {
      // current month
      displayDay = i - startWeekday + 1;
    }

    cell.textContent = displayDay;

    if (isOtherMonth) {
      cell.classList.add('other-month');
    }

    const cellDateKey = formatDateKey(cellYear, cellMonth, displayDay);

    const todayFlag =
      today.getFullYear() === cellYear &&
      today.getMonth() === cellMonth &&
      today.getDate() === displayDay;

    if (todayFlag && !isOtherMonth) {
      cell.classList.add('today');
    }

    // mark tasks
    const dayTasks = tasks[cellDateKey] || [];
    if (dayTasks.length > 0) {
      const finished = dayTasks.filter(t => t.status === 'finished').length;
      const partial = dayTasks.filter(t => t.status === 'partial').length;
      const pending = dayTasks.filter(t => t.status === 'pending').length;

      const dot = document.createElement('div');
      dot.classList.add('day-dot');

      if (finished > 0 && pending === 0 && partial === 0) {
        // default accent = all done
      } else if (pending > 0 && finished === 0 && partial === 0) {
        dot.classList.add('pending');
      } else {
        dot.classList.add('partial');
      }

      cell.appendChild(dot);
    }

    cell.addEventListener('click', () => {
      selectedDateStr = cellDateKey;
      updateSelectedDateLabel();
      renderTaskList();
      document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
    });

    // auto_select today on first load
    if (!selectedDateStr && todayFlag && !isOtherMonth) {
      selectedDateStr = cellDateKey;
      cell.classList.add('selected');
    }

    calendarGrid.appendChild(cell);
  }

  if (!selectedDateStr) {
    selectedDateStr = formatDateKey(currentYear, currentMonth, 1);
  }

  updateSelectedDateLabel();
  renderTaskList();
}

function updateSelectedDateLabel() {
  const [y, m, d] = selectedDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  selectedDateLabel.textContent = dt.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function renderTaskList() {
  const tasks = loadTasks();
  const list = tasks[selectedDateStr] || [];

  taskListEl.innerHTML = '';
  if (list.length === 0) {
    emptyTasksMsg.style.display = 'block';
    return;
  }
  emptyTasksMsg.style.display = 'none';

list.forEach((t, index) => {
  const item = document.createElement('div');
  item.className = 'task-item';

  // serial number column
  const serial = document.createElement('div');
  serial.className = 'task-serial';
  serial.textContent = index + 1;

  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = t.title;

  const statusSelect = document.createElement('select');
  statusSelect.className = 'status-select';
  ['pending', 'partial', 'finished'].forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent =
      val === 'pending' ? 'Pending' :
      val === 'partial' ? 'Partially finished' :
      'Finished';
    statusSelect.appendChild(opt);
  });
  statusSelect.value = t.status;

  function applyStatusStyle() {
    statusSelect.classList.remove('pending', 'partial', 'finished');
    statusSelect.classList.add(t.status);
  }
  applyStatusStyle();

  statusSelect.addEventListener('change', () => {
    t.status = statusSelect.value;
    tasks[selectedDateStr][index] = t;
    saveTasks(tasks);
    applyStatusStyle();
    renderCalendar();
  });

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'task-btn';
  deleteBtn.title = 'Delete';
  deleteBtn.textContent = '✕';
  deleteBtn.addEventListener('click', () => {
    tasks[selectedDateStr].splice(index, 1);
    saveTasks(tasks);
    renderCalendar();
    renderTaskList();
  });

  actions.appendChild(deleteBtn);

  // append in order: serial | title | status | delete
  item.appendChild(serial);
  item.appendChild(title);
  item.appendChild(statusSelect);
  item.appendChild(actions);

  taskListEl.appendChild(item);
});

}

// Initialize on first load
function initCalendar() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  selectedDateStr = null;
  renderCalendar();
}

prevMonthBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
});

addTaskBtn.addEventListener('click', () => {
  const title = prompt('Enter task title:');
  if (!title) return;
  const tasks = loadTasks();
  if (!tasks[selectedDateStr]) tasks[selectedDateStr] = [];
  tasks[selectedDateStr].push({
    title: title.trim(),
    status: 'pending'
  });
  saveTasks(tasks);
  renderCalendar();
  renderTaskList();
});

// Start
initCalendar();
