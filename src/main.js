import './style.css'
import Phaser from 'phaser'

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

// Calculate scaling factors based on original 1080x1920 resolution
const scaleX = sizes.width / 1080
const scaleY = sizes.height / 1920
const scale = Math.min(scaleX, scaleY) // Use the smaller scale to maintain aspect ratio

// Global game variables
let score = 0
let blockSpeed = 400
// Block dimensions: 800px x 200px, made responsive
let blockWidth = Math.min(800 * scale, window.innerWidth * 0.8) // Responsive initial width
let blockHeight = 200 * scale // Block height
let gameOver = false

const gameCanvas = document.querySelector('#gameCanvas')
const gameStartDiv = document.querySelector('#gameStartDiv')
const gameStartBtn = document.querySelector('#gameStartBtn')
const gameEndDiv = document.querySelector('#gameEndDiv')
const gameEndScoreSpan = document.querySelector('#gameEndScoreSpan')
const gameWinLoseSpan = document.querySelector('#gameWinLoseSpan')

class StackTheBlocksScene extends Phaser.Scene {
  constructor() {
    super('stackTheBlocksScene')
    this.blocks = []
    this.currentBlock = null
    this.towerHeight = 0
    this.isMovingRight = true
    this.isFalling = false
    this.textScore = null
    this.gameOverText = null
    this.retryButton = null
    this.baseBlock = null
    this.gameStarted = false
    this.currentColorIndex = 0
  }
  
  // ========================================
  // PHASER DEFAULT FUNCTIONS
  // ========================================
  
  preload() {
    // Load background image
    this.load.image('cryptoBgd', 'assets/cryptoBgd.png')
    
    // Load base block image
    this.load.image('baseBlock', 'assets/baseBlock.png')
    
    // Load block images (6 blocks total)
    for (let i = 1; i <= 6; i++) {
      this.load.image(`block_${i}`, `assets/block_${i}.png`)
    }
  }

  create() {
    this.createBackground()
    this.createBaseBlock()
    this.createUI()
    this.createCurrentBlock()
    this.setupInput()
  }

  update() {
    if (gameOver) return
    this.moveCurrentBlock()
    this.updateCamera()
  }

  // ========================================
  // GAME INITIALIZATION & SETUP
  // ========================================

  startGame() {
    // Mark game as started
    this.gameStarted = true
    // Start the first block falling
    this.startBlockFall()
  }

  setupInput() {
    // Handle click/tap to stop the falling block
    this.input.on('pointerdown', () => {
      this.stopBlockFall()
    })
  }

  // ========================================
  // BLOCK CREATION & MANAGEMENT
  // ========================================

  createBlock(x, y, blockWidth, blockHeight, blockImageIndex) {
    // Create the block image with simple scaling
    const block = this.add.image(x, y, `block_${blockImageIndex}`)
    block.setOrigin(0.5, 0.5)
    block.setDisplaySize(blockWidth, blockHeight)
    
    return block
  }


  createBaseBlock() {
    // Use the same width as the global blockWidth variable
    const baseWidth = blockWidth
    
    // Create the base block using the original image (not HTML)
    this.baseBlock = this.add.image(
      sizes.width / 2, 
      sizes.height - blockHeight / 2, // Position center so bottom edge is at screen bottom
      'baseBlock'
    )
    this.baseBlock.setOrigin(0.5, 0.5)
    this.baseBlock.setDisplaySize(baseWidth, blockHeight)
    
    this.blocks.push({
      sprite: this.baseBlock,
      width: baseWidth,
      x: sizes.width / 2
    })
    // Tower height starts at the top of the base block
    this.towerHeight = sizes.height - blockHeight
  }

  createCurrentBlock() {
    if (gameOver) return

    // Reset falling flag for new block
    this.isFalling = false

    // Create block using helper function
    const blockImageIndex = (this.currentColorIndex % 6) + 1
    
    // Spawn block at the top of the current view (accounting for camera scroll)
    const spawnY = this.cameras.main.scrollY + 100 * scale
    
    this.currentBlock = this.createBlock(
      sizes.width / 2, 
      spawnY, 
      blockWidth, 
      blockHeight, 
      blockImageIndex
    )
    
    this.currentColorIndex++
    
    // Start falling automatically if game has started
    if (this.gameStarted) {
      this.startBlockFall()
    }
  }

