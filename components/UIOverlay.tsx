
import React from 'react';
import { formatNumber } from '../game/utils';
import { UpgradeOption } from '../game/types';
import { 
  Heart, Zap, Swords, Sparkles, Play, RotateCw, 
  Wand2, Axe, CircleDashed, Book, Maximize, Wind, Utensils, 
  Crown, ShieldPlus
} from 'lucide-react';
import { playSound } from '../game/audio';

interface UIProps {
  hp: number;
  maxHp: number;
  xp: number;
  nextXp: number;
  level: number;
  time: number;
  showLevelUp: boolean;
  upgradeOptions: UpgradeOption[];
  onSelectUpgrade: (opt: UpgradeOption) => void;
  gameOver: boolean;
  onRestart: () => void;
  gameStarted: boolean;
  onStart: () => void;
}

const UIOverlay: React.FC<UIProps> = ({
  hp, maxHp, xp, nextXp, level, time,
  showLevelUp, upgradeOptions, onSelectUpgrade,
  gameOver, onRestart, gameStarted, onStart
}) => {
  
  const handleStart = () => {
    playSound('select');
    onStart();
  };

  const handleRestart = () => {
    playSound('select');
    onRestart();
  };

  // --- 辅助函数：根据ID获取特定图标 ---
  const getIconForUpgrade = (id: string) => {
    if (id.includes('wand')) return <Wand2 className="w-16 h-16 text-blue-300" />;
    if (id.includes('axe')) return <Axe className="w-16 h-16 text-red-400" />;
    if (id.includes('aura')) return <CircleDashed className="w-16 h-16 text-yellow-200" />;
    
    if (id.includes('might')) return <Swords className="w-16 h-16 text-red-500" />;
    if (id.includes('cdr')) return <Book className="w-16 h-16 text-cyan-400" />;
    if (id.includes('area')) return <Maximize className="w-16 h-16 text-purple-400" />;
    if (id.includes('speed')) return <Wind className="w-16 h-16 text-emerald-400" />;
    if (id.includes('heal')) return <Utensils className="w-16 h-16 text-pink-400" />;
    
    // 默认图标
    return <Sparkles className="w-16 h-16 text-white" />;
  };

  // --- 辅助函数：根据稀有度获取样式配置 ---
  const getRarityConfig = (rarity: string) => {
    switch (rarity) {
      case '传说':
        return {
          border: 'border-amber-400',
          bg: 'bg-gradient-to-b from-amber-900/80 to-black',
          shadow: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-500 text-black',
          iconBorder: 'border-amber-400',
          glow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]'
        };
      case '稀有':
        return {
          border: 'border-cyan-400',
          bg: 'bg-gradient-to-b from-cyan-900/80 to-black',
          shadow: 'shadow-[0_0_30px_rgba(34,211,238,0.3)]',
          text: 'text-cyan-400',
          badgeBg: 'bg-cyan-500 text-black',
          iconBorder: 'border-cyan-400',
          glow: 'shadow-[0_0_15px_rgba(34,211,238,0.4)]'
        };
      default: // 普通
        return {
          border: 'border-zinc-500',
          bg: 'bg-zinc-800',
          shadow: 'shadow-none',
          text: 'text-zinc-300',
          badgeBg: 'bg-zinc-600 text-zinc-100',
          iconBorder: 'border-zinc-600',
          glow: 'shadow-none'
        };
    }
  };

  // Start Screen
  if (!gameStarted && !gameOver) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-50">
        <h1 className="text-6xl mb-8 text-blue-500 pixel-font drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]">
          绝境幸存者
        </h1>
        <p className="mb-8 text-zinc-400 text-xl max-w-md text-center leading-relaxed">
          使用 WASD 或 方向键 移动。<br/>
          摧毁 <span className="text-amber-600">木箱</span> 可以获得道具。<br/>
          升级时选择合适的技能组合。
        </p>
        <button 
          onClick={handleStart}
          className="group flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-2xl rounded shadow-lg transition-transform hover:scale-105 font-bold"
        >
          <Play className="fill-current" /> 开始游戏
        </button>
      </div>
    );
  }

  // Game Over Screen
  if (gameOver) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 text-white z-50">
        <h2 className="text-6xl mb-6 font-bold pixel-font text-red-500 tracking-widest">胜败乃兵家常事</h2>
        <div className="bg-black/60 p-10 rounded-xl text-center mb-8 border border-red-700 shadow-2xl">
          <p className="text-2xl mb-4 text-zinc-200">存活时间: <span className="text-white font-mono font-bold">{Math.floor(time / 60)}分 {time % 60}秒</span></p>
          <p className="text-xl text-zinc-400">达到等级: <span className="text-white font-bold">{level}</span></p>
        </div>
        <button 
          onClick={handleRestart}
          className="flex items-center gap-2 px-8 py-3 bg-white text-red-900 hover:bg-zinc-200 text-xl rounded font-bold shadow-xl transition-all"
        >
          <RotateCw /> 重新开始
        </button>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* HUD Top */}
      <div className="w-full h-20 bg-gradient-to-b from-black/90 to-transparent p-4 flex justify-between items-start pointer-events-auto">
        
        {/* Level & XP */}
        <div className="flex-1 flex flex-col max-w-md">
          <div className="flex justify-between text-white font-bold mb-1 text-shadow">
            <span className="text-yellow-400 text-lg">LV. {level}</span>
          </div>
          <div className="w-full h-4 bg-zinc-800 rounded-full border border-zinc-600 overflow-hidden relative">
            <div 
              className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" 
              style={{ width: `${Math.min(100, (xp / nextXp) * 100)}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">
              EXP
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="flex-1 flex justify-center">
           <div className="text-3xl font-mono font-bold text-white drop-shadow-md bg-zinc-900/50 border border-zinc-700 px-6 py-2 rounded-lg tracking-wider">
             {formatTime(time)}
           </div>
        </div>

        <div className="flex-1 text-right">
           {/* Kill count or other stats could go here */}
        </div>
      </div>

      {/* Health Bar (Bottom Center) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 pointer-events-auto transform transition-all">
        <div className="flex items-center justify-center text-red-400 mb-2 font-bold text-lg drop-shadow-md">
           <Heart className="w-6 h-6 mr-2 fill-current animate-pulse" />
           {Math.ceil(hp)} / {Math.ceil(maxHp)}
        </div>
        <div className="w-full h-8 bg-zinc-900 border-2 border-red-900 rounded-full overflow-hidden shadow-lg relative">
           <div 
             className="h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-200"
             style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }}
           ></div>
        </div>
      </div>

      {/* Level Up Modal */}
      {showLevelUp && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto animate-in fade-in duration-300 z-50">
           <div className="bg-zinc-900/90 border-2 border-yellow-500 p-8 rounded-xl max-w-6xl w-full shadow-[0_0_50px_rgba(234,179,8,0.2)] flex flex-col items-center">
              <div className="text-yellow-400 text-2xl mb-2 font-bold uppercase tracking-[0.5em] animate-pulse flex items-center gap-4">
                <Crown className="w-8 h-8" /> LEVEL UP <Crown className="w-8 h-8" />
              </div>
              <h2 className="text-4xl text-white mb-10 pixel-font text-center">选择升级奖励</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {upgradeOptions.map((opt) => {
                  const style = getRarityConfig(opt.rarity);
                  return (
                    <button 
                      key={opt.id}
                      onClick={() => onSelectUpgrade(opt)}
                      className={`
                        group relative border-2 p-6 rounded-xl text-left transition-all duration-300 transform hover:-translate-y-3 flex flex-col h-[28rem] overflow-hidden
                        ${style.border} ${style.bg} ${style.shadow}
                      `}
                    >
                      {/* Rarity Badge */}
                      <div className={`
                        absolute top-0 right-0 px-4 py-1 rounded-bl-xl font-bold uppercase text-sm tracking-wider z-10
                        ${style.badgeBg}
                      `}>
                        {opt.rarity}
                      </div>

                      {/* Icon Container */}
                      <div className={`
                        mb-6 p-4 bg-black/60 rounded-full w-32 h-32 flex items-center justify-center self-center 
                        border-4 transition-transform group-hover:scale-110 shadow-lg relative
                        ${style.iconBorder} ${style.glow}
                      `}>
                         {/* Radial Glow behind icon */}
                         <div className={`absolute inset-0 rounded-full opacity-20 blur-md ${style.badgeBg}`}></div>
                         <div className="relative z-10">
                           {getIconForUpgrade(opt.id)}
                         </div>
                      </div>
                      
                      {/* Text Content */}
                      <h3 className={`text-2xl font-bold mb-3 text-center tracking-wide ${style.text} drop-shadow-sm`}>
                        {opt.name}
                      </h3>
                      
                      <div className="flex-grow flex items-center justify-center">
                        <p className="text-zinc-300 text-lg text-center leading-relaxed px-2">
                          {opt.description}
                        </p>
                      </div>
                      
                      {opt.synergy && (
                        <div className="mt-4 bg-black/30 p-3 rounded-lg text-center border border-white/10">
                          <div className="flex items-center justify-center text-zinc-400 text-xs font-bold uppercase mb-1">
                            <Sparkles className="w-3 h-3 mr-1" /> 协同效应
                          </div>
                          <p className="text-zinc-300 text-sm font-medium">{opt.synergy}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;
