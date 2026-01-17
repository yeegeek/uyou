import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DemandsService } from './demands.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateDemandDto } from './dto/create-demand.dto';
import { SelectConsultantDto } from './dto/select-consultant.dto';
import { CancelDemandDto } from './dto/cancel-demand.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('需求模块')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('demands')
export class DemandsController {
  constructor(private readonly demandsService: DemandsService) {}

  // ============================================
  // 需求发布
  // ============================================

  @Post()
  @ApiOperation({ summary: '发布需求' })
  async createDemand(@User('userId') userId: string, @Body() createDemandDto: CreateDemandDto) {
    return this.demandsService.createDemand(userId, createDemandDto);
  }

  // ============================================
  // 需求管理
  // ============================================

  @Get('my')
  @ApiOperation({ summary: '获取我的需求列表' })
  @ApiQuery({ name: 'status', required: false, description: '需求状态', type: Number })
  @ApiQuery({ name: 'nextPage', required: false, description: '下一页游标' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  async getMyDemands(
    @User('userId') userId: string,
    @Query('status') status?: number,
    @Query() pagination?: PaginationDto,
  ) {
    return this.demandsService.getMyDemands(
      userId,
      status,
      pagination?.nextPage,
      pagination?.pageSize,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取需求详情' })
  async getDemandDetail(@Param('id') demandId: string, @User('userId') userId: string) {
    return this.demandsService.getDemandDetail(demandId, userId);
  }

  @Get(':id/applications')
  @ApiOperation({ summary: '获取需求申请列表' })
  async getDemandApplications(@Param('id') demandId: string, @User('userId') userId: string) {
    return this.demandsService.getDemandApplications(demandId, userId);
  }

  @Post(':id/select-consultant')
  @ApiOperation({ summary: '选择顾问' })
  async selectConsultant(
    @Param('id') demandId: string,
    @User('userId') userId: string,
    @Body() selectConsultantDto: SelectConsultantDto,
  ) {
    return this.demandsService.selectConsultant(
      demandId,
      userId,
      selectConsultantDto.applicationId,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消需求' })
  async cancelDemand(
    @Param('id') demandId: string,
    @User('userId') userId: string,
    @Body() cancelDemandDto: CancelDemandDto,
  ) {
    return this.demandsService.cancelDemand(demandId, userId, cancelDemandDto.reason);
  }

  @Get(':id/lock-status')
  @ApiOperation({ summary: '查询需求锁定状态' })
  async getLockStatus(@Param('id') demandId: string) {
    return this.demandsService.getLockStatus(demandId);
  }
}
