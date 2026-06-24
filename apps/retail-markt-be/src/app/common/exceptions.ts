import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';

export class OrderNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Order ${id} not found`);
  }
}

export class ProductNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Product ${id} not found`);
  }
}

export class OrderOwnershipException extends ForbiddenException {
  constructor() {
    super('You do not have permission to access this order');
  }
}

export class OutOfStockException extends HttpException {
  constructor(productName: string, available: number, requested: number) {
    super(
      {
        message: `Insufficient stock for "${productName}". Available: ${available}, requested: ${requested}`,
        code: 'OUT_OF_STOCK',
        productName,
        available,
        requested,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class CheckoutFailedException extends BadRequestException {
  constructor(reason: string) {
    super(`Checkout failed: ${reason}`);
  }
}

export class InvalidOrderStateException extends BadRequestException {
  constructor(currentStatus: string, attempted: string) {
    super(`Cannot ${attempted} an order with status ${currentStatus}`);
  }
}
