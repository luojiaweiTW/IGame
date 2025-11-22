
export enum GameState {
  MENU,
  PLAYING,
  LEVEL_UP,
  GAME_OVER,
}

export interface Point {
  x: number;
  y: number;
}

export interface Stats {
  maxHp: number;
  hp: number;
  speed: number;
  pickupRange: number;
  might: number; // 伤害倍率
  cooldownReduction: number; // 冷却缩减
  area: number; // 范围大小
}

export interface Player {
  pos: Point;
  stats: Stats;
  level: number;
  xp: number;
  nextLevelXp: number;
  weapons: Weapon[];
  facingRight: boolean;
}

export enum WeaponType {
  WAND = 'Magic Wand',
  AXE = 'Throwing Axe',
  AURA = 'Garlic Aura',
}

export interface Weapon {
  type: WeaponType;
  level: number;
  cooldownTimer: number;
  baseCooldown: number;
  damage: number;
  name: string; // 中文名称
}

export interface Enemy {
  id: string;
  type: 'zombie' | 'bat' | 'tank';
  pos: Point;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  knockback: Point;
}

export interface Bullet {
  id: string;
  pos: Point;
  velocity: Point;
  radius: number;
  damage: number;
  duration: number;
  pierce: number;
  color: string;
  rotation?: number;
  weaponType: WeaponType;
}

export interface Gem {
  id: string;
  pos: Point;
  value: number;
  type: 'blue' | 'green' | 'red';
}

export type PickupType = 'health' | 'magnet' | 'bomb' | 'speed';

export interface MapPickup {
  id: string;
  type: PickupType;
  pos: Point;
  radius: number;
}

export interface Obstacle {
  pos: Point;
  width: number;
  height: number;
  type: 'tree' | 'rock' | 'crate';
  destructible: boolean;
  hp: number;
  maxHp: number;
}

export interface DamageText {
  id: string;
  pos: Point;
  value: number | string;
  life: number;
  color: string;
  scale?: number;
}

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  synergy?: string; // 协同效应描述
  type: 'weapon' | 'stat' | 'heal';
  rarity: '普通' | '稀有' | '传说';
  apply: (player: Player) => void;
}
