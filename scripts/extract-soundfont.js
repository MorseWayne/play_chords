#!/usr/bin/env node

/**
 * 从 MIDI.Soundfont 格式提取独立的音频文件
 * 将 base64 编码的音频数据转换为独立的 .mp3 文件
 */

const fs = require('fs');
const path = require('path');

// 源文件和目标目录
const sourceFile = path.join(__dirname, '../public/soundfonts/MusyngKite/acoustic_guitar_steel-mp3.js');
const targetDir = path.join(__dirname, '../public/soundfonts/guitar');

// 创建目标目录
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('🎵 开始提取 soundfont 音频文件...');
console.log(`📂 源文件: ${sourceFile}`);
console.log(`📁 目标目录: ${targetDir}`);

// 读取源文件
const content = fs.readFileSync(sourceFile, 'utf-8');

// 匹配所有音符数据: "C4": "data:audio/mp3;base64,..."
const noteRegex = /"([A-Gb#]+\d+)":\s*"data:audio\/mp3;base64,([^"]+)"/g;

let match;
let count = 0;
const notes = [];

while ((match = noteRegex.exec(content)) !== null) {
  const [, noteName, base64Data] = match;
  notes.push(noteName);
  
  try {
    // 将 base64 转换为 Buffer
    const audioBuffer = Buffer.from(base64Data, 'base64');
    
    // 写入文件
    const outputPath = path.join(targetDir, `${noteName}.mp3`);
    fs.writeFileSync(outputPath, audioBuffer);
    
    count++;
    
    // 每处理 10 个音符输出一次进度
    if (count % 10 === 0) {
      console.log(`✅ 已处理 ${count} 个音符...`);
    }
  } catch (error) {
    console.error(`❌ 处理音符 ${noteName} 时出错:`, error.message);
  }
}

console.log(`\n🎉 完成！共提取 ${count} 个音频文件到 ${targetDir}`);
console.log(`📝 音符列表: ${notes.join(', ')}`);

// 计算总大小
let totalSize = 0;
notes.forEach(note => {
  const filePath = path.join(targetDir, `${note}.mp3`);
  if (fs.existsSync(filePath)) {
    totalSize += fs.statSync(filePath).size;
  }
});

console.log(`💾 总大小: ${(totalSize / 1024).toFixed(2)} KB`);
console.log(`📊 平均每个音符: ${(totalSize / count / 1024).toFixed(2)} KB`);
