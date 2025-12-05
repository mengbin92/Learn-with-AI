package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	pb "github.com/example/proto"
	"github.com/gorilla/websocket"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const (
	grpcServerAddr = "localhost:50051"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许所有来源，生产环境应该限制
	},
}

// WebSocket消息格式
type WSMessage struct {
	Type    string          `json:"type"`    // "request" 或 "response"
	Method  string          `json:"method"`  // "SayHello" 或 "StreamMessages"
	ID      string          `json:"id"`      // 请求ID，用于匹配响应
	Payload json.RawMessage `json:"payload"` // 请求/响应数据
	Error   string          `json:"error,omitempty"`
}

// WebSocket桥接服务
func websocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket升级失败: %v", err)
		return
	}
	defer conn.Close()

	log.Println("WebSocket连接已建立")

	// 连接到gRPC服务
	grpcConn, err := grpc.NewClient(grpcServerAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Printf("连接gRPC服务失败: %v", err)
		sendError(conn, "", "连接gRPC服务失败: "+err.Error())
		return
	}
	defer grpcConn.Close()

	client := pb.NewExampleServiceClient(grpcConn)

	// 处理WebSocket消息
	for {
		var msg WSMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket读取错误: %v", err)
			}
			break
		}

		log.Printf("收到WebSocket消息: %+v", msg)

		// 根据方法类型处理请求
		switch msg.Method {
		case "SayHello":
			go handleSayHello(conn, client, msg)
		case "StreamMessages":
			go handleStreamMessages(conn, client, msg)
		default:
			sendError(conn, msg.ID, "未知的方法: "+msg.Method)
		}
	}

	log.Println("WebSocket连接已关闭")
}

// 处理SayHello请求
func handleSayHello(conn *websocket.Conn, client pb.ExampleServiceClient, msg WSMessage) {
	var req pb.HelloRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		sendError(conn, msg.ID, "解析请求失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp, err := client.SayHello(ctx, &req)
	if err != nil {
		sendError(conn, msg.ID, "gRPC调用失败: "+err.Error())
		return
	}

	// 发送响应
	response := WSMessage{
		Type:    "response",
		Method:  "SayHello",
		ID:      msg.ID,
		Payload: marshalResponse(resp),
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("发送响应失败: %v", err)
	}
}

// 处理StreamMessages请求
func handleStreamMessages(conn *websocket.Conn, client pb.ExampleServiceClient, msg WSMessage) {
	var req pb.StreamRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		sendError(conn, msg.ID, "解析请求失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	stream, err := client.StreamMessages(ctx, &req)
	if err != nil {
		sendError(conn, msg.ID, "创建流失败: "+err.Error())
		return
	}

	// 接收流式响应
	for {
		resp, err := stream.Recv()
		if err != nil {
			// 流结束
			if err == io.EOF {
				// 发送流结束标记
				endMsg := WSMessage{
					Type:    "response",
					Method:  "StreamMessages",
					ID:      msg.ID,
					Payload: json.RawMessage(`{"end": true}`),
				}
				conn.WriteJSON(endMsg)
			} else {
				sendError(conn, msg.ID, "接收流失败: "+err.Error())
			}
			break
		}

		// 发送流式响应
		streamMsg := WSMessage{
			Type:    "response",
			Method:  "StreamMessages",
			ID:      msg.ID,
			Payload: marshalResponse(resp),
		}

		if err := conn.WriteJSON(streamMsg); err != nil {
			log.Printf("发送流式响应失败: %v", err)
			break
		}
	}
}

// 发送错误消息
func sendError(conn *websocket.Conn, id, errorMsg string) {
	msg := WSMessage{
		Type:  "response",
		ID:    id,
		Error: errorMsg,
	}
	conn.WriteJSON(msg)
}

// 将protobuf消息序列化为JSON
func marshalResponse(resp interface{}) json.RawMessage {
	// 使用protobuf的JSON序列化
	var data []byte
	var err error

	switch v := resp.(type) {
	case *pb.HelloResponse:
		data, err = json.Marshal(map[string]interface{}{
			"message": v.GetMessage(),
		})
	case *pb.StreamResponse:
		data, err = json.Marshal(map[string]interface{}{
			"message": v.GetMessage(),
			"index":   v.GetIndex(),
		})
	default:
		data, err = json.Marshal(resp)
	}

	if err != nil {
		log.Printf("序列化响应失败: %v", err)
		return json.RawMessage(`{}`)
	}
	return json.RawMessage(data)
}
