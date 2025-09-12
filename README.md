# Link - Puzzle Matching Game

Connect pairs with ≤2 turns, beat the clock, manage hearts, and climb infinite levels—no ads!

## Overview

Link is a modern take on the classic "Lianliankan" puzzle game built with React Native and Expo. Players connect matching tile pairs using paths with no more than 2 turns, racing against time and managing limited hearts to progress through increasingly challenging levels.

## Features

### Core Gameplay
- **Classic Matching**: Connect identical tiles with paths using ≤2 turns
- **Progressive Difficulty**: Size increases every 12 levels, kinds every 6 levels
- **6 Gravity Layouts**: Static, Left, Right, Up, Down, Split (cycles every 6 levels)
- **Time Pressure**: Each level has a calculated time limit based on complexity
- **Heart System**: Limited mistakes allowed per level (decreases with progression)

### Economy & Tools
- **Bamboo Currency**: Earn bamboo by completing levels (scoring based on path complexity)
- **Tool Shop**: Purchase Hint, Bomb, and Shuffle tools with bamboo
- **Strategic Usage**: Tools don't consume time or hearts
- **No Ads**: Pure puzzle experience without interruptions

### Game Modes
- **Infinite Progression**: Endless levels with increasing difficulty
- **Fast Track System**: Rapid progression through size and complexity tiers
- **Deadlock Handling**: Smart detection with tool-based solutions

## Tech Stack

- **Framework**: React Native with Expo 53.0.0
- **Navigation**: expo-router (tabs + stacks)
- **State Management**: Zustand
- **Storage**: AsyncStorage for local data persistence
- **Styling**: React Native StyleSheet
- **Icons**: @expo/vector-icons (Material Icons)

## Installation & Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for web
npm run build:web
```

## Project Structure

```
app/
├── (tabs)/              # Main tab navigation
│   ├── index.js         # Home dashboard
│   ├── levels.js        # Level browser
│   ├── shop.js          # Tool marketplace
│   └── profile.js       # Settings & stats
├── details/[id].js      # Level preview
├── game.js              # Main gameplay
├── onboarding.js        # Tutorial slides
└── _layout.js           # Root navigation

store/
└── gameStore.js         # Zustand state management

utils/
└── StorageUtils.js      # AsyncStorage wrapper
```

## Game Mechanics

### Scoring System
- **Straight Path**: +1 bamboo per pair
- **1-Turn Path**: +2 bamboo per pair  
- **2-Turn Path**: +3 bamboo per pair

### Difficulty Progression
- **Size**: 10 → 16 → 20 → 24... (max 80, +4 every 12 levels)
- **Kinds**: 3 → 4 → 5... (max 15, +1 every 6 levels)
- **Hearts**: 10 → 9 → 8... (min 3, -1 every 12 levels)
- **Layouts**: Static → Left → Right → Up → Down → Split (6-cycle)

### Time Limit Formula
```
timeLimit = ceil(pairs × Tpp(L) × LayoutFactor × KindFactor)
- Tpp(L) = max(2.8, 5.2 - 0.06 × floor((L-1)/3))
- LayoutFactor: Static(1.0), Left/Right(1.05), Up/Down(1.1), Split(1.15)
- KindFactor: 1 + 0.015 × (kinds - 3)
```

## Adding New Features

### New Screens
1. Create component in `app/` directory
2. Add navigation route in `_layout.js`
3. Update tab navigation in `(tabs)/_layout.js` if needed

### Game Mechanics
1. Extend `GameUtils` in `store/gameStore.js`
2. Add constants to `GAME_CONSTANTS`
3. Update storage schema in `StorageUtils.js`

### Tools & Items
1. Add to `TOOL_PRICES` in game store
2. Implement logic in `useTool` function
3. Update shop UI in `app/(tabs)/shop.js`

## Next Steps

Here are 8 concrete follow-up tasks to enhance the game:

1. **Pathfinding Algorithm**: Implement actual tile connection validation with ≤2 turns rule
2. **Board Generation**: Create pair-reachable level generator with solvability validation  
3. **Animation System**: Add smooth tile removal, shuffle animations, and particle effects
4. **Audio Integration**: Implement sound effects and background music with Expo AV
5. **Achievement System**: Add milestone tracking, badges, and progression rewards
6. **Tutorial Integration**: Create interactive in-game tutorials for complex mechanics
7. **Performance Optimization**: Add board virtualization for larger grids and memory management
8. **Social Features**: Implement level sharing, leaderboards, and daily challenges

## Platform Support

- **iOS**: Full native support
- **Android**: Full native support  
- **Web**: Expo web compatibility (limited native features)

## License

Private project - Link Puzzle Game v1.0.0