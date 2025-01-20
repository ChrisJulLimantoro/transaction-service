import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MessagePatternDiscoveryService } from './discovery/message-pattern-discovery.service';
import { CustomResponse } from './exception/dto/custom-response.dto';
import { Exempt } from './decorator/exempt.decorator';

@Controller('app')
export class AppController {
  constructor(private readonly discovery: MessagePatternDiscoveryService) {}
  @MessagePattern({ cmd: 'get_routes' })
  @Exempt()
  async getAllRoutes(): Promise<any> {
    const patterns = this.discovery.getMessagePatterns();
    return CustomResponse.success('Pattern Found!', patterns, 200);
  }
}