  addBlockToTower(alignment) {
    // Create a new block for the tower using helper function
    const blockImageIndex = ((this.currentColorIndex - 1) % 6) + 1
    const newWidth = alignment.overlap
    const newX = Math.max(alignment.lastLeft, alignment.currentLeft) + newWidth / 2
    
    // Create block using helper function
    const newBlock = this.createBlock(
      newX, 
      this.towerHeight - blockHeight / 2, 
      newWidth, 
      blockHeight, 
      blockImageIndex
    )
    
    // Debug: Log positioning info
    console.log('New block position:', {
      newX: newX,
      newY: this.towerHeight - blockHeight / 2,
      towerHeight: this.towerHeight,
      blockHeight: blockHeight,
      blocksCount: this.blocks.length
    })
    
    // Add to blocks array
    this.blocks.push({
      sprite: newBlock,
      width: newWidth,
      x: newX
    })
    
    // Update tower height (move up for next block)
    this.towerHeight -= blockHeight
    
    // Update the global blockWidth for the next falling block
    blockWidth = newWidth
    
    // Destroy the moving block
    this.currentBlock.destroy()
    this.currentBlock = null

    // Add slice effect if block was cut
    if (alignment.overlap < blockWidth) {
      this.createSliceEffect(alignment)
    }
  }

  // ========================================
  // CAMERA & SCROLLING
  // ========================================

  updateCamera() {
    // Calculate the target camera Y position
    // We want the top of the tower to be at half screen height
    const targetTowerTopY = this.towerHeight
    const halfScreenHeight = sizes.height / 2
    
    // Only start scrolling when the tower top reaches the middle of the screen
    // towerHeight starts at sizes.height - blockHeight and decreases as tower grows
    // When towerHeight reaches halfScreenHeight, that's when we start scrolling
    const shouldStartScrolling = targetTowerTopY <= halfScreenHeight
    
    if (shouldStartScrolling) {
      // Calculate how much to scroll to keep tower top at half screen
      // Use negative scrollY to scroll down (show content above)
      const scrollAmount = halfScreenHeight - targetTowerTopY
      this.cameras.main.scrollY = -scrollAmount
    } else {
      // Keep camera at top when tower is still low
      this.cameras.main.scrollY = 0
    }
    
    // Debug logging
    if (this.blocks.length > 1) { // Only log when we have blocks
      console.log('Camera Debug:', {
        towerHeight: this.towerHeight,
        targetTowerTopY: targetTowerTopY,
        halfScreenHeight: halfScreenHeight,
        shouldStartScrolling: shouldStartScrolling,
        scrollAmount: shouldStartScrolling ? -(halfScreenHeight - targetTowerTopY) : 0,
        currentScrollY: this.cameras.main.scrollY,
        blocksCount: this.blocks.length
      })
    }
  }

  // ========================================
  // ANIMATION & MOVEMENT
  // ========================================

  startBlockFall() {
    if (!this.currentBlock) return
    
    // Calculate the target Y position (on top of the tower)
    const targetY = this.towerHeight - blockHeight / 2
    
    // Create a tween to make the block fall down automatically
    this.fallTween = this.tweens.add({
      targets: this.currentBlock,
      y: targetY,
      duration: 8000, // 8 seconds to fall (slower)
      ease: 'Linear',
      onComplete: () => {
        // If block reaches the bottom without being stopped, check alignment
        this.checkBlockLanding()
      }
    })
  }

  stopBlockFall() {
    if (!this.currentBlock || !this.fallTween) return
    
    // Stop the falling animation
    this.fallTween.stop()
    this.fallTween = null
    
    // Stop horizontal movement by setting a flag
    this.isFalling = true
    
    // Calculate the target Y position (on top of the tower)
    const targetY = this.towerHeight - blockHeight / 2
    
    // Create a quick falling animation to the target position
    this.fallTween = this.tweens.add({
      targets: this.currentBlock,
      y: targetY,
      duration: 300, // Quick fall animation
      ease: 'Power2',
      onComplete: () => {
        // Check alignment after falling into place
        this.checkBlockLanding()
      }
    })
  }

  moveCurrentBlock() {
    if (!this.currentBlock || this.isFalling) return

    // Calculate speed based on block size - smaller blocks move faster
    const originalBlockWidth = Math.min(800 * scale, window.innerWidth * 0.8) // Original full width
    const sizeRatio = blockWidth / originalBlockWidth // 1.0 = full size, 0.5 = half size, etc.
    
    // Smaller blocks (lower sizeRatio) should move faster
    // Base speed of 2 pixels/frame, increased for smaller blocks
    const baseSpeed = 2
    const speedMultiplier = 1 + (1 - sizeRatio) * 2 // 1x for full size, up to 3x for very small blocks
    const moveSpeed = baseSpeed * speedMultiplier

    // Move block horizontally
    if (this.isMovingRight) {
      this.currentBlock.x += moveSpeed
      if (this.currentBlock.x + blockWidth / 2 >= sizes.width) {
        this.isMovingRight = false
      }
    } else {
      this.currentBlock.x -= moveSpeed
      if (this.currentBlock.x - blockWidth / 2 <= 0) {
        this.isMovingRight = true
      }
    }
  }

