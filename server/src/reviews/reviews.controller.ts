import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateTipDto } from './dto/create-tip.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('评价模块')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ============================================
  // 创建评价
  // ============================================

  @Post()
  @ApiOperation({ summary: '用户评价顾问' })
  async createUserReview(@User('userId') userId: string, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.createReview(userId, createReviewDto, 1);
  }

  @Post('consultant')
  @ApiOperation({ summary: '顾问评价用户' })
  async createConsultantReview(
    @User('userId') userId: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, createReviewDto, 2);
  }

  // ============================================
  // 查询评价
  // ============================================

  @Get()
  @ApiOperation({ summary: '获取评价列表' })
  @ApiQuery({ name: 'targetId', required: true, description: '被评价者ID' })
  @ApiQuery({
    name: 'targetType',
    required: true,
    description: '被评价者类型：user/consultant',
  })
  @ApiQuery({ name: 'nextPage', required: false, description: '下一页游标' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  async getReviews(
    @Query('targetId') targetId: string,
    @Query('targetType') targetType: 'user' | 'consultant',
    @Query() pagination?: PaginationDto,
  ) {
    return this.reviewsService.getReviews(
      targetId,
      targetType,
      pagination?.nextPage,
      pagination?.pageSize,
    );
  }

  @Get('tags')
  @ApiOperation({ summary: '获取评价标签' })
  @ApiQuery({ name: 'type', required: false, description: '标签类型：1正面/2负面', type: Number })
  async getReviewTags(@Query('type') type?: number) {
    return this.reviewsService.getReviewTags(type);
  }

  // ============================================
  // 删除评价
  // ============================================

  @Delete(':id')
  @ApiOperation({ summary: '删除评价' })
  async deleteReview(@Param('id') reviewId: string, @User('userId') userId: string) {
    return this.reviewsService.deleteReview(reviewId, userId);
  }

  // ============================================
  // 打赏
  // ============================================

  @Post('tips')
  @ApiOperation({ summary: '打赏顾问' })
  async createTip(@User('userId') userId: string, @Body() createTipDto: CreateTipDto) {
    return this.reviewsService.createTip(
      userId,
      createTipDto.orderId,
      createTipDto.amount,
      createTipDto.message,
    );
  }

  // ============================================
  // 审核评价（管理员）
  // ============================================

  @Post(':id/audit')
  @ApiOperation({ summary: '审核评价（管理员）' })
  async auditReview(
    @Param('id') reviewId: string,
    @Body('action') action: 'approve' | 'reject',
    @Body('reason') reason?: string,
  ) {
    // TODO: Add admin role guard
    return this.reviewsService.auditReview(reviewId, action, reason);
  }
}
