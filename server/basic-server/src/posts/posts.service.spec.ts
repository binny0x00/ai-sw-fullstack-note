import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { Comment } from './entities/comment.emtity';
import { Post } from './entities/post.entity';
import { Tag } from './entities/tag.entity';
import { InquiriesService } from '../inquiries/inquiries.service';

const repositoryMock = {};
const inquiriesServiceMock = {};

describe('PostsService', () => {
  let service: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getRepositoryToken(Post), useValue: repositoryMock },
        { provide: getRepositoryToken(Comment), useValue: repositoryMock },
        { provide: getRepositoryToken(Tag), useValue: repositoryMock },
        { provide: InquiriesService, useValue: inquiriesServiceMock },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
