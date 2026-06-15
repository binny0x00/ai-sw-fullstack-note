import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Comment } from '../posts/entities/comment.emtity';
import { Tag } from '../posts/entities/tag.entity';

export const typeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: Number(configService.get<string>('DB_PORT') ?? 5433),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_DATABASE'),
  entities: [User, Post, Comment, Tag],
  synchronize: true,
});
