/**
 * Game Screen - Main gameplay interface
 * Purpose: Core puzzle game with tile matching mechanics
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  Dimensions,
  BackHandler
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import useGameStore from '../store/gameStore';
import { GameUtils } from '../store/gameStore';
import MiniBoard from '../components/MiniBoard';
import SparkAnimation from '../components/SparkAnimation';
import BambooAnimation from '../components/BambooAnimation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Game() {
  const { 
    currentLevel, 
    maxLevel,
    gameState, 
    startLevel, 
    completeLevel,
    inventory,
    useTool
  } = useGameStore();

  const [selectedTiles, setSelectedTiles] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [heartsRemaining, setHeartsRemaining] = useState(0);
  const [board, setBoard] = useState([]);
  const [currentLevelBamboo, setCurrentLevelBamboo] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showSparks, setShowSparks] = useState(false);
  const [showBambooAnimation, setShowBambooAnimation] = useState(false);
  const [sparkData, setSparkData] = useState(null);
  const [bambooAnimationData, setBambooAnimationData] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const timerRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  // Initialize level
  useEffect(() => {
    if (currentLevel) {
      initializeLevel(currentLevel);
    }
  }, [currentLevel]);

  // Show tutorial for new users on level 1
  useEffect(() => {
    if (currentLevel === 1 && maxLevel === 1) {
      setShowTutorial(true);
    }
  }, [currentLevel, maxLevel]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !isPaused && !showTutorial) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && !showTutorial) {
      handleGameOver();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeRemaining, isPaused, showTutorial]);

  // Handle back button
  useEffect(() => {
    const backAction = () => {
      handlePause();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // Clean up error message timeout
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const initializeLevel = (levelId) => {
    const timeLimit = GameUtils.calculateTimeLimit(levelId);
    const hearts = GameUtils.calculateHearts(levelId);
    const size = GameUtils.getLevelSize(levelId);
    const kinds = GameUtils.getLevelKinds(levelId);
    
    const newBoard = generateGameBoard(size, kinds);
    
    setBoard(newBoard);
    setTimeRemaining(timeLimit);
    setHeartsRemaining(hearts);
    setCurrentLevelBamboo(0);
    setSelectedTiles([]);
    setIsPaused(false);
    setShowSparks(false);
    setShowBambooAnimation(false);
  };

  const generateGameBoard = (size, kinds) => {
    const [rows, cols] = GameUtils.getBoardDimensions(size);
    const pairs = size / 2;
    const availableEmojis = useGameStore.getState().gameState.board.length > 0 
      ? useGameStore.getState().gameState.board 
      : ['🌸', '🍀', '🎯', '🏠', '🌞', '🎨', '🎵', '🍎', '🦋', '⭐', '🎪', '🌈', '🎭', '🎲', '🎸'].slice(0, kinds);
    
    const tiles = [];
    for (let i = 0; i < pairs; i++) {
      const emoji = availableEmojis[i % kinds];
      tiles.push(emoji, emoji);
    }
    
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
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
  };

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorMessage(true);
    
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    // Auto hide after 2.5 seconds
    errorTimeoutRef.current = setTimeout(() => {
      setShowErrorMessage(false);
      setErrorMessage('');
    }, 2500);
  };

  const canConnect = (pos1, pos2, board) => {
    const [rows, cols] = [board.length, board[0].length];
    
    // Check if tiles are the same
    if (board[pos1.row][pos1.col] !== board[pos2.row][pos2.col]) {
      return { canConnect: false, reason: 'different' };
    }
    
    // Check if tiles are empty
    if (!board[pos1.row][pos1.col] || !board[pos2.row][pos2.col]) {
      return { canConnect: false, reason: 'empty' };
    }
    
    // Try to find a path with ≤2 turns
    const visited = Array(rows).fill().map(() => Array(cols).fill(false));
    
    // BFS to find path with minimum turns
    const queue = [{ 
      row: pos1.row, 
      col: pos1.col, 
      turns: 0, 
      direction: null,
      path: [{ row: pos1.row, col: pos1.col }]
    }];
    
    visited[pos1.row][pos1.col] = true;
    
    const directions = [
      { row: -1, col: 0, name: 'up' },
      { row: 1, col: 0, name: 'down' },
      { row: 0, col: -1, name: 'left' },
      { row: 0, col: 1, name: 'right' }
    ];
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      // Found target
      if (current.row === pos2.row && current.col === pos2.col) {
        return { canConnect: true, turns: current.turns, path: current.path };
      }
      
      // Try all directions
      for (const dir of directions) {
        const newRow = current.row + dir.row;
        const newCol = current.col + dir.col;
        
        // Check bounds
        if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) {
          continue;
        }
        
        // Check if cell is empty or is the target
        const isEmpty = !board[newRow][newCol];
        const isTarget = newRow === pos2.row && newCol === pos2.col;
        
        if (!isEmpty && !isTarget) {
          continue;
        }
        
        // Calculate turns
        let newTurns = current.turns;
        if (current.direction && current.direction !== dir.name) {
          newTurns++;
        }
        
        // Skip if too many turns
        if (newTurns > 2) {
          continue;
        }
        
        // Skip if already visited with same or fewer turns
        if (visited[newRow][newCol]) {
          continue;
        }
        
        visited[newRow][newCol] = true;
        queue.push({
          row: newRow,
          col: newCol,
          turns: newTurns,
          direction: dir.name,
          path: [...current.path, { row: newRow, col: newCol }]
        });
      }
    }
    
    return { canConnect: false, reason: 'no_path' };
  };

  const handleTilePress = (row, col) => {
    if (isPaused || showTutorial) return;
    
    const tile = board[row][col];
    if (!tile) return;
    
    const tilePos = { row, col };
    const isAlreadySelected = selectedTiles.some(
      selected => selected.row === row && selected.col === col
    );
    
    if (isAlreadySelected) {
      setSelectedTiles(selectedTiles.filter(
        selected => !(selected.row === row && selected.col === col)
      ));
      return;
    }
    
    if (selectedTiles.length === 0) {
      setSelectedTiles([tilePos]);
    } else if (selectedTiles.length === 1) {
      const firstTile = selectedTiles[0];
      
      // Check if same tile
      if (firstTile.row === row && firstTile.col === col) {
        setSelectedTiles([]);
        return;
      }
      
      // Check connection
      const connectionResult = canConnect(firstTile, tilePos, board);
      
      if (connectionResult.canConnect) {
        // Valid connection - remove tiles
        const newBoard = board.map(boardRow => [...boardRow]);
        newBoard[firstTile.row][firstTile.col] = '';
        newBoard[row][col] = '';
        
        setBoard(newBoard);
        setSelectedTiles([]);
        
        // Add bamboo based on turns
        const bambooEarned = connectionResult.turns === 0 ? 1 : 
                           connectionResult.turns === 1 ? 2 : 3;
        setCurrentLevelBamboo(prev => prev + bambooEarned);
        
        // Show spark animation
        triggerSparkAnimation(firstTile, tilePos);
        
        // Check if level complete
        const remainingTiles = newBoard.flat().filter(tile => tile !== '').length;
        if (remainingTiles === 0) {
          handleLevelComplete();
        }
      } else {
        // Invalid connection - show error and lose heart
        if (connectionResult.reason === 'no_path') {
          showError('These two tiles cannot be connected~');
        } else {
          showError('Path cannot have more than 2 turns~');
        }
        
        setHeartsRemaining(prev => {
          const newHearts = prev - 1;
          if (newHearts <= 0) {
            setTimeout(handleGameOver, 100);
          }
          return newHearts;
        });
        
        setSelectedTiles([]);
      }
    } else {
      setSelectedTiles([tilePos]);
    }
  };

  const triggerSparkAnimation = (pos1, pos2) => {
    const tileSize = Math.min(screenWidth / 10, 40);
    const boardStartX = (screenWidth - (board[0].length * tileSize)) / 2;
    const boardStartY = 280;
    
    const spark1Pos = {
      x: boardStartX + pos1.col * tileSize + tileSize / 2,
      y: boardStartY + pos1.row * tileSize + tileSize / 2
    };
    
    const spark2Pos = {
      x: boardStartX + pos2.col * tileSize + tileSize / 2,
      y: boardStartY + pos2.row * tileSize + tileSize / 2
    };
    
    const bambooTargetPos = { x: screenWidth - 80, y: 60 };
    
    setSparkData({
      sparkCount: 6,
      startPosition: spark1Pos,
      targetPositions: [bambooTargetPos, bambooTargetPos, bambooTargetPos, spark2Pos, spark2Pos, spark2Pos]
    });
    
    setShowSparks(true);
  };

  const handleSparkAnimationComplete = () => {
    setShowSparks(false);
    setSparkData(null);
    
    // Trigger bamboo animation
    const bambooStartPositions = Array(currentLevelBamboo).fill().map((_, index) => ({
      x: screenWidth / 2 + (index - currentLevelBamboo / 2) * 30,
      y: screenHeight / 2
    }));
    
    setBambooAnimationData({
      bambooCount: Math.min(currentLevelBamboo, 5),
      startPositions: bambooStartPositions,
      endPosition: { x: screenWidth - 80, y: 60 }
    });
    
    setShowBambooAnimation(true);
  };

  const handleBambooAnimationComplete = () => {
    setShowBambooAnimation(false);
    setBambooAnimationData(null);
  };

  const handleLevelComplete = async () => {
    const isFirstTime = currentLevel > maxLevel;
    const earnedBamboo = isFirstTime ? currentLevelBamboo : 0;
    const completionTime = GameUtils.calculateTimeLimit(currentLevel) - timeRemaining;
    
    await completeLevel(currentLevel, earnedBamboo, completionTime, isFirstTime);
    
    Alert.alert(
      'Level Complete! 🎉',
      `${isFirstTime ? `You earned ${currentLevelBamboo} bamboo!` : 'Level completed again!'}`,
      [
        { text: 'Next Level', onPress: () => startLevel(currentLevel + 1) },
        { text: 'Home', onPress: () => router.replace('/') }
      ]
    );
  };

  const handleGameOver = () => {
    Alert.alert(
      'Game Over',
      'Time\'s up or no hearts left!',
      [
        { text: 'Retry', onPress: () => initializeLevel(currentLevel) },
        { text: 'Home', onPress: () => router.replace('/') }
      ]
    );
  };

  const handlePause = () => {
    setIsPaused(true);
    Alert.alert(
      'Game Paused',
      'Take a break!',
      [
        { text: 'Resume', onPress: () => setIsPaused(false) },
        { text: 'Home', onPress: () => router.replace('/') }
      ]
    );
  };

  const handleUseTool = (toolType) => {
    if (useTool(toolType)) {
      // TODO: Implement tool effects
      Alert.alert('Tool Used', `${toolType} tool activated!`);
    } else {
      Alert.alert('No Tools', `You don't have any ${toolType} tools.`);
    }
  };

  const handleTutorialNext = () => {
    if (tutorialStep < 2) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      setTutorialStep(1);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTile = (tile, row, col) => {
    const isEmpty = !tile;
    const isSelected = selectedTiles.some(
      selected => selected.row === row && selected.col === col
    );
    
    if (isEmpty) {
      return (
        <View 
          key={`${row}-${col}`} 
          style={[styles.tile, styles.emptyTile]} 
        />
      );
    }

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.tile,
          isSelected && styles.selectedTile,
        ]}
        onPress={() => handleTilePress(row, col)}
        disabled={isPaused || showTutorial}
      >
        <Text style={styles.tileEmoji}>{tile}</Text>
      </TouchableOpacity>
    );
  };

  const gravityInfo = GameUtils.getGravityModeInfo(currentLevel);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
          <MaterialIcons name="pause" size={24} color="#666" />
        </TouchableOpacity>
        
        <Text style={styles.levelText}>Level {currentLevel}</Text>
        
        <View style={styles.bambooContainer}>
          <Text style={styles.bambooEmoji}>🎋</Text>
          <Text style={styles.bambooText}>{currentLevelBamboo}</Text>
        </View>
      </View>

      {/* Game Stats */}
      <View style={styles.gameStats}>
        <View style={styles.statItem}>
          <MaterialIcons name="timer" size={20} color="#FF9800" />
          <Text style={styles.statText}>{formatTime(timeRemaining)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.heartEmoji}>❤️</Text>
          <Text style={styles.statText}>{heartsRemaining}</Text>
        </View>
      </View>

      {/* Error Message */}
      {showErrorMessage && (
        <View style={styles.errorMessageContainer}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      )}

      {/* Gravity Mode Tip */}
      {gravityInfo.showTip && (
        <View style={styles.gravityTip}>
          <Text style={styles.gravityArrow}>{gravityInfo.arrow}</Text>
          <Text style={styles.gravityText}>{gravityInfo.tipText}</Text>
        </View>
      )}

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
          style={styles.toolButton}
          onPress={() => handleUseTool('hint')}
        >
          <Text style={styles.toolEmoji}>💡</Text>
          <Text style={styles.toolCount}>{inventory.hint}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.toolButton}
          onPress={() => handleUseTool('bomb')}
        >
          <Text style={styles.toolEmoji}>💣</Text>
          <Text style={styles.toolCount}>{inventory.bomb}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.toolButton}
          onPress={() => handleUseTool('shuffle')}
        >
          <Text style={styles.toolEmoji}>🔀</Text>
          <Text style={styles.toolCount}>{inventory.shuffle}</Text>
        </TouchableOpacity>
      </View>

      {/* Tutorial Modal */}
      {showTutorial && (
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialModal}>
            <Text style={styles.tutorialTitle}>
              {tutorialStep === 1 ? 'Welcome to Link! 🎋' : 'How to Play'}
            </Text>
            <Text style={styles.tutorialText}>
              {tutorialStep === 1 
                ? 'Match two identical tiles with no more than 2 turns to clear them.'
                : 'Tap two identical tiles to connect them.\nPaths can go around the board edges if needed.'
              }
            </Text>
            <TouchableOpacity 
              style={styles.tutorialButton}
              onPress={handleTutorialNext}
            >
              <Text style={styles.tutorialButtonText}>
                {tutorialStep === 1 ? 'Next' : 'Start Playing!'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Animations */}
      {showSparks && sparkData && (
        <SparkAnimation
          sparkCount={sparkData.sparkCount}
          startPosition={sparkData.startPosition}
          targetPositions={sparkData.targetPositions}
          onAnimationComplete={handleSparkAnimationComplete}
        />
      )}
      
      {showBambooAnimation && bambooAnimationData && (
        <BambooAnimation
          bambooCount={bambooAnimationData.bambooCount}
          startPositions={bambooAnimationData.startPositions}
          endPosition={bambooAnimationData.endPosition}
          onAnimationComplete={handleBambooAnimationComplete}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pauseButton: {
    padding: 8,
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  bambooContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bambooText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
    color: '#4CAF50',
  },
  bambooEmoji: {
    fontSize: 16,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 40,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  heartEmoji: {
    fontSize: 16,
  },
  errorMessageContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  errorMessageText: {
    fontSize: 14,
    color: '#FF5722',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  gravityTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  gravityArrow: {
    fontSize: 16,
    marginRight: 8,
  },
  gravityText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  board: {
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 12,
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
    width: Math.min(screenWidth / 10, 40),
    height: Math.min(screenWidth / 10, 40),
    backgroundColor: '#F5F5F5',
    margin: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyTile: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  selectedTile: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  tileEmoji: {
    fontSize: Math.min(screenWidth / 15, 24),
  },
  toolsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  toolButton: {
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toolEmoji: {
    fontSize: 24,
  },
  toolCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tutorialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  tutorialModal: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tutorialTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
    textAlign: 'center',
  },
  tutorialText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  tutorialButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  tutorialButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});