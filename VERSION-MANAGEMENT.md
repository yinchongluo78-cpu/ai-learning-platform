# 版本管理指南

## Vercel部署历史

### 查看历史部署
1. 登录Vercel控制台
2. 进入项目 → "Deployments"标签
3. 可以看到所有历史部署记录
4. 每个部署都有独立的URL

### 回滚到之前版本
在Vercel中：
1. 找到想要回滚的历史部署
2. 点击三个点菜单"..."
3. 选择"Promote to Production"
4. 即可立即回滚到该版本

## Git版本管理

### 常用命令

#### 查看版本历史
```bash
# 查看简洁历史
git log --oneline

# 查看详细历史
git log -p

# 查看最近5次提交
git log -5
```

#### 回滚操作

##### 方法1：回滚到指定版本
```bash
# 查看历史
git log --oneline

# 回滚到指定版本（会丢失之后的提交）
git reset --hard <commit-id>

# 强制推送
git push -f origin main
```

##### 方法2：撤销最近的提交（保留历史）
```bash
# 创建一个新提交来撤销之前的改动
git revert HEAD

# 推送
git push origin main
```

##### 方法3：临时切换到旧版本
```bash
# 切换到旧版本查看
git checkout <commit-id>

# 切回最新版本
git checkout main
```

## 创建版本标签

为重要版本创建标签：

```bash
# 创建标签
git tag -a v1.0.0 -m "第一个正式版本"

# 推送标签
git push origin v1.0.0

# 查看所有标签
git tag -l
```

## 备份策略

### 自动备份
- ✅ Git仓库（本地）
- ✅ GitHub（远程）
- ✅ Vercel部署历史

### 手动备份建议
1. 定期下载GitHub仓库ZIP包
2. 重要更新前创建分支
3. 数据库定期导出备份

## 查看文件历史

### 查看某个文件的修改历史
```bash
# 查看文件所有提交
git log -- src/views/Knowledge.vue

# 查看文件具体改动
git log -p src/views/Knowledge.vue

# 恢复删除的文件
git checkout <commit-id> -- <file-path>
```

## 最佳实践

1. **频繁提交**：小步快跑，每个功能一个提交
2. **清晰的提交信息**：描述做了什么改动
3. **使用标签**：为重要版本打标签
4. **分支管理**：
   - main：生产环境
   - dev：开发环境
   - feature/*：新功能开发

## 紧急回滚流程

如果线上出现严重问题：

### 选项1：Vercel快速回滚（最快）
1. 登录Vercel
2. 找到上一个正常的部署
3. "Promote to Production"
4. 立即生效

### 选项2：Git回滚
```bash
# 回滚最近的提交
git revert HEAD
git push origin main

# 或者回滚到指定版本
git reset --hard <safe-commit-id>
git push -f origin main
```

## 版本命名建议

- v1.0.0 - 主要版本
- v1.1.0 - 新功能
- v1.1.1 - Bug修复

示例：
```bash
git tag -a v1.0.0 -m "初始版本"
git tag -a v1.1.0 -m "添加OSS直传功能"
git tag -a v1.1.1 -m "修复Toast通知问题"
```