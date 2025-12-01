// 显示加载状态
function showLoading() {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="max-width: 800px; margin: 50px auto; padding: 20px; font-family: Arial, sans-serif; text-align: center;">
        <h1>gRPC-Web 客户端</h1>
        <p>正在加载...</p>
      </div>
    `;
  }
}

// 异步初始化函数
async function init() {
  try {
    console.log('开始加载 gRPC-Web 模块...');
    showLoading();
    
    // 使用动态导入来加载 ES 模块
    const grpcWebModule = await import('./proto/example_grpc_web_pb.js');
    const protoModule = await import('./proto/example_pb.js');

    console.log('模块加载成功:', { grpcWebModule, protoModule });

    // 从模块中提取需要的类（ES 模块使用 default 导出）
    const grpcWebExports = grpcWebModule.default || grpcWebModule;
    const protoExports = protoModule.default || protoModule;
    
    console.log('导出的类:', { 
      grpcWebKeys: Object.keys(grpcWebExports),
      protoKeys: Object.keys(protoExports)
    });
    
    const ExampleServiceClient = grpcWebExports.ExampleServiceClient;
    const ExampleServicePromiseClient = grpcWebExports.ExampleServicePromiseClient;
    const HelloRequest = protoExports.HelloRequest;
    const StreamRequest = protoExports.StreamRequest;

    if (!ExampleServiceClient || !ExampleServicePromiseClient || !HelloRequest || !StreamRequest) {
      throw new Error('无法找到所需的类: ' + JSON.stringify({
        ExampleServiceClient: !!ExampleServiceClient,
        ExampleServicePromiseClient: !!ExampleServicePromiseClient,
        HelloRequest: !!HelloRequest,
        StreamRequest: !!StreamRequest
      }));
    }

    // 创建客户端，连接到envoy代理
    // Promise 客户端用于普通 RPC
    const promiseClient = new ExampleServicePromiseClient('http://localhost:8080', null, null);
    // 普通客户端用于流式 RPC
    const streamClient = new ExampleServiceClient('http://localhost:8080', null, null);

    // 测试普通RPC调用
    async function testSayHello() {
      const request = new HelloRequest();
      request.setName('World');
      
      try {
        console.log('发送请求:', request.toObject());
        const response = await promiseClient.sayHello(request, {});
        console.log('SayHello Response:', response);
        console.log('Response type:', typeof response);
        console.log('Response methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(response)));
        console.log('Response message:', response.getMessage());
        document.getElementById('hello-result')!.textContent = response.getMessage();
      } catch (error: any) {
        console.error('SayHello Error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          metadata: error.metadata,
          stack: error.stack
        });
        document.getElementById('hello-result')!.textContent = 'Error: ' + (error.message || error);
      }
    }

    // 测试流式RPC调用
    function testStreamMessages() {
      const request = new StreamRequest();
      request.setMessage('Hello from stream');
      request.setCount(5);
      
      const stream = streamClient.streamMessages(request, {});
      const resultDiv = document.getElementById('stream-result')!;
      resultDiv.innerHTML = '<p>开始接收流式消息...</p>';
      
      stream.on('data', (response: any) => {
        console.log('Stream Response:', response.getMessage(), 'Index:', response.getIndex());
        const p = document.createElement('p');
        p.textContent = `[${response.getIndex()}] ${response.getMessage()}`;
        resultDiv.appendChild(p);
      });
      
      stream.on('error', (error: any) => {
        console.error('Stream Error:', error);
        const p = document.createElement('p');
        p.style.color = 'red';
        p.textContent = 'Error: ' + (error.message || error);
        resultDiv.appendChild(p);
      });
      
      stream.on('end', () => {
        console.log('Stream ended');
        const p = document.createElement('p');
        p.style.color = 'green';
        p.textContent = '流式传输完成';
        resultDiv.appendChild(p);
      });
    }

    // 创建UI
    function createUI() {
      const app = document.getElementById('app')!;
      app.innerHTML = `
        <div style="max-width: 800px; margin: 50px auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1>gRPC-Web 客户端示例</h1>
          
          <div style="margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2>普通RPC调用</h2>
            <button id="hello-btn" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
              调用 SayHello
            </button>
            <div id="hello-result" style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px;">
              等待调用...
            </div>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2>流式RPC调用</h2>
            <button id="stream-btn" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
              调用 StreamMessages
            </button>
            <div id="stream-result" style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; max-height: 300px; overflow-y: auto;">
              等待调用...
            </div>
          </div>
        </div>
      `;
      
      document.getElementById('hello-btn')!.addEventListener('click', testSayHello);
      document.getElementById('stream-btn')!.addEventListener('click', testStreamMessages);
    }

    // 初始化UI
    createUI();
    console.log('初始化完成！');
  } catch (error: any) {
    console.error('初始化错误:', error);
    const errorMessage = error?.message || error?.toString() || '未知错误';
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="max-width: 800px; margin: 50px auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: red;">初始化失败</h1>
          <p><strong>错误:</strong> ${errorMessage}</p>
          <p>请检查浏览器控制台获取更多信息。</p>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto;">${error?.stack || ''}</pre>
        </div>
      `;
    } else {
      document.body.innerHTML = `
        <div style="max-width: 800px; margin: 50px auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: red;">严重错误</h1>
          <p>无法找到 app 元素</p>
          <p><strong>错误:</strong> ${errorMessage}</p>
        </div>
      `;
    }
  }
}

// 立即显示加载状态
showLoading();

// 确保 DOM 加载完成后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

