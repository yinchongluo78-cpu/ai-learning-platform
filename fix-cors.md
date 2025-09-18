# 修复OSS CORS问题

## 问题诊断
浏览器阻止了跨域请求，需要在阿里云OSS控制台配置CORS。

## 解决步骤

### 1. 登录阿里云OSS控制台
访问：https://oss.console.aliyun.com/

### 2. 找到你的Bucket
点击 `smartyouth-docs-luoyinchong`

### 3. 进入权限管理 → 跨域设置

### 4. 删除现有规则（如果有）

### 5. 创建新的CORS规则

**重要：请完全按照下面的配置**

```
来源（一行一个）：
http://localhost:5173
http://localhost:5174
http://localhost:4173
http://127.0.0.1:5173
https://localhost:5173
*

允许Methods（全选）：
✓ GET
✓ POST
✓ PUT
✓ DELETE
✓ HEAD
✓ OPTIONS

允许Headers：
*

暴露Headers：
ETag
x-oss-request-id
x-oss-version-id
Content-Length
x-oss-hash-crc64ecma
x-oss-object-type

缓存时间（秒）：
600

返回Vary: Origin：
✓ 是
```

### 6. 点击"确定"保存

### 7. 等待1-2分钟生效

## 验证步骤

1. 清除浏览器缓存（重要！）
   - Chrome: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

2. 重新访问测试页面
   - http://localhost:5173/test-oss

3. 再次尝试上传

## 如果还不行

### 方案A：使用通配符（临时测试）

在CORS来源中只填一个：
```
*
```

这会允许所有来源访问（不安全，仅测试用）

### 方案B：检查防盗链设置

1. 在Bucket详情页
2. 权限管理 → 防盗链
3. 确保没有启用，或者添加了localhost

### 方案C：检查Bucket权限

1. 在Bucket详情页
2. 权限管理 → 读写权限
3. 虽然设置为"私有"是对的，但可以临时改为"公共读"测试

## 常见错误

❌ **错误**：来源没有包含http://
✅ **正确**：http://localhost:5173

❌ **错误**：Methods没有全选
✅ **正确**：所有方法都要勾选

❌ **错误**：Headers写了具体值
✅ **正确**：允许Headers填 *

---

**完成配置后，告诉我结果！**