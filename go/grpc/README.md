# gRPC-Web 示例项目

这是一个完整的 gRPC-Web 示例项目，包含：
- Go 实现的 gRPC 服务端（包含流式服务）
- TypeScript 客户端使用 gRPC-Web 调用服务
- Envoy 代理配置

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

服务将在 `localhost:50051` 启动。

### 3. 启动 Envoy 代理

```bash
make envoy
# 或
envoy -c envoy.yaml
```

Envoy 将在 `localhost:8080` 启动，代理 gRPC-Web 请求到 gRPC 服务。

### 4. 启动客户端

```bash
cd client
npm install
npm run dev
```

客户端将在 `http://localhost:3000` 启动。

## 测试

1. 打开浏览器访问 `http://localhost:3000`
2. 点击 "调用 SayHello" 按钮测试普通 RPC
3. 点击 "调用 StreamMessages" 按钮测试流式 RPC

## 服务说明

### gRPC 服务端

- **SayHello**: 普通 RPC 调用，接收名字并返回问候语
- **StreamMessages**: 服务端流式 RPC，根据请求的 count 参数发送多条消息

### Envoy 配置

Envoy 配置了：
- gRPC-Web 支持
- CORS 支持
- HTTP/2 协议
- 代理到本地 gRPC 服务 (localhost:50051)

### 客户端

TypeScript 客户端使用 gRPC-Web 库，通过 Envoy 代理调用 gRPC 服务。

## 故障排除

1. **端口冲突**: 确保 50051 (gRPC), 8080 (Envoy), 3000 (客户端) 端口未被占用
2. **protoc 未找到**: 确保 protoc 在 PATH 中
3. **依赖问题**: 运行 `go mod download` 和 `cd client && npm install`
