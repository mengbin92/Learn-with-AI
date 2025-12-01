#!/bin/bash

# 启动脚本 - 按顺序启动所有服务

echo "=== gRPC-Web 示例项目启动脚本 ==="

# 检查依赖
echo "1. 检查依赖..."
if ! command -v protoc &> /dev/null; then
    echo "错误: 未找到 protoc，请先安装 Protocol Buffers"
    exit 1
fi

if ! command -v envoy &> /dev/null; then
    echo "警告: 未找到 envoy，请先安装 Envoy"
    echo "macOS: brew install envoy"
    echo "或使用 Docker: docker pull envoyproxy/envoy:latest"
    exit 1
fi

# 生成 Go proto 代码
echo "2. 生成 Go proto 代码..."
make proto-go || {
    echo "错误: 生成 Go proto 代码失败"
    exit 1
}

# 下载 Go 依赖
echo "3. 下载 Go 依赖..."
go mod download || {
    echo "错误: 下载 Go 依赖失败"
    exit 1
}

# 安装客户端依赖
echo "4. 安装客户端依赖..."
cd client
if [ ! -d "node_modules" ]; then
    npm install || {
        echo "错误: 安装客户端依赖失败"
        exit 1
    }
fi
cd ..

# 生成 TypeScript proto 代码
echo "5. 生成 TypeScript proto 代码..."
if [ ! -f "node_modules/.bin/protoc-gen-ts" ]; then
    echo "警告: protoc-gen-ts 未找到，尝试安装..."
    npm install -g protoc-gen-ts || {
        echo "错误: 安装 protoc-gen-ts 失败"
        exit 1
    }
fi
make proto-ts || {
    echo "错误: 生成 TypeScript proto 代码失败"
    exit 1
}

echo ""
echo "=== 启动服务 ==="
echo "请在不同的终端窗口中运行以下命令："
echo ""
echo "终端 1 - gRPC 服务:"
echo "  make server"
echo ""
echo "终端 2 - Envoy 代理:"
echo "  make envoy"
echo ""
echo "终端 3 - 客户端:"
echo "  make client"
echo ""
echo "然后在浏览器中访问: http://localhost:3000"

