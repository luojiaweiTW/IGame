import { Point } from './types';

export const getDistance = (p1: Point, p2: Point): number => {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

export const normalizeVector = (v: Point): Point => {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
};

export const checkCircleCollision = (c1: Point, r1: number, c2: Point, r2: number): boolean => {
  const dist = getDistance(c1, c2);
  return dist < r1 + r2;
};

export const checkRectCollision = (circle: Point, r: number, rect: Point, w: number, h: number): boolean => {
  const distX = Math.abs(circle.x - rect.x - w / 2);
  const distY = Math.abs(circle.y - rect.y - h / 2);

  if (distX > (w / 2 + r)) { return false; }
  if (distY > (h / 2 + r)) { return false; }

  if (distX <= (w / 2)) { return true; }
  if (distY <= (h / 2)) { return true; }

  const dx = distX - w / 2;
  const dy = distY - h / 2;
  return (dx * dx + dy * dy <= (r * r));
};

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const formatNumber = (num: number): string => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return Math.floor(num).toString();
};
