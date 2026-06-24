import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDto {
  @IsUUID('4')
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsString()
  @Length(1, 20)
  size!: string;

  @IsString()
  @Length(1, 50)
  color!: string;
}

export class CreateCheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  totalAmount!: number;
}
