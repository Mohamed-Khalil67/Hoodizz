import { InputType, Field } from '@nestjs/graphql';
import { OrderStatus } from '@prisma/client';

@InputType()
export class UpdateOrderInput {
  @Field(() => String)
  id!: string;

  @Field(() => OrderStatus)
  status!: OrderStatus;
}
