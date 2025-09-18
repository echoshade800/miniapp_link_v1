/**
 * Game Screen - Main gameplay interface
 * Purpose: Core puzzle game with tile matching, tools, and progression
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  Modal,
  Dimensions,
  Switch
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import useGameStore from '../store/gameStore';
import { GameUtils } from '../store/gameStore';
import BambooAnimation from '../components/BambooAnimation';
import SparkAnimation from '../components/SparkAnimation';

const { width, height } = Dimensions.get('window');

export default function Game() {
  const { 
    currentLevel, 
    gameState, 
    inventory, 
    bambooBalance,
    settings,
    startLevel, 
    completeLevel, 
    useTool,
    updateSettings
  } = useGameStore();

  // Game state
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [board, setBoard] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [heartsRemaining, setHeartsRemaining] = useState(0);
  const [currentLevelBamboo, setCurrentLevelBamboo] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showBambooAnimation, setShowBambooAnimation] = useState(false);
  const [showSparkAnimation, setShowSparkAnimation] = useState(false);
  const [animationData, setAnimationData] = useState(null);

  // Refs for animations
  const timerRef = useRef(null);

  // Initialize level
  useEffect(() => {
    initializeLevel();
  }, [currentLevel]);

  // Game timer
  useEffect(() => {
    if (!isPaused && timeRemaining > 0 && !showLevelComplete && !showGameOver) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleGameOver();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeRemaining, isPaused, showLevelComplete, showGameOver]);

  const initializeLevel = () => {
    const timeLimit = GameUtils.calculateTimeLimit(currentLevel);
    const hearts = GameUtils.calculateHearts(currentLevel);
    const size = GameUtils.getLevelSize(currentLevel);
    const kinds = GameUtils.getLevelKinds(currentLevel);
    
    const newBoard = generateGameBoard(size, kinds);
    
    setBoard(newBoard);
    setTimeRemaining(timeLimit);
    setHeartsRemaining(hearts);
    setCurrentLevelBamboo(0);
    setSelectedTiles([]);
    setIsPaused(false);
    setShowLevelComplete(false);
    setShowGameOver(false);
  };

  const generateGameBoard = (size, kinds) => {
    const [rows, cols] = GameUtils.getBoardDimensions(size);
    const pairs = size / 2;
    const availableEmojis = ['🌸', '🍀', '🎯', '🏠', '🌞', '🎨', '🎵', '🍎', '🦋', '⭐', '🎪', '🌈', '🎭', '🎲', '🎸'].slice(0, kinds);
    
    const tiles = [];
    for (let i = 0; i < pairs; i++) {
      const emoji = availableEmojis[i % kinds];
      tiles.push(emoji, emoji);
    }
    
    // Shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    // Fill board
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

  const handleTilePress = (row, col) => {
    if (isPaused || showLevelComplete || showGameOver) return;
    if (!board[row][col]) return; // Empty tile
    
    const tileKey = `${row}-${col}`;
    
    if (selectedTiles.includes(tileKey)) {
      // Deselect tile
      setSelectedTiles(prev => prev.filter(tile => tile !== tileKey));
      return;
    }
    
    if (selectedTiles.length === 0) {
      // First tile selection
      setSelectedTiles([tileKey]);
    } else if (selectedTiles.length === 1) {
      // Second tile selection
      const [firstRow, firstCol] = selectedTiles[0].split('-').map(Number);
      
      if (board[firstRow][firstCol] === board[row][col]) {
        // Match found
        handleMatch([selectedTiles[0], tileKey]);
      } else {
        // No match, select new tile
        setSelectedTiles([tileKey]);
      }
    }
  };

  const handleMatch = (matchedTiles) => {
    // Remove matched tiles from board
    const newBoard = [...board];
    matchedTiles.forEach(tileKey => {
      const [row, col] = tileKey.split('-').map(Number);
      newBoard[row][col] = '';
    });
    
    setBoard(newBoard);
    setSelectedTiles([]);
    
    // Add bamboo (simplified scoring)
    const earnedBamboo = 2;
    setCurrentLevelBamboo(prev => prev + earnedBamboo);
    
    // Check if level complete
    const remainingTiles = newBoard.flat().filter(tile => tile !== '').length;
    if (remainingTiles === 0) {
      handleLevelComplete();
    }
  };

  const handleLevelComplete = async () => {
    setShowLevelComplete(true);
    setIsPaused(true);
    
    const totalTime = GameUtils.calculateTimeLimit(currentLevel);
    const timeUsed = totalTime - timeRemaining;
    
    const isFirstTime = await completeLevel(currentLevel, currentLevelBamboo, timeUsed, true);
    
    // Show bamboo animation if earned
    if (isFirstTime && currentLevelBamboo > 0) {
      setTimeout(() => {
        setShowBambooAnimation(true);
        setAnimationData({
          bambooCount: currentLevelBamboo,
          startPositions: [{ x: width / 2, y: height / 2 }],
          endPosition: { x: width - 60, y: 100 }
        });
      }, 1000);
    }
  };

  const handleGameOver = () => {
    setShowGameOver(true);
    setIsPaused(true);
  };

  const handleHeartLoss = () => {
    if (heartsRemaining > 1) {
      setHeartsRemaining(prev => prev - 1);
    } else {
      handleGameOver();
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    setShowPauseModal(true);
  };

  const handleHome = () => {
    setIsPaused(true);
    setShowHomeModal(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    setShowPauseModal(false);
  };

  const handleRestart = () => {
    setShowPauseModal(false);
    setShowHomeModal(false);
    initializeLevel();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const handleNextLevel = () => {
    setShowLevelComplete(false);
    startLevel(currentLevel + 1);
  };

  const handleUseTool = (toolType) => {
    if (useTool(toolType)) {
      // Tool effects would be implemented here
      Alert.alert('Tool Used', `${toolType} tool activated!`);
    } else {
      Alert.alert('No Tools', `You don't have any ${toolType} tools.`);
    }
  };

  const handleSettingToggle = (setting, value) => {
    updateSettings({ [setting]: value });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderBoard = () => {
    const [rows, cols] = GameUtils.getBoardDimensions(board.length * board[0]?.length || 0);
    const tileSize = Math.min((width - 40) / cols, (height - 300) / rows) - 2;
    
    return (
      <View style={styles.boardContainer}>
        {board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.boardRow}>
            {row.map((tile, colIndex) => {
              const tileKey = `${rowIndex}-${colIndex}`;
              const isSelected = selectedTiles.includes(tileKey);
              const isEmpty = !tile;
              
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.tile,
                    { width: tileSize, height: tileSize },
                    isSelected && styles.selectedTile,
                    isEmpty && styles.emptyTile
                  ]}
                  onPress={() => handleTilePress(rowIndex, colIndex)}
                  disabled={isEmpty}
                >
                  {!isEmpty && (
                    <Text style={[styles.tileEmoji, { fontSize: tileSize * 0.6 }]}>
                      {tile}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderPauseModal = () => (
    <Modal
      visible={showPauseModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowPauseModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Game Paused</Text>
          
          {/* Game Controls */}
          <View style={styles.modalSection}>
            <TouchableOpacity style={styles.modalButton} onPress={handleResume}>
              <MaterialIcons name="play-arrow" size={24} color="#4CAF50" />
              <Text style={styles.modalButtonText}>Resume</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleRestart}>
              <MaterialIcons name="refresh" size={24} color="#FF9800" />
              <Text style={styles.modalButtonText}>Restart</Text>
            </TouchableOpacity>
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>Game Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="music-note" size={20} color="#666" />
                <Text style={styles.settingLabel}>Background Music</Text>
              </View>
              <Switch
                value={settings.musicOn}
                onValueChange={(value) => handleSettingToggle('musicOn', value)}
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
                onValueChange={(value) => handleSettingToggle('sfxOn', value)}
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
                onValueChange={(value) => handleSettingToggle('hapticsOn', value)}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor={settings.hapticsOn ? '#FFF' : '#FFF'}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHomeModal = () => (
    <Modal
      visible={showHomeModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowHomeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Game Menu</Text>
          
          <TouchableOpacity style={styles.modalButton} onPress={handleResume}>
            <MaterialIcons name="play-arrow" size={24} color="#4CAF50" />
            <Text style={styles.modalButtonText}>Resume</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.modalButton} onPress={handleRestart}>
            <MaterialIcons name="refresh" size={24} color="#FF9800" />
            <Text style={styles.modalButtonText}>Restart</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.modalButton} onPress={handleGoHome}>
            <MaterialIcons name="home" size={24} color="#2196F3" />
            <Text style={styles.modalButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderLevelCompleteModal = () => (
    <Modal
      visible={showLevelComplete}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <MaterialIcons name="emoji-events" size={60} color="#FFD700" />
          <Text style={styles.modalTitle}>Level Complete!</Text>
          <Text style={styles.modalSubtitle}>
            Earned {currentLevelBamboo} bamboo 🎋
          </Text>
          
          <TouchableOpacity style={styles.nextButton} onPress={handleNextLevel}>
            <Text style={styles.nextButtonText}>Next Level</Text>
            <MaterialIcons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderGameOverModal = () => (
    <Modal
      visible={showGameOver}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <MaterialIcons name="sentiment-dissatisfied" size={60} color="#FF5722" />
          <Text style={styles.modalTitle}>Game Over</Text>
          <Text style={styles.modalSubtitle}>
            Better luck next time!
          </Text>
          
          <View style={styles.gameOverButtons}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRestart}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
              <Text style={styles.homeButtonText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handlePause}>
          <MaterialIcons name="pause" size={24} color="#666" />
        </TouchableOpacity>
        
        <View style={styles.levelInfo}>
          <Text style={styles.levelText}>Level {currentLevel}</Text>
          <Text style={styles.layoutText}>{GameUtils.getLevelLayout(currentLevel)}</Text>
        </View>
        
        <TouchableOpacity style={styles.headerButton} onPress={handleHome}>
          <MaterialIcons name="home" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Game Stats */}
      <View style={styles.gameStats}>
        <View style={styles.statItem}>
          <MaterialIcons name="timer" size={20} color="#FF9800" />
          <Text style={styles.statText}>{formatTime(timeRemaining)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <MaterialIcons name="favorite" size={20} color="#E91E63" />
          <Text style={styles.statText}>{heartsRemaining}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.bambooEmoji}>🎋</Text>
          <Text style={styles.statText}>{currentLevelBamboo}</Text>
        </View>
      </View>

      {/* Game Board */}
      {renderBoard()}

      {/* Tools */}
      <View style={styles.toolsContainer}>
        <TouchableOpacity 
          style={styles.toolButton} 
          onPress={() => handleUseTool('hint')}
        >
          <MaterialIcons name="lightbulb" size={24} color="#FFC107" />
          <Text style={styles.toolCount}>{inventory.hint}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.toolButton} 
          onPress={() => handleUseTool('bomb')}
        >
          <MaterialIcons name="whatshot" size={24} color="#FF5722" />
          <Text style={styles.toolCount}>{inventory.bomb}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.toolButton} 
          onPress={() => handleUseTool('shuffle')}
        >
          <MaterialIcons name="shuffle" size={24} color="#9C27B0" />
          <Text style={styles.toolCount}>{inventory.shuffle}</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderPauseModal()}
      {renderHomeModal()}
      {renderLevelCompleteModal()}
      {renderGameOverModal()}

      {/* Animations */}
      {showBambooAnimation && animationData && (
        <BambooAnimation
          bambooCount={animationData.bambooCount}
          startPositions={animationData.startPositions}
          endPosition={animationData.endPosition}
          onAnimationComplete={() => setShowBambooAnimation(false)}
        />
      )}
      
      {showSparkAnimation && animationData && (
        <SparkAnimation
          sparkCount={5}
          startPosition={animationData.startPosition}
          targetPositions={animationData.targetPositions}
          onAnimationComplete={() => setShowSparkAnimation(false)}
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
  headerButton: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelInfo: {
    alignItems: 'center',
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  layoutText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    marginLeft: 6,
    color: '#333',
  },
  bambooEmoji: {
    fontSize: 20,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  boardRow: {
    flexDirection: 'row',
  },
  tile: {
    backgroundColor: '#FFF',
    margin: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedTile: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  emptyTile: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  tileEmoji: {
    textAlign: 'center',
  },
  toolsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  toolButton: {
    backgroundColor: '#FFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  toolCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF5722',
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSection: {
    width: '100%',
    marginBottom: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingsSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    gap: 10,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameOverButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  homeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});