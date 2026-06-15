import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import {
  InMemoryPostsRepository,
  POSTS_REPOSITORY,
} from './posts.repository';
import { PostsService } from './posts.service';

@Module({
  controllers: [PostsController],
  providers: [
    PostsService,
    {
      provide: POSTS_REPOSITORY,
      useClass: InMemoryPostsRepository,
    },
  ],
})
export class PostsModule {}