  createSliceEffect(alignment) {
    // Create falling pieces for the sliced part
    const slicedWidth = blockWidth - alignment.overlap
    const slicedX = alignment.currentLeft < alignment.lastLeft ? 
      alignment.currentLeft : alignment.lastRight
    
    // Create falling piece using helper function
    const blockImageIndex = ((this.currentColorIndex - 1) % 6) + 1
    const fallingPiece = this.createBlock(
      slicedX + slicedWidth / 2,
      this.towerHeight - blockHeight / 2,
      slicedWidth,
      blockHeight,
      blockImageIndex
    )
    
    // Add physics to make it fall
    this.physics.add.existing(fallingPiece)
    fallingPiece.body.setVelocityY(300)
    fallingPiece.body.setVelocityX((Math.random() - 0.5) * 200)
    
    // Destroy after falling
    this.time.delayedCall(3000, () => {
      fallingPiece.destroy()
    })
  }

  // ========================================
  // GAME LOGIC & COLLISION DETECTION
  // ========================================

  checkBlockLanding() {
    if (!this.currentBlock) return
    
    // Check alignment with the block below
    const lastBlock = this.blocks[this.blocks.length - 1]
    const alignment = this.checkAlignment(this.currentBlock, lastBlock)

    if (alignment.overlap > 0) {
      // Block is aligned - add to tower
      this.addBlockToTower(alignment)
      this.updateScore()
      this.createCurrentBlock()
    } else {
      // Block missed completely - game over
      this.gameOver()
    }
  }

  checkAlignment(currentBlock, lastBlock) {
    // Use the actual visual width of the current block (blockWidth)
    const currentLeft = currentBlock.x - blockWidth / 2
    const currentRight = currentBlock.x + blockWidth / 2
    const lastLeft = lastBlock.x - lastBlock.width / 2
    const lastRight = lastBlock.x + lastBlock.width / 2

    // Calculate overlap
    const overlap = Math.max(0, Math.min(currentRight, lastRight) - Math.max(currentLeft, lastLeft))
    
    return {
      overlap: overlap,
      currentLeft: currentLeft,
      currentRight: currentRight,
      lastLeft: lastLeft,
      lastRight: lastRight
    }
  }

  updateScore() {
    score++
    this.textScore.setText(`Score: ${score}`)
  }


  // ========================================
  // UI & GAME STATE MANAGEMENT
  // ========================================

  createBackground() {
    // Create background image
    this.background = this.add.image(sizes.width / 2, sizes.height / 2, 'cryptoBgd')
    this.background.setDisplaySize(sizes.width, sizes.height)
    this.background.setScrollFactor(0) // Background doesn't scroll with camera
  }

  createUI() {
    // Calculate responsive font size
    const fontSize = Math.max(20, Math.min(35, sizes.width / 30))
    const strokeThickness = Math.max(1, Math.min(3, sizes.width / 400))
    
    this.textScore = this.add.text(sizes.width / 2, 50 * scale, `Score: ${score}`, {
      font: `${fontSize}px Arial`,
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: strokeThickness
    }).setOrigin(0.5, 0.5)
    this.textScore.setScrollFactor(0) // UI doesn't scroll with camera
  }

  gameOver() {
    gameOver = true
    
    // Create game over UI
    const fontSize = Math.max(20, Math.min(35, sizes.width / 30))
    const strokeThickness = Math.max(1, Math.min(3, sizes.width / 400))
    
    this.gameOverText = this.add.text(sizes.width / 2, sizes.height / 2, 'Game Over!', {
      font: `${fontSize * 1.5}px Arial`,
      fill: "#FF0000",
      stroke: "#000000",
      strokeThickness: strokeThickness
    }).setOrigin(0.5, 0.5)
    this.gameOverText.setScrollFactor(0) // UI doesn't scroll with camera
    
    this.add.text(sizes.width / 2, sizes.height / 2 + 60 * scale, `Final Score: ${score}`, {
      font: `${fontSize}px Arial`,
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: strokeThickness
    }).setOrigin(0.5, 0.5).setScrollFactor(0) // UI doesn't scroll with camera

    this.add.text(sizes.width / 2, sizes.height / 2 + 120 * scale, 'Refresh page to restart', {
      font: `${fontSize * 0.8}px Arial`,
      fill: "#CCCCCC",
      stroke: "#000000",
      strokeThickness: strokeThickness
    }).setOrigin(0.5, 0.5).setScrollFactor(0) // UI doesn't scroll with camera
  }

}

// ========================================
// GAME CONFIGURATION & INITIALIZATION
// ========================================

const config = {
  type: Phaser.WEBGL,
  width: sizes.width,
  height: sizes.height,
  canvas: gameCanvas,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [StackTheBlocksScene]
}

const game = new Phaser.Game(config)

console.log('Game created:', game)

gameStartBtn.addEventListener('click', () => {
  console.log('Start button clicked')
  gameStartDiv.style.display = 'none'
  // Start the game by making the first block fall
  game.scene.getScene('stackTheBlocksScene').startGame()
})