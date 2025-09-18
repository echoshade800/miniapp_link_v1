# Game.js - 核心游戏组件文档

## 概述

`app/game.js` 是 Link 拼图游戏的核心游戏页面，实现了完整的连连看游戏逻辑。玩家需要在限定时间内连接相同的瓦片对，路径转弯次数不能超过2次。

## 主要功能

### 🎮 核心游戏机制
- **瓦片连接验证**：实现≤2转弯的路径查找算法
- **多种重力模式**：支持6种不同的瓦片移动方式
- **时间压力系统**：每关都有计算好的时间限制
- **心数管理**：错误次数限制，增加策略性

### 🎨 用户界面
- **响应式棋盘**：自适应不同屏幕尺寸
- **流畅动画**：瓦片选择、连接、消除动画
- **实时反馈**：路径显示、得分动画
- **直观控制**：暂停、重启、道具使用

### 🔧 道具系统
- **提示工具**：高亮显示可连接的瓦片对
- **炸弹工具**：直接移除一对可连接瓦片
- **洗牌工具**：重新排列剩余瓦片

## 技术架构

### 状态管理
```javascript
// 本地状态
const [selectedTiles, setSelectedTiles] = useState([]);
const [board, setBoard] = useState([]);
const [animatingTiles, setAnimatingTiles] = useState([]);
const [showPath, setShowPath] = useState(null);

// 全局状态（来自 gameStore）
const { gameState, startLevel, completeLevel, useTool } = useGameStore();
```

### 核心算法

#### 路径查找算法
```javascript
/**
 * 查找两个瓦片之间的连接路径
 * @param {Object} start - 起始位置 {row, col}
 * @param {Object} end - 目标位置 {row, col}
 * @returns {Array|null} - 路径数组或null
 */
const findPath = (start, end) => {
  // 1. 直线连接（0转弯）
  if (canConnectDirectly(start, end)) {
    return generateDirectPath(start, end);
  }
  
  // 2. 一次转弯连接
  const oneCornerPath = findOneCornerPath(start, end);
  if (oneCornerPath) return oneCornerPath;
  
  // 3. 两次转弯连接
  return findTwoCornerPath(start, end);
};
```

#### 重力系统
```javascript
const applyGravity = (mode, board, removedPositions) => {
  switch (mode) {
    case 'Left': return slideLeft(board);
    case 'Right': return slideRight(board);
    case 'Up': return slideUp(board);
    case 'Down': return slideDown(board);
    case 'Split': return slideSplit(board);
    default: return board; // Static
  }
};
```

## 组件结构

```
Game
├── GameHeader
│   ├── Timer (倒计时显示)
│   ├── Hearts (心数显示)
│   ├── Score (得分显示)
│   └── PauseButton
├── GameBoard
│   ├── TileGrid
│   │   └── Tile[] (瓦片数组)
│   ├── PathOverlay (路径显示)
│   └── AnimationLayer
├── ToolBar
│   ├── HintTool
│   ├── BombTool
│   └── ShuffleTool
└── GameFooter
    ├── HomeButton
    └── RestartButton
```

## 游戏流程

### 1. 游戏初始化
```javascript
useEffect(() => {
  // 从 gameStore 获取关卡信息
  const level = gameState.currentLevel;
  const board = gameState.board;
  
  // 初始化本地状态
  setBoard(board);
  setSelectedTiles([]);
  
  // 启动计时器
  startTimer();
}, [gameState.currentLevel]);
```

### 2. 瓦片选择逻辑
```javascript
const handleTilePress = (row, col) => {
  const tile = board[row][col];
  
  // 忽略空瓦片
  if (!tile) return;
  
  if (selectedTiles.length === 0) {
    // 选择第一个瓦片
    setSelectedTiles([{row, col, tile}]);
  } else if (selectedTiles.length === 1) {
    const firstTile = selectedTiles[0];
    
    // 点击同一个瓦片取消选择
    if (firstTile.row === row && firstTile.col === col) {
      setSelectedTiles([]);
      return;
    }
    
    // 检查瓦片是否匹配
    if (firstTile.tile === tile) {
      // 查找连接路径
      const path = findPath(firstTile, {row, col});
      
      if (path) {
        // 连接成功
        handleSuccessfulConnection(firstTile, {row, col, tile}, path);
      } else {
        // 连接失败
        handleFailedConnection();
      }
    } else {
      // 瓦片不匹配
      setSelectedTiles([{row, col, tile}]);
    }
  }
};
```

### 3. 连接成功处理
```javascript
const handleSuccessfulConnection = (tile1, tile2, path) => {
  // 显示连接路径
  setShowPath(path);
  
  // 计算得分（基于路径复杂度）
  const score = calculateScore(path);
  
  // 播放消除动画
  animateRemoval([tile1, tile2]);
  
  // 更新棋盘
  setTimeout(() => {
    removeTiles([tile1, tile2]);
    applyGravityEffect();
    
    // 检查游戏结束条件
    checkGameEnd();
  }, 300);
};
```

## 动画系统

