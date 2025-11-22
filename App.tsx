import React, { useState, useCallback } from 'react';
import Game from './components/Game';
import UIOverlay from './components/UIOverlay';
import { GameState, UpgradeOption } from './game/types';
import { PLAYER_BASE_HP, XP_BASE } from './game/constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradeOption | null>(null);
  
  // UI State (Synced from Game Ref)
  const [playerData, setPlayerData] = useState({
    hp: PLAYER_BASE_HP,
    maxHp: PLAYER_BASE_HP,
    xp: 0,
    nextXp: XP_BASE,
    level: 1,
    time: 0
  });

  const handleStart = () => {
    setGameState(GameState.PLAYING);
  };

  const handleRestart = () => {
    // Force full reload to clear all refs cleanly for this demo
    window.location.reload(); 
  };

  const handleLevelUp = useCallback((options: UpgradeOption[]) => {
    setUpgradeOptions(options);
    setGameState(GameState.LEVEL_UP);
  }, []);

  const handleSelectUpgrade = (opt: UpgradeOption) => {
    setSelectedUpgrade(opt);
    setGameState(GameState.PLAYING);
  };

  const handleUpgradeApplied = () => {
    setSelectedUpgrade(null);
    setUpgradeOptions([]);
  };

  const handleGameOver = (survivedTime: number) => {
    setGameState(GameState.GAME_OVER);
  };

  const updatePlayerData = useCallback((hp: number, maxHp: number, xp: number, nextXp: number, level: number, time: number) => {
    setPlayerData({ hp, maxHp, xp, nextXp, level, time });
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Game 
        state={gameState}
        onLevelUp={handleLevelUp}
        onGameOver={handleGameOver}
        setPlayerData={updatePlayerData}
        selectedUpgrade={selectedUpgrade}
        onUpgradeApplied={handleUpgradeApplied}
      />
      
      <UIOverlay 
        {...playerData}
        gameStarted={gameState !== GameState.MENU}
        showLevelUp={gameState === GameState.LEVEL_UP}
        upgradeOptions={upgradeOptions}
        onSelectUpgrade={handleSelectUpgrade}
        gameOver={gameState === GameState.GAME_OVER}
        onRestart={handleRestart}
        onStart={handleStart}
      />
    </div>
  );
};

export default App;
