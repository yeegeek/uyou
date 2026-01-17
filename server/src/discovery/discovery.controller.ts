import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../common/decorators/user.decorator';
import { SearchConsultantDto } from './dto/search-consultant.dto';
import { RecommendedConsultantDto } from './dto/recommended-consultant.dto';

@ApiTags('发现模块')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  // ============================================
  // 城市和类目
  // ============================================

  @Public()
  @Get('cities')
  @ApiOperation({ summary: '获取城市列表' })
  async getCities() {
    return this.discoveryService.getCities();
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: '获取服务类目列表' })
  async getCategories() {
    return this.discoveryService.getCategories();
  }

  @Public()
  @Get('categories/:id')
  @ApiOperation({ summary: '获取类目详情' })
  async getCategoryDetail(@Param('id') categoryId: string) {
    return this.discoveryService.getCategoryDetail(categoryId);
  }

  // ============================================
  // 顾问推荐
  // ============================================

  @Public()
  @Get('consultants/recommended')
  @ApiOperation({ summary: '获取推荐顾问列表' })
  @ApiQuery({ name: 'cityId', required: true, description: '城市ID' })
  @ApiQuery({ name: 'categoryId', required: false, description: '服务类目ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码', type: Number })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  async getRecommendedConsultants(@Query() query: RecommendedConsultantDto) {
    const { cityId, categoryId, page = 1, pageSize = 20 } = query;
    // TODO: Get user location from request or user profile
    return this.discoveryService.getRecommendedConsultants(
      cityId,
      categoryId,
      page,
      pageSize,
    );
  }

  // ============================================
  // 顾问搜索
  // ============================================

  @Public()
  @Get('consultants/search')
  @ApiOperation({ summary: '搜索顾问' })
  @ApiQuery({ name: 'cityId', required: true, description: '城市ID' })
  @ApiQuery({ name: 'categoryId', required: false, description: '服务类目ID' })
  @ApiQuery({ name: 'gender', required: false, description: '性别：1男/2女' })
  @ApiQuery({ name: 'ageMin', required: false, description: '最小年龄' })
  @ApiQuery({ name: 'ageMax', required: false, description: '最大年龄' })
  @ApiQuery({ name: 'priceMin', required: false, description: '最低价格' })
  @ApiQuery({ name: 'priceMax', required: false, description: '最高价格' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序方式：rating/distance/orders' })
  @ApiQuery({ name: 'nextPage', required: false, description: '下一页游标' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  async searchConsultants(@Query() query: SearchConsultantDto) {
    // TODO: Get user location from request or user profile
    return this.discoveryService.searchConsultants(query);
  }

  // ============================================
  // 顾问详情
  // ============================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('consultants/:id')
  @ApiOperation({ summary: '获取顾问详情' })
  async getConsultantDetail(
    @Param('id') consultantId: string,
    @User('userId') userId?: string,
  ) {
    return this.discoveryService.getConsultantDetail(consultantId, userId);
  }

  @Public()
  @Get('consultants/:id/public')
  @ApiOperation({ summary: '获取顾问详情（公开访问）' })
  async getConsultantDetailPublic(@Param('id') consultantId: string) {
    return this.discoveryService.getConsultantDetail(consultantId);
  }
}
