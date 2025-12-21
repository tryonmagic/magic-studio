-- CreateTable
CREATE TABLE "TryOnSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productImage" TEXT NOT NULL,
    "customerEmail" TEXT,
    "uploadedImage" TEXT NOT NULL,
    "generatedImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "templateType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TryOnTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productTags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL DEFAULT 'Virtual Try-On',
    "buttonStyle" TEXT NOT NULL DEFAULT 'primary',
    "modalTitle" TEXT NOT NULL DEFAULT 'Virtual Fitting Room',
    "enableLeadCapture" BOOLEAN NOT NULL DEFAULT false,
    "discountCode" TEXT,
    "tryOnApiKey" TEXT,
    "tryOnApiProvider" TEXT NOT NULL DEFAULT 'replicate',
    "tryOnApiEndpoint" TEXT,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 20,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "resetDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");
