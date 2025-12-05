# gRPC-Web 示例项目

这是一个完整的 gRPC-Web 示例项目，包含：
- Go 实现的 gRPC 服务端（包含流式服务）
- TypeScript 客户端使用 gRPC-Web 调用服务
- WebSocket 桥接服务，支持通过 WebSocket 调用 gRPC 服务
- Envoy 代理配置，支持 gRPC-Web 和 WebSocket

## 项目结构

```
.
├── proto/              # Protocol Buffers 定义文件
├── server/             # Go gRPC 服务端
├── client/             # TypeScript gRPC-Web 客户端
├── envoy.yaml          # Envoy 代理配置
└── Makefile            # 构建脚本
```

## 前置要求

1. **Go** (1.21+)
2. **Node.js** (18+)
3. **Protocol Buffers Compiler** (protoc)
4. **Envoy** 代理

### 安装依赖

#### Go 依赖
```bash
make install-go
# 或手动安装
go mod download
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

#### Protocol Buffers
- macOS: `brew install protobuf`
- Linux: 从 https://github.com/protocolbuffers/protobuf/releases 下载

#### Envoy
- macOS: `brew install envoy`
- 或使用 Docker: `docker pull envoyproxy/envoy:latest`

## 使用步骤

### 1. 生成代码

生成 Go 代码：
```bash
make proto-go
```

生成 TypeScript 代码：
```bash
cd client
npm install
cd ..
# 需要安装 protoc-gen-ts
npm install -g protoc-gen-ts
make proto-ts
```

### 2. 启动 gRPC 服务端

```bash
make server
# 或
go run server/main.go
```

服务将在以下端口启动：
- `localhost:50051` - gRPC 服务
- `localhost:50052` - WebSocket 桥接服务

### 3. 启动 Envoy 代理

```bash
make envoy
# 或
envoy -c envoy.yaml
```

Envoy 将在 `localhost:8080` 启动，代理以下请求：
- gRPC-Web 请求到 gRPC 服务 (localhost:50051)
- WebSocket 请求到 WebSocket 桥接服务 (localhost:50052)

### 4. 启动客户端

```bash
cd client
npm install
npm run dev
```

客户端将在 `http://localhost:3000` 启动。

## 测试

### gRPC-Web 客户端
1. 打开浏览器访问 `http://localhost:3000`
2. 点击 "调用 SayHello" 按钮测试普通 RPC
3. 点击 "调用 StreamMessages" 按钮测试流式 RPC

### WebSocket 客户端
1. 打开浏览器访问 `http://localhost:3000/websocket_example.html`
2. 点击 "连接" 按钮建立 WebSocket 连接
3. 测试普通 RPC 和流式 RPC 调用

## 服务说明

### gRPC 服务端

- **SayHello**: 普通 RPC 调用，接收名字并返回问候语
- **StreamMessages**: 服务端流式 RPC，根据请求的 count 参数发送多条消息

### Envoy 配置

Envoy 配置了：
- gRPC-Web 支持（路径：`/`）
- WebSocket 支持（路径：`/ws`）
- CORS 支持
- HTTP/2 协议
- 代理到本地 gRPC 服务 (localhost:50051)
- 代理到本地 WebSocket 桥接服务 (localhost:50052)

### 客户端

项目提供两种客户端实现：

1. **gRPC-Web 客户端** (`src/main.ts`)
   - 使用 gRPC-Web 库
   - 通过 Envoy 代理调用 gRPC 服务
   - 支持普通 RPC 和流式 RPC

2. **WebSocket 客户端** (`src/websocket_client.ts`)
   - 使用原生 WebSocket API
   - 通过 Envoy 代理连接到 WebSocket 桥接服务
   - 桥接服务将 WebSocket 消息转换为 gRPC 调用
   - 支持普通 RPC 和流式 RPC

### WebSocket 桥接服务

WebSocket 桥接服务 (`server/websocket_bridge.go`) 实现了：
- WebSocket 连接管理
- WebSocket 消息到 gRPC 调用的转换
- gRPC 响应到 WebSocket 消息的转换
- 支持普通 RPC 和流式 RPC

## WebSocket 使用说明

### 为什么需要 WebSocket？

虽然 gRPC-Web 已经可以很好地工作，但在某些场景下，WebSocket 可能更适合：
- 需要双向实时通信
- 需要长连接保持
- 需要更细粒度的连接控制
- 某些网络环境对 HTTP/1.1 有限制

### WebSocket 架构

```
前端 WebSocket 客户端
    ↓
Envoy 代理 (localhost:8080/ws)
    ↓
WebSocket 桥接服务 (localhost:50052)
    ↓
gRPC 服务 (localhost:50051)
```

### WebSocket 消息格式

**请求消息：**
```json
{
  "type": "request",
  "method": "SayHello",
  "id": "req_1",
  "payload": {
    "name": "World"
  }
}
```

**响应消息：**
```json
{
  "type": "response",
  "method": "SayHello",
  "id": "req_1",
  "payload": {
    "message": "Hello World"
  }
}
```

**流式响应：**
```json
{
  "type": "response",
  "method": "StreamMessages",
  "id": "req_2",
  "payload": {
    "message": "Hello from stream",
    "index": 1
  }
}
```

## 故障排除

1. **端口冲突**: 确保以下端口未被占用：
   - 50051 (gRPC 服务)
   - 50052 (WebSocket 桥接服务)
   - 8080 (Envoy 代理)
   - 3000 (客户端开发服务器)
2. **protoc 未找到**: 确保 protoc 在 PATH 中
3. **依赖问题**: 
   - Go: 运行 `go mod download`
   - Node.js: 运行 `cd client && npm install`
4. **WebSocket 连接失败**: 
   - 确保 WebSocket 桥接服务已启动（端口 50052）
   - 检查 Envoy 配置中的 WebSocket 路由
   - 检查浏览器控制台的错误信息
