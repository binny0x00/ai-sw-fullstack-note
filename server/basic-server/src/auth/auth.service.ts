import {ConflictException, Injectable, UnauthorizedException, UnprocessableEntityException} from '@nestjs/common';
import {LoginDto} from './dto/login.dto';
import {SignupDto} from './dto/signup.dto';
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {User} from '../users/user.entity'

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}
    async signup(signupDto: SignupDto) {
        // todo : 토큰 발급 및 저장
        // todo : 비밀번호 해싱
        const existingUser = await this.userRepository.findOne({where: {email: signupDto.email}});
        if (existingUser) {
            throw new UnprocessableEntityException('이미 사용중인 이메일입니다.');
        }

        const user = this.userRepository.create({
            nickname: signupDto.nickname,
            email: signupDto.email,
            password: signupDto.password,
        });

        const savedUser = await this.userRepository.save(user);

        return {
            success: true,
            user:{
                id: savedUser.id,
                nickname: savedUser.nickname,
                email: savedUser.email,
            }
        }
    }

    async login(loginDto: LoginDto) {
        const user = await this.userRepository.findOne({where: {email: loginDto.email}});

        if (!user || user.password !== loginDto.password) {
            throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }

        return {
            success: true,
            user:{
                id: user.id,
                nickname: user.nickname,
                email: user.email,
            }
        };
    }
}