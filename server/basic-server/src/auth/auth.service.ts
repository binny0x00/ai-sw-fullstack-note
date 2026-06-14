import {ConflictException, Injectable, UnauthorizedException, UnprocessableEntityException} from '@nestjs/common';
import {LoginDto} from './dto/login.dto';
import {SignupDto} from './dto/signup.dto';
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {User} from './entities/user.entity'
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}
    async signup(signupDto: SignupDto) {
        const existingUser = await this.userRepository.findOne({where: {email: signupDto.email}});
        if (existingUser) {
            throw new UnprocessableEntityException('이미 사용중인 이메일입니다.');
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(signupDto.password, 12);

        const user = this.userRepository.create({
            nickname: signupDto.nickname,
            email: signupDto.email,
            password: hashedPassword,
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

        if (!user) {
            throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
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
