
export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

export const PLAYER_RADIUS = 12;
export const PLAYER_BASE_SPEED = 2.5;
export const PLAYER_BASE_HP = 100;

// 升级经验公式: BASE * (n ^ FACTOR)
export const XP_BASE = 10;
export const XP_FACTOR = 1.2;

export const SPAWN_RATE_INITIAL = 60; // 初始刷怪帧间隔
export const SPAWN_RATE_MIN = 5;

export const COLORS = {
  player: '#3b82f6', // blue-500
  enemy: {
    zombie: '#22c55e', // green-500
    bat: '#a855f7', // purple-500
    tank: '#ef4444', // red-500
  },
  gem: {
    blue: '#60a5fa',
    green: '#4ade80',
    red: '#f87171',
  },
  pickup: {
    health: '#f43f5e', // 烤鸡 (rose-500)
    magnet: '#3b82f6', // 吸铁石 (blue-500)
    bomb: '#18181b',   // 炸弹 (zinc-900)
    speed: '#eab308',  // 怀表/加速 (yellow-500)
  },
  obstacle: {
    tree: '#166534',
    rock: '#3f3f46',
    crate: '#92400e', // 木箱 (amber-800)
  },
  damage: '#ffffff',
  crit: '#fbbf24',
};
