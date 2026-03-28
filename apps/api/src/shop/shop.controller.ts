import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('catalog')
  async getCatalog() {
    const items = await this.shopService.getCatalog();
    // Mapper pour rétrocompatibilité frontend (id = code)
    return items.map(item => ({
      id: item.code,
      name: item.name,
      description: item.description,
      type: item.type,
      value: item.value,
      price: item.price,
      icon: item.icon,
    }));
  }

  @Post('buy')
  @UseGuards(AuthGuard('jwt'))
  async buyItem(@Request() req, @Body('itemId') itemCode: string) {
    // itemId du frontend correspond au code de l'item
    return this.shopService.buyItem(req.user.userId, itemCode);
  }
}
