/**
 * Game Screen - Main gameplay interface
 * Purpose: Handle tile matching, game mechanics, timers, and tool usage
 * Extension: Add animations, particle effects, sound integration, or multiplayer
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  Modal,
  Vibration,
  ImageBackground,
  Image
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import useGameStore, { GameUtils, GAME_CONSTANTS } from '../store/gameStore';
import BambooAnimation from '../components/BambooAnimation';
import SparkAnimation from '../components/SparkAnimation';
import MiniBoard from '../components/MiniBoard';
import StorageUtils from '../utils/StorageUtils';

export default function Game() {
  const { 
    gameState, 
    currentLevel, 
    inventory,
    settings,
    useTool,
    completeLevel,
    startLevel
  } = useGameStore();

  const [selectedTiles, setSelectedTiles] = useState([]);
  const [currentLevelBamboo, setCurrentLevelBamboo] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showModal, setShowModal] = useState(null); // 'pause', 'complete', 'failed', 'deadlock', 'gravity-tip'
  const [bambooAnimations, setBambooAnimations] = useState([]);
  const [sparkAnimations, setSparkAnimations] = useState([]);
  const [hasShownGravityTip, setHasShownGravityTip] = useState(false);
  const [hintedTiles, setHintedTiles] = useState([]); // 存储被提示高亮的瓦片位置
  const [bombTargetTiles, setBombTargetTiles] = useState([]); // 存储炸弹目标瓦片
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1); // 1 or 2

  // 使用store中的状态，不使用本地状态
  const timeRemaining = gameState.timeRemaining;
  const heartsRemaining = gameState.heartsRemaining;
  const board = gameState.board;
  
  // 计算进度条相关数据 - 基于剩余瓦片数量
  const currentSize = GameUtils.getLevelSize(currentLevel);
  const totalPairs = currentSize / 2;
  
  // 统计剩余瓦片数量
  const remainingTiles = board.reduce((count, row) => {
    return count + row.reduce((rowCount, tile) => {
      return rowCount + (tile ? 1 : 0);
    }, 0);
  }, 0);
  
  const remainingPairs = remainingTiles / 2;
  const eliminatedPairs = totalPairs - remainingPairs;
  const progressPercentage = totalPairs > 0 ? (eliminatedPairs / totalPairs) * 100 : 0;
  
  // 获取当前关卡的重力模式信息
  const gravityModeInfo = GameUtils.getGravityModeInfo(currentLevel);

  // Emoji tile types for the game
  const emojiTiles = ['🌸', '🍀', '🎯', '🏠', '🌞', '🎨', '🎵', '🍎', '🦋', '⭐', '🎪', '🌈', '🎭', '🎲', '🎸'];

  // 检查棋盘是否可解（至少有一对可连接的瓦片）
  const isBoardSolvable = (board) => {
    // 收集所有非空瓦片
    const tiles = [];
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[0].length; col++) {
        if (board[row][col]) {
          tiles.push({
            row,
            col,
            type: board[row][col]
          });
        }
      }
    }
    
    // 检查是否存在至少一对可连接的瓦片
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const tile1 = tiles[i];
        const tile2 = tiles[j];
        
        // 只检查相同类型的瓦片
        if (tile1.type === tile2.type) {
          const pathResult = findPath(tile1, tile2);
          if (pathResult.isValid) {
            return true; // 找到可连接的瓦片对
          }
        }
      }
    }
    
    return false; // 没有找到任何可连接的瓦片对
  };

  // 安全的随机炸弹目标选择（支持多目标）
  const findSafeRandomBombTargets = (currentBoard, targetCount) => {
    // 统计每种瓦片的数量和位置
    const tileStats = {};
    
    for (let row = 0; row < currentBoard.length; row++) {
      for (let col = 0; col < currentBoard[0].length; col++) {
        const tile = currentBoard[row][col];
        if (tile) {
          if (!tileStats[tile]) {
            tileStats[tile] = [];
          }
          tileStats[tile].push({ row, col, type: tile });
        }
      }
    }
    
    // 找到数量≥targetCount且消除后剩余数量为偶数的瓦片类型（安全炸弹目标）
    const safeTileTypes = [];
    for (const [type, positions] of Object.entries(tileStats)) {
      const remainingAfterBomb = positions.length - targetCount;
      if (positions.length >= targetCount && remainingAfterBomb >= 0 && remainingAfterBomb % 2 === 0) {
        safeTileTypes.push({ type, positions });
      }
    }
    
    if (safeTileTypes.length === 0) {
      return null; // 没有安全的炸弹目标
    }
    
    // 随机选择一种瓦片类型
    const randomTypeData = safeTileTypes[Math.floor(Math.random() * safeTileTypes.length)];
    
    // 从该类型中随机选择targetCount个瓦片
    const positions = randomTypeData.positions;
    const shuffledPositions = [...positions];
    
    // 洗牌算法
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]];
    }
    
    // 返回指定数量的目标瓦片
    return shuffledPositions.slice(0, targetCount);
  };

  // 生成基础棋盘（简单随机分布）
  const generateBasicBoard = (size, kinds) => {
    const [rows, cols] = GameUtils.getBoardDimensions(size);
    const pairs = size / 2;
    const availableEmojis = emojiTiles.slice(0, kinds);
    
    // 创建瓦片对
    const tiles = [];
    for (let i = 0; i < pairs; i++) {
      const emoji = availableEmojis[i % kinds];
      tiles.push(emoji, emoji);
    }
    
    // 洗牌
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    // 填充到棋盘
    const newBoard = Array(rows).fill().map(() => Array(cols).fill(''));
    let tileIndex = 0;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (tileIndex < tiles.length) {
          newBoard[row][col] = tiles[tileIndex];
          tileIndex++;
        }
      }
    }
    
    return newBoard;
  };

  // 生成可解的棋盘（带验证）
  const generateSolvableBoard = (size, kinds, maxAttempts = 50) => {
    let attempts = 0;
    let board;
    
    do {
      board = generateBasicBoard(size, kinds);
      attempts++;
      
      // 如果尝试次数过多，使用智能生成
      if (attempts >= maxAttempts) {
        board = generateIntelligentBoard(size, kinds);
        break;
      }
    } while (!isBoardSolvable(board));
    
    return board;
  };

  // 智能生成棋盘（确保可解）
  const generateIntelligentBoard = (size, kinds) => {
    const [rows, cols] = GameUtils.getBoardDimensions(size);
    const pairs = size / 2;
    const availableEmojis = emojiTiles.slice(0, kinds);
    
    // 创建空棋盘
    const board = Array(rows).fill().map(() => Array(cols).fill(''));
    
    // 创建瓦片对列表
    const tilePairs = [];
    for (let i = 0; i < pairs; i++) {
      const emoji = availableEmojis[i % kinds];
      tilePairs.push(emoji);
    }
    
    // 洗牌瓦片对
    for (let i = tilePairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tilePairs[i], tilePairs[j]] = [tilePairs[j], tilePairs[i]];
    }
    
    // 智能放置瓦片对
    for (const tileType of tilePairs) {
      const positions = findBestPositionsForPair(board, rows, cols);
      if (positions.length >= 2) {
        // 放置一对瓦片
        board[positions[0].row][positions[0].col] = tileType;
        board[positions[1].row][positions[1].col] = tileType;
      }
    }
    
    return board;
  };

  // 为瓦片对寻找最佳放置位置
  const findBestPositionsForPair = (board, rows, cols) => {
    const emptyPositions = [];
    
    // 收集所有空位置
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!board[row][col]) {
          emptyPositions.push({ row, col });
        }
      }
    }
    
    // 洗牌空位置以增加随机性
    for (let i = emptyPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptyPositions[i], emptyPositions[j]] = [emptyPositions[j], emptyPositions[i]];
    }
    
    // 尝试找到可连接的位置对
    for (let i = 0; i < emptyPositions.length; i++) {
      for (let j = i + 1; j < emptyPositions.length; j++) {
        const pos1 = emptyPositions[i];
        const pos2 = emptyPositions[j];
        
        // 临时放置瓦片来测试连接性
        const tempTile1 = { row: pos1.row, col: pos1.col, type: 'test' };
        const tempTile2 = { row: pos2.row, col: pos2.col, type: 'test' };
        
        // 检查这两个位置是否可以连接
        const pathResult = findPath(tempTile1, tempTile2);
        if (pathResult.isValid) {
          return [pos1, pos2];
        }
      }
    }
    
    // 如果没有找到理想位置，返回前两个空位置
    return emptyPositions.slice(0, 2);
  };

  // 生成棋盘的主函数
  const generateBoard = (size, kinds) => {
    return generateSolvableBoard(size, kinds);
  };
  // Timer effect
  useEffect(() => {
    // 组件挂载时自动开始当前关卡
    if (!gameState.isPlaying) {
      startLevel(currentLevel);
    }
    
    // 检查是否需要显示重力模式提示
    if (gravityModeInfo.showTip && !hasShownGravityTip) {
      setShowModal('gravity-tip');
      setHasShownGravityTip(true);
    }
  }, []);

  // 首次进入Level 1显示两步新手引导
  useEffect(() => {
    const checkAndShowTutorial = async () => {
      try {
        const data = await StorageUtils.getData();
        const hasShown = data?.level1GuideShown === true;
        if (!hasShown && currentLevel === 1) {
          setTutorialStep(1);
          setShowTutorial(true);
          setShowModal('tutorial');
        }
      } catch (e) {
        // 读取失败也不阻塞游戏，仅在Level 1显示
        if (currentLevel === 1) {
          setTutorialStep(1);
          setShowTutorial(true);
          setShowModal('tutorial');
        }
      }
    };
    checkAndShowTutorial();
  }, [currentLevel]);

  const handleTutorialNext = () => {
    if (tutorialStep === 1) {
      setTutorialStep(2);
    }
  };

  const handleTutorialFinish = async () => {
    try {
      await StorageUtils.setData({ level1GuideShown: true });
    } catch (e) {
      // ignore persist errors
    }
    setShowTutorial(false);
    setShowModal(null);
  };
  
  // 根据关卡规模计算炸弹威力
  const getBombTargetCount = (levelSize) => {
    if (levelSize === 20) return 2;      // 小关卡：2个瓦片
    if (levelSize === 60) return 4;      // 中关卡：4个瓦片
    if (levelSize === 80) return 6;      // 大关卡：6个瓦片
    return 2; // 默认值
  };

  // 监听关卡变化，重置重力提示状态
  useEffect(() => {
    setHasShownGravityTip(false);
  }, [currentLevel]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (timeRemaining > 0 && !isPaused && !showModal) {
      interval = setInterval(() => {
        // 直接更新store中的时间
        const newTime = timeRemaining - 1;
        if (newTime <= 0) {
          useGameStore.setState({
            gameState: {
              ...gameState,
              timeRemaining: 0
            }
          });
          handleGameOver('time');
        } else {
          useGameStore.setState({
            gameState: {
              ...gameState,
              timeRemaining: newTime
            }
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeRemaining, isPaused, showModal, gameState]);

  // 旧的timer effect逻辑，替换为上面的新逻辑
  /*
  useEffect(() => {
    let interval;
    if (timeRemaining > 0 && !isPaused && !showModal) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleGameOver('time');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeRemaining, isPaused, showModal]);
  */

  const handleTilePress = (row, col) => {
    if (isPaused || showModal || !board[row][col]) return;

    const tilePos = { row, col, type: board[row][col] };
    
    if (selectedTiles.length === 0) {
      // First tile selection
      setSelectedTiles([tilePos]);
      playSound('tap');
    } else if (selectedTiles.length === 1) {
      const firstTile = selectedTiles[0];
      
      if (firstTile.row === row && firstTile.col === col) {
        // Deselect same tile
        setSelectedTiles([]);
        playSound('tap');
      } else if (firstTile.type === tilePos.type) {
        // Same type - check if valid path (TODO: Implement path validation)
        const pathResult = isValidPath(firstTile, tilePos);
        if (pathResult.isValid) {
          // Valid match
          handleSuccessfulMatch(firstTile, tilePos);
        } else {
          // Invalid path
          handleInvalidMatch();
        }
      } else {
        // Different types
        handleInvalidMatch();
      }
    }
  };

  const isValidPath = (tile1, tile2) => {
    return findPath(tile1, tile2);
  };

  // 检查位置是否为空（可以通过）
  const isEmpty = (row, col, boardToCheck = board) => {
    // 边界外视为空
    if (row < 0 || row >= boardToCheck.length || col < 0 || col >= boardToCheck[0].length) {
      return true;
    }
    return !boardToCheck[row][col];
  };

  // 路径验证算法 - 连连看核心逻辑
  const findPath = (tile1, tile2, boardToCheck = board) => {
    const { row: r1, col: c1 } = tile1;
    const { row: r2, col: c2 } = tile2;
    
    // 检查直线连接（0转弯）
    const straightPath = findStraightPath(r1, c1, r2, c2, boardToCheck);
    if (straightPath.isValid) {
      return { isValid: true, turns: 0, path: straightPath.path };
    }
    
    // 检查一次转弯连接（1转弯）
    const oneCornerPath = findOneCornerPath(r1, c1, r2, c2, boardToCheck);
    if (oneCornerPath.isValid) {
      return { isValid: true, turns: 1, path: oneCornerPath.path };
    }
    
    // 检查两次转弯连接（2转弯）
    const twoCornerPath = findTwoCornerPath(r1, c1, r2, c2, boardToCheck);
    if (twoCornerPath.isValid) {
      return { isValid: true, turns: 2, path: twoCornerPath.path };
    }
    
    return { isValid: false, turns: -1, path: [] };
  };

  // 检查直线路径（水平或垂直）
  const findStraightPath = (r1, c1, r2, c2, boardToCheck = board) => {
    const path = [];
    
    if (r1 === r2) {
      // 水平直线
      const minCol = Math.min(c1, c2);
      const maxCol = Math.max(c1, c2);
      
      // 检查中间是否有障碍
      for (let col = minCol + 1; col < maxCol; col++) {
        if (!isEmpty(r1, col, boardToCheck)) {
          return { isValid: false, path: [] };
        }
        path.push({ row: r1, col });
      }
      
      return { isValid: true, path };
    } else if (c1 === c2) {
      // 垂直直线
      const minRow = Math.min(r1, r2);
      const maxRow = Math.max(r1, r2);
      
      // 检查中间是否有障碍
      for (let row = minRow + 1; row < maxRow; row++) {
        if (!isEmpty(row, c1, boardToCheck)) {
          return { isValid: false, path: [] };
        }
        path.push({ row, col: c1 });
      }
      
      return { isValid: true, path };
    }
    
    return { isValid: false, path: [] };
  };

  // 检查一次转弯路径（L形）
  const findOneCornerPath = (r1, c1, r2, c2, boardToCheck = board) => {
    // 尝试两种L形路径
    
    // 路径1: (r1,c1) -> (r1,c2) -> (r2,c2)
    const path1 = checkLPath(r1, c1, r1, c2, r2, c2, boardToCheck);
    if (path1.isValid) {
      return path1;
    }
    
    // 路径2: (r1,c1) -> (r2,c1) -> (r2,c2)
    const path2 = checkLPath(r1, c1, r2, c1, r2, c2, boardToCheck);
    if (path2.isValid) {
      return path2;
    }
    
    return { isValid: false, path: [] };
  };

  // 检查L形路径
  const checkLPath = (r1, c1, rMid, cMid, r2, c2, boardToCheck = board) => {
    // 转折点必须为空
    if (!isEmpty(rMid, cMid, boardToCheck)) {
      return { isValid: false, path: [] };
    }
    
    // 检查第一段路径
    const segment1 = findStraightPath(r1, c1, rMid, cMid, boardToCheck);
    if (!segment1.isValid) {
      return { isValid: false, path: [] };
    }
    
    // 检查第二段路径
    const segment2 = findStraightPath(rMid, cMid, r2, c2, boardToCheck);
    if (!segment2.isValid) {
      return { isValid: false, path: [] };
    }
    
    // 合并路径
    const fullPath = [...segment1.path, { row: rMid, col: cMid }, ...segment2.path];
    return { isValid: true, path: fullPath };
  };

  // 检查两次转弯路径
  const findTwoCornerPath = (r1, c1, r2, c2, boardToCheck = board) => {
    const boardHeight = boardToCheck.length;
    const boardWidth = boardToCheck[0].length;
    
    // 首先尝试棋盘内部的所有空白位置作为中转点
    for (let row = 0; row < boardHeight; row++) {
      for (let col = 0; col < boardWidth; col++) {
        if (isEmpty(row, col, boardToCheck)) {
          const path = checkTwoCornerPath(r1, c1, row, col, r2, c2, boardToCheck);
          if (path.isValid) return path;
        }
      }
    }
    
    // 然后尝试通过边界外的路径连接
    // 尝试上边界外
    for (let col = -1; col <= boardWidth; col++) {
      const path = checkTwoCornerPath(r1, c1, -1, col, r2, c2, boardToCheck);
      if (path.isValid) return path;
    }
    
    // 尝试下边界外
    for (let col = -1; col <= boardWidth; col++) {
      const path = checkTwoCornerPath(r1, c1, boardHeight, col, r2, c2, boardToCheck);
      if (path.isValid) return path;
    }
    
    // 尝试左边界外
    for (let row = -1; row <= boardHeight; row++) {
      const path = checkTwoCornerPath(r1, c1, row, -1, r2, c2, boardToCheck);
      if (path.isValid) return path;
    }
    
    // 尝试右边界外
    for (let row = -1; row <= boardHeight; row++) {
      const path = checkTwoCornerPath(r1, c1, row, boardWidth, r2, c2, boardToCheck);
      if (path.isValid) return path;
    }
    
    return { isValid: false, path: [] };
  };

  // 检查通过中间点的两次转弯路径
  const checkTwoCornerPath = (r1, c1, rMid, cMid, r2, c2, boardToCheck = board) => {
    // 中间点必须为空（如果在棋盘内）
    if (!isEmpty(rMid, cMid, boardToCheck)) {
      return { isValid: false, path: [] };
    }
    
    // 尝试两种路径组合：
    // 1. 起点 -> 中间点（直线） -> 终点（直线）
    const straightPath1 = findStraightPath(r1, c1, rMid, cMid, boardToCheck);
    const straightPath2 = findStraightPath(rMid, cMid, r2, c2, boardToCheck);
    
    if (straightPath1.isValid && straightPath2.isValid) {
      const fullPath = [...straightPath1.path, { row: rMid, col: cMid }, ...straightPath2.path];
      return { isValid: true, path: fullPath };
    }
    
    // 2. 起点 -> 中间点（L形） -> 终点（直线）
    const lPath1 = findOneCornerPath(r1, c1, rMid, cMid, boardToCheck);
    const straightPath3 = findStraightPath(rMid, cMid, r2, c2, boardToCheck);
    
    if (lPath1.isValid && straightPath3.isValid) {
      const fullPath = [...lPath1.path, { row: rMid, col: cMid }, ...straightPath3.path];
      return { isValid: true, path: fullPath };
    }
    
    // 3. 起点 -> 中间点（直线） -> 终点（L形）
    const straightPath4 = findStraightPath(r1, c1, rMid, cMid, boardToCheck);
    const lPath2 = findOneCornerPath(rMid, cMid, r2, c2, boardToCheck);
    
    if (straightPath4.isValid && lPath2.isValid) {
      const fullPath = [...straightPath4.path, { row: rMid, col: cMid }, ...lPath2.path];
      return { isValid: true, path: fullPath };
    }
    
    return { isValid: false, path: [] };
  };

  const handleSuccessfulMatch = (tile1, tile2) => {
    // Remove tiles and apply gravity
    let newBoard = board.map(row => [...row]);
    newBoard[tile1.row][tile1.col] = '';
    newBoard[tile2.row][tile2.col] = '';
    
    // Apply gravity effect based on current level layout
    const currentLayout = GameUtils.getLevelLayout(currentLevel);
    newBoard = applyGravityEffect(newBoard, currentLayout);
    
    // 更新store中的棋盘
    useGameStore.setState({
      gameState: {
        ...gameState,
        board: newBoard
      }
    });
    
    // Calculate bamboo based on path turns
    const pathResult = findPath(tile1, tile2);
    const earnedBamboo = pathResult.turns + 1; // 0转弯=1竹子, 1转弯=2竹子, 2转弯=3竹子
    
    // 计算竹子动画的起始位置（从连接线的拐角开始）
    const animationPositions = calculateBambooStartPositions(pathResult.path, earnedBamboo, tile1, tile2);
    
    // 目标位置（竹子进度条的竹子图标位置）
    const endX = 60; // 竹子进度条图标的位置
    const endY = 120;
    
    // 创建竹子飞行动画
    const animationId = Date.now();
    setBambooAnimations(prev => [...prev, {
      id: animationId,
      bambooCount: earnedBamboo,
      startPositions: animationPositions,
      endPosition: { x: endX, y: endY },
    }]);
    
    setCurrentLevelBamboo(prev => prev + earnedBamboo);
    
    setSelectedTiles([]);
    playSound('success');
    vibrate();
    
    // Check if level complete
    if (isLevelComplete(newBoard)) {
      handleLevelComplete();
    } else {
      // Check for deadlock
      if (isDeadlocked(newBoard)) {
        setShowModal('deadlock');
      }
    }
  };

  // 计算竹子动画的起始位置
  const calculateBambooStartPositions = (path, bambooCount, tile1, tile2) => {
    const positions = [];
    const tileSize = 34; // 瓦片大小包含间距
    const boardOffsetX = 15; // 棋盘在屏幕中的X偏移
    const boardOffsetY = 200; // 棋盘在屏幕中的Y偏移（大概位置）
    
    if (path.length === 0) {
      // 直线连接，从两个瓦片中心开始
      const centerX = boardOffsetX + (tile1.col + tile2.col) / 2 * tileSize + tileSize / 2;
      const centerY = boardOffsetY + (tile1.row + tile2.row) / 2 * tileSize + tileSize / 2;
      
      for (let i = 0; i < bambooCount; i++) {
        positions.push({
          x: centerX + (i - bambooCount / 2) * 15, // 水平错开
          y: centerY
        });
      }
    } else {
      // 有拐角的连接，从拐角位置开始
      const corners = [];
      
      // 添加起始点
      corners.push({
        x: boardOffsetX + tile1.col * tileSize + tileSize / 2,
        y: boardOffsetY + tile1.row * tileSize + tileSize / 2
      });
      
      // 添加路径中的拐角点
      for (let i = 0; i < path.length; i++) {
        const point = path[i];
        corners.push({
          x: boardOffsetX + point.col * tileSize + tileSize / 2,
          y: boardOffsetY + point.row * tileSize + tileSize / 2
        });
      }
      
      // 添加终点
      corners.push({
        x: boardOffsetX + tile2.col * tileSize + tileSize / 2,
        y: boardOffsetY + tile2.row * tileSize + tileSize / 2
      });
      
      // 根据竹子数量分配到拐角位置
      for (let i = 0; i < bambooCount; i++) {
        const cornerIndex = Math.min(i, corners.length - 1);
        const corner = corners[cornerIndex];
        
        positions.push({
          x: corner.x + (Math.random() - 0.5) * 20, // 添加随机偏移
          y: corner.y + (Math.random() - 0.5) * 20
        });
      }
    }
    
    return positions;
  };

  // Apply gravity effect based on layout type
  const applyGravityEffect = (board, layoutType) => {
    const newBoard = board.map(row => [...row]);
    const rows = newBoard.length;
    const cols = newBoard[0].length;

    switch (layoutType) {
      case 'Static':
        // No movement, tiles stay in place
        return newBoard;

      case 'Left':
        // Tiles slide left to fill gaps
        for (let row = 0; row < rows; row++) {
          const rowTiles = [];
          for (let col = 0; col < cols; col++) {
            if (newBoard[row][col]) {
              rowTiles.push(newBoard[row][col]);
            }
          }
          // Fill from left, empty spaces on right
          for (let col = 0; col < cols; col++) {
            newBoard[row][col] = rowTiles[col] || '';
          }
        }
        break;

      case 'Right':
        // Tiles slide right to fill gaps
        for (let row = 0; row < rows; row++) {
          const rowTiles = [];
          for (let col = 0; col < cols; col++) {
            if (newBoard[row][col]) {
              rowTiles.push(newBoard[row][col]);
            }
          }
          // Fill from right, empty spaces on left
          for (let col = 0; col < cols; col++) {
            const tileIndex = rowTiles.length - cols + col;
            newBoard[row][col] = tileIndex >= 0 ? rowTiles[tileIndex] : '';
          }
        }
        break;

      case 'Up':
        // Tiles slide up to fill gaps
        for (let col = 0; col < cols; col++) {
          const colTiles = [];
          for (let row = 0; row < rows; row++) {
            if (newBoard[row][col]) {
              colTiles.push(newBoard[row][col]);
            }
          }
          // Fill from top, empty spaces at bottom
          for (let row = 0; row < rows; row++) {
            newBoard[row][col] = colTiles[row] || '';
          }
        }
        break;

      case 'Down':
        // Tiles slide down to fill gaps (like Tetris)
        for (let col = 0; col < cols; col++) {
          const colTiles = [];
          for (let row = 0; row < rows; row++) {
            if (newBoard[row][col]) {
              colTiles.push(newBoard[row][col]);
            }
          }
          // Fill from bottom, empty spaces at top
          for (let row = 0; row < rows; row++) {
            const tileIndex = colTiles.length - rows + row;
            newBoard[row][col] = tileIndex >= 0 ? colTiles[tileIndex] : '';
          }
        }
        break;

      case 'Split':
        // Tiles split left and right from center
        for (let row = 0; row < rows; row++) {
          const rowTiles = [];
          for (let col = 0; col < cols; col++) {
            if (newBoard[row][col]) {
              rowTiles.push(newBoard[row][col]);
            }
          }
          
          // Clear the row first
          for (let col = 0; col < cols; col++) {
            newBoard[row][col] = '';
          }
          
          // Split tiles: half go left, half go right
          const leftTiles = rowTiles.slice(0, Math.ceil(rowTiles.length / 2));
          const rightTiles = rowTiles.slice(Math.ceil(rowTiles.length / 2));
          
          // Place left tiles from left side
          for (let i = 0; i < leftTiles.length; i++) {
            newBoard[row][i] = leftTiles[i];
          }
          
          // Place right tiles from right side
          for (let i = 0; i < rightTiles.length; i++) {
            newBoard[row][cols - rightTiles.length + i] = rightTiles[i];
          }
        }
        break;

      default:
        return newBoard;
    }

    return newBoard;
  };

  const handleInvalidMatch = () => {
    const newHearts = heartsRemaining - 1;
    useGameStore.setState({
      gameState: {
        ...gameState,
        heartsRemaining: newHearts
      }
    });
    setSelectedTiles([]);
    playSound('fail');
    vibrate();
    
    if (newHearts <= 0) {
      handleGameOver('hearts');
    }
  };

  // 重启当前关卡
  const handleRestart = () => {
    // 重置所有关卡状态，但保持道具消耗
    setSelectedTiles([]);
    setCurrentLevelBamboo(0);
    setHintedTiles([]);
    setBambooAnimations([]);
    setSparkAnimations([]);
    setHasShownGravityTip(false);
    
    // 重新开始当前关卡
    startLevel(currentLevel);
    
    // 关闭模态框
    setShowModal(null);
  };

  // 获取初始爱心数量
  const initialHearts = GameUtils.calculateHearts(currentLevel);

  const isLevelComplete = (currentBoard) => {
    return currentBoard.every(row => row.every(tile => !tile));
  };

  const isDeadlocked = (currentBoard) => {
    // 收集所有非空瓦片的位置和类型
    const tiles = [];
    for (let row = 0; row < currentBoard.length; row++) {
      for (let col = 0; col < currentBoard[0].length; col++) {
        if (currentBoard[row][col]) {
          tiles.push({
            row,
            col,
            type: currentBoard[row][col]
          });
        }
      }
    }
    
    // 检查是否存在任何可连接的瓦片对
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const tile1 = tiles[i];
        const tile2 = tiles[j];
        
        // 只检查相同类型的瓦片
        if (tile1.type === tile2.type) {
          // 使用现有的路径识别算法检查是否可连接
          const pathResult = findPath(tile1, tile2, currentBoard);
          if (pathResult.isValid) {
            return false; // 找到可连接的瓦片对，不是死局
          }
        }
      }
    }
    
    // 没有找到任何可连接的瓦片对，是死局
    return tiles.length > 0; // 只有还有瓦片但无法连接才是死局
  };

  const handleLevelComplete = () => {
    const finalTime = gameState.timeRemaining - timeRemaining;
    const earnedBamboo = completeLevel(currentLevel, currentLevelBamboo, finalTime);
    setShowModal('complete');
  };

  const handleGameOver = (reason) => {
    setShowModal('failed');
  };

  // 寻找第一对可连接的瓦片
  const findConnectablePair = (currentBoard) => {
    // 收集所有非空瓦片
    const tiles = [];
    for (let row = 0; row < currentBoard.length; row++) {
      for (let col = 0; col < currentBoard[0].length; col++) {
        if (currentBoard[row][col]) {
          tiles.push({
            row,
            col,
            type: currentBoard[row][col]
          });
        }
      }
    }
    
    // 检查所有瓦片对
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const tile1 = tiles[i];
        const tile2 = tiles[j];
        
        // 只检查相同类型的瓦片
        if (tile1.type === tile2.type) {
          const pathResult = findPath(tile1, tile2, currentBoard);
          if (pathResult.isValid) {
            return { tile1, tile2, pathResult };
          }
        }
      }
    }
    
    return null; // 没有找到可连接的瓦片对
  };

  // 计算瓦片在屏幕上的位置
  const getTileScreenPosition = (row, col) => {
    const tileSize = 34; // 瓦片大小包含间距
    const boardOffsetX = 15; // 棋盘在屏幕中的X偏移
    const boardOffsetY = 200; // 棋盘在屏幕中的Y偏移（大概位置）
    
    return {
      x: boardOffsetX + col * tileSize + tileSize / 2,
      y: boardOffsetY + row * tileSize + tileSize / 2
    };
  };

  // 计算炸弹消除数量
  const getBombRemoveCount = (levelSize) => {
    if (levelSize === 20) return 2;      // 小关卡：2个瓦片
    if (levelSize === 60) return 4;      // 中关卡：4个瓦片
    if (levelSize === 80) return 6;      // 大关卡：6个瓦片
    return 2; // 默认值
  };

  // 随机选择要消除的瓦片
  const selectRandomTilesToRemove = (currentBoard, removeCount) => {
    // 收集所有非空瓦片
    const tiles = [];
    for (let row = 0; row < currentBoard.length; row++) {
      for (let col = 0; col < currentBoard[0].length; col++) {
        if (currentBoard[row][col]) {
          tiles.push({
            row,
            col,
            type: currentBoard[row][col]
          });
        }
      }
    }
    
    // 洗牌并选择指定数量的瓦片
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    return tiles.slice(0, Math.min(removeCount, tiles.length));
  };

  const handleUseTool = (toolType) => {
    const success = useTool(toolType);
    if (!success) return;

    switch (toolType) {
      case 'hint':
        // 寻找可连接的瓦片对并高亮显示
        const connectablePair = findConnectablePair(board);
        if (connectablePair) {
          const { tile1, tile2 } = connectablePair;
          setHintedTiles([
            { row: tile1.row, col: tile1.col },
            { row: tile2.row, col: tile2.col }
          ]);
          
          // 3秒后清除高亮
          setTimeout(() => {
            setHintedTiles([]);
          }, 3000);
        } else {
          // No connectable pairs found - could add visual feedback here if needed
        }
        break;
        
      case 'bomb':
        // 计算要消除的瓦片数量
        const currentSize = GameUtils.getLevelSize(currentLevel);
        const removeCount = getBombRemoveCount(currentSize);

        // 在消除前尝试选择“保证消除后可解”的目标集合
        const tilesToRemove = selectBombTargetsEnsuringSolvable(board, removeCount) || selectRandomTilesToRemove(board, removeCount);

        if (tilesToRemove.length > 0) {
          // 先标记目标瓦片：底部红色指示条
          setBombTargetTiles(tilesToRemove);

          // 稍作停留，让用户看清标记，然后发射火花
          setTimeout(() => {
            // 计算炸弹按钮位置（火花起始位置）
            const bombButtonPosition = { x: 60, y: 600 }; // 大概的炸弹按钮位置
            
            // 计算目标瓦片的屏幕位置
            const targetPositions = tilesToRemove.map(tile => 
              getTileScreenPosition(tile.row, tile.col)
            );
            
            // 创建火花动画
            const animationId = Date.now();
            setSparkAnimations(prev => [...prev, {
              id: animationId,
              sparkCount: tilesToRemove.length,
              startPosition: bombButtonPosition,
              targetPositions,
              tilesToRemove,
              onComplete: () => executeBombDestruction(tilesToRemove)
            }]);
            
            playSound('bomb');
            vibrate();
          }, 400); // 标记与火花之间的延迟
        } else {
          Alert.alert('Bomb Failed', 'No tiles to remove!');
        }
        break;
        
      case 'shuffle':
        // 收集所有剩余瓦片
        const remainingTiles = [];
        board.forEach(row => {
          row.forEach(tile => {
            if (tile) remainingTiles.push(tile);
          });
        });
        
        // 洗牌
        for (let i = remainingTiles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remainingTiles[i], remainingTiles[j]] = [remainingTiles[j], remainingTiles[i]];
        }
        
        // 重新填充棋盘
        let shuffledBoard = board.map(row => row.map(() => ''));
        let tileIndex = 0;
        
        for (let row = 0; row < shuffledBoard.length; row++) {
          for (let col = 0; col < shuffledBoard[0].length; col++) {
            if (tileIndex < remainingTiles.length) {
              shuffledBoard[row][col] = remainingTiles[tileIndex];
              tileIndex++;
            }
          }
        }
        
        // Apply current layout gravity after shuffle
        const currentLayout = GameUtils.getLevelLayout(currentLevel);
        shuffledBoard = applyGravityEffect(shuffledBoard, currentLayout);
        
        useGameStore.setState({
          gameState: {
            ...gameState,
            board: shuffledBoard,
            timeRemaining: timeRemaining + 3
          }
        });
        break;
    }
  };

  // 在移除前通过模拟重力来验证“消除后可解”，尽可能选择安全目标
  const selectBombTargetsEnsuringSolvable = (currentBoard, removeCount, maxAttempts = 120) => {
    // 收集所有非空瓦片
    const tiles = [];
    for (let row = 0; row < currentBoard.length; row++) {
      for (let col = 0; col < currentBoard[0].length; col++) {
        if (currentBoard[row][col]) {
          tiles.push({ row, col, type: currentBoard[row][col] });
        }
      }
    }

    if (tiles.length === 0) return [];

    // 随机尝试不同的目标组合（采样，不是穷举组合）
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = selectRandomSubset(tiles, removeCount);
      const simulated = simulateRemovalAndGravity(currentBoard, candidate);
      if (isBoardSolvable(simulated)) {
        return candidate;
      }
    }
    return null; // 没找到保证可解的集合
  };

  const selectRandomSubset = (arr, k) => {
    if (k <= 0) return [];
    const copy = [...arr];
    // 洗牌
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(k, copy.length));
  };

  const simulateRemovalAndGravity = (sourceBoard, targets) => {
    let tempBoard = sourceBoard.map(row => [...row]);
    targets.forEach(t => {
      if (tempBoard[t.row] && typeof tempBoard[t.row][t.col] !== 'undefined') {
        tempBoard[t.row][t.col] = '';
      }
    });
    const currentLayout = GameUtils.getLevelLayout(currentLevel);
    const finalBoard = applyGravityEffect(tempBoard, currentLayout);
    return finalBoard;
  };

  // 执行炸弹摧毁效果（延迟执行）
  const executeBombDestruction = (targets) => {
    // 短暂停留让用户看清目标
    setTimeout(() => {
      // 消除所有目标瓦片
      let newBoard = board.map(row => [...row]);
      targets.forEach(target => {
        newBoard[target.row][target.col] = '';
      });
      
      // 清除炸弹目标高亮
      setBombTargetTiles([]);
      
      // 延迟应用重力效果，让用户看到消除过程
      setTimeout(() => {
        // 应用重力效果
        const currentLayout = GameUtils.getLevelLayout(currentLevel);
        let finalBoard = applyGravityEffect(newBoard, currentLayout);
        
        // 若出现死局，自动洗牌直到可解（不消耗洗牌道具）
        if (isDeadlocked(finalBoard)) {
          finalBoard = shuffleUntilSolvable(finalBoard, 25);
        }

        // 更新棋盘
        useGameStore.setState({
          gameState: {
            ...gameState,
            board: finalBoard
          }
        });
        
        playSound('success');
        vibrate();
        
        // 检查关卡是否完成
        if (isLevelComplete(finalBoard)) {
          handleLevelComplete();
        }
      }, 300); // 重力效果延迟300ms
    }, 500); // 火花停留500ms
  };

  // 内部洗牌，直到可解或达到尝试上限（不改变时间与道具）
  const shuffleUntilSolvable = (currentBoard, maxTries = 30) => {
    const flatten = [];
    currentBoard.forEach(row => row.forEach(tile => { if (tile) flatten.push(tile); }));

    for (let attempt = 0; attempt < maxTries; attempt++) {
      // 洗牌
      for (let i = flatten.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flatten[i], flatten[j]] = [flatten[j], flatten[i]];
      }

      // 回填
      let idx = 0;
      const shuffled = currentBoard.map(row => row.map(cell => ''));
      for (let r = 0; r < shuffled.length; r++) {
        for (let c = 0; c < shuffled[0].length; c++) {
          if (idx < flatten.length) {
            shuffled[r][c] = flatten[idx++];
          }
        }
      }

      // 应用当前布局重力
      const layout = GameUtils.getLevelLayout(currentLevel);
      const afterGravity = applyGravityEffect(shuffled, layout);
      if (isBoardSolvable(afterGravity)) {
        return afterGravity;
      }
    }
    return currentBoard; // 放弃改善，返回原局面
  };

  const playSound = (type) => {
    // TODO: Implement sound effects based on settings.sfxOn
    if (!settings.sfxOn) return;
    
    // 可以根据不同类型播放不同音效
    switch (type) {
      case 'bomb_launch':
        // 炸弹发射音效
        break;
      case 'tap':
        // 点击音效
        break;
      case 'success':
        // 成功音效
        break;
      case 'fail':
        // 失败音效
        break;
      default:
        break;
    }
  };

  const vibrate = () => {
    if (settings.hapticsOn) {
      Vibration.vibrate(100);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBambooAnimationComplete = (animationId) => {
    setBambooAnimations(prev => prev.filter(anim => anim.id !== animationId));
  };

  const handleSparkAnimationComplete = (animationId) => {
    setSparkAnimations(prev => prev.filter(anim => anim.id !== animationId));
    
    // 查找对应的动画并执行回调
    const animation = sparkAnimations.find(anim => anim.id === animationId);
    if (animation && animation.onComplete) {
      animation.onComplete();
    }
  };

  const renderTile = (tile, row, col) => {
    const isSelected = selectedTiles.some(t => t.row === row && t.col === col);
    const isHinted = hintedTiles.some(t => t.row === row && t.col === col);
    const isBombTarget = bombTargetTiles.some(t => t.row === row && t.col === col);
    const isEmpty = !tile;
    
    if (isEmpty) {
      return <View key={`${row}-${col}`} style={styles.emptyTile} />;
    }

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.tile, 
          isSelected && styles.selectedTile,
          isHinted && styles.hintedTile,
          isBombTarget && styles.bombTargetTile
        ]}
        onPress={() => handleTilePress(row, col)}
      >
        <Text style={styles.tileEmoji}>{tile}</Text>
      </TouchableOpacity>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    // 教程模态：仅使用较小的背景框（tutorialModal），不套通用modalContent
    if (showModal === 'tutorial') {
      return (
        <Modal transparent animationType="fade" visible={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.tutorialModal}>
              <Text style={styles.tutorialTitle}>
                {tutorialStep === 1 ? 'Step 1 – Welcome' : 'Step 2 – How to Play'}
              </Text>
              <Text style={styles.tutorialMessage}>
                {tutorialStep === 1
                  ? 'Welcome to Link! 🎋\nMatch two identical tiles with no more than 2 turns to clear them.'
                  : 'Tap two identical tiles to connect them.\nPaths can go around the board edges if needed.'}
              </Text>
              <View style={styles.tutorialButtons}>
                {tutorialStep === 1 ? (
                  <TouchableOpacity style={styles.tutorialButton} onPress={handleTutorialNext}>
                    <Text style={styles.tutorialButtonText}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.tutorialButton} onPress={handleTutorialFinish}>
                    <Text style={styles.tutorialButtonText}>Start</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.tutorialProgress}>
                <View style={[styles.progressDot, tutorialStep === 1 && styles.progressDotActive]} />
                <View style={[styles.progressDot, tutorialStep === 2 && styles.progressDotActive]} />
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    const getModalContent = () => {
      switch (showModal) {
        case 'pause':
          return {
            title: 'Game Paused',
            content: 'Take a break!',
            buttons: [
              { text: 'Resume', onPress: () => setShowModal(null), style: 'primary' },
              { text: 'Restart', onPress: handleRestart, style: 'secondary' },
              { text: 'Home', onPress: () => router.replace('/'), style: 'secondary' },
            ]
          };
        case 'complete':
          return {
            title: '🎉 Level Complete!',
            content: `Congratulations! You earned ${currentLevelBamboo} bamboo!`,
            buttons: [
              { text: 'Next Level', onPress: () => router.replace('/game'), style: 'primary' },
              { text: 'Home', onPress: () => router.replace('/'), style: 'secondary' },
            ]
          };
        case 'failed':
          return {
            title: 'Game Over',
            content: 'Time\'s up or no hearts left!',
            buttons: [
              { text: 'Restart', onPress: handleRestart, style: 'primary' },
              { text: 'Home', onPress: () => router.replace('/'), style: 'secondary' },
            ]
          };
        case 'deadlock':
          return {
            title: 'No Valid Moves!',
            content: 'Use Shuffle tool or restart the level',
            buttons: [
              { text: 'View Board', onPress: () => setShowModal('view-deadlock'), style: 'secondary' },
              { text: `Use Shuffle (${inventory.shuffle})`, onPress: () => { handleUseTool('shuffle'); setShowModal(null); }, style: 'primary', disabled: inventory.shuffle === 0 },
              { text: 'Restart', onPress: handleRestart, style: 'secondary' },
              { text: 'Home', onPress: () => router.replace('/'), style: 'secondary' },
            ]
          };
        case 'view-deadlock':
          return {
            title: 'Deadlock Board',
            content: (
              <View style={styles.deadlockView}>
                <Text style={styles.deadlockText}>
                  Current board state with no valid moves:
                </Text>
                <MiniBoard board={board} />
                <Text style={styles.deadlockHint}>
                  Use Shuffle to rearrange tiles or restart the level
                </Text>
              </View>
            ),
            buttons: [
              { text: 'Back', onPress: () => setShowModal('deadlock'), style: 'secondary' },
              { text: `Use Shuffle (${inventory.shuffle})`, onPress: () => { handleUseTool('shuffle'); setShowModal(null); }, style: 'primary', disabled: inventory.shuffle === 0 },
              { text: 'Restart', onPress: handleRestart, style: 'primary' },
            ]
          };
        case 'gravity-tip':
          return {
            title: 'Gravity Mode',
            content: gravityModeInfo.tipText,
            buttons: [
              { text: 'Got it!', onPress: () => setShowModal(null), style: 'primary' },
            ]
          };
        default:
          return null;
      }
    };

    const modalContent = getModalContent();
    if (!modalContent) return null;

    return (
      <Modal transparent animationType="fade" visible={!!showModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalContent.title}</Text>
            <Text style={styles.modalText}>{modalContent.content}</Text>
            
            <View style={styles.modalButtons}>
              {modalContent.buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalButton,
                    button.style === 'primary' ? styles.modalButtonPrimary : styles.modalButtonSecondary,
                    button.disabled && styles.modalButtonDisabled,
                  ]}
                  onPress={button.onPress}
                  disabled={button.disabled}
                >
                  <Text style={[
                    styles.modalButtonText,
                    button.style === 'primary' ? styles.modalButtonTextPrimary : styles.modalButtonTextSecondary,
                    button.disabled && styles.modalButtonTextDisabled,
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://bvluteuqlybyzwtpoegb.supabase.co/storage/v1/object/public/photo/game_background.png' }}
        style={styles.backgroundContainer}
        resizeMode="cover"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.pauseButton} 
            onPress={() => setShowModal('pause')}
          >
            <MaterialIcons name="pause" size={24} color="#5A8F7B" />
          </TouchableOpacity>
          
          <Text style={styles.levelTitle}>Level {currentLevel}</Text>
          
          <TouchableOpacity 
            style={styles.homeButton} 
            onPress={() => setShowModal('pause')}
          >
            <MaterialIcons name="home" size={24} color="#5A8F7B" />
          </TouchableOpacity>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressContainer}>
            {gravityModeInfo.arrow && (
              <View style={styles.gravityArrow}>
                <Text style={styles.gravityArrowText}>{gravityModeInfo.arrow}</Text>
              </View>
            )}
            <View style={styles.progressIcon}>
              <Text style={styles.bambooIcon}>🎋</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }]} />
            </View>
          </View>
          <Text style={styles.progressText}>+{currentLevelBamboo}</Text>
        </View>

        {/* Game Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="timer" size={20} color="#FF8A65" />
            <Text style={styles.statText}>{formatTime(timeRemaining)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={styles.heartsContainer}>
              {Array.from({ length: initialHearts }).map((_, index) => (
                <Text key={index} style={styles.heartEmoji}>
                  {index < heartsRemaining ? '❤️' : '🩶'}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Game Board */}
        <View style={styles.boardContainer}>
          <View style={styles.board}>
            {board.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((tile, colIndex) => 
                  renderTile(tile, rowIndex, colIndex)
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Tools */}
        <View style={styles.toolsContainer}>
          <TouchableOpacity
            style={[styles.toolButton, inventory.bomb === 0 && styles.toolButtonDisabled]}
            onPress={() => handleUseTool('bomb')}
            disabled={inventory.bomb === 0}
          >
            <Image 
              source={{ uri: 'https://bvluteuqlybyzwtpoegb.supabase.co/storage/v1/object/public/photo/boomtab.png' }}
              style={styles.toolIconImage}
            />
            <View style={styles.toolBadge}>
              <Text style={styles.toolCount}>{inventory.bomb}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolButton, inventory.hint === 0 && styles.toolButtonDisabled]}
            onPress={() => handleUseTool('hint')}
            disabled={inventory.hint === 0}
          >
            <Image 
              source={{ uri: 'https://bvluteuqlybyzwtpoegb.supabase.co/storage/v1/object/public/photo/lighttab.png' }}
              style={styles.toolIconImage}
            />
            <View style={styles.toolBadge}>
              <Text style={styles.toolCount}>{inventory.hint}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolButton, inventory.shuffle === 0 && styles.toolButtonDisabled]}
            onPress={() => handleUseTool('shuffle')}
            disabled={inventory.shuffle === 0}
          >
            <Image 
              source={{ uri: 'https://bvluteuqlybyzwtpoegb.supabase.co/storage/v1/object/public/photo/washtab.png' }}
              style={styles.toolIconImage}
            />
            <View style={styles.toolBadge}>
              <Text style={styles.toolCount}>{inventory.shuffle}</Text>
            </View>
          {/* Game Settings */}
          <View style={styles.settingsSection}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="music-note" size={20} color="#666" />
                <Text style={styles.settingLabel}>Background Music</Text>
              </View>
              <Switch
                value={settings.musicOn}
                onValueChange={(value) => updateSettings({ musicOn: value })}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor={settings.musicOn ? '#FFF' : '#FFF'}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="volume-up" size={20} color="#666" />
                <Text style={styles.settingLabel}>Sound Effects</Text>
              </View>
              <Switch
                value={settings.sfxOn}
                onValueChange={(value) => updateSettings({ sfxOn: value })}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor={settings.sfxOn ? '#FFF' : '#FFF'}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="vibration" size={20} color="#666" />
                <Text style={styles.settingLabel}>Vibration Feedback</Text>
              </View>
              <Switch
                value={settings.hapticsOn}
                onValueChange={(value) => updateSettings({ hapticsOn: value })}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor={settings.hapticsOn ? '#FFF' : '#FFF'}
              />
            </View>
          </View>
          
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* 竹子飞行动画 */}
      {bambooAnimations.map((animation) => (
        <BambooAnimation
          key={animation.id}
          bambooCount={animation.bambooCount}
          startPositions={animation.startPositions}
          endPosition={animation.endPosition}
          onAnimationComplete={() => handleBambooAnimationComplete(animation.id)}
        />
      ))}

      {/* 火花飞行动画 */}
      ))}

      {renderModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  pauseButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  homeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  progressSection: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gravityArrow: {
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gravityArrowText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  progressIcon: {
    marginRight: 10,
  },
  bambooIcon: {
    fontSize: 24,
  },
  progressBar: {
    width: 200,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
    color: '#333',
  },
  heartsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  heartEmoji: {
    fontSize: 16,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  board: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    width: 32,
    height: 32,
    backgroundColor: '#F5F5F5',
    margin: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTile: {
    backgroundColor: '#81C784',
    borderColor: '#4CAF50',
  },
  hintedTile: {
    backgroundColor: '#FFE082',
    borderColor: '#FFC107',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  bombTargetTile: {
    backgroundColor: '#FFAB91',
    borderColor: '#FF5722',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyTile: {
    width: 32,
    height: 32,
    margin: 1,
  },
  tileEmoji: {
    fontSize: 20,
  },
  toolsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 30,
    zIndex: 1000,
  },
  toolButton: {
    backgroundColor: 'transparent',
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1001,
  },
  toolButtonDisabled: {
    opacity: 0.5,
  },
  toolIcon: {
    fontSize: 28,
  },
  toolIconImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    opacity: 1,
  },
  toolBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolCount: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#FFF',
  },
  modalButtonTextSecondary: {
    color: '#666',
  },
  modalButtonTextDisabled: {
    color: '#CCC',
  },
  deadlockView: {
    alignItems: 'center',
  },
  deadlockText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  deadlockHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  tutorialModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    maxWidth: 350,
  },
  tutorialTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 20,
  },
  tutorialMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  tutorialButtons: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  tutorialButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tutorialButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tutorialProgress: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: '#4CAF50',
  },
});