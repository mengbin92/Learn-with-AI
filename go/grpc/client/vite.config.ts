import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    include: ['grpc-web', 'google-protobuf']
  },
  server: {
    port: 3000,
    proxy: {
      '/example.ExampleService': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})

