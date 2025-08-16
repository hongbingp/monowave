# MonoWave 文件夹重命名指南

## 📋 重命名前的准备工作

### 1. 备份当前状态
```bash
# 确保所有更改已提交
git status
git add .
git commit -m "Complete project rename to MonoWave"

# 推送到远程仓库（如果有）
git push origin main  # 或你的默认分支
```

### 2. 检查当前路径引用
```bash
# 检查 Git 远程仓库配置
git remote -v

# 检查是否有硬编码的绝对路径
grep -r "/Users/hongbingpan/ADchain" . --exclude-dir=node_modules --exclude-dir=.git

# 检查环境变量
env | grep -i adchain
```

### 3. 关闭相关应用
- 关闭 IDE/编辑器
- 停止运行的服务器
- 关闭终端中的相关进程

## 🚀 安全重命名步骤

### 步骤 1: 创建新文件夹并移动文件
```bash
# 在上级目录执行
cd /Users/hongbingpan/

# 重命名文件夹
mv ADchain monowave

# 验证重命名成功
ls -la monowave/
```

### 步骤 2: 更新工作目录
```bash
# 进入新目录
cd monowave

# 验证 Git 仓库完整性
git status
git log --oneline -5
```

### 步骤 3: 检查和更新配置

#### Git 配置检查
```bash
# 检查 Git 是否正常工作
git status
git remote -v

# 如果远程 URL 包含旧路径，可能需要更新
# git remote set-url origin <new-url>
```

#### IDE 重新打开
```bash
# 使用新路径打开项目
code /Users/hongbingpan/monowave  # VSCode
cursor /Users/hongbingpan/monowave  # Cursor
```

### 步骤 4: 验证功能完整性
```bash
# 安装依赖（如果需要）
npm install

# 运行测试验证
npm run test:unit:current -- tests/unit/simple.test.js

# 启动开发服务器测试
npm run dev
```

## 🔍 可能需要手动更新的文件

### 1. IDE 工作区配置
```json
// .vscode/settings.json (如果存在)
{
  "eslint.workingDirectories": ["/Users/hongbingpan/monowave"]
}
```

### 2. 环境变量文件
```bash
# .env 文件中的路径（如果有）
LOG_PATH=/Users/hongbingpan/monowave/logs
```

### 3. Shell 配置文件
```bash
# ~/.bashrc 或 ~/.zshrc 中的别名
alias monowave='cd /Users/hongbingpan/monowave'
```

## ⚠️ 常见问题和解决方案

### 问题 1: Git 仓库损坏
```bash
# 检查 Git 完整性
git fsck

# 如果有问题，重新初始化（谨慎使用）
# git init
# git remote add origin <your-repo-url>
```

### 问题 2: Node.js 模块问题
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

### 问题 3: 权限问题
```bash
# 检查文件权限
ls -la
chmod -R 755 /Users/hongbingpan/monowave
```

### 问题 4: IDE 无法识别项目
- 关闭 IDE
- 删除 IDE 缓存文件
- 使用新路径重新打开项目

## 📊 重命名影响评估

### 🟢 无影响的部分
- **相对路径**: 项目内所有相对路径引用
- **npm 脚本**: package.json 中的脚本命令
- **代码逻辑**: 所有业务逻辑代码
- **数据库配置**: 相对路径的数据库文件
- **测试文件**: 相对路径的测试引用

### 🟡 可能受影响的部分
- **IDE 设置**: 工作区配置和历史记录
- **终端历史**: 命令历史中的路径
- **Git 远程 URL**: 如果包含路径信息
- **环境变量**: 包含绝对路径的配置

### 🔴 需要手动更新的部分
- **Shell 别名**: ~/.bashrc, ~/.zshrc 中的路径别名
- **系统服务**: 如果有系统级服务配置
- **部署脚本**: CI/CD 中的硬编码路径
- **文档**: 包含绝对路径的文档

## 🎯 推荐的重命名策略

### 策略 1: 简单重命名（推荐）
```bash
cd /Users/hongbingpan/
mv ADchain monowave
cd monowave
```

**优点**: 简单快速，大部分功能不受影响
**缺点**: 可能需要重新配置 IDE

### 策略 2: 创建新目录并复制
```bash
cd /Users/hongbingpan/
cp -r ADchain monowave
cd monowave
# 测试无误后删除旧目录
# rm -rf /Users/hongbingpan/ADchain
```

**优点**: 保留备份，更安全
**缺点**: 需要额外磁盘空间

### 策略 3: 符号链接过渡
```bash
cd /Users/hongbingpan/
mv ADchain monowave
ln -s monowave ADchain  # 创建向后兼容的链接
```

**优点**: 渐进式迁移，向后兼容
**缺点**: 可能造成混淆

## ✅ 重命名后的验证清单

- [ ] Git 仓库正常工作 (`git status`)
- [ ] npm 命令正常执行 (`npm run test`)
- [ ] IDE 可以正常打开项目
- [ ] 环境变量和配置正确
- [ ] 数据库连接正常
- [ ] 日志文件路径正确
- [ ] 所有脚本正常运行

## 📝 总结

文件夹重命名是完全可行的，主要影响是：

1. **终端路径变化**: 需要使用新路径
2. **IDE 重新配置**: 可能需要重新打开项目
3. **Git 仓库保持完整**: 不会影响版本历史
4. **代码功能不变**: 所有相对路径引用正常

**建议**: 选择策略 1（简单重命名），这是最直接和安全的方法。

---

**MonoWave 文件夹重命名** - 完整品牌统一的最后一步。
