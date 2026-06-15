import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {ILike, In, Repository} from 'typeorm';
import {CreatePostDto} from './dto/create-post.dto';
import {UpdatePostDto} from './dto/update-post.dto';
import {Post} from './entities/post.entity';
import {PostQueryDto} from './dto/post-query.dto';
import {Comment} from './entities/comment.emtity';
import {CreateCommentDto} from './dto/create-comment.dto';
import {Tag} from './entities/tag.entity';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postRepository: Repository<Post>,
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,
        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,
    ) {
    }

    async create(createPostDto: CreatePostDto) {
        const tags = await this.findOrCreateTags(createPostDto.tagNames);

        const post = this.postRepository.create({
            title: createPostDto.title,
            content: createPostDto.content,
            userId: createPostDto.userId,
            tags,
        });

        const savedPost = await this.postRepository.save(post);

        return {
            success: true,
            post: savedPost,
        };
    }

    async findAll(query: PostQueryDto) {
        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 10);
        const keyword = query.keyword?.trim();

        const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
        const safeLimit = Number.isNaN(limit) || limit < 1 ? 10 : limit;

        const where = keyword
            ? [
                {title: ILike(`%${keyword}%`)},
                {content: ILike(`%${keyword}%`)},
            ]
            : undefined;

        const [items, total] = await this.postRepository.findAndCount({
            where,
            relations: {
                user: true,
                tags: true,
            },
            order: {
                createdAt: 'DESC',
            },
            skip: (safePage - 1) * safeLimit,
            take: safeLimit,
        });

        return {
            items,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        }
    }

    findOne(id: number) {
        return this.postRepository.findOne({
            where: {id},
            relations: {
                user: true,
                tags: true,
            },
        });
    }

    async update(id: number, updatePostDto: UpdatePostDto) {
        const post = await this.postRepository.findOne({
            where: {id},
            relations: {
                tags: true,
            },
        });

        if (!post) {
            return null;
        }

        if (updatePostDto.title !== undefined) {
            post.title = updatePostDto.title;
        }

        if (updatePostDto.content !== undefined) {
            post.content = updatePostDto.content;
        }

        if (updatePostDto.userId !== undefined) {
            post.userId = updatePostDto.userId;
        }

        if (updatePostDto.tagNames !== undefined) {
            post.tags = await this.findOrCreateTags(updatePostDto.tagNames);
        }

        const savedPost = await this.postRepository.save(post);

        return {
            success: true,
            post: savedPost,
        };
    }

    remove(id: number) {
        return this.postRepository.delete(id);
    }

    findComments(postId: number) {
        return this.commentRepository.find({
            where: {postId},
            relations: {
                user: true,
            },
            order: {
                createdAt: 'ASC',
            },
        });
    }

    async createComment(postId: number, createCommentDto: CreateCommentDto) {
        const comment = this.commentRepository.create({
            postId,
            content: createCommentDto.content,
            userId: createCommentDto.userId,
        });

        const savedComment = await this.commentRepository.save(comment);

        return {
            success: true,
            comment: savedComment,
        };
    }

    private normalizeTagNames(tagNames?: string[]) {
        return [
            ...new Set(
                (tagNames ?? [])
                    .map((tagName) => tagName.trim().toLowerCase())
                    .filter(Boolean),
            ),
        ];
    }

    private async findOrCreateTags(tagNames?: string[]) {
        const names = this.normalizeTagNames(tagNames);

        if (names.length === 0) {
            return [];
        }

        const existingTags = await this.tagRepository.find({
            where: {
                name: In(names),
            },
        });
        const existingNames = new Set(existingTags.map((tag) => tag.name));
        const newTags = names
            .filter((name) => !existingNames.has(name))
            .map((name) => this.tagRepository.create({name}));
        const savedNewTags = newTags.length > 0
            ? await this.tagRepository.save(newTags)
            : [];

        return [...existingTags, ...savedNewTags];
    }
}
