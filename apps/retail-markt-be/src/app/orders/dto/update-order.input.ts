import { InputType, Field } from '@nestjs/graphql';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

@InputType()
export class UpdateOrderInput {
  @Field(() => String)
  @IsUUID('4')
  id!: string;

  @Field(() => OrderStatus)
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
