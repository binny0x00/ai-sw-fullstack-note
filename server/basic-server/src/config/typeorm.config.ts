import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Comment } from '../posts/entities/comment.emtity';
import { Tag } from '../posts/entities/tag.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { AiAnalysisResult } from '../inquiries/entities/ai-analysis-result.entity';
import { McpExecutionLog } from '../inquiries/entities/mcp-execution-log.entity';

export const typeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST') ?? 'localhost',
  port: Number(configService.get<string>('DB_PORT') ?? 5432),
  username: configService.get<string>('DB_USERNAME') ?? 'postgres',
  password: configService.get<string>('DB_PASSWORD') ?? 'postgres',
  database: configService.get<string>('DB_DATABASE') ?? 'inquiry_rag',
  entities: [User, Post, Comment, Tag, Inquiry, AiAnalysisResult, McpExecutionLog],
  synchronize: true,
});
