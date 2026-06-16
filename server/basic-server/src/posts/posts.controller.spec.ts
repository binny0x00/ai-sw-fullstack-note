import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Comment } from './entities/comment.emtity';
import { Post } from './entities/post.entity';
import { Tag } from './entities/tag.entity';
import { InquiriesService } from '../inquiries/inquiries.service';

const repositoryMock = {};
const inquiriesServiceMock = {};

describe('PostsController', () => {
  let controller: PostsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        PostsService,
        { provide: getRepositoryToken(Post), useValue: repositoryMock },
        { provide: getRepositoryToken(Comment), useValue: repositoryMock },
        { provide: getRepositoryToken(Tag), useValue: repositoryMock },
        { provide: InquiriesService, useValue: inquiriesServiceMock },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
