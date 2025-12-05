// WebSocket 示例页面的逻辑代码
import { WebSocketGRPCClient } from './websocket_client.js';

const client = new WebSocketGRPCClient('ws://localhost:8080/ws');
let streamCancel: (() => void) | null = null;

const statusDiv = document.getElementById('status')!;
const connectBtn = document.getElementById('connect-btn')!;
const disconnectBtn = document.getElementById('disconnect-btn')!;
const helloBtn = document.getElementById('hello-btn')!;
const streamBtn = document.getElementById('stream-btn')!;

function updateStatus(connected: boolean) {
  if (connected) {
    statusDiv.textContent = '已连接';
    statusDiv.className = 'status connected';
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    helloBtn.disabled = false;
    streamBtn.disabled = false;
  } else {
    statusDiv.textContent = '未连接';
    statusDiv.className = 'status disconnected';
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    helloBtn.disabled = true;
    streamBtn.disabled = true;
  }
}

connectBtn.addEventListener('click', async () => {
  try {
    await client.connect();
    updateStatus(true);
  } catch (error: any) {
    alert('连接失败: ' + error.message);
  }
});

disconnectBtn.addEventListener('click', () => {
  if (streamCancel) {
    streamCancel();
    streamCancel = null;
  }
  client.disconnect();
  updateStatus(false);
});

helloBtn.addEventListener('click', async () => {
  const nameInput = document.getElementById('name-input') as HTMLInputElement;
  const name = nameInput.value;
  const resultDiv = document.getElementById('hello-result')!;
  resultDiv.textContent = '调用中...';
  resultDiv.style.color = '';

  try {
    const response = await client.sayHello(name);
    resultDiv.textContent = `响应: ${response.message}`;
  } catch (error: any) {
    resultDiv.textContent = `错误: ${error.message}`;
    resultDiv.style.color = 'red';
  }
});

streamBtn.addEventListener('click', () => {
  const messageInput = document.getElementById('stream-message-input') as HTMLInputElement;
  const countInput = document.getElementById('stream-count-input') as HTMLInputElement;
  const message = messageInput.value;
  const count = parseInt(countInput.value) || 5;
  const resultDiv = document.getElementById('stream-result')!;
  resultDiv.innerHTML = '<p>开始接收流式消息...</p>';

  streamCancel = client.streamMessages(
    message,
    count,
    (data) => {
      const p = document.createElement('p');
      p.textContent = `[${data.index}] ${data.message}`;
      resultDiv.appendChild(p);
    },
    (error) => {
      const p = document.createElement('p');
      p.style.color = 'red';
      p.textContent = `错误: ${error.message}`;
      resultDiv.appendChild(p);
    },
    () => {
      const p = document.createElement('p');
      p.style.color = 'green';
      p.textContent = '流式传输完成';
      resultDiv.appendChild(p);
      streamCancel = null;
    }
  );
});

updateStatus(false);

