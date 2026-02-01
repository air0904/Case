const winston = require('winston');
const path = require('path');

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // 自动捕获错误堆栈
  winston.format.json() // 生产环境通常用 JSON 格式，方便 ELK 等工具分析
);

// 创建 Logger 实例
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'cases-system' }, // 默认标签
  transports: [
    // 1. 错误日志单独存文件 (案发现场证据)
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'error.log'), 
      level: 'error' 
    }),
    // 2. 所有日志存另一个文件 (日常流水)
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'combined.log') 
    }),
  ],
});

// 非生产环境下，同时输出到控制台，并带颜色方便开发调试
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        // 自定义打印格式：时间 [级别]: 消息 {其他元数据}
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''} ${stack || ''}`;
      })
    ),
  }));
}

module.exports = logger;