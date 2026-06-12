import {
  BlurStyle,
  Skia,
  createPicture,
  drawAsImageFromPicture,
  type SkImage,
} from '@shopify/react-native-skia';
import type { Rect } from './types';

export function textBlockBounds(rects: Rect[]): { cx: number; cy: number; top: number; width: number } {
  if (rects.length === 0) return { cx: 0, cy: 0, top: 0, width: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, top: minY, width: maxX - minX };
}

/** Soft glowing dot sprite (pre-blurred so the Atlas pays no per-frame blur cost). */
export function makeDotSprite(size: number, blur: number): SkImage | null {
  const picture = createPicture(
    (canvas) => {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color('white'));
      paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true));
      canvas.drawCircle(size / 2, size / 2, size / 2 - blur * 1.5, paint);
    },
    { width: size, height: size },
  );
  return drawAsImageFromPicture(picture, { width: size, height: size });
}

/** Small white rectangle sprite, tinted per-particle via the Atlas colors array. */
export function makeRectSprite(w: number, h: number): SkImage | null {
  const picture = createPicture(
    (canvas) => {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color('white'));
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, w, h), 1.5, 1.5), paint);
    },
    { width: w, height: h },
  );
  return drawAsImageFromPicture(picture, { width: w, height: h });
}

/** RSXform fields for drawing a sprite of size (sw,sh) centered at (px,py) with rotation and scale. */
export function rsxformCentered(
  xform: { set(scos: number, ssin: number, tx: number, ty: number): void },
  scale: number,
  rotation: number,
  px: number,
  py: number,
  sw: number,
  sh: number,
): void {
  'worklet';
  const scos = scale * Math.cos(rotation);
  const ssin = scale * Math.sin(rotation);
  const cx = sw / 2;
  const cy = sh / 2;
  xform.set(scos, ssin, px - scos * cx + ssin * cy, py - ssin * cx - scos * cy);
}
