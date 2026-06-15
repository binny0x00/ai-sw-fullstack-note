import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {ILike, Repository} from 'typeorm';
import {CreatePostDto} from './dto/create-post.dto';
import {UpdatePostDto} from './dto/update-post.dto';
import {Post} from './entities/post.entity';
import {PostQueryDto} from './dto/post-query.dto';
import {Comment} from './entities/comment.emtity';
import {CreateCommentDto} from './dto/create-comment.dto';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postRepository: Repository<Post>,
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,
    ) {
    }

    async create(createPostDto: CreatePostDto) {
        const post = this.postRepository.create({
            title: createPostDto.title,
            content: createPostDto.content,
            userId: createPostDto.userId,
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
            },
        });
    }

    update(id: number, updatePostDto: UpdatePostDto) {
        return this.postRepository.update(id, updatePostDto);
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
}
