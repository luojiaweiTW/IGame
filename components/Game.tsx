
import React, { useEffect, useRef } from 'react';
import { 
  GameState, Player, Enemy, Bullet, Gem, DamageText, Point, 
  WeaponType, Obstacle, UpgradeOption, MapPickup, PickupType 
} from '../game/types';
import { 
  PLAYER_RADIUS, PLAYER_BASE_SPEED, PLAYER_BASE_HP, 
  XP_BASE, XP_FACTOR, COLORS, SPAWN_RATE_INITIAL, SPAWN_RATE_MIN 
} from '../game/constants';
import { getDistance, normalizeVector, checkCircleCollision, checkRectCollision, randomRange } from '../game/utils';
import { playSound, initAudio } from '../game/audio';

interface GameProps {
  state: GameState;
  onLevelUp: (options: UpgradeOption[]) => void;
  onGameOver: (survivedTime: number) => void;
  setPlayerData: (hp: number, maxHp: number, xp: number, nextXp: number, level: number, time: number) => void;
  selectedUpgrade: UpgradeOption | null;
  onUpgradeApplied: () => void;
}

const Game: React.FC<GameProps> = ({ 
  state, 
  onLevelUp, 
  onGameOver, 
  setPlayerData,
  selectedUpgrade,
  onUpgradeApplied
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs (Mutable for performance)
  const playerRef = useRef<Player>({
    pos: { x: 0, y: 0 },
    facingRight: true,
    level: 1,
    xp: 0,
    nextLevelXp: XP_BASE,
    stats: {
      maxHp: PLAYER_BASE_HP,
      hp: PLAYER_BASE_HP,
      speed: PLAYER_BASE_SPEED,
      pickupRange: 60,
      might: 1,
      cooldownReduction: 0,
      area: 1,
    },
    weapons: [
      {
        type: WeaponType.WAND,
        name: '魔法杖',
        level: 1,
        damage: 15,
        cooldownTimer: 0,
        baseCooldown: 60,
      }
    ]
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const gemsRef = useRef<Gem[]>([]);
  const pickupsRef = useRef<MapPickup[]>([]);
  const textsRef = useRef<DamageText[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  
  const frameCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const inputRef = useRef<{ [key: string]: boolean }>({});
  
  // Temporary buffs
  const speedBoostTimer = useRef(0);

  // Initialize Map
  useEffect(() => {
    const obs: Obstacle[] = [];
    // Generate obstacles
    for(let i=0; i<100; i++) {
      const typeRand = Math.random();
      let type: Obstacle['type'] = 'tree';
      let destructible = false;
      let hp = 9999;
      let width = randomRange(40, 90);
      let height = randomRange(40, 90);

      if (typeRand < 0.4) {
        type = 'tree';
      } else if (typeRand < 0.6) {
        type = 'rock';
      } else {
        type = 'crate';
        destructible = true;
        hp = 25; // Crate HP
        width = 40;
        height = 40;
      }

      obs.push({
        pos: { x: randomRange(-2500, 2500), y: randomRange(-2500, 2500) },
        width,
        height,
        type,
        destructible,
        hp,
        maxHp: hp
      });
    }
    obstaclesRef.current = obs;
  }, []);

  // Apply Upgrade
  useEffect(() => {
    if (selectedUpgrade && state === GameState.PLAYING) {
      playSound('select');
      selectedUpgrade.apply(playerRef.current);
      // Small heal on level up
      playerRef.current.stats.hp = Math.min(
        playerRef.current.stats.hp + 10, 
        playerRef.current.stats.maxHp
      );
      onUpgradeApplied();
    }
  }, [selectedUpgrade, state]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (state === GameState.PLAYING) initAudio();
      inputRef.current[e.code] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { inputRef.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state]);

  // Main Loop
  const update = () => {
    if (state !== GameState.PLAYING) return;

    const player = playerRef.current;
    frameCountRef.current++;

    // Difficulty scaling
    const difficultyMultiplier = 1 + (frameCountRef.current / 3600); 

    // Handle Buffs
    if (speedBoostTimer.current > 0) {
      speedBoostTimer.current--;
    }
    const currentSpeed = speedBoostTimer.current > 0 ? player.stats.speed * 1.6 : player.stats.speed;

    // --- 1. Player Movement ---
    let dx = 0;
    let dy = 0;
    if (inputRef.current['KeyW'] || inputRef.current['ArrowUp']) dy -= 1;
    if (inputRef.current['KeyS'] || inputRef.current['ArrowDown']) dy += 1;
    if (inputRef.current['KeyA'] || inputRef.current['ArrowLeft']) { dx -= 1; player.facingRight = false; }
    if (inputRef.current['KeyD'] || inputRef.current['ArrowRight']) { dx += 1; player.facingRight = true; }

    if (dx !== 0 || dy !== 0) {
      const moveVec = normalizeVector({ x: dx, y: dy });
      const nextPos = { 
        x: player.pos.x + moveVec.x * currentSpeed, 
        y: player.pos.y + moveVec.y * currentSpeed 
      };

      // Obstacle Collision (Player)
      let collided = false;
      for (const obs of obstaclesRef.current) {
        if (checkRectCollision(nextPos, PLAYER_RADIUS, obs.pos, obs.width, obs.height)) {
          collided = true;
          break;
        }
      }

      if (!collided) {
        player.pos = nextPos;
      }
    }

    // --- 2. Spawn Enemies ---
    const currentSpawnRate = Math.max(SPAWN_RATE_MIN, SPAWN_RATE_INITIAL - Math.floor(frameCountRef.current / 500));
    if (frameCountRef.current % Math.floor(currentSpawnRate) === 0) {
      const angle = Math.random() * Math.PI * 2;
      // Spawn slightly outside screen
      const radius = Math.max(window.innerWidth, window.innerHeight) / 2 + 100;
      const spawnPos = {
        x: player.pos.x + Math.cos(angle) * radius,
        y: player.pos.y + Math.sin(angle) * radius
      };
      
      const isTank = frameCountRef.current > 1200 && Math.random() < 0.15;
      const isBat = frameCountRef.current > 600 && Math.random() < 0.4;
      
      let enemyType: Enemy['type'] = 'zombie';
      let hp = 15 * difficultyMultiplier;
      let speed = 1.5;
      let radiusHit = 10;

      if (isTank) {
        enemyType = 'tank';
        hp = 80 * difficultyMultiplier;
        speed = 0.9;
        radiusHit = 18;
      } else if (isBat) {
        enemyType = 'bat';
        hp = 8 * difficultyMultiplier;
        speed = 2.8;
        radiusHit = 8;
      }

      enemiesRef.current.push({
        id: Math.random().toString(36).substr(2, 9),
        type: enemyType,
        pos: spawnPos,
        hp,
        maxHp: hp,
        speed,
        damage: isTank ? 15 : 8,
        radius: radiusHit,
        knockback: { x: 0, y: 0 }
      });
    }

    // --- 3. Weapons Fire ---
    player.weapons.forEach(weapon => {
      if (weapon.cooldownTimer > 0) {
        weapon.cooldownTimer -= (1 + player.stats.cooldownReduction);
      } else {
        weapon.cooldownTimer = weapon.baseCooldown;
        
        if (weapon.type === WeaponType.WAND) {
          playSound('shoot');
          // Find nearest enemy
          let nearest: Enemy | null = null;
          let minDst = Infinity;
          enemiesRef.current.forEach(e => {
            const dst = getDistance(player.pos, e.pos);
            if (dst < minDst && dst < 600) {
              minDst = dst;
              nearest = e;
            }
          });

          const targetDir = nearest 
            ? normalizeVector({ x: nearest.pos.x - player.pos.x, y: nearest.pos.y - player.pos.y })
            : { x: Math.random() - 0.5, y: Math.random() - 0.5 };

          bulletsRef.current.push({
            id: Math.random().toString(),
            pos: { ...player.pos },
            velocity: { x: targetDir.x * 8, y: targetDir.y * 8 },
            radius: 6,
            damage: weapon.damage * player.stats.might,
            duration: 60,
            pierce: 1,
            color: '#60a5fa',
            weaponType: WeaponType.WAND
          });
        } else if (weapon.type === WeaponType.AXE) {
           playSound('shoot');
           const dirY = -11;
           const dirX = (player.facingRight ? 1 : -1) * 4 + (Math.random() - 0.5) * 2;
           bulletsRef.current.push({
              id: Math.random().toString(),
              pos: { x: player.pos.x, y: player.pos.y - 10 },
              velocity: { x: dirX, y: dirY },
              radius: 10,
              damage: weapon.damage * 1.5 * player.stats.might,
              duration: 80,
              pierce: 99,
              color: '#ef4444',
              rotation: 0,
              weaponType: WeaponType.AXE
           });
        } else if (weapon.type === WeaponType.AURA) {
           // Aura is persistent, we just check if it exists
           const existingAura = bulletsRef.current.find(b => b.weaponType === WeaponType.AURA);
           if (!existingAura) {
             bulletsRef.current.push({
               id: 'aura',
               pos: player.pos,
               velocity: {x:0, y:0},
               radius: 55 * player.stats.area,
               damage: weapon.damage * 0.2 * player.stats.might,
               duration: 99999,
               pierce: 9999,
               color: 'rgba(255, 200, 100, 0.2)',
               weaponType: WeaponType.AURA
             });
           }
        }
      }
    });

    // --- 4. Update Bullets ---
    bulletsRef.current.forEach(b => {
      if (b.weaponType === WeaponType.AXE) {
        b.velocity.y += 0.4; // Gravity
        b.pos.x += b.velocity.x;
        b.pos.y += b.velocity.y;
        b.rotation = (b.rotation || 0) + 0.3;
      } else if (b.weaponType === WeaponType.AURA) {
        b.pos = player.pos;
        b.radius = 55 * player.stats.area; 
      } else {
        b.pos.x += b.velocity.x;
        b.pos.y += b.velocity.y;
      }
      b.duration--;
    });
    bulletsRef.current = bulletsRef.current.filter(b => b.duration > 0);

    // --- 5. Collisions (Enemy vs Player/Bullet) ---
    const enemiesToRemove = new Set<string>();
    const obstaclesToRemove = new Set<number>();
    
    enemiesRef.current.forEach(enemy => {
      // Knockback friction
      enemy.pos.x += enemy.knockback.x;
      enemy.pos.y += enemy.knockback.y;
      enemy.knockback.x *= 0.8;
      enemy.knockback.y *= 0.8;

      // AI Movement
      const dir = normalizeVector({ x: player.pos.x - enemy.pos.x, y: player.pos.y - enemy.pos.y });
      enemy.pos.x += dir.x * enemy.speed;
      enemy.pos.y += dir.y * enemy.speed;

      // Bullet Collision
      bulletsRef.current.forEach(bullet => {
        if (enemiesToRemove.has(enemy.id)) return;
        
        // Aura ticks every 15 frames
        if (bullet.weaponType === WeaponType.AURA && frameCountRef.current % 15 !== 0) return;

        if (checkCircleCollision(enemy.pos, enemy.radius, bullet.pos, bullet.radius)) {
          if (frameCountRef.current % 5 === 0) playSound('hit');
          
          const dmg = Math.floor(bullet.damage);
          enemy.hp -= dmg;
          
          textsRef.current.push({
            id: Math.random().toString(),
            pos: { x: enemy.pos.x, y: enemy.pos.y - 15 },
            value: dmg,
            life: 30,
            color: dmg > 30 ? COLORS.crit : COLORS.damage
          });

          // Knockback
          if (bullet.weaponType !== WeaponType.AURA) {
             const kbDir = normalizeVector(bullet.velocity);
             enemy.knockback.x += kbDir.x * 5;
             enemy.knockback.y += kbDir.y * 5;
             if (bullet.pierce > 0) bullet.pierce--;
          } else {
             // Aura slight push
             enemy.knockback.x += dir.x * -1;
             enemy.knockback.y += dir.y * -1;
          }

          if (enemy.hp <= 0) {
             enemiesToRemove.add(enemy.id);
             // Drop chance
             const rand = Math.random();
             if (rand > 0.995) { // Ultra rare drop
                 spawnPickup(enemy.pos);
             } else {
                 gemsRef.current.push({
                   id: Math.random().toString(),
                   pos: { ...enemy.pos },
                   value: enemy.type === 'tank' ? 20 : 2,
                   type: enemy.type === 'tank' ? 'red' : (Math.random() > 0.9 ? 'green' : 'blue')
                 });
             }
          }
        }
      });

      // Player Collision
      if (!enemiesToRemove.has(enemy.id)) {
        if (checkCircleCollision(enemy.pos, enemy.radius, player.pos, PLAYER_RADIUS)) {
           // iFrames check
           if (frameCountRef.current % 30 === 0) { 
              player.stats.hp -= enemy.damage;
              playSound('hit');
              textsRef.current.push({
                id: Math.random().toString(),
                pos: { ...player.pos },
                value: `-${enemy.damage}`,
                life: 40,
                color: '#ff0000'
              });
              if (player.stats.hp <= 0) {
                playSound('die');
                onGameOver(Math.floor((Date.now() - startTimeRef.current) / 1000));
              }
           }
        }
      }
    });

    // --- 6. Obstacle Destruction ---
    bulletsRef.current.forEach(bullet => {
      obstaclesRef.current.forEach((obs, index) => {
        if (obstaclesToRemove.has(index)) return;
        if (!obs.destructible) return;
        
        if (checkRectCollision(bullet.pos, bullet.radius, obs.pos, obs.width, obs.height)) {
          if (bullet.pierce > 0 || bullet.weaponType === WeaponType.AURA) {
            obs.hp -= bullet.damage;
            if (bullet.weaponType !== WeaponType.AURA) bullet.pierce--;
            
            textsRef.current.push({
              id: Math.random().toString(),
              pos: { x: obs.pos.x + obs.width/2, y: obs.pos.y },
              value: Math.floor(bullet.damage),
              life: 20,
              color: '#cccccc',
              scale: 0.8
            });

            if (obs.hp <= 0) {
              playSound('explosion');
              obstaclesToRemove.add(index);
              
              // Crate Loot Table
              const centerPos = { x: obs.pos.x + obs.width/2, y: obs.pos.y + obs.height/2 };
              const lootRnd = Math.random();
              if (lootRnd > 0.6) {
                 spawnPickup(centerPos);
              } else {
                 gemsRef.current.push({
                    id: Math.random().toString(),
                    pos: centerPos,
                    value: 10,
                    type: 'green'
                 });
              }
            }
          }
        }
      });
    });

    // Clean up entities
    bulletsRef.current = bulletsRef.current.filter(b => b.pierce > 0);
    enemiesRef.current = enemiesRef.current.filter(e => !enemiesToRemove.has(e.id));
    obstaclesRef.current = obstaclesRef.current.filter((_, i) => !obstaclesToRemove.has(i));

    // --- 7. Items & Pickups ---
    const gemsToRemove = new Set<string>();
    gemsRef.current.forEach(gem => {
       const dist = getDistance(player.pos, gem.pos);
       if (dist < player.stats.pickupRange) {
          // Magnet effect
          gem.pos.x += (player.pos.x - gem.pos.x) * 0.2;
          gem.pos.y += (player.pos.y - gem.pos.y) * 0.2;
       }
       if (dist < PLAYER_RADIUS + 10) {
         playSound('gem');
         player.xp += gem.value;
         gemsToRemove.add(gem.id);
         
         // Level Up Check
         if (player.xp >= player.nextLevelXp) {
           player.level++;
           player.xp -= player.nextLevelXp;
           player.nextLevelXp = Math.floor(XP_BASE * Math.pow(player.level, XP_FACTOR));
           playSound('levelup');
           generateUpgrades();
         }
       }
    });
    gemsRef.current = gemsRef.current.filter(g => !gemsToRemove.has(g.id));

    const pickupsToRemove = new Set<string>();
    pickupsRef.current.forEach(p => {
      if (checkCircleCollision(player.pos, PLAYER_RADIUS + 10, p.pos, p.radius)) {
        playSound('powerup');
        applyPickup(p.type);
        pickupsToRemove.add(p.id);
        
        let text = "";
        if (p.type === 'health') text = "美味烤鸡!";
        if (p.type === 'magnet') text = "磁铁!";
        if (p.type === 'bomb') text = "全屏炸弹!";
        if (p.type === 'speed') text = "急速!";
        
        textsRef.current.push({
          id: Math.random().toString(),
          pos: { x: player.pos.x, y: player.pos.y - 40 },
          value: text,
          life: 80,
          color: COLORS.pickup[p.type],
          scale: 1.5
        });
      }
    });
    pickupsRef.current = pickupsRef.current.filter(p => !pickupsToRemove.has(p.id));

    // Sync UI
    if (frameCountRef.current % 5 === 0) {
      setPlayerData(
        player.stats.hp, 
        player.stats.maxHp, 
        player.xp, 
        player.nextLevelXp, 
        player.level,
        Math.floor((Date.now() - startTimeRef.current) / 1000)
      );
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const spawnPickup = (pos: Point) => {
    const types: PickupType[] = ['health', 'magnet', 'bomb', 'speed'];
    // Weighted random
    const r = Math.random();
    let type: PickupType = 'health';
    if (r < 0.4) type = 'health';      // 40% Chicken
    else if (r < 0.6) type = 'magnet'; // 20% Magnet
    else if (r < 0.8) type = 'speed';  // 20% Speed
    else type = 'bomb';                // 20% Bomb

    pickupsRef.current.push({
      id: Math.random().toString(),
      pos: { ...pos },
      type,
      radius: 15
    });
  };

  const applyPickup = (type: PickupType) => {
    const player = playerRef.current;
    if (type === 'health') {
      player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + 30);
    } else if (type === 'speed') {
      speedBoostTimer.current = 900; // 15s
    } else if (type === 'bomb') {
      playSound('explosion');
      enemiesRef.current.forEach(e => {
        // Kill visual
        textsRef.current.push({
          id: Math.random().toString(),
          pos: { ...e.pos },
          value: "9999",
          life: 30,
          color: '#ff0000'
        });
        // Drop gems
        gemsRef.current.push({
           id: Math.random().toString(),
           pos: { ...e.pos },
           value: 1,
           type: 'blue'
        });
      });
      enemiesRef.current = [];
    } else if (type === 'magnet') {
      gemsRef.current.forEach(g => {
        // Teleport near player
        g.pos.x = player.pos.x + (Math.random()-0.5)*50;
        g.pos.y = player.pos.y + (Math.random()-0.5)*50;
      });
    }
  };

  // --- Upgrade System (Chinese) ---
  const generateUpgrades = () => {
    const p = playerRef.current;
    const opts: UpgradeOption[] = [];
    
    const hasWand = p.weapons.some(w => w.type === WeaponType.WAND);
    const hasAxe = p.weapons.some(w => w.type === WeaponType.AXE);
    const hasAura = p.weapons.some(w => w.type === WeaponType.AURA);

    // Upgrade Pool
    const pool = [
      { 
        type: 'stat', name: '大力菠菜', description: '造成的所有伤害提升 10%', 
        synergy: '所有武器通用', id: 'might', rarity: '普通',
        apply: (p: Player) => p.stats.might += 0.1 
      },
      { 
        type: 'stat', name: '空日之书', description: '武器冷却时间减少 5%', 
        synergy: '配合 魔法杖 效果极佳', id: 'cdr', rarity: '稀有',
        apply: (p: Player) => p.stats.cooldownReduction += 0.05 
      },
      { 
        type: 'stat', name: '烛台', description: '攻击范围扩大 10%', 
        synergy: '配合 大蒜光环 效果极佳', id: 'area', rarity: '普通',
        apply: (p: Player) => p.stats.area += 0.1 
      },
      { 
        type: 'stat', name: '飞鞋', description: '移动速度提升 10%', 
        synergy: '提升生存能力', id: 'speed', rarity: '普通',
        apply: (p: Player) => p.stats.speed *= 1.1 
      },
      
      // Weapons
      { 
        type: 'weapon', name: hasWand ? '强化魔法杖' : '魔法杖', 
        description: hasWand ? '伤害 +5' : '向最近的敌人发射魔法飞弹', 
        synergy: hasWand ? '基础武器' : '获得新武器', id: 'wand', rarity: hasWand ? '普通' : '普通',
        apply: (p: Player) => {
          const w = p.weapons.find(x => x.type === WeaponType.WAND);
          if (w) { w.level++; w.damage += 5; } else {
            p.weapons.push({ type: WeaponType.WAND, name: '魔法杖', level: 1, damage: 15, cooldownTimer: 0, baseCooldown: 60 });
          }
        } 
      },
      
      { 
        type: 'weapon', name: hasAxe ? '强化飞斧' : '飞斧', 
        description: hasAxe ? '伤害 +10, 冷却 -10%' : '向高空投掷造成范围伤害的斧头', 
        synergy: hasAxe ? '高伤害输出' : '获得新武器', id: 'axe', rarity: hasAxe ? '稀有' : '稀有',
        apply: (p: Player) => {
          const w = p.weapons.find(x => x.type === WeaponType.AXE);
          if (w) { w.level++; w.damage += 10; w.baseCooldown *= 0.9; } else {
            p.weapons.push({ type: WeaponType.AXE, name: '飞斧', level: 1, damage: 25, cooldownTimer: 0, baseCooldown: 80 });
          }
        } 
      },

      { 
        type: 'weapon', name: hasAura ? '强化光环' : '大蒜光环', 
        description: hasAura ? '范围 +20%' : '对周围敌人造成持续伤害并击退', 
        synergy: hasAura ? '防御型神器' : '获得新武器', id: 'aura', rarity: hasAura ? '稀有' : '稀有',
        apply: (p: Player) => {
          const w = p.weapons.find(x => x.type === WeaponType.AURA);
          if (w) { w.level++; p.stats.area *= 1.2; } else {
            p.weapons.push({ type: WeaponType.AURA, name: '大蒜光环', level: 1, damage: 5, cooldownTimer: 0, baseCooldown: 1 });
          }
        } 
      },

      { 
        type: 'heal', name: '全席大餐', description: '立即恢复 50 点生命值', 
        synergy: '救命稻草', id: 'heal', rarity: '传说',
        apply: (p: Player) => p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + 50) 
      },
    ];

    // Pick 3 distinct
    const shuffled = pool.sort(() => 0.5 - Math.random());
    for(let i=0; i<3; i++) {
       if (shuffled[i]) {
         // Unique IDs to avoid React key issues
         opts.push({ ...shuffled[i], id: shuffled[i].id + Math.random() } as any);
       }
    }
    onLevelUp(opts);
  };

  // --- Rendering ---
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const player = playerRef.current;

    // Background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    const camX = canvas.width / 2 - player.pos.x;
    const camY = canvas.height / 2 - player.pos.y;
    ctx.translate(camX, camY);

    // Grid
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;
    const gridSize = 100;
    const startX = Math.floor((player.pos.x - canvas.width / 2) / gridSize) * gridSize;
    const endX = startX + canvas.width + gridSize * 2;
    const startY = Math.floor((player.pos.y - canvas.height / 2) / gridSize) * gridSize;
    const endY = startY + canvas.height + gridSize * 2;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for (let y = startY; y <= endY; y += gridSize) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke();

    // Obstacles
    obstaclesRef.current.forEach(obs => {
      ctx.fillStyle = COLORS.obstacle[obs.type];
      ctx.fillRect(obs.pos.x, obs.pos.y, obs.width, obs.height);
      
      // Detail for Crate
      if (obs.type === 'crate') {
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.strokeRect(obs.pos.x, obs.pos.y, obs.width, obs.height);
        ctx.beginPath();
        ctx.moveTo(obs.pos.x, obs.pos.y);
        ctx.lineTo(obs.pos.x + obs.width, obs.pos.y + obs.height);
        ctx.moveTo(obs.pos.x + obs.width, obs.pos.y);
        ctx.lineTo(obs.pos.x, obs.pos.y + obs.height);
        ctx.stroke();
      } else if (obs.type === 'rock') {
        ctx.fillStyle = '#52525b';
        ctx.beginPath();
        ctx.arc(obs.pos.x + obs.width/2, obs.pos.y + obs.height/2, obs.width/2, 0, Math.PI*2);
        ctx.fill();
      } else { // tree
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(obs.pos.x + obs.width/2, obs.pos.y + obs.height/2, obs.width/2, 0, Math.PI*2);
        ctx.fill();
      }
    });

    // Gems
    gemsRef.current.forEach(gem => {
      ctx.fillStyle = COLORS.gem[gem.type as keyof typeof COLORS.gem];
      ctx.beginPath();
      ctx.arc(gem.pos.x, gem.pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Pickups
    pickupsRef.current.forEach(p => {
      const cx = p.pos.x;
      const cy = p.pos.y;
      const r = p.radius;
      
      ctx.fillStyle = COLORS.pickup[p.type];
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      
      ctx.beginPath();
      if (p.type === 'health') {
        // Cross
        const w = r * 0.4;
        ctx.fillRect(cx - w, cy - r, w*2, r*2);
        ctx.fillRect(cx - r, cy - w, r*2, w*2);
      } else if (p.type === 'magnet') {
         // U-Shape
         ctx.strokeStyle = COLORS.pickup.magnet;
         ctx.lineWidth = 4;
         ctx.arc(cx, cy - 5, r, 0, Math.PI, false);
         ctx.stroke();
         ctx.fillStyle = 'white';
         ctx.fillRect(cx - r - 2, cy - 5, 4, 10);
         ctx.fillRect(cx + r - 2, cy - 5, 4, 10);
      } else if (p.type === 'bomb') {
         ctx.arc(cx, cy, r, 0, Math.PI*2);
         ctx.fill();
         ctx.fillStyle = 'white'; // Wick spark
         ctx.fillRect(cx-2, cy-r-4, 4, 4);
      } else { // speed
         ctx.arc(cx, cy, r, 0, Math.PI*2);
         ctx.fill();
         ctx.strokeStyle = 'white';
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.moveTo(cx-5, cy);
         ctx.lineTo(cx+2, cy-5);
         ctx.lineTo(cx+2, cy+5);
         ctx.stroke();
      }
      ctx.shadowBlur = 0;
    });

    // Enemies
    enemiesRef.current.forEach(enemy => {
      ctx.fillStyle = enemy.id.startsWith('tank') ? COLORS.enemy.tank : COLORS.enemy[enemy.type as keyof typeof COLORS.enemy];
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      // Simple eye
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      const eyeOffset = enemy.pos.x < player.pos.x ? -3 : 3;
      ctx.beginPath();
      ctx.arc(enemy.pos.x + eyeOffset, enemy.pos.y - 4, 3, 0, Math.PI*2);
      ctx.fill();
    });

    // Player
    ctx.fillStyle = COLORS.player;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.player;
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Player Direction Indicator
    ctx.fillStyle = 'white';
    const lookDir = player.facingRight ? 6 : -6;
    ctx.fillRect(player.pos.x + lookDir, player.pos.y - 5, 4, 8);

    // Bullets
    bulletsRef.current.forEach(b => {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      if (b.rotation) ctx.rotate(b.rotation);
      
      if (b.weaponType === WeaponType.AURA) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (b.weaponType === WeaponType.AXE) {
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.radius, -b.radius, b.radius*2, b.radius*2);
      } else {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Damage Text
    ctx.textAlign = 'center';
    textsRef.current.forEach(t => {
      ctx.fillStyle = t.color;
      const scale = t.scale || 1;
      ctx.font = `bold ${14 * scale}px Roboto`;
      ctx.fillText(t.value.toString(), t.pos.x, t.pos.y);
      t.pos.y -= 0.5;
      t.life--;
    });
    textsRef.current = textsRef.current.filter(t => t.life > 0);

    ctx.restore();
  };

  useEffect(() => {
    if (state === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [state]); 

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      className="block bg-zinc-900"
    />
  );
};

export default Game;
