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

/** Replaces the cart with every matched part from an estimate (exact quantities). */
export async function addAllFromEstimate(estimateId: string): Promise<void> {
  const user = await ensureUser();
  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: { comparisons: { include: { estimateItem: true } } },
  });
  if (estimate.userId !== user.id && !user.isAdmin) throw new Error("Forbidden");

  const cart = await getOrCreateCart();

  // Sum quantities when the same catalog part matches multiple estimate lines
  // (e.g. two turbo coolant lines → qty 2 of one SKU).
  const qtyByPart = new Map<string, number>();
  for (const comparison of estimate.comparisons) {
    const quantity = comparison.estimateItem?.quantity ?? 1;
    qtyByPart.set(
      comparison.catalogPartId,
      (qtyByPart.get(comparison.catalogPartId) ?? 0) + quantity
    );
  }

  // Clear leftover items from other estimates so checkout matches the savings shown.
  await db.cartItem.deleteMany({ where: { cartId: cart.id } });
  if (qtyByPart.size > 0) {
    await db.cartItem.createMany({
      data: [...qtyByPart.entries()].map(([catalogPartId, quantity]) => ({
        cartId: cart.id,
        catalogPartId,
        quantity,
      })),
    });
  }
  revalidatePath("/cart");
  revalidatePath("/checkout");
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
