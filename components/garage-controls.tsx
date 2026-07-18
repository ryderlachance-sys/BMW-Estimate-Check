"use client";

import { useTransition } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";
import { removeFavoriteMechanic, toggleFavoriteMechanic } from "@/app/actions/mechanics";
import { Button } from "@/components/ui/button";

export function MechanicFavoriteActions({
  mechanicId,
  isFavorite,
}: {
  mechanicId: string;
  isFavorite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        aria-label={isFavorite ? "Remove from favorites" : "Mark favorite"}
        onClick={() =>
          startTransition(() => toggleFavoriteMechanic(mechanicId, !isFavorite))
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Star className={`size-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        aria-label="Remove mechanic"
        onClick={() => startTransition(() => removeFavoriteMechanic(mechanicId))}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
