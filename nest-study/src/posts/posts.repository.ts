import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../common/paginated-response';
import { CreatePostDto } from './dto/create-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

export const POSTS_REPOSITORY = Symbol('POSTS_REPOSITORY');

export type PostsRepository = {
  create(dto: CreatePostDto): Promise<Post>;
  findAll(query: PostQueryDto): Promise<PaginatedResponse<Post>>;
  findById(id: string): Promise<Post | null>;
  update(id: string, dto: UpdatePostDto): Promise<Post | null>;
  delete(id: string): Promise<boolean>;
};

@Injectable()
export class InMemoryPostsRepository implements PostsRepository {
  private readonly posts = new Map<string, Post>();

  async create(dto: CreatePostDto) {
    const now = new Date();
    const post: Post = {
      id: randomUUID(),
      title: dto.title,
      content: dto.content,
      tags: this.normalizeTags(dto.tags),
      createdAt: now,
      updatedAt: now,
    };

    this.posts.set(post.id, post);
    return post;
  }

  async findAll(query: PostQueryDto) {
    const keyword = query.keyword?.trim().toLowerCase();
    const allPosts = [...this.posts.values()]
      .filter((post) => {
        if (!keyword) {
          return true;
        }

        return (
          post.title.toLowerCase().includes(keyword) ||
          post.content.toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (query.page - 1) * query.limit;
    const items = allPosts.slice(start, start + query.limit);
    const total = allPosts.length;

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findById(id: string) {
    return this.posts.get(id) ?? null;
  }

  async update(id: string, dto: UpdatePostDto) {
    const post = this.posts.get(id);

    if (!post) {
      return null;
    }

    const updated: Post = {
      ...post,
      title: dto.title ?? post.title,
      content: dto.content ?? post.content,
      tags: dto.tags === undefined ? post.tags : this.normalizeTags(dto.tags),
      updatedAt: new Date(),
    };

    this.posts.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    return this.posts.delete(id);
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
