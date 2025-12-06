import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;
  private logger: winston.Logger;

  constructor() {
    // Log dizinini belirle
    const logDir = path.join(process.cwd(), 'logs');

    // Winston logger yapılandırması
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        // Console transport - Development için renkli, Production için JSON
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: process.env.NODE_ENV !== 'production' }),
            winston.format.printf((info) => {
              const { timestamp, level, context, message, ...meta } = info;
              let msg = `${timestamp} [${level}]`;
              if (context) msg += ` [${context}]`;
              msg += ` ${typeof message === 'object' ? JSON.stringify(message) : message}`;

              // Meta bilgileri varsa ekle
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return metaStr ? `${msg}\n${metaStr}` : msg;
            }),
          ),
        }),

        // Combined log - Tüm loglar (info ve üzeri)
        new DailyRotateFile({
          dirname: logDir,
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d', // 14 gün sakla
          level: 'info',
        }),

        // Error log - Sadece hatalar
        new DailyRotateFile({
          dirname: logDir,
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d', // 30 gün sakla
          level: 'error',
        }),

        // Debug log - Development için detaylı loglar
        new DailyRotateFile({
          dirname: logDir,
          filename: 'debug-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '7d', // 7 gün sakla
          level: 'debug',
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any) {
    this.logger.info(message, { context: this.context });
  }

  error(message: any, trace?: string) {
    this.logger.error(message, { context: this.context, trace });
  }

  warn(message: any) {
    this.logger.warn(message, { context: this.context });
  }

  debug(message: any) {
    this.logger.debug(message, { context: this.context });
  }

  verbose(message: any) {
    this.logger.verbose(message, { context: this.context });
  }
}