### 瓦片动画
```javascript
// 选择动画
const tileScale = useSharedValue(1);
const selectedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: tileScale.value }],
}));

// 消除动画
const removeTileAnimation = () => {
  tileScale.value = withSequence(
    withTiming(1.2, { duration: 150 }),
    withTiming(0, { duration: 200 })
  );
};
```

### 路径动画
```javascript
const PathOverlay = ({ path }) => {
  const pathOpacity = useSharedValue(0);
  
  useEffect(() => {
    pathOpacity.value = withTiming(1, { duration: 200 });
  }, [path]);
  
  return (
    <Animated.View style={[styles.pathOverlay, { opacity: pathOpacity }]}>
      {/* 绘制连接线 */}
    </Animated.View>
  );
};
```

## 道具实现

### 提示工具
```javascript
const useHint = () => {
  if (inventory.hint > 0) {
    const hintPair = findConnectablePair(board);
    if (hintPair) {
      highlightTiles(hintPair, 2000); // 高亮2秒
      useTool('hint');
    }
  }
};
```

### 炸弹工具
```javascript
const useBomb = () => {
  if (inventory.bomb > 0) {
    const randomPair = findRandomConnectablePair(board);
    if (randomPair) {
      animateExplosion(randomPair);
      removeTiles(randomPair);
      useTool('bomb');
    }
  }
};
```

### 洗牌工具
```javascript
const useShuffle = () => {
  if (inventory.shuffle > 0) {
    const newBoard = shuffleRemainingTiles(board);
    animateShuffle(newBoard);
    useTool('shuffle');
  }
};
```

## 性能优化

### 1. 渲染优化
```javascript
// 使用 React.memo 避免不必要的重渲染
const Tile = React.memo(({ tile, isSelected, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{tile}</Text>
    </TouchableOpacity>
  );
});

// 使用 useCallback 缓存事件处理函数
const handleTilePress = useCallback((row, col) => {
  // 处理逻辑
}, [selectedTiles, board]);
```

### 2. 算法优化
```javascript
// 缓存路径查找结果
const pathCache = useMemo(() => new Map(), [board]);

const findPathWithCache = (start, end) => {
  const key = `${start.row},${start.col}-${end.row},${end.col}`;
  if (pathCache.has(key)) {
    return pathCache.get(key);
  }
  
  const path = findPath(start, end);
  pathCache.set(key, path);
  return path;
};
```

## 错误处理

### 游戏状态异常
```javascript
const validateGameState = () => {
  // 检查棋盘完整性
  if (!board || board.length === 0) {
    console.error('Invalid board state');
    return false;
  }
  
  // 检查是否还有可连接的对
  const connectablePairs = findAllConnectablePairs(board);
  if (connectablePairs.length === 0 && !isBoardEmpty(board)) {
    // 触发自动洗牌或游戏结束
    handleDeadlock();
  }
  
  return true;
};
```

### 边界情况处理
```javascript
const handleEdgeCases = () => {
  // 时间耗尽
  if (timeRemaining <= 0) {
    handleGameOver('timeout');
  }
  
  // 心数耗尽
  if (heartsRemaining <= 0) {
    handleGameOver('no_hearts');
  }
  
  // 棋盘清空
  if (isBoardEmpty(board)) {
    handleLevelComplete();
  }
};
```

## 测试策略

### 单元测试
- [ ] 路径查找算法正确性
- [ ] 重力系统各模式表现
- [ ] 得分计算准确性
- [ ] 道具功能正常工作

### 集成测试
- [ ] 完整游戏流程
- [ ] 状态同步正确性
- [ ] 动画性能表现
- [ ] 错误恢复机制

### 用户测试
- [ ] 操作响应性
- [ ] 视觉反馈清晰度
- [ ] 学习曲线合理性
- [ ] 长时间游戏稳定性

## 扩展功能

### 计划中的功能
- **多人对战模式**：实时对战系统
- **自定义主题**：瓦片和背景主题
- **关卡编辑器**：用户自制关卡
- **回放系统**：游戏过程录制回放
- **成就系统**：里程碑和徽章

### 技术改进
- **AI提示系统**：智能难度调节
- **云端存档**：跨设备数据同步
- **性能监控**：实时性能分析
- **A/B测试**：功能效果验证

## 依赖关系

### 核心依赖
```javascript
import { useGameStore } from '../store/gameStore';
import SparkAnimation from '../components/SparkAnimation';
import BambooAnimation from '../components/BambooAnimation';
import { MaterialIcons } from '@expo/vector-icons';
```

### 动画依赖
```javascript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
```

## 维护指南

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 React Hooks 最佳实践
- 保持函数单一职责
- 添加详细的 JSDoc 注释

### 调试工具
- React DevTools：组件状态检查
- Flipper：网络和性能调试
- Console.log：游戏状态跟踪
- 开发模式调试面板

### 版本控制
- 功能分支开发
- 代码审查流程
- 自动化测试集成
- 发布版本标记

---

**最后更新：** 2024年1月
**维护者：** Link Game Development Team
**版本：** 1.0.0