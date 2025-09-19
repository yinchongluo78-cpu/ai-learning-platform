// 本地PDF.js Worker
// 如果CDN无法访问，使用这个本地版本
console.log('Using local PDF.js worker fallback');
self.importScripts = self.importScripts || function() {};