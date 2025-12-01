#!/usr/bin/env node
// 后处理脚本：将 CommonJS require 替换为 ES 模块导入

const fs = require('fs');
const path = require('path');

const protoDir = path.join(__dirname, 'src/proto');
const grpcWebFile = path.join(protoDir, 'example_grpc_web_pb.js');
const protoFile = path.join(protoDir, 'example_pb.js');

// 修复 grpc-web 文件
if (fs.existsSync(grpcWebFile)) {
  let content = fs.readFileSync(grpcWebFile, 'utf8');
  
  // 替换 require 为 import
  content = content.replace(
    /const grpc = {};\s*grpc\.web = require\('grpc-web'\);/,
    "import * as grpcWebLib from 'grpc-web';\nconst grpc = {};\ngrpc.web = grpcWebLib;"
  );
  
  content = content.replace(
    /const proto = {};\s*proto\.example = require\('\.\/example_pb\.js'\);/,
    "import * as protoLib from './example_pb.js';\nconst proto = {};\nconst importedProto = protoLib.default || protoLib;\nproto.example = {};\nObject.keys(importedProto).forEach(key => { proto.example[key] = importedProto[key]; });"
  );
  
  // 替换 module.exports 为 export
  content = content.replace(
    /module\.exports = proto\.example;/,
    'export default proto.example;'
  );
  
  fs.writeFileSync(grpcWebFile, content);
  console.log('Fixed example_grpc_web_pb.js');
}

// 修复 proto 文件
if (fs.existsSync(protoFile)) {
  let content = fs.readFileSync(protoFile, 'utf8');
  
  // 替换 require 为 import
  content = content.replace(
    /var jspb = require\('google-protobuf'\);/,
    "import * as jspb from 'google-protobuf';"
  );
  
  // 替换 exports 为 export
  content = content.replace(
    /goog\.object\.extend\(exports, proto\.example\);/,
    'export default proto.example;'
  );
  
  // 替换 readStringRequireUtf8 为 readString（兼容 google-protobuf 3.x）
  content = content.replace(
    /reader\.readStringRequireUtf8\(\)/g,
    'reader.readString()'
  );
  
  fs.writeFileSync(protoFile, content);
  console.log('Fixed example_pb.js');
}

console.log('Proto files fixed!');

