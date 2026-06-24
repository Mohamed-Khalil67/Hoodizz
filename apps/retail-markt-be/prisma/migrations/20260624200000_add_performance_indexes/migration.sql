-- Performance indexes for hot query paths:
--   * Product.category   -> `products(category: …)`
--   * Product.isFeatured  -> `products(featured: true)`
--   * Order.userId        -> `userOrders` (auth-guarded listing)
--   * Order.paymentId     -> Stripe webhook `findByStripeSession`
--   * Order.status        -> filter PAYMENT_REQUIRED out of user orders
--   * (userId, status)    -> composite covers the userOrders query exactly
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_paymentId_idx" ON "Order"("paymentId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
