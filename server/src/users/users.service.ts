import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // 用户信息管理
  // ============================================

  async getUserInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            province: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      birthday: user.birthday,
      bio: user.bio,
      city: user.city,
      isConsultant: user.isConsultant,
      status: user.status,
    };
  }

  async updateUserInfo(userId: string, updateUserDto: UpdateUserDto) {
    // Validate city if provided
    if (updateUserDto.cityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: updateUserDto.cityId },
      });
      if (!city) {
        throw new BadRequestException({
          code: 'INVALID_PARAM',
          message: 'Invalid city ID',
        });
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateUserDto.nickname && { nickname: updateUserDto.nickname }),
        ...(updateUserDto.avatar && { avatar: updateUserDto.avatar }),
        ...(updateUserDto.gender !== undefined && { gender: updateUserDto.gender }),
        ...(updateUserDto.birthday && { birthday: new Date(updateUserDto.birthday) }),
        ...(updateUserDto.bio !== undefined && { bio: updateUserDto.bio }),
        ...(updateUserDto.cityId && { cityId: updateUserDto.cityId }),
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            province: true,
          },
        },
      },
    });

    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      birthday: user.birthday,
      bio: user.bio,
      city: user.city,
      isConsultant: user.isConsultant,
      status: user.status,
    };
  }

  // ============================================
  // 实名认证
  // ============================================

  async createVerification(userId: string, createVerificationDto: CreateVerificationDto) {
    // Check if user already has a pending or approved verification
    const existingVerification = await this.prisma.userVerification.findUnique({
      where: { userId },
    });

    if (existingVerification && existingVerification.status === 1) {
      throw new ConflictException({
        code: 'VERIFICATION_ALREADY_APPROVED',
        message: 'User is already verified',
      });
    }

    if (existingVerification && existingVerification.status === 0) {
      throw new ConflictException({
        code: 'VERIFICATION_PENDING',
        message: 'Verification is pending review',
      });
    }

    // TODO: Encrypt sensitive data (realName, idCardNo) before storing
    // TODO: Call face recognition API to verify face similarity

    const verification = await this.prisma.userVerification.upsert({
      where: { userId },
      create: {
        userId,
        realName: createVerificationDto.realName,
        idCardNo: createVerificationDto.idCardNo,
        idCardFront: createVerificationDto.idCardFront,
        idCardBack: createVerificationDto.idCardBack,
        facePhoto: createVerificationDto.facePhoto,
        status: 0, // Pending review
      },
      update: {
        realName: createVerificationDto.realName,
        idCardNo: createVerificationDto.idCardNo,
        idCardFront: createVerificationDto.idCardFront,
        idCardBack: createVerificationDto.idCardBack,
        facePhoto: createVerificationDto.facePhoto,
        status: 0,
        rejectReason: null,
      },
    });

    return {
      verificationId: verification.id,
      status: verification.status,
      message: '提交成功，等待审核',
    };
  }

  async getVerificationStatus(userId: string) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { userId },
    });

    if (!verification) {
      return {
        status: null,
        rejectReason: null,
        message: '未提交实名认证',
      };
    }

    return {
      status: verification.status,
      rejectReason: verification.rejectReason,
      verifiedAt: verification.verifiedAt,
    };
  }

  // ============================================
  // 紧急联系人
  // ============================================

  async createEmergencyContact(userId: string, createEmergencyContactDto: CreateEmergencyContactDto) {
    // If setting as primary, unset other primary contacts
    if (createEmergencyContactDto.isPrimary) {
      await this.prisma.userEmergencyContact.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.userEmergencyContact.create({
      data: {
        userId,
        name: createEmergencyContactDto.name,
        phone: createEmergencyContactDto.phone,
        relation: createEmergencyContactDto.relation,
        isPrimary: createEmergencyContactDto.isPrimary || false,
      },
    });

    return contact;
  }

  async getEmergencyContacts(userId: string) {
    const contacts = await this.prisma.userEmergencyContact.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return { contacts };
  }

  async deleteEmergencyContact(userId: string, contactId: string) {
    const contact = await this.prisma.userEmergencyContact.findFirst({
      where: { id: contactId, userId },
    });

    if (!contact) {
      throw new NotFoundException({
        code: 'CONTACT_NOT_FOUND',
        message: 'Emergency contact not found',
      });
    }

    await this.prisma.userEmergencyContact.delete({
      where: { id: contactId },
    });

    return { message: '删除成功' };
  }

  // ============================================
  // 收藏管理
  // ============================================

  async createFavorite(userId: string, createFavoriteDto: CreateFavoriteDto) {
    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: createFavoriteDto.targetId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Target user not found',
      });
    }

    // Check if already favorited
    const existingFavorite = await this.prisma.userFavorite.findUnique({
      where: {
        userId_targetId: {
          userId,
          targetId: createFavoriteDto.targetId,
        },
      },
    });

    if (existingFavorite) {
      // Update existing favorite
      const favorite = await this.prisma.userFavorite.update({
        where: { id: existingFavorite.id },
        data: {
          favoriteType: createFavoriteDto.favoriteType,
          remark: createFavoriteDto.remark,
        },
      });

      return {
        favoriteId: favorite.id,
        targetId: favorite.targetId,
        favoriteType: favorite.favoriteType,
        remark: favorite.remark,
        createdAt: favorite.createdAt,
      };
    }

    // Create new favorite
    const favorite = await this.prisma.userFavorite.create({
      data: {
        userId,
        targetId: createFavoriteDto.targetId,
        favoriteType: createFavoriteDto.favoriteType,
        remark: createFavoriteDto.remark,
      },
    });

    return {
      favoriteId: favorite.id,
      targetId: favorite.targetId,
      favoriteType: favorite.favoriteType,
      remark: favorite.remark,
      createdAt: favorite.createdAt,
    };
  }

  async getFavorites(userId: string, favoriteType?: number, nextPage?: string, pageSize: number = 20) {
    const where: any = { userId };
    if (favoriteType) {
      where.favoriteType = favoriteType;
    }
    if (nextPage) {
      where.id = { lt: nextPage };
    }

    const favorites = await this.prisma.userFavorite.findMany({
      where,
      take: pageSize + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        target: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            isConsultant: true,
          },
        },
      },
    });

    const hasMore = favorites.length > pageSize;
    const items = hasMore ? favorites.slice(0, pageSize) : favorites;
    const nextPageCursor = hasMore ? items[items.length - 1].id : null;

    return {
      favorites: items.map((fav) => ({
        id: fav.id,
        targetId: fav.targetId,
        favoriteType: fav.favoriteType,
        remark: fav.remark,
        target: fav.target,
        createdAt: fav.createdAt,
      })),
      pagination: {
        nextPage: nextPageCursor,
        hasMore,
      },
    };
  }

  async deleteFavorite(userId: string, favoriteId: string) {
    const favorite = await this.prisma.userFavorite.findFirst({
      where: { id: favoriteId, userId },
    });

    if (!favorite) {
      throw new NotFoundException({
        code: 'FAVORITE_NOT_FOUND',
        message: 'Favorite not found',
      });
    }

    await this.prisma.userFavorite.delete({
      where: { id: favoriteId },
    });

    return { message: '取消收藏成功' };
  }

  // ============================================
  // 屏蔽管理
  // ============================================

  async createBlock(userId: string, createBlockDto: CreateBlockDto) {
    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: createBlockDto.blockedId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Target user not found',
      });
    }

    // Cannot block self
    if (userId === createBlockDto.blockedId) {
      throw new BadRequestException({
        code: 'INVALID_PARAM',
        message: 'Cannot block yourself',
      });
    }

    // Check if already blocked
    const existingBlock = await this.prisma.userBlock.findUnique({
      where: {
        userId_blockedId: {
          userId,
          blockedId: createBlockDto.blockedId,
        },
      },
    });

    if (existingBlock) {
      return {
        blockId: existingBlock.id,
        blockedId: existingBlock.blockedId,
        createdAt: existingBlock.createdAt,
      };
    }

    // Create block
    const block = await this.prisma.userBlock.create({
      data: {
        userId,
        blockedId: createBlockDto.blockedId,
        reason: createBlockDto.reason,
      },
    });

    // Remove from favorites if exists
    await this.prisma.userFavorite.deleteMany({
      where: {
        userId,
        targetId: createBlockDto.blockedId,
      },
    });

    return {
      blockId: block.id,
      blockedId: block.blockedId,
      createdAt: block.createdAt,
    };
  }

  async getBlocks(userId: string, nextPage?: string, pageSize: number = 20) {
    const where: any = { userId };
    if (nextPage) {
      where.id = { lt: nextPage };
    }

    const blocks = await this.prisma.userBlock.findMany({
      where,
      take: pageSize + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            isConsultant: true,
          },
        },
      },
    });

    const hasMore = blocks.length > pageSize;
    const items = hasMore ? blocks.slice(0, pageSize) : blocks;
    const nextPageCursor = hasMore ? items[items.length - 1].id : null;

    return {
      blocks: items.map((block) => ({
        id: block.id,
        blockedId: block.blockedId,
        reason: block.reason,
        blocked: block.blocked,
        createdAt: block.createdAt,
      })),
      pagination: {
        nextPage: nextPageCursor,
        hasMore,
      },
    };
  }

  async deleteBlock(userId: string, blockId: string) {
    const block = await this.prisma.userBlock.findFirst({
      where: { id: blockId, userId },
    });

    if (!block) {
      throw new NotFoundException({
        code: 'BLOCK_NOT_FOUND',
        message: 'Block not found',
      });
    }

    await this.prisma.userBlock.delete({
      where: { id: blockId },
    });

    return { message: '取消屏蔽成功' };
  }
}
