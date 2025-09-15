import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MiniBoard = ({ board }) => {
  const renderTile = (tile, row, col) => {
    const isEmpty = !tile;
    
    if (isEmpty) {
      return <View key={`${row}-${col}`} style={styles.emptyTile} />;
    }

    return (
      <View key={`${row}-${col}`} style={styles.tile}>
        <Text style={styles.tileEmoji}>{tile}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  board: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    width: 16,
    height: 16,
    backgroundColor: '#F5F5F5',
    margin: 0.5,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyTile: {
    width: 16,
    height: 16,
    margin: 0.5,
  },
  tileEmoji: {
    fontSize: 8,
  },
});

export default MiniBoard;