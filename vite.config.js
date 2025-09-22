import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // 代码分割和性能优化
    rollupOptions: {
      output: {
        // 手动分包策略
        manualChunks: {
          // 基础框架
          'vendor-vue': ['vue', 'vue-router'],
          // Supabase相关
          'vendor-supabase': ['@supabase/supabase-js'],
          // Markdown和代码高亮
          'vendor-markdown': ['marked', 'marked-highlight', 'highlight.js'],
          // OSS上传（如果需要）
          'vendor-oss': ['ali-oss']
        },
        // 资源文件名模式
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除console
        drop_debugger: true
      }
    },
    // 文件大小警告限制
    chunkSizeWarningLimit: 500,
    // 资源内联限制
    assetsInlineLimit: 4096
  },
  // 开发服务器配置
  server: {
    port: 5173,
    host: true,
    // 预加载优化
    warmup: {
      clientFiles: [
        './src/main.js',
        './src/App.vue'
      ]
    }
  },
  // 依赖预构建优化
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@supabase/supabase-js'
    ],
    exclude: []
  }
})
