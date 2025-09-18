# 🎨 自定义背景图片使用指南

## 如何添加自己的背景图片

### 步骤 1：准备图片
- 推荐尺寸：1920x1080 或更高
- 支持格式：JPG、PNG、WebP
- 文件大小：建议不超过 2MB

### 步骤 2：放置图片
把你的图片文件放在这个文件夹（`public/backgrounds/`）中

### 步骤 3：配置背景
打开 `src/config/theme-config.js` 文件，修改相应的配置：

```javascript
// 登录页背景
backgrounds: {
  login: {
    image: '/backgrounds/你的图片文件名.jpg',
    blur: 0,        // 模糊度（0-20）
    opacity: 1,     // 透明度（0-1）
    overlay: 'rgba(10, 14, 39, 0.7)'  // 覆盖层颜色
  }
}
```

### 步骤 4：保存并查看效果
保存文件后，页面会自动刷新显示新背景

## 推荐的免费图片网站

- [Unsplash](https://unsplash.com) - 高质量免费图片
- [Pexels](https://www.pexels.com) - 免费图片库
- [Pixabay](https://pixabay.com) - 免费图片和视频

## 示例配置

### 科技感背景
```javascript
image: '/backgrounds/tech-bg.jpg',
blur: 2,
opacity: 0.9,
overlay: 'rgba(0, 20, 40, 0.8)'
```

### 太空主题
```javascript
image: '/backgrounds/space.jpg',
blur: 0,
opacity: 1,
overlay: 'rgba(10, 0, 30, 0.6)'
```

### 渐变叠加
```javascript
image: '/backgrounds/abstract.jpg',
blur: 5,
opacity: 0.7,
overlay: 'linear-gradient(135deg, rgba(102, 126, 234, 0.5), rgba(118, 75, 162, 0.5))'
```

## 提示

- 深色背景图片效果最佳
- 可以通过调整 `blur` 和 `overlay` 来优化文字可读性
- 如果图片太亮，增加 `overlay` 的透明度
- 可以使用渐变色作为 `overlay` 创造独特效果