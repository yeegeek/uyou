import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { User } from '../common/decorators/user.decorator';

@ApiTags('用户模块')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================
  // 用户信息管理
  // ============================================

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getUserInfo(@User('userId') userId: string) {
    return this.usersService.getUserInfo(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新当前用户信息' })
  async updateUserInfo(
    @User('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserInfo(userId, updateUserDto);
  }

  // ============================================
  // 实名认证
  // ============================================

  @Post('verification')
  @ApiOperation({ summary: '提交实名认证' })
  async createVerification(
    @User('userId') userId: string,
    @Body() createVerificationDto: CreateVerificationDto,
  ) {
    return this.usersService.createVerification(userId, createVerificationDto);
  }

  @Get('verification/status')
  @ApiOperation({ summary: '获取实名认证状态' })
  async getVerificationStatus(@User('userId') userId: string) {
    return this.usersService.getVerificationStatus(userId);
  }

  // ============================================
  // 紧急联系人
  // ============================================

  @Post('emergency-contacts')
  @ApiOperation({ summary: '添加紧急联系人' })
  async createEmergencyContact(
    @User('userId') userId: string,
    @Body() createEmergencyContactDto: CreateEmergencyContactDto,
  ) {
    return this.usersService.createEmergencyContact(userId, createEmergencyContactDto);
  }

  @Get('emergency-contacts')
  @ApiOperation({ summary: '获取紧急联系人列表' })
  async getEmergencyContacts(@User('userId') userId: string) {
    return this.usersService.getEmergencyContacts(userId);
  }

  @Delete('emergency-contacts/:id')
  @ApiOperation({ summary: '删除紧急联系人' })
  async deleteEmergencyContact(
    @User('userId') userId: string,
    @Param('id') contactId: string,
  ) {
    return this.usersService.deleteEmergencyContact(userId, contactId);
  }

  // ============================================
  // 收藏管理
  // ============================================

  @Post('favorites')
  @ApiOperation({ summary: '收藏用户/顾问' })
  async createFavorite(
    @User('userId') userId: string,
    @Body() createFavoriteDto: CreateFavoriteDto,
  ) {
    return this.usersService.createFavorite(userId, createFavoriteDto);
  }

  @Get('favorites')
  @ApiOperation({ summary: '获取收藏列表' })
  @ApiQuery({ name: 'favoriteType', required: false, description: '收藏类型：1普通收藏/2特别关注' })
  @ApiQuery({ name: 'nextPage', required: false, description: '下一页游标' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  async getFavorites(
    @User('userId') userId: string,
    @Query('favoriteType') favoriteType?: string,
    @Query('nextPage') nextPage?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const favoriteTypeNum = favoriteType ? parseInt(favoriteType) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize) : 20;
    return this.usersService.getFavorites(userId, favoriteTypeNum, nextPage, pageSizeNum);
  }

  @Delete('favorites/:id')
  @ApiOperation({ summary: '取消收藏' })
  async deleteFavorite(
    @User('userId') userId: string,
    @Param('id') favoriteId: string,
  ) {
    return this.usersService.deleteFavorite(userId, favoriteId);
  }

  // ============================================
  // 屏蔽管理
  // ============================================

  @Post('blocks')
  @ApiOperation({ summary: '屏蔽用户/顾问' })
  async createBlock(
    @User('userId') userId: string,
    @Body() createBlockDto: CreateBlockDto,
  ) {
    return this.usersService.createBlock(userId, createBlockDto);
  }

  @Get('blocks')
  @ApiOperation({ summary: '获取屏蔽列表' })
  @ApiQuery({ name: 'nextPage', required: false, description: '下一页游标' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  async getBlocks(
    @User('userId') userId: string,
    @Query('nextPage') nextPage?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageSizeNum = pageSize ? parseInt(pageSize) : 20;
    return this.usersService.getBlocks(userId, nextPage, pageSizeNum);
  }

  @Delete('blocks/:id')
  @ApiOperation({ summary: '取消屏蔽' })
  async deleteBlock(
    @User('userId') userId: string,
    @Param('id') blockId: string,
  ) {
    return this.usersService.deleteBlock(userId, blockId);
  }
}
