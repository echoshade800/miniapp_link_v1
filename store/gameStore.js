import { create } from 'zustand';
import StorageUtils from '../utils/StorageUtils';

// Game constants and formulas
export const GAME_CONSTANTS = {
  LAYOUTS: ['Static', 'Left', 'Right', 'Up', 'Down', 'Split'],
  LAYOUT_FACTORS: {
    Static: 1.00,
    Left: 1.05,
    Right: 1.05,
    Up: 1.10,
    Down: 1.10,
    Split: 1.15
  },
  TOOL_PRICES: {
    hint: 15,
    bomb: 25,
    shuffle: 20
  },
  TILE_KINDS: [
    '🌸', '🍀', '🎯', '🏠', '🌞', '🎨', '🎵', '🍎', '🦋', '⭐', 
    '🎪', '🌈', '🎭', '🎲', '🎸'
  ]
};

// Helper functions for game mechanics
export const GameUtils = {
  // Calculate time limit per level
  calculateTimeLimit: (level) => {
    const size = GameUtils.getLevelSize(level);
    const pairs = size / 2;
    const layout = GameUtils.getLevelLayout(level);
    const kinds = GameUtils.getLevelKinds(level);
    
    const Tpp = Math.max(2.8, 5.2 - 0.06 * Math.floor((level - 1) / 3));
    const layoutFactor = GAME_CONSTANTS.LAYOUT_FACTORS[layout];
    const kindFactor = 1 + 0.015 * (kinds - 3);
    
    return Math.ceil(pairs * Tpp * layoutFactor * kindFactor);
  },

  // Calculate hearts per level
  calculateHearts: (level) => {
    return Math.max(3, 10 - Math.floor((level - 1) / 12));
  },

  // Get level size (increases +4 every 12 levels, max 80)
  getLevelSize: (level) => {
    if (level === 1) {
      return 20; // 第1关：20个瓦片 (4×5)
    } else if (level <= 6) {
      return 60; // 第2-6关：60个瓦片 (6×10)
    } else {
      return 80; // 第7关及以后：80个瓦片 (8×10)
    }
  },

  // Get level kinds (increases +1 every 6 levels, max 15)
  getLevelKinds: (level) => {
    if (level <= 6) {
      return 5; // 1-6关：5种牌
    } else if (level <= 12) {
      return 12; // 7-12关：12种牌
    } else {
      return 15; // 13关及以后：15种牌
    }
  },

  // Get level layout (cycles every 6 levels)
  getLevelLayout: (level) => {
    const layoutIndex = ((level - 1) % 6);
    return GAME_CONSTANTS.LAYOUTS[layoutIndex];
  },

  // Get board dimensions for given size
  getBoardDimensions: (size) => {
    const factors = [];
    for (let i = 1; i <= Math.sqrt(size); i++) {
      if (size % i === 0) {
        factors.push([i, size / i]);
      }
    }
    // Return the most square-like dimensions
    return factors[factors.length - 1];
  },

  // Get gravity mode info for UI display
  getGravityModeInfo: (level) => {
    const layout = GameUtils.getLevelLayout(level);
    const gravityModes = {
      'Static': {
        showTip: false,
        tipText: '',
        arrow: null
      },
      'Left': {
        showTip: true,
        tipText: 'Bricks will move left after removal.',
        arrow: '←'
      },
      'Right': {
        showTip: true,
        tipText: 'Bricks will move right after removal.',
        arrow: '→'
      },
      'Up': {
        showTip: true,
        tipText: 'Bricks will move up after removal.',
        arrow: '↑'
      },
      'Down': {
        showTip: true,
        tipText: 'Bricks will move down after removal.',
        arrow: '↓'
      },
      'Split': {
        showTip: true,
        tipText: 'Bricks will move to both left and right after removal.',
        arrow: '↔'
      }
    };
    return gravityModes[layout];
  }
};

const useGameStore = create((set, get) => ({
  // User data
  userData: null,
  
  // Game progress
  currentLevel: 1,
  maxLevel: 1,
  bestTime: null,
  bambooBalance: 0,
  
  // Inventory
  inventory: {
    hint: 3,
    bomb: 1,
    shuffle: 1
  },
  
  // Settings
  settings: {
    musicOn: true,
    sfxOn: true,
    hapticsOn: true
  },
  
  // Current game state
  gameState: {
    isPlaying: false,
    timeRemaining: 0,
    heartsRemaining: 0,
    currentLevelBamboo: 0,
    selectedTiles: [],
    board: [],
    isPaused: false
  },

  // Initialize app data
  initializeApp: async () => {
    try {
      const userData = await StorageUtils.getUserData();
      const gameData = await StorageUtils.getData();
      
      set({
        userData,
        currentLevel: gameData?.maxLevel + 1 || 1,
        maxLevel: gameData?.maxLevel || 1,
        bestTime: gameData?.bestTime || null,
        bambooBalance: gameData?.bambooBalance || 0,
        inventory: gameData?.inventory || { hint: 3, bomb: 1, shuffle: 1 },
        settings: gameData?.settings || { musicOn: true, sfxOn: true, hapticsOn: true }
      });
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  },

  // Save game progress
  saveProgress: async (data) => {
    try {
      await StorageUtils.setData(data);
      return true;
    } catch (error) {
      console.error('Failed to save progress:', error);
      return false;
    }
  },

  // Start a level
  startLevel: (levelId) => {
    const timeLimit = GameUtils.calculateTimeLimit(levelId);
    const hearts = GameUtils.calculateHearts(levelId);
    const size = GameUtils.getLevelSize(levelId);
    const kinds = GameUtils.getLevelKinds(levelId);
    
    // 生成实际的游戏棋盘
    const board = get().generateGameBoard(size, kinds);
    
    set({
      currentLevel: levelId,
      gameState: {
        isPlaying: true,
        timeRemaining: timeLimit,
        heartsRemaining: hearts,
        currentLevelBamboo: 0,
        selectedTiles: [],
        board,
        isPaused: false
      }
    });
  },

  // 生成游戏棋盘
  generateGameBoard: (size, kinds) => {
    const [rows, cols] = GameUtils.getBoardDimensions(size);
    const pairs = size / 2;
    const availableEmojis = GAME_CONSTANTS.TILE_KINDS.slice(0, kinds);
    
    // 创建瓦片对
    const tiles = [];
    for (let i = 0; i < pairs; i++) {
      const emoji = availableEmojis[i % kinds];
      tiles.push(emoji, emoji);
    }
    
    // 洗牌算法
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    // 填充到棋盘
    const board = Array(rows).fill().map(() => Array(cols).fill(''));
    let tileIndex = 0;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (tileIndex < tiles.length) {
          board[row][col] = tiles[tileIndex];
          tileIndex++;
        }
      }
    }
    
    return board;
  },
  // Complete level
  completeLevel: async (levelId, earnedBamboo, time, isFirstTime = true) => {
    const { maxLevel, bambooBalance, bestTime } = get();
    const newMaxLevel = Math.max(maxLevel, levelId);
    // 只有首次通关才能获得竹子
    const newBambooBalance = isFirstTime ? bambooBalance + earnedBamboo : bambooBalance;
    const newBestTime = bestTime ? Math.min(bestTime, time) : time;
    
    await get().saveProgress({
      maxLevel: newMaxLevel,
      bestTime: newBestTime,
      bambooBalance: newBambooBalance
    });
    
    set({
      maxLevel: newMaxLevel,
      bambooBalance: newBambooBalance,
      bestTime: newBestTime,
      currentLevel: newMaxLevel + 1,
      gameState: { ...get().gameState, isPlaying: false }
    });
    
    return isFirstTime; // 返回是否获得了竹子
  },

  // Purchase tool
  purchaseTool: async (toolType) => {
    const { bambooBalance, inventory } = get();
    const price = GAME_CONSTANTS.TOOL_PRICES[toolType];
    
    if (bambooBalance >= price) {
      const newBalance = bambooBalance - price;
      const newInventory = {
        ...inventory,
        [toolType]: inventory[toolType] + 1
      };
      
      await get().saveProgress({
        bambooBalance: newBalance,
        inventory: newInventory
      });
      
      set({
        bambooBalance: newBalance,
        inventory: newInventory
      });
      
      return true;
    }
    return false;
  },

  // Use tool
  useTool: (toolType) => {
    const { inventory } = get();
    if (inventory[toolType] > 0) {
      const newInventory = {
        ...inventory,
        [toolType]: inventory[toolType] - 1
      };
      
      set({ inventory: newInventory });
      get().saveProgress({ inventory: newInventory });
      
      // TODO: Implement tool effects (bomb, hint, shuffle)
      return true;
    }
    return false;
  },

  // Update settings
  updateSettings: async (newSettings) => {
    const updatedSettings = { ...get().settings, ...newSettings };
    await get().saveProgress({ settings: updatedSettings });
    set({ settings: updatedSettings });
  }
}));

export default useGameStore;