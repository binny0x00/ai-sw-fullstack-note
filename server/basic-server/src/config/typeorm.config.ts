import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Comment } from '../posts/entities/comment.emtity';
import { Tag } from '../posts/entities/tag.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { AiAnalysisResult } from '../inquiries/entities/ai-analysis-result.entity';
import { McpExecutionLog } from '../inquiries/entities/mcp-execution-log.entity';

export const appEntities = [
  User,
  Post,
  Comment,
  Tag,
  Inquiry,
  AiAnalysisResult,
  McpExecutionLog,
];

const parseDatabaseUrl = (databaseUrl: string) => {
  const url = new URL(databaseUrl);

  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  };
};

export const typeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const databaseConfig = databaseUrl
    ? parseDatabaseUrl(databaseUrl)
    : {
        host: configService.get<string>('DB_HOST') ?? 'localhost',
        port: Number(configService.get<string>('DB_PORT') ?? 5432),
        username: configService.get<string>('DB_USERNAME') ?? 'postgres',
        password: configService.get<string>('DB_PASSWORD') ?? 'postgres',
        database: configService.get<string>('DB_DATABASE') ?? 'inquiry_rag',
      };
  const synchronizeFlag = configService.get<string>('TYPEORM_SYNCHRONIZE');
  const migrationsRunFlag = configService.get<string>('TYPEORM_MIGRATIONS_RUN');

  return {
    type: 'postgres',
    ...databaseConfig,
    entities: appEntities,
    migrations: ['dist/migrations/*.js'],
    synchronize:
      nodeEnv !== 'production' && synchronizeFlag !== 'false',
    migrationsRun: migrationsRunFlag === 'true',
    ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  };
};
