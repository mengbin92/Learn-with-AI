# Proto 文件编译指南

本文档说明如何编译 `proto/example.proto` 文件生成 Go 和 TypeScript 代码。

## 前置依赖

### 1. 安装 Protocol Buffers 编译器 (protoc)

**macOS:**
```bash
brew install protobuf
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install protobuf-compiler

# 或从源码编译
# 下载: https://github.com/protocolbuffers/protobuf/releases
```

**验证安装:**
```bash
protoc --version
```

### 2. 安装 Go 插件

```bash
# 安装 protoc-gen-go (生成 Go 消息代码)
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest

# 安装 protoc-gen-go-grpc (生成 Go gRPC 代码)
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 确保 $GOPATH/bin 或 $GOBIN 在 PATH 中
export PATH=$PATH:$(go env GOPATH)/bin
```

**或使用 Makefile:**
```bash
make install-go
```

### 3. 安装 TypeScript 插件（可选，仅用于生成 TS 代码）

```bash
npm install -g protoc-gen-ts

# 或本地安装
cd client
npm install
cd ..
```

## 编译步骤

### 方式一：使用 Makefile（推荐）

#### 生成 Go 代码
```bash
make proto-go
```

这会生成以下文件：
- `proto/example.pb.go` - Go 消息定义
- `proto/example_grpc.pb.go` - Go gRPC 服务定义

#### 生成 TypeScript 代码
```bash
# 先安装客户端依赖
cd client && npm install && cd ..

# 生成 TypeScript 代码
make proto-ts
```

这会生成以下文件到 `client/src/proto/` 目录：
- `example_pb.js` - JavaScript 消息定义
- `example_pb.d.ts` - TypeScript 类型定义
- `example_grpc_web_pb.js` - gRPC-Web 客户端代码
- `example_grpc_web_pb.d.ts` - TypeScript 类型定义

### 方式二：手动编译

#### 生成 Go 代码

```bash
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/example.proto
```

**参数说明:**
- `--go_out=.` - 指定 Go 代码输出目录（当前目录）
- `--go_opt=paths=source_relative` - 使用相对路径
- `--go-grpc_out=.` - 指定 gRPC Go 代码输出目录
- `--go-grpc_opt=paths=source_relative` - 使用相对路径
- `proto/example.proto` - 输入的 proto 文件

#### 生成 TypeScript 代码

```bash
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
    --js_out=import_style=commonjs,binary:./client/src \
    --ts_out=service=grpc-web:./client/src \
    proto/example.proto
```

**参数说明:**
- `--plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts` - 指定 TypeScript 插件路径
- `--js_out=import_style=commonjs,binary:./client/src` - 生成 CommonJS 格式的 JavaScript 代码
- `--ts_out=service=grpc-web:./client/src` - 生成 gRPC-Web 服务的 TypeScript 代码
- `proto/example.proto` - 输入的 proto 文件

## 验证编译结果

### 检查 Go 代码

```bash
ls -la proto/
# 应该看到:
# - example.pb.go
# - example_grpc.pb.go
```

### 检查 TypeScript 代码

```bash
ls -la client/src/proto/
# 应该看到:
# - example_pb.js
# - example_pb.d.ts
# - example_grpc_web_pb.js
# - example_grpc_web_pb.d.ts
```

## 常见问题

### 1. 找不到 protoc-gen-go

**错误信息:**
```
protoc-gen-go: program not found or is not executable
```

**解决方法:**
```bash
# 确保插件已安装
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 检查 PATH
echo $PATH | grep -q "$(go env GOPATH)/bin" || export PATH=$PATH:$(go env GOPATH)/bin
```

### 2. 找不到 protoc-gen-ts

**错误信息:**
```
--plugin: protoc-gen-ts: system cannot find the file specified
```

**解决方法:**
```bash
# 全局安装
npm install -g protoc-gen-ts

# 或本地安装后使用完整路径
cd client && npm install && cd ..
# 然后使用 ./node_modules/.bin/protoc-gen-ts
```

### 3. Go 导入路径错误

如果生成的 Go 代码导入路径不正确，检查 `proto/example.proto` 中的 `go_package` 选项：

```protobuf
option go_package = "github.com/example/proto";
```

确保与 `go.mod` 中的模块名一致。

## 完整编译流程示例

```bash
# 1. 安装依赖
make install-go
cd client && npm install && cd ..

# 2. 生成 Go 代码
make proto-go

# 3. 生成 TypeScript 代码
make proto-ts

# 4. 验证
ls proto/
ls client/src/proto/
```

## 重新编译

如果修改了 proto 文件，直接重新运行编译命令即可：

```bash
make proto-go
make proto-ts
```

生成的文件会被覆盖更新。

