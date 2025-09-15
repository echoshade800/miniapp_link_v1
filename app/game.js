import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import useGameStore from '../store/gameStore';
import { GameUtils } from '../store/gameStore';
import MiniBoard from '../components/MiniBoard';
import BambooAnimation from '../components/BambooAnimation';
import SparkAnimation from '../components/SparkAnimation';

const { width, height } = Dimensions.get('window');

export default function GameScreen() {
  const {
    currentLevel,
    maxLevel,
    gameState,
    inventory,
    startLevel,
    completeLevel,
    useTool,
  } = useGameStore();

  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [heartsRemaining, setHeartsRemaining] = useState(0);
  const [showBambooAnimation, setShowBambooAnimation] = useState(false);
  const [showSparkAnimation, setShowSparkAnimation] = useState(false);

  // Check if should show tutorial for new users on Level 1
  useEffect(() => {
    if (currentLevel === 1 && maxLevel === 1) {
      setShowTutorial(true);
      setTutorialStep(1);
    }
  }, [currentLevel, maxLevel]);

  // Initialize level when component mounts
  useEffect(() => {
    if (!gameState.isPlaying) {
      startLevel(currentLevel);
    }
  }, []);

  // Game timer
  useEffect(() => {
    if (gameState.isPlaying && gameState.timeRemaining > 0 && !gameState.isPaused) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleGameOver();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  const handleBack = () => {
    router.back();
  };

  const handleGameOver = () => {
    Alert.alert('Game Over', 'Time\'s up! Try again?', [
      { text: 'Retry', onPress: () => startLevel(currentLevel) },
      { text: 'Back', onPress: handleBack },
    ]);
  };

  const handleLevelComplete = () => {
    const earnedBamboo = 50; // Base bamboo for completing level
    const isFirstTime = currentLevel > maxLevel;
    
    completeLevel(currentLevel, earnedBamboo, timeRemaining, isFirstTime);
    
    if (showBambooAnimation) {
      setShowBambooAnimation(false);
    }
    setShowBambooAnimation(true);
  };

  const handleTilePress = (row, col) => {
    // Tutorial logic - don't allow tile selection during tutorial
    if (showTutorial) {
      return;
    }

    const tile = gameState.board[row][col];
    if (!tile) return;

    const tileKey = `${row}-${col}`;
    
    if (selectedTiles.includes(tileKey)) {
      // Deselect tile
      setSelectedTiles(prev => prev.filter(t => t !== tileKey));
    } else if (selectedTiles.length < 2) {
      // Select tile
      setSelectedTiles(prev => [...prev, tileKey]);
      
      if (selectedTiles.length === 1) {
        // Check if tiles match
        const [firstRow, firstCol] = selectedTiles[0].split('-').map(Number);
        const firstTile = gameState.board[firstRow][firstCol];
        
        if (firstTile === tile) {
          // Match found - remove tiles and add bamboo
          setTimeout(() => {
            setSelectedTiles([]);
            // TODO: Implement tile removal logic
            setShowSparkAnimation(true);
          }, 500);
        } else {
          // No match - deselect after delay
          setTimeout(() => {
            setSelectedTiles([]);
            setHeartsRemaining(prev => prev - 1);
          }, 1000);
        }
      }
    }
  };

  const handleUseTool = (toolType) => {
    if (useTool(toolType)) {
      // TODO: Implement tool effects
      Alert.alert('Tool Used', `${toolType} tool activated!`);
    } else {
      Alert.alert('No Tools', `You don't have any ${toolType} tools.`);
    }
  };

  const renderTutorialModal = () => {
    const tutorialContent = {
      1: {
        title: 'Welcome to Link! 🎋',
        content: 'Match two identical tiles with no more than 2 turns to clear them.',
        buttonText: 'Next'
      },
      2: {
        title: 'How to Play',
        content: 'Tap two identical tiles to connect them.\nPaths can go around the board edges if needed.',
        buttonText: 'Start Playing!'
      }
    };

    const current = tutorialContent[tutorialStep];

    return (
      <Modal
        visible={showTutorial}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialModal}>
            <Text style={styles.tutorialTitle}>{current.title}</Text>
            <Text style={styles.tutorialContent}>{current.content}</Text>
            
            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={() => {
                if (tutorialStep === 2) {
                  setShowTutorial(false);
                } else {
                  setTutorialStep(2);
                }
              }}
            >
              <Text style={styles.tutorialButtonText}>{current.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderBoard = () => {
    if (!gameState.board || gameState.board.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading level...</Text>
        </View>
      );
    }

    return (
      <View style={styles.boardContainer}>
        {gameState.board.map((row, rowIndex) => (
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
                    isEmpty && styles.emptyTile,
                    isSelected && styles.selectedTile,
                  ]}
                  onPress={() => handleTilePress(rowIndex, colIndex)}
                  disabled={isEmpty}
                >
                  {!isEmpty && (
                    <Text style={styles.tileEmoji}>{tile}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        
        <Text style={styles.levelTitle}>Level {currentLevel}</Text>
        
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="timer" size={20} color="#FF9800" />
            <Text style={styles.statText}>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.heartEmoji}>♥</Text>
            <Text style={styles.statText}>{heartsRemaining}</Text>
          </View>
        </View>
      </View>

      {/* Level Info */}
      <View style={styles.levelInfo}>
        <Text style={styles.levelInfoText}>
          {GameUtils.getLevelLayout(currentLevel)} • {GameUtils.getLevelKinds(currentLevel)} kinds
        </Text>
      </View>

      {/* Game Board */}
      <View style={styles.gameArea}>
        {renderBoard()}
      </View>

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

      {/* Tutorial Modal */}
      {renderTutorialModal()}

      {/* Animations */}
      {showBambooAnimation && (
        <BambooAnimation
          bambooCount={3}
          startPositions={[{ x: width / 2, y: height / 2 }]}
          endPosition={{ x: width - 60, y: 100 }}
          onAnimationComplete={() => setShowBambooAnimation(false)}
        />
      )}

      {showSparkAnimation && (
        <SparkAnimation
          sparkCount={5}
          startPosition={{ x: width / 2, y: height / 2 }}
          targetPositions={Array.from({ length: 5 }, (_, i) => ({
            x: width / 2 + (Math.random() - 0.5) * 200,
            y: height / 2 + (Math.random() - 0.5) * 200,
          }))}
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
  backButton: {
    padding: 8,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  heartEmoji: {
    fontSize: 16,
    color: '#E91E63',
  },
  levelInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  levelInfoText: {
    fontSize: 14,
    color: '#666',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  boardContainer: {
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  boardRow: {
    flexDirection: 'row',
  },
  tile: {
    width: 40,
    height: 40,
    backgroundColor: '#F5F5F5',
    margin: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  emptyTile: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  selectedTile: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  tileEmoji: {
    fontSize: 24,
  },
  toolsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  toolButton: {
    backgroundColor: '#FFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  toolCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  // Tutorial Modal Styles
  tutorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
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
    maxWidth: width * 0.85,
  },
  tutorialTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 16,
  },
  tutorialContent: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  tutorialButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  tutorialButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});