<template>
  <teleport to="body">
    <transition-group name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <div class="toast-icon">
          {{ getIcon(toast.type) }}
        </div>
        <div class="toast-content">
          <div class="toast-title" v-if="toast.title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-close" @click="removeToast(toast.id)">×</button>
      </div>
    </transition-group>
  </teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Toast列表
const toasts = ref([])
let toastId = 0

// 获取图标
function getIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[type] || icons.info
}

// 添加Toast
function addToast({ type = 'info', title = '', message = '', duration = 3000 }) {
  const id = ++toastId
  const toast = {
    id,
    type,
    title,
    message
  }

  toasts.value.push(toast)

  // 自动移除
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  return id
}

// 移除Toast
function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// Toast管理器
class ToastManager {
  show(message, type = 'info', duration = 3000) {
    return addToast({ type, message, duration })
  }

  success(message, duration = 3000) {
    return addToast({ type: 'success', message, duration })
  }

  error(message, duration = 5000) {
    return addToast({ type: 'error', message, duration })
  }

  warning(message, duration = 4000) {
    return addToast({ type: 'warning', message, duration })
  }

  info(message, duration = 3000) {
    return addToast({ type: 'info', message, duration })
  }

  remove(id) {
    removeToast(id)
  }

  clear() {
    toasts.value = []
  }
}

// 创建全局实例
const toastManager = new ToastManager()

// 监听自定义事件
function handleToastEvent(event) {
  const { type, message, title, duration } = event.detail
  addToast({ type, title, message, duration })
}

onMounted(() => {
  // 监听全局Toast事件
  window.addEventListener('show-toast', handleToastEvent)

  // 挂载到window对象，方便全局调用
  window.$toast = toastManager
})

onUnmounted(() => {
  window.removeEventListener('show-toast', handleToastEvent)
  delete window.$toast
})

// 暴露方法供外部使用
defineExpose({
  show: toastManager.show,
  success: toastManager.success,
  error: toastManager.error,
  warning: toastManager.warning,
  info: toastManager.info,
  clear: toastManager.clear
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 300px;
  max-width: 500px;
  padding: 16px;
  margin-bottom: 12px;
  background: rgba(20, 27, 45, 0.95);
  border-radius: 12px;
  border: 1px solid;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-success {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 27, 45, 0.95) 100%);
}

.toast-error {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(20, 27, 45, 0.95) 100%);
}

.toast-warning {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(20, 27, 45, 0.95) 100%);
}

.toast-info {
  border-color: #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(20, 27, 45, 0.95) 100%);
}

.toast-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.toast-message {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  word-wrap: break-word;
}

.toast-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  margin-left: 12px;
  opacity: 0.6;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.toast-close:hover {
  opacity: 1;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .toast-container {
    left: 10px;
    right: 10px;
  }

  .toast {
    min-width: auto;
    max-width: 100%;
  }
}
</style>