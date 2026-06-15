import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.emtity';
import { Tag } from './entities/tag.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Comment, Tag]), AuthModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
