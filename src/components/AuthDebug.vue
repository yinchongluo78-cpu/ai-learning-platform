<template>
  <div class="auth-debug">
    <h4>🔍 认证状态调试信息</h4>

    <div class="debug-section">
      <h5>加载状态：</h5>
      <p>isLoading: {{ isLoading }}</p>
    </div>

    <div class="debug-section">
      <h5>用户认证信息：</h5>
      <p>user存在: {{ !!user }}</p>
      <p v-if="user">用户ID: {{ user.id }}</p>
      <p v-if="user">邮箱: {{ user.email }}</p>
      <p v-if="user">邮箱已验证: {{ user.email_confirmed_at ? '是' : '否' }}</p>
    </div>

    <div class="debug-section">
      <h5>用户详细信息：</h5>
      <p>userProfile存在: {{ !!userProfile }}</p>
      <div v-if="userProfile">
        <p>姓名: {{ userProfile.name }}</p>
        <p>年龄: {{ userProfile.age }}</p>
        <p>手机: {{ userProfile.phone }}</p>
      </div>
    </div>

    <div class="debug-actions">
      <button @click="refreshAuth">刷新认证状态</button>
      <button @click="logOut" v-if="user">强制退出登录</button>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from '../composables/useAuth.js'

const { user, userProfile, isLoading, getCurrentUser, signOut } = useAuth()

async function refreshAuth() {
  await getCurrentUser()
}

async function logOut() {
  await signOut()
}
</script>

<style scoped>
.auth-debug {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  font-size: 12px;
}

.debug-section {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #dee2e6;
}

.debug-section h5 {
  margin: 0 0 5px 0;
  color: #495057;
}

.debug-section p {
  margin: 2px 0;
  color: #6c757d;
}

.debug-actions {
  display: flex;
  gap: 10px;
}

.debug-actions button {
  background: #007bff;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.debug-actions button:hover {
  background: #0056b3;
}
</style>