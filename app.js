// 待办事项应用
class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.requestNotificationPermission();
        this.render();
        this.startReminderCheck();
    }

    cacheDOM() {
        this.dom = {
            todoInput: document.getElementById('todoInput'),
            reminderInput: document.getElementById('reminderInput'),
            priorityInput: document.getElementById('priorityInput'),
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
            notification: document.getElementById('notification')
        };
    }

    bindEvents() {
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
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    addTodo() {
        const text = this.dom.todoInput.value.trim();
        if (!text) {
            this.showNotification('请输入待办事项内容', 'error');
            return;
        }

        const reminder = this.dom.reminderInput.value;
        const priority = this.dom.priorityInput.value;

        const todo = {
            id: Date.now(),
            text,
            reminder: reminder || null,
            priority,
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>还没有待办事项，添加一个吧！</p>
                </div>
            `;
            return;
        }

        this.dom.todoList.innerHTML = filteredTodos.map(todo => `
            <li class="todo-item priority-${todo.priority} ${todo.completed ? 'completed' : ''}">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} />
                <div class="todo-content">
                    <div class="todo-text">${this.escapeHtml(todo.text)}</div>
                    <div class="todo-meta">
                        ${todo.reminder ? `<span>${this.formatReminder(todo.reminder)}</span>` : ''}
                        <span>📅 ${new Date(todo.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="todo-btn edit-btn" title="编辑">✏️</button>
                    <button class="todo-btn delete-btn" title="删除">🗑️</button>
                </div>
            </li>
        `).join('');

        // 绑定事件
        this.dom.todoList.querySelectorAll('.todo-checkbox').forEach((checkbox, index) => {
            checkbox.addEventListener('change', () => this.toggleTodo(filteredTodos[index].id));
        });

        this.dom.todoList.querySelectorAll('.edit-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => this.editTodo(filteredTodos[index].id));
        });

        this.dom.todoList.querySelectorAll('.delete-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => this.deleteTodo(filteredTodos[index].id));
        });
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const pending = total - completed;

        this.dom.totalCount.textContent = `总计: ${total}`;
        this.dom.pendingCount.textContent = `待完成: ${pending}`;
        this.dom.completedCount.textContent = `已完成: ${completed}`;
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
        // 每分钟检查一次待提醒的事项
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

    exportData() {
        const dataStr = JSON.stringify(this.todos, null, 2);
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
                const importedTodos = JSON.parse(e.target.result);
                if (Array.isArray(importedTodos)) {
                    this.todos = [...importedTodos, ...this.todos];
                    // 去重
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
                    this.render();
                    this.showNotification(`已导入 ${importedTodos.length} 条待办事项`);
                }
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

    clearInputs() {
        this.dom.todoInput.value = '';
        this.dom.reminderInput.value = '';
        this.dom.priorityInput.value = 'medium';
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
    new TodoApp();
});
