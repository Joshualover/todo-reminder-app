// 待办事项应用 v2.1 - 底部导航版本
class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.recurringTasks = JSON.parse(localStorage.getItem('recurringTasks')) || [];
        this.currentFilter = 'all';
        this.pomodoro = null;
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.requestNotificationPermission();
        this.render();
        this.initPomodoro();
        this.startRecurringTaskCheck();
    }

    cacheDOM() {
        this.dom = {
            // 底部导航
            navItems: document.querySelectorAll('.nav-item'),
            pages: document.querySelectorAll('.page'),
            // 待办事项
            todoInput: document.getElementById('todoInput'),
            reminderInput: document.getElementById('reminderInput'),
            priorityInput: document.getElementById('priorityInput'),
            recurrenceInput: document.getElementById('recurrenceInput'),
            addBtn: document.getElementById('addBtn'),
            todoList: document.getElementById('todoList'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            totalCount: document.getElementById('totalCount'),
            pendingCount: document.getElementById('pendingCount'),
            completedCount: document.getElementById('completedCount'),
            clearCompleted: document.getElementById('clearCompleted'),
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile'),
            // 番茄时钟
            pomodoroTimer: document.getElementById('pomodoroTimer'),
            pomodoroStatus: document.getElementById('pomodoroStatus'),
            pomodoroStart: document.getElementById('pomodoroStart'),
            pomodoroPause: document.getElementById('pomodoroPause'),
            pomodoroReset: document.getElementById('pomodoroReset'),
            pomodoroMode: document.getElementById('pomodoroMode'),
            // 定期任务
            recurringList: document.getElementById('recurringList'),
            addRecurringBtn: document.getElementById('addRecurringBtn'),
            recurringInput: document.getElementById('recurringInput'),
            recurringInterval: document.getElementById('recurringInterval'),
            // 通知
            notification: document.getElementById('notification')
        };
    }

    bindEvents() {
        // 底部导航切换
        this.dom.navItems.forEach(btn => {
            btn.addEventListener('click', () => this.switchPage(btn.dataset.page));
        });

        // 待办事项
        this.dom.addBtn.addEventListener('click', () => this.addTodo());
        this.dom.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        this.dom.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.updateFilterButtons();
                this.render();
            });
        });

        this.dom.clearCompleted.addEventListener('click', () => this.clearCompleted());
        this.dom.exportBtn.addEventListener('click', () => this.exportData());
        this.dom.importBtn.addEventListener('click', () => this.dom.importFile.click());
        this.dom.importFile.addEventListener('change', (e) => this.importData(e));

        // 番茄时钟
        this.dom.pomodoroStart.addEventListener('click', () => this.startPomodoro());
        this.dom.pomodoroPause.addEventListener('click', () => this.pausePomodoro());
        this.dom.pomodoroReset.addEventListener('click', () => this.resetPomodoro());
        if (this.dom.pomodoroMode) {
            this.dom.pomodoroMode.addEventListener('click', () => this.switchPomodoroMode());
        }

        // 定期任务
        this.dom.addRecurringBtn.addEventListener('click', () => this.addRecurringTask());
    }

    // ========== 底部导航切换 ==========
    switchPage(pageName) {
        // 更新导航按钮状态
        this.dom.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });

        // 更新页面显示
        this.dom.pages.forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageName}`);
        });
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    // ========== 待办事项功能 ==========
    addTodo() {
        const text = this.dom.todoInput.value.trim();
        if (!text) {
            this.showNotification('请输入待办事项内容', 'error');
            return;
        }

        const reminder = this.dom.reminderInput.value;
        const priority = this.dom.priorityInput.value;
        const recurrence = this.dom.recurrenceInput.value;

        const todo = {
            id: Date.now(),
            text,
            reminder: reminder || null,
            priority,
            recurrence: recurrence !== 'none' ? recurrence : null,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.unshift(todo);
        this.save();
        this.render();
        this.clearInputs();

        if (reminder) {
            this.scheduleReminder(todo);
        }

        this.showNotification('待办事项已添加！');
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            
            if (todo.completed && todo.recurrence) {
                this.createNextOccurrence(todo);
            }
            
            this.save();
            this.render();
        }
    }

    editTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            const newText = prompt('编辑待办事项:', todo.text);
            if (newText !== null && newText.trim()) {
                todo.text = newText.trim();
                this.save();
                this.render();
                this.showNotification('待办事项已更新');
            }
        }
    }

    deleteTodo(id) {
        if (confirm('确定要删除这个待办事项吗？')) {
            this.todos = this.todos.filter(t => t.id !== id);
            this.save();
            this.render();
            this.showNotification('待办事项已删除');
        }
    }

    clearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showNotification('没有已完成的待办事项', 'error');
            return;
        }

        if (confirm(`确定要清除 ${completedCount} 个已完成的待办事项吗？`)) {
            this.todos = this.todos.filter(t => !t.completed);
            this.save();
            this.render();
            this.showNotification(`已清除 ${completedCount} 个已完成事项`);
        }
    }

    updateFilterButtons() {
        this.dom.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'pending':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    formatReminder(reminder) {
        if (!reminder) return '';
        const date = new Date(reminder);
        const now = new Date();
        const diff = date - now;

        if (diff < 0) return '⏰ 已过期';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `⏰ ${days}天${hours}小时后`;
        if (hours > 0) return `⏰ ${hours}小时${minutes}分钟后`;
        return `⏰ ${minutes}分钟后`;
    }

    render() {
        const filteredTodos = this.getFilteredTodos();
        this.updateStats();

        if (filteredTodos.length === 0) {
            this.dom.todoList.innerHTML = `
                <div class="empty-state">
                    <p>还没有待办事项，添加一个吧！</p>
                </div>
            `;
            return;
        }

        this.dom.todoList.innerHTML = filteredTodos.map(todo => `
            <li class="todo-item priority-${todo.priority} ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} data-id="${todo.id}" />
                <div class="todo-content">
                    <div class="todo-text">${this.escapeHtml(todo.text)}</div>
                    <div class="todo-meta">
                        ${todo.reminder ? `<span>${this.formatReminder(todo.reminder)}</span>` : ''}
                        ${todo.recurrence ? `<span class="recurrence-badge">${this.getIntervalText(todo.recurrence)}</span>` : ''}
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="todo-btn edit-btn" data-id="${todo.id}" title="编辑">✏️</button>
                    <button class="todo-btn delete-btn" data-id="${todo.id}" title="删除">🗑️</button>
                </div>
            </li>
        `).join('');

        this.dom.todoList.querySelectorAll('.todo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.toggleTodo(id);
            });
        });

        this.dom.todoList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.editTodo(id);
            });
        });

        this.dom.todoList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.deleteTodo(id);
            });
        });
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const pending = total - completed;

        this.dom.totalCount.textContent = `总计: ${total}`;
        this.dom.pendingCount.textContent = `待完成: ${pending}`;
    }

    scheduleReminder(todo) {
        if (!todo.reminder) return;

        const reminderTime = new Date(todo.reminder).getTime();
        const now = new Date().getTime();
        const delay = reminderTime - now;

        if (delay > 0) {
            setTimeout(() => {
                if (!todo.completed) {
                    this.sendNotification(todo);
                }
            }, delay);
        }
    }

    sendNotification(todo) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 待办事项提醒', {
                body: todo.text,
                icon: '📝',
                tag: todo.id.toString()
            });
        }
        this.showNotification(`⏰ 提醒: ${todo.text}`);
    }

    startReminderCheck() {
        setInterval(() => {
            const now = new Date();
            this.todos.forEach(todo => {
                if (todo.reminder && !todo.completed && !todo.notified) {
                    const reminderTime = new Date(todo.reminder);
                    if (now >= reminderTime) {
                        this.sendNotification(todo);
                        todo.notified = true;
                        this.save();
                    }
                }
            });
        }, 60000);
    }

    // ========== 定期任务功能 ==========
    addRecurringTask() {
        const text = this.dom.recurringInput.value.trim();
        const interval = this.dom.recurringInterval.value;

        if (!text) {
            this.showNotification('请输入定期任务内容', 'error');
            return;
        }

        const task = {
            id: Date.now(),
            text,
            interval,
            lastCreated: null,
            createdAt: new Date().toISOString()
        };

        this.recurringTasks.push(task);
        this.saveRecurring();
        this.renderRecurring();
        this.dom.recurringInput.value = '';
        this.showNotification('定期任务已添加！');
    }

    deleteRecurringTask(id) {
        this.recurringTasks = this.recurringTasks.filter(t => t.id !== id);
        this.saveRecurring();
        this.renderRecurring();
        this.showNotification('定期任务已删除');
    }

    createNextOccurrence(todo) {
        const now = new Date();
        let nextDate = new Date(now);

        switch (todo.recurrence) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }

        const newTodo = {
            id: Date.now(),
            text: todo.text,
            reminder: nextDate.toISOString().slice(0, 16),
            priority: todo.priority,
            recurrence: todo.recurrence,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.push(newTodo);
        this.save();
        this.showNotification(`已创建下次任务：${todo.text}`);
    }

    startRecurringTaskCheck() {
        setInterval(() => {
            this.recurringTasks.forEach(task => {
                if (this.shouldCreateTask(task)) {
                    this.createTodoFromRecurring(task);
                }
            });
        }, 60 * 60 * 1000);
    }

    shouldCreateTask(task) {
        const now = new Date();
        const lastCreated = task.lastCreated ? new Date(task.lastCreated) : null;

        if (!lastCreated) return true;

        const diffDays = Math.floor((now - lastCreated) / (1000 * 60 * 60 * 24));

        switch (task.interval) {
            case 'daily': return diffDays >= 1;
            case 'weekly': return diffDays >= 7;
            case 'monthly': return diffDays >= 30;
            case 'yearly': return diffDays >= 365;
            default: return false;
        }
    }

    createTodoFromRecurring(task) {
        const now = new Date();
        let dueDate = new Date(now);

        switch (task.interval) {
            case 'daily':
                dueDate.setDate(dueDate.getDate() + 1);
                break;
            case 'weekly':
                dueDate.setDate(dueDate.getDate() + 7);
                break;
            case 'monthly':
                dueDate.setMonth(dueDate.getMonth() + 1);
                break;
            case 'yearly':
                dueDate.setFullYear(dueDate.getFullYear() + 1);
                break;
        }

        const todo = {
            id: Date.now(),
            text: task.text,
            reminder: dueDate.toISOString().slice(0, 16),
            priority: 'medium',
            recurrence: task.interval,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.push(todo);
        task.lastCreated = now.toISOString();
        this.save();
        this.saveRecurring();
        this.render();
        this.showNotification(`定期任务已创建：${task.text}`);
    }

    renderRecurring() {
        if (!this.dom.recurringList) return;

        if (this.recurringTasks.length === 0) {
            this.dom.recurringList.innerHTML = '<p class="empty-state">还没有定期任务</p>';
            return;
        }

        this.dom.recurringList.innerHTML = this.recurringTasks.map(task => `
            <li class="recurring-item">
                <div>
                    <span class="recurring-text">${this.escapeHtml(task.text)}</span>
                    <span class="recurring-badge">${this.getIntervalText(task.interval)}</span>
                </div>
                <button class="todo-btn delete-btn" onclick="app.deleteRecurringTask(${task.id})">🗑️</button>
            </li>
        `).join('');
    }

    getIntervalText(interval) {
        const map = {
            daily: '每天',
            weekly: '每周',
            monthly: '每月',
            yearly: '每年'
        };
        return map[interval] || interval;
    }

    // ========== 番茄时钟功能 ==========
    initPomodoro() {
        this.pomodoro = {
            minutes: 25,
            seconds: 0,
            isRunning: false,
            isWorkMode: true,
            interval: null
        };
        this.updatePomodoroDisplay();
    }

    startPomodoro() {
        if (this.pomodoro.isRunning) return;

        this.pomodoro.isRunning = true;
        this.updatePomodoroButtons();
        
        this.pomodoro.interval = setInterval(() => {
            if (this.pomodoro.seconds === 0) {
                if (this.pomodoro.minutes === 0) {
                    this.completePomodoro();
                } else {
                    this.pomodoro.minutes--;
                    this.pomodoro.seconds = 59;
                }
            } else {
                this.pomodoro.seconds--;
            }
            this.updatePomodoroDisplay();
        }, 1000);

        this.showNotification(this.pomodoro.isWorkMode ? '🍅 开始专注工作！' : '☕ 开始休息！');
    }

    pausePomodoro() {
        if (!this.pomodoro.isRunning) return;

        this.pomodoro.isRunning = false;
        clearInterval(this.pomodoro.interval);
        this.updatePomodoroButtons();
        this.showNotification('⏸️ 番茄时钟已暂停');
    }

    resetPomodoro() {
        this.pausePomodoro();
        this.pomodoro.minutes = this.pomodoro.isWorkMode ? 25 : 5;
        this.pomodoro.seconds = 0;
        this.updatePomodoroDisplay();
        this.showNotification('🔄 番茄时钟已重置');
    }

    switchPomodoroMode() {
        this.pausePomodoro();
        this.pomodoro.isWorkMode = !this.pomodoro.isWorkMode;
        this.pomodoro.minutes = this.pomodoro.isWorkMode ? 25 : 5;
        this.pomodoro.seconds = 0;
        this.updatePomodoroDisplay();
        this.showNotification(this.pomodoro.isWorkMode ? '切换到工作模式' : '切换到休息模式');
    }

    completePomodoro() {
        this.pausePomodoro();
        
        if (this.pomodoro.isWorkMode) {
            this.showNotification('🎉 专注完成！休息一下吧~');
            this.pomodoro.isWorkMode = false;
            this.pomodoro.minutes = 5;
            this.pomodoro.seconds = 0;
        } else {
            this.showNotification('☕ 休息结束！继续加油~');
            this.pomodoro.isWorkMode = true;
            this.pomodoro.minutes = 25;
            this.pomodoro.seconds = 0;
        }
        
        this.updatePomodoroDisplay();
        this.playNotificationSound();
    }

    updatePomodoroDisplay() {
        if (!this.dom.pomodoroTimer) return;

        const minutes = String(this.pomodoro.minutes).padStart(2, '0');
        const seconds = String(this.pomodoro.seconds).padStart(2, '0');
        this.dom.pomodoroTimer.textContent = `${minutes}:${seconds}`;
        
        if (this.dom.pomodoroStatus) {
            this.dom.pomodoroStatus.textContent = this.pomodoro.isWorkMode ? '🍅 工作模式' : '☕ 休息模式';
        }
        
        document.title = `${minutes}:${seconds} - ${this.pomodoro.isWorkMode ? '专注中' : '休息中'}`;
    }

    updatePomodoroButtons() {
        if (this.dom.pomodoroStart) {
            this.dom.pomodoroStart.disabled = this.pomodoro.isRunning;
        }
        if (this.dom.pomodoroPause) {
            this.dom.pomodoroPause.disabled = !this.pomodoro.isRunning;
        }
    }

    playNotificationSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    // ========== 数据管理 ==========
    exportData() {
        const data = {
            todos: this.todos,
            recurringTasks: this.recurringTasks
        };
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('数据已导出');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.todos && Array.isArray(data.todos)) {
                    this.todos = [...data.todos, ...this.todos];
                    const uniqueTodos = [];
                    const seen = new Set();
                    this.todos.forEach(todo => {
                        if (!seen.has(todo.id)) {
                            seen.add(todo.id);
                            uniqueTodos.push(todo);
                        }
                    });
                    this.todos = uniqueTodos;
                    this.save();
                }

                if (data.recurringTasks && Array.isArray(data.recurringTasks)) {
                    this.recurringTasks = [...data.recurringTasks, ...this.recurringTasks];
                    const uniqueRecurring = [];
                    const seen = new Set();
                    this.recurringTasks.forEach(task => {
                        if (!seen.has(task.id)) {
                            seen.add(task.id);
                            uniqueRecurring.push(task);
                        }
                    });
                    this.recurringTasks = uniqueRecurring;
                    this.saveRecurring();
                }

                this.render();
                this.renderRecurring();
                this.showNotification('数据已导入');
            } catch (error) {
                this.showNotification('导入失败，文件格式错误', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    save() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    saveRecurring() {
        localStorage.setItem('recurringTasks', JSON.stringify(this.recurringTasks));
    }

    clearInputs() {
        this.dom.todoInput.value = '';
        this.dom.reminderInput.value = '';
        this.dom.priorityInput.value = 'medium';
        this.dom.recurrenceInput.value = 'none';
    }

    showNotification(message, type = 'success') {
        this.dom.notification.textContent = message;
        this.dom.notification.className = `notification ${type} show`;

        setTimeout(() => {
            this.dom.notification.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});
