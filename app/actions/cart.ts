"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/auth";
import type { Cart, CartItem, CatalogPart } from "@prisma/client";

export type CartWithItems = Cart & {
  items: (CartItem & { catalogPart: CatalogPart })[];
};

export async function getOrCreateCart(): Promise<CartWithItems> {
  const user = await ensureUser();
  const cart = await db.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
    include: {
      items: { include: { catalogPart: true }, orderBy: { id: "asc" } },
    },
  });
  return cart;
}

export async function addToCart(catalogPartId: string, quantity = 1): Promise<void> {
  const cart = await getOrCreateCart();
  await db.cartItem.upsert({
    where: { cartId_catalogPartId: { cartId: cart.id, catalogPartId } },
    update: { quantity: { increment: quantity } },
    create: { cartId: cart.id, catalogPartId, quantity },
  });
  revalidatePath("/cart");
  revalidatePath("/catalog");
}

/** Adds every AI-recommended part from an estimate's comparisons to the cart. */
export async function addAllFromEstimate(estimateId: string): Promise<void> {
  const user = await ensureUser();
  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: { comparisons: { include: { estimateItem: true } } },
  });
  if (estimate.userId !== user.id && !user.isAdmin) throw new Error("Forbidden");

  const cart = await getOrCreateCart();
  for (const comparison of estimate.comparisons) {
    const quantity = comparison.estimateItem?.quantity ?? 1;
    await db.cartItem.upsert({
      where: {
        cartId_catalogPartId: {
          cartId: cart.id,
          catalogPartId: comparison.catalogPartId,
        },
      },
      update: { quantity },
      create: { cartId: cart.id, catalogPartId: comparison.catalogPartId, quantity },
    });
  }
  revalidatePath("/cart");
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
): Promise<void> {
  const user = await ensureUser();
  const item = await db.cartItem.findUniqueOrThrow({
    where: { id: cartItemId },
    include: { cart: true },
  });
  if (item.cart.userId !== user.id) throw new Error("Forbidden");

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: cartItemId } });
  } else {
    await db.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
  }
  revalidatePath("/cart");
}

export async function removeCartItem(cartItemId: string): Promise<void> {
  await updateCartItemQuantity(cartItemId, 0);
}
