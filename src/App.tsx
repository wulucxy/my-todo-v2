import { useState } from 'react';

interface TodoVersion {
  text: string;
  timestamp: number;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  versions: TodoVersion[];
  lastModified: number;
}

type FilterType = 'all' | 'active' | 'completed';

function App() {
  const [todos, setTodos] = useState<Todo[]>([
    {
      id: 1,
      text: '欢迎使用 Todo 应用！',
      completed: false,
      versions: [{ text: '欢迎使用 Todo 应用！', timestamp: Date.now() }],
      lastModified: Date.now(),
    },
    {
      id: 2,
      text: '点击复选框完成任务',
      completed: true,
      versions: [{ text: '点击复选框完成任务', timestamp: Date.now() }],
      lastModified: Date.now(),
    },
    {
      id: 3,
      text: '试试添加新任务吧',
      completed: false,
      versions: [{ text: '试试添加新任务吧', timestamp: Date.now() }],
      lastModified: Date.now(),
    },
  ]);
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [historyTodoId, setHistoryTodoId] = useState<number | null>(null);

  const addTodo = () => {
    if (newTodo.trim() === '') return;
    const now = Date.now();
    const todo: Todo = {
      id: now,
      text: newTodo.trim(),
      completed: false,
      versions: [{ text: newTodo.trim(), timestamp: now }],
      lastModified: now,
    };
    setTodos([todo, ...todos]);
    setNewTodo('');
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const toggleComplete = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, lastModified: Date.now() } : todo
      )
    );
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
  };

  const saveEditing = () => {
    if (editingText.trim() === '') return;
    const now = Date.now();
    setTodos(
      todos.map((todo) => {
        if (todo.id === editingId) {
          return {
            ...todo,
            text: editingText.trim(),
            lastModified: now,
            versions: [...todo.versions, { text: editingText.trim(), timestamp: now }],
          };
        }
        return todo;
      })
    );
    setEditingId(null);
    setEditingText('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  const rollbackToVersion = (todoId: number, version: TodoVersion) => {
    const now = Date.now();
    setTodos(
      todos.map((todo) => {
        if (todo.id === todoId) {
          return {
            ...todo,
            text: version.text,
            lastModified: now,
            versions: [...todo.versions, { text: version.text, timestamp: now }],
          };
        }
        return todo;
      })
    );
    setHistoryTodoId(null);
  };

  const clearCompleted = () => {
    setTodos(todos.filter((todo) => !todo.completed));
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.filter((todo) => todo.completed).length;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedTodo = historyTodoId ? todos.find((t) => t.id === historyTodoId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-6 py-10">
      {/* History Modal */}
      {historyTodoId && selectedTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
            <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-2xl font-bold text-gray-900">版本历史</h3>
                          <button
                            onClick={() => setHistoryTodoId(null)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="max-h-80 space-y-2 overflow-y-auto">
                          {[...selectedTodo.versions].reverse().map((version, index) => (
                            <div
                              key={version.timestamp}
                              className={`flex items-center justify-between rounded-xl border p-5 transition-all ${
                                index === 0
                                  ? 'border-indigo-200 bg-indigo-50'
                                  : 'border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              <div className="flex-1">
                                <p className={`text-lg ${index === 0 ? 'font-medium text-indigo-900' : 'text-gray-700'}`}>
                                  {version.text}
                                </p>
                                <p className="mt-1 text-sm text-gray-400">
                                  {index === 0 ? '当前版本' : formatTime(version.timestamp)}
                                </p>
                              </div>
                  {index !== 0 && (
                    <button
                                          onClick={() => rollbackToVersion(selectedTodo.id, version)}
                                          className="ml-3 rounded-lg bg-indigo-100 px-4 py-2 text-base font-medium text-indigo-600 hover:bg-indigo-200 transition-colors"
                                        >
                                          回滚
                                        </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl ring-1 ring-black/5">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Todo List
          </h1>
          <p className="mt-2 text-lg text-gray-500">记录你的待办事项</p>
        </div>

        {/* Add Todo */}
        <div className="flex gap-3">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="添加新任务..."
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-lg text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={addTodo}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95"
          >
            添加
          </button>
        </div>

        {/* Filter Tabs */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-5 py-3 text-base font-medium transition-all duration-200 ${
                                      filter === f
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已完成'}
                                  </button>
              ))}
            </div>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-sm text-gray-400 hover:text-red-500 transition-colors"
              >
                清除已完成
              </button>
            )}
          </div>
        )}

        {/* Todo List */}
        <div className="flex flex-col gap-3">
          {filteredTodos.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              {filter === 'all'
                ? '暂无待办事项'
                : filter === 'active'
                ? '没有进行中的任务'
                : '没有已完成的任务'}
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200"
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(todo.id)}
                  className={`relative h-6 w-6 flex-shrink-0 rounded-full border-2 transition-all duration-200 ${
                    todo.completed
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {todo.completed && (
                    <svg
                      className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                {/* Text */}
                {editingId === todo.id ? (
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing();
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    onBlur={saveEditing}
                    autoFocus
                    className="flex-1 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                ) : (
                  <span
                    className={`flex-1 cursor-pointer text-lg transition-all duration-200 ${
                                          todo.completed
                                            ? 'text-gray-400 line-through'
                                            : 'text-gray-700'
                                        }`}
                                        onDoubleClick={() => startEditing(todo)}
                                      >
                                        {todo.text}
                                      </span>
                )}

                {/* Actions */}
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setHistoryTodoId(todo.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-purple-600 transition-colors"
                    title="版本历史"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  {editingId !== todo.id && (
                    <button
                      onClick={() => startEditing(todo)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                      title="编辑"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="删除"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                        stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Stats */}
                {todos.length > 0 && (
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-base text-gray-500">
                    <span>
                      {activeCount} 项进行中 / {completedCount} 项已完成
                    </span>
                    <span>双击文本编辑任务 • 点击时钟查看历史</span>
                  </div>
                )}
      </div>
    </div>
  );
}

export default App;