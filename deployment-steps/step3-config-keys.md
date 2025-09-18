# 第三步：配置密钥

## ⚠️ 重要提醒

**请立即完成此步骤！你需要将AccessKey配置到项目中才能继续。**

## 配置方法

### 1. 打开 `.env.local` 文件

文件位置：`/ai-learning-platform/.env.local`

### 2. 填入你的密钥

将文件中的占位符替换为实际值：

```env
# 阿里云OSS配置
VITE_OSS_REGION=oss-cn-shenzhen
VITE_OSS_ACCESS_KEY_ID=这里填入你的AccessKey_ID
VITE_OSS_ACCESS_KEY_SECRET=这里填入你的AccessKey_Secret
VITE_OSS_BUCKET=smartyouth-docs-luoyinchong

# 启用OSS（改为true启用）
VITE_USE_OSS=false
```

### 3. 密钥获取方式

如果你忘记了密钥，可以：

1. **查看之前保存的文件**（推荐）
   - 你应该在创建RAM用户时保存了密钥

2. **重新生成**（如果丢失）
   - 登录阿里云RAM控制台
   - 找到用户 `smartyouth-oss-user`
   - 点击"创建AccessKey"
   - 记得立即保存！

## ⚠️ 安全警告

1. **不要提交到Git**
   - `.env.local` 已在 `.gitignore` 中
   - 永远不要把密钥提交到代码仓库

2. **不要分享密钥**
   - 不要截图包含密钥的内容
   - 不要在聊天中发送密钥

3. **定期更换**
   - 建议每3个月更换一次密钥

## 验证配置

配置完成后，告诉我：
- "我已配置好密钥"

我会帮你测试OSS连接是否正常。

---

**注意**：在你配置好密钥之前，我们无法测试OSS上传功能。请现在就完成这一步！