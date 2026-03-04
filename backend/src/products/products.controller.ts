import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
} from './dto/products.dto';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Permissions('quotes:view')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.productsService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Permissions('quotes:view')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Permissions('settings:manage')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @Permissions('settings:manage')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('settings:manage')
  delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
