"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProductImage } from "@/features/storefront/components/product-image";

/** The gallery's full-size view (M10 US-10.1.2); a separate chunk, mounted on first zoom. */
export function GalleryZoom({ open, onOpenChange, name, image }: { open: boolean; onOpenChange: (o: boolean) => void; name: string; image: { url: string; alt: string } }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(56rem,calc(100%-2rem))] p-2 sm:max-w-[min(56rem,calc(100%-2rem))]">
        <DialogTitle className="sr-only">{name}</DialogTitle>
        {image.url ? (
          <div className="relative aspect-square w-full">
            <Image src={image.url} alt={image.alt} fill sizes="90vw" unoptimized={!image.url.startsWith("/")} className="object-contain" />
          </div>
        ) : (
          <ProductImage src={null} alt={name} />
        )}
      </DialogContent>
    </Dialog>
  );
}
