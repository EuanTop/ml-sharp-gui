# SHARP(三维重建与预测模型) GUI
[中文版](./README.zh-CN.md) | [English](./README.md)

![Monalisa Example](example_monalisa.gif)


Apple SHARP（单图像3D人物-物体交互重建与预测）模型的现代化Web GUI，具有实时3D高斯溅射可视化和交互特效。

## 前置要求

**⚠️ 重要：首先安装Apple的SHARP**

本项目需要先安装Apple的SHARP模型才能使用：

```bash
# 克隆Apple的SHARP仓库
git clone https://github.com/apple/ml-sharp.git
cd ml-sharp

# 切换到测试过的commit版本
git checkout 1eaa046

# 按照官方说明安装SHARP
pip install -e .
```

详情请访问：https://github.com/apple/ml-sharp

## 安装步骤

### 1. 后端设置

```bash
cd ml-sharp-gui/backend

# 安装依赖
pip install -r requirements.txt

# 启动后端服务器
python app.py
```

后端将运行在 `http://localhost:5000`

### 2. 前端设置

```bash
cd ml-sharp-gui/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将运行在 `http://localhost:5173`

## 使用方法

1. **打开浏览器**访问 `http://localhost:5173`

2. **选择图片**使用"选图"按钮，或直接**导入PLY文件**

3. **配置参数**（可选）：
   - 点大小：调整高斯溅射点的大小
   - 模型缩放：缩放3D模型
   - 点数上限：生成的最大点数
   - 特效模式：选择Magic、Spread、Unroll、Twister或Rain特效

4. **点击"生成"**创建3D模型

5. **与3D视图交互**：
   - 鼠标左键拖拽：旋转镜头
   - 滚轮：缩放
   - 切换坐标轴/网格显示

6. **下载**生成的PLY模型，保存在 `backend/outputs/`

## 功能特性

- 🎨 实时3D高斯溅射可视化
- 🎬 多种动画特效（Magic Reveal, Spread, Unroll, Twister, Rain）
- 🌐 多语言支持（英、中、法、德、意、西、日、韩）
- 📦 PLY文件导入/导出
- ⚙️ 可自定义渲染参数
- 🎮 交互式镜头控制

## 系统要求

- Python 3.8+
- Node.js 16+
- 支持CUDA的GPU 或 Apple Silicon（MPS）

## License
[MIT License](LICENSE.txt)