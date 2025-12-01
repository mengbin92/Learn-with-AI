.PHONY: proto server client build

# 生成Go代码
proto-go:
	mkdir -p proto
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		proto/example.proto

# 生成TypeScript代码
proto-ts:
	mkdir -p client/src/proto
	# 生成 JavaScript 消息定义
	protoc --js_out=import_style=commonjs,binary:./client/src \
		--proto_path=proto proto/example.proto
	# 生成 gRPC-Web 服务代码
	protoc --plugin=protoc-gen-grpc-web=/opt/homebrew/bin/protoc-gen-grpc-web \
		--grpc-web_out=import_style=commonjs+dts,mode=grpcwebtext:./client/src \
		--proto_path=proto proto/example.proto
	# 移动文件到 proto 目录
	mv client/src/example_pb.js client/src/proto/ 2>/dev/null || true
	mv client/src/example_pb.d.ts client/src/proto/ 2>/dev/null || true
	mv client/src/example_grpc_web_pb.js client/src/proto/ 2>/dev/null || true
	mv client/src/example_grpc_web_pb.d.ts client/src/proto/ 2>/dev/null || true
	# 修复 CommonJS 为 ES 模块
	cd client && node fix-proto.js

# 运行服务器
server:
	go run server/main.go

# 构建服务器
build-server:
	go build -o bin/server server/main.go

# 安装依赖
install-go:
	go mod download
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

install-ts:
	cd client && npm install

# 运行客户端
client:
	cd client && npm run dev

# 运行envoy
envoy:
	envoy -c envoy.yaml

