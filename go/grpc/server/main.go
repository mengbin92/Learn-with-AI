package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"sync"

	pb "github.com/example/proto"
	"google.golang.org/grpc"
)

const (
	grpcPort    = ":50051"
	wsPort      = ":50052"
)

// server 实现 ExampleService
type server struct {
	pb.UnimplementedExampleServiceServer
}

// SayHello 实现普通RPC方法
func (s *server) SayHello(ctx context.Context, req *pb.HelloRequest) (*pb.HelloResponse, error) {
	log.Printf("Received: %v", req.GetName())
	return &pb.HelloResponse{
		Message: "Hello " + req.GetName(),
	}, nil
}

// StreamMessages 实现服务端流式RPC方法
func (s *server) StreamMessages(req *pb.StreamRequest, stream pb.ExampleService_StreamMessagesServer) error {
	log.Printf("Stream request: message=%s, count=%d", req.GetMessage(), req.GetCount())

	count := req.GetCount()
	if count <= 0 {
		count = 5 // 默认发送5条消息
	}

	for i := int32(1); i <= count; i++ {
		response := &pb.StreamResponse{
			Message: req.GetMessage(),
			Index:   i,
		}

		if err := stream.Send(response); err != nil {
			log.Printf("Error sending stream: %v", err)
			return err
		}

		log.Printf("Sent stream message %d", i)
	}

	return nil
}

func main() {
	var wg sync.WaitGroup

	// 启动gRPC服务器
	wg.Add(1)
	go func() {
		defer wg.Done()
		lis, err := net.Listen("tcp", grpcPort)
		if err != nil {
			log.Fatalf("failed to listen: %v", err)
		}

		s := grpc.NewServer()
		pb.RegisterExampleServiceServer(s, &server{})

		log.Printf("gRPC server listening on %s", grpcPort)
		if err := s.Serve(lis); err != nil {
			log.Fatalf("failed to serve: %v", err)
		}
	}()

	// 启动WebSocket桥接服务器
	wg.Add(1)
	go func() {
		defer wg.Done()
		http.HandleFunc("/ws", websocketHandler)
		log.Printf("WebSocket bridge server listening on %s", wsPort)
		if err := http.ListenAndServe(wsPort, nil); err != nil {
			log.Fatalf("WebSocket server failed: %v", err)
		}
	}()

	wg.Wait()
}
