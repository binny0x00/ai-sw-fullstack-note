import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { PaginatedResponse } from '../common/paginated-response';
import { CreatePostDto } from './dto/create-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostEntity } from './entities/post.entity';

export const POSTS_REPOSITORY = Symbol('POSTS_REPOSITORY');

export type PostsRepository = {
  create(dto: CreatePostDto): Promise<PostEntity>;
  findAll(query: PostQueryDto): Promise<PaginatedResponse<PostEntity>>;
  findById(id: string): Promise<PostEntity | null>;
  update(id: string, dto: UpdatePostDto): Promise<PostEntity | null>;
  delete(id: string): Promise<boolean>;
};

@Injectable()
export class TypeOrmPostsRepository implements PostsRepository {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
  ) {}

  async create(dto: CreatePostDto) {
    const post = this.postRepository.create({
      title: dto.title,
      content: dto.content,
      tags: this.normalizeTags(dto.tags),
    });

    return this.postRepository.save(post);
  }

  async findAll(query: PostQueryDto) {
    const keyword = query.keyword?.trim();
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .orderBy('post.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (keyword) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('post.title ILIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('post.content ILIKE :keyword', {
              keyword: `%${keyword}%`,
            });
        }),
      );
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  findById(id: string) {
    return this.postRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, dto: UpdatePostDto) {
    const post = await this.findById(id);

    if (!post) {
      return null;
    }

    if (dto.title !== undefined) {
      post.title = dto.title;
    }

    if (dto.content !== undefined) {
      post.content = dto.content;
    }

    if (dto.tags !== undefined) {
      post.tags = this.normalizeTags(dto.tags);
    }

    return this.postRepository.save(post);
  }

  async delete(id: string) {
    const result = await this.postRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  private normalizeTags(tags?: string[]) {
    return [
      ...new Set(
        (tags ?? [])
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }
}
