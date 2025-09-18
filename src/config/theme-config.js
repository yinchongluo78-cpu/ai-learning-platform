// 主题配置文件
// 在这里可以自定义你的背景图片和主题设置

export const themeConfig = {
  // 背景图片设置
  backgrounds: {
    // 登录页背景（支持本地图片或网络图片）
    login: {
      // 方式1：使用默认星空背景（设为null）
      image: '/backgrounds/fengmian.png',

      // 方式2：使用本地图片（把图片放在public文件夹）
      // image: '/backgrounds/fengmian.png',

      // 方式3：使用网络图片
      // image: '/backgrounds/fengmian.png',

      // 背景模糊度（0-20）
      blur: 0,

      // 背景透明度（0-1）
      opacity: 1,

      // 背景覆盖层颜色（用于调整图片色调）
      overlay: 'rgba(10, 14, 39, 0.3)'
    },

    // 主应用背景
    main: {
      image: null,
      blur: 0,
      opacity: 1,
      overlay: 'rgba(10, 14, 39, 0.85)'
    }
  },

  // 粒子效果设置
  particles: {
    enabled: true,
    count: 20,
    color: '#00d4ff',
    speed: 10 // 速度（秒）
  },

  // 星空效果设置
  stars: {
    enabled: true,
    opacity: 0.3
  },

  // 主题颜色（可以自定义霓虹色）
  colors: {
    neonBlue: '#00d4ff',
    neonPurple: '#b74dff',
    neonPink: '#ff006e',
    neonGreen: '#00ff88'
  },

  // 动画设置
  animations: {
    // 是否启用动画
    enabled: true,
    // 动画速度倍数（1为正常速度）
    speed: 1
  }
}

// 应用背景图片的辅助函数
export function getBackgroundStyle(type = 'login') {
  const bg = themeConfig.backgrounds[type]

  if (!bg || !bg.image) {
    return {}
  }

  return {
    backgroundImage: `url(${bg.image})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    filter: bg.blur ? `blur(${bg.blur}px)` : 'none',
    opacity: bg.opacity,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: bg.overlay,
      pointerEvents: 'none'
    }
  }
}

// 如何使用自定义背景图片：
// 1. 把你的图片放在 public/backgrounds/ 文件夹下
// 2. 修改上面的 image 字段，例如：image: '/backgrounds/my-background.jpg'
// 3. 调整 blur（模糊度）和 overlay（覆盖层）来获得最佳效果
// 4. 保存文件，页面会自动刷新显示新背景