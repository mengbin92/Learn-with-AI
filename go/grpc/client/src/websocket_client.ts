// WebSocket客户端，用于通过WebSocket调用gRPC服务

interface WSMessage {
  type: 'request' | 'response';
  method?: string;
  id: string;
  payload?: any;
  error?: string;
}

export class WebSocketGRPCClient {
  private ws: WebSocket | null = null;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    streamCallback?: (data: any) => void;
  }> = new Map();
  private requestIdCounter = 0;

  constructor(private url: string) {}

  // 连接到WebSocket服务器
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket连接已建立');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket连接已关闭');
        this.ws = null;
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      };
    });
  }

  // 处理收到的消息
  private handleMessage(msg: WSMessage) {
    if (msg.type === 'response') {
      const pending = this.pendingRequests.get(msg.id);
      if (!pending) {
        console.warn('收到未知ID的响应:', msg.id);
        return;
      }

      if (msg.error) {
        pending.reject(new Error(msg.error));
        this.pendingRequests.delete(msg.id);
        return;
      }

      // 检查是否是流结束标记
      if (msg.payload && msg.payload.end === true) {
        if (pending.streamCallback) {
          // 流结束，但不删除pending，因为可能还有后续消息
          return;
        }
        this.pendingRequests.delete(msg.id);
        return;
      }

      // 流式响应
      if (msg.method === 'StreamMessages' && pending.streamCallback) {
        pending.streamCallback(msg.payload);
        return;
      }

      // 普通响应
      pending.resolve(msg.payload);
      this.pendingRequests.delete(msg.id);
    }
  }

  // 调用SayHello方法
  async sayHello(name: string): Promise<{ message: string }> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket未连接');
    }

    const id = `req_${++this.requestIdCounter}`;
    const request: WSMessage = {
      type: 'request',
      method: 'SayHello',
      id,
      payload: { name },
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(request));
    });
  }

  // 调用StreamMessages方法（流式）
  streamMessages(
    message: string,
    count: number,
    onData: (data: { message: string; index: number }) => void,
    onError?: (error: Error) => void,
    onEnd?: () => void
  ): () => void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket未连接');
    }

    const id = `req_${++this.requestIdCounter}`;
    const request: WSMessage = {
      type: 'request',
      method: 'StreamMessages',
      id,
      payload: { message, count },
    };

    let ended = false;

    const cleanup = () => {
      ended = true;
      this.pendingRequests.delete(id);
    };

    this.pendingRequests.set(id, {
      resolve: () => {
        if (!ended && onEnd) {
          onEnd();
        }
        cleanup();
      },
      reject: (error) => {
        if (!ended && onError) {
          onError(error);
        }
        cleanup();
      },
      streamCallback: (data) => {
        if (!ended) {
          onData(data);
        }
      },
    });

    this.ws.send(JSON.stringify(request));

    // 返回取消函数
    return () => {
      cleanup();
    };
  }

  // 断开连接
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
  }
}

