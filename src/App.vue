<script setup>
import { computed } from 'vue'
import { themeConfig } from './config/theme-config.js'
import Toast from './components/Toast.vue'

// 获取背景样式
const bgStyle = computed(() => {
  const bg = themeConfig.backgrounds.main
  if (!bg || !bg.image) return {}

  return {
    backgroundImage: `url(${bg.image})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    filter: `blur(${bg.blur || 0}px)`,
    opacity: bg.opacity || 1
  }
})
</script>

<template>
  <div class="app">
    <!-- 自定义背景图片层 -->
    <div v-if="themeConfig.backgrounds.main.image"
         class="custom-bg-layer"
         :style="bgStyle">
      <div class="bg-overlay" :style="{ background: themeConfig.backgrounds.main.overlay }"></div>
    </div>

    <!-- 动态星空背景 -->
    <div v-if="themeConfig.stars.enabled" class="stars-bg"></div>

    <!-- 浮动粒子效果 -->
    <div v-if="themeConfig.particles.enabled" class="particles">
      <div v-for="i in themeConfig.particles.count" :key="i"
           class="particle"
           :style="{
             left: Math.random() * 100 + '%',
             animationDelay: Math.random() * themeConfig.particles.speed + 's',
             animationDuration: (Math.random() * themeConfig.particles.speed + themeConfig.particles.speed) + 's',
             background: themeConfig.particles.color
           }"></div>
    </div>

    <!-- 路由视图 -->
    <router-view />

    <!-- 全局Toast通知 -->
    <Toast />
  </div>
</template>

<style>
/* 引入科技感主题 */
@import './styles/tech-theme.css';
</style>

<style scoped>
.app {
  min-height: 100vh;
  position: relative;
  background: var(--dark-bg);
  width: 100%;
  /* 确保 app 容器不会缩小 */
  min-width: 100%;
}

/* 自定义背景图片层 */
.custom-bg-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

/* 加载屏幕 */
.loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 100;
}

.loading-content {
  text-align: center;
}

.loading-text {
  margin-top: 30px;
  font-size: 18px;
  color: var(--neon-blue);
  text-transform: uppercase;
  letter-spacing: 2px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}


/* 全局样式重置 */
* {
  box-sizing: border-box;
}

html {
  width: 100%;
  height: 100%;
}

body {
  margin: 0;
  padding: 0;
  background: var(--dark-bg);
  width: 100%;
  min-height: 100vh;
}
</style>
