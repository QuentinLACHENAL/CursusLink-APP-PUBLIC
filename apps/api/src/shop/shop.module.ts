import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { User } from '../users/entities/user.entity';
import { ShopItem } from './entities/shop-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ShopItem])],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
