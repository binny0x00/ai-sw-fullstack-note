import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResponse } from '../common/paginated-response';
import { CreatePostDto } from './dto/create-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostEntity } from './entities/post.entity';
import { POSTS_REPOSITORY, PostsRepository } from './posts.repository';

@Injectable()
export class PostsService {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: PostsRepository,
  ) {}

  create(dto: CreatePostDto): Promise<PostEntity> {
    return this.postsRepository.create(dto);
  }

  findAll(query: PostQueryDto): Promise<PaginatedResponse<PostEntity>> {
    return this.postsRepository.findAll(query);
  }

  async findOne(id: string): Promise<PostEntity> {
    const post = await this.postsRepository.findById(id);

    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    return post;
  }

  async update(id: string, dto: UpdatePostDto): Promise<PostEntity> {
    const post = await this.postsRepository.update(id, dto);

    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    return post;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.postsRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Post ${id} not found`);
    }
  }
}
