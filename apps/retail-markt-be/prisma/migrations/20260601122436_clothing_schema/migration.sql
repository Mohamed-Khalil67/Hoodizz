/*
  Warnings:

  - You are about to drop the column `image` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `Product` table. All the data in the column will be lost.
  - Added the required column `category` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Made the column `isFeatured` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingAddress" JSONB;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "color" TEXT,
ADD COLUMN     "size" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "image",
DROP COLUMN "stripePriceId",
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "colors" TEXT[],
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "sizes" TEXT[],
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "isFeatured" SET NOT NULL;
