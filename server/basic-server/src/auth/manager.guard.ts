import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { AuthenticatedRequest } from './jwt-auth.guard';
import { UserRole } from './entities/user.entity';

@Injectable()
export class ManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user.role !== UserRole.MANAGER) {
      throw new ForbiddenException('담당자 권한이 필요합니다.');
    }

    return true;
  }
}
