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
let blockSpeed = 200
let blockWidth = Math.min(400 * scale, window.innerWidth * 0.8) // Responsive initial width
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
    this.blockHeight = 40 * scale
    this.isMovingRight = true
    this.textScore = null
    this.gameOverText = null
    this.retryButton = null
    this.baseBlock = null
    this.gameStarted = false
    this.colors = [
      0xff6b6b, // Red
      0x4ecdc4, // Teal
      0x45b7d1, // Blue
      0x96ceb4, // Green
      0xfeca57, // Yellow
      0xff9ff3, // Pink
      0x54a0ff, // Light Blue
      0x5f27cd, // Purple
      0x00d2d3, // Cyan
      0xff9f43  // Orange
    ]
    this.currentColorIndex = 0
  }
  
  preload() {
    // No assets to preload - we'll use rectangles
  }

  create() {
    this.createBackground()
    this.createBaseBlock()
    this.createUI()
    this.createCurrentBlock()
    this.setupInput()
  }

  startGame() {
    // Mark game as started
    this.gameStarted = true
    // Start the first block falling
    this.startBlockFall()
  }

  createBackground() {
    // Create a gradient background
    this.background = this.add.graphics()
    this.background.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xE0F6FF, 0xE0F6FF, 1)
    this.background.fillRect(0, 0, sizes.width, sizes.height)
  }

  createBaseBlock() {
    // Calculate responsive base block width (80% of screen width, max 400px)
    const baseWidth = Math.min(400 * scale, sizes.width * 0.8)
    
    // Create the base block at the bottom using rectangle
    this.baseBlock = this.add.rectangle(
      sizes.width / 2, 
      sizes.height - this.blockHeight, // Position from bottom edge
      baseWidth, 
      this.blockHeight, 
      0x8B4513
    )
    this.baseBlock.setOrigin(0.5, 0.5) // Center origin
    this.blocks.push({
      sprite: this.baseBlock,
      width: baseWidth,
      x: sizes.width / 2
    })
    // Tower height starts at the top of the base block
    this.towerHeight = sizes.height - this.blockHeight
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
  }

  createCurrentBlock() {
    if (gameOver) return

    // Create the moving block at the top using rectangle
    const colorIndex = this.currentColorIndex % this.colors.length
    this.currentBlock = this.add.rectangle(
      sizes.width / 2, 
      100 * scale, 
      blockWidth, 
      this.blockHeight, 
      this.colors[colorIndex]
    )
    this.currentBlock.setOrigin(0.5, 0.5)
    this.currentColorIndex++
    
    // Start falling automatically if game has started
    if (this.gameStarted) {
      this.startBlockFall()
    }
  }

  setupInput() {
    // Handle click/tap to stop the falling block
    this.input.on('pointerdown', () => {
      this.stopBlockFall()
    })
  }

  startBlockFall() {
    if (!this.currentBlock) return
    
    // Calculate the target Y position (on top of the tower)
    const targetY = this.towerHeight - this.blockHeight / 2
    
    // Create a tween to make the block fall down automatically
    this.fallTween = this.tweens.add({
      targets: this.currentBlock,
      y: targetY,
      duration: 8000, // 4 seconds to fall (slower)
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
    
    // Check alignment at current position
    this.checkBlockLanding()
  }

  checkBlockLanding() {
    if (!this.currentBlock) return
    
    // Check alignment with the block below
    const lastBlock = this.blocks[this.blocks.length - 1]
    const alignment = this.checkAlignment(this.currentBlock, lastBlock)

    if (alignment.overlap > 0) {
      // Block is aligned - add to tower
      this.addBlockToTower(alignment)
      this.updateScore()
      this.increaseDifficulty()
      this.createCurrentBlock()
    } else {
      // Block missed completely - game over
      this.gameOver()
    }
  }

  moveCurrentBlock() {
    if (!this.currentBlock) return

    // Use a fixed movement speed instead of time.delta
    const moveSpeed = 2 // pixels per frame

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

  update() {
    if (gameOver) return
    this.moveCurrentBlock()
  }


  checkAlignment(currentBlock, lastBlock) {
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

  addBlockToTower(alignment) {
    // Create a new block for the tower using rectangle
    const colorIndex = (this.currentColorIndex - 1) % this.colors.length
    const newWidth = alignment.overlap
    const newX = Math.max(alignment.lastLeft, alignment.currentLeft) + newWidth / 2
    
    const newBlock = this.add.rectangle(
      newX, 
      this.towerHeight - this.blockHeight / 2, 
      newWidth, 
      this.blockHeight, 
      this.colors[colorIndex]
    )
    newBlock.setOrigin(0.5, 0.5)
    
    // Add to blocks array
    this.blocks.push({
      sprite: newBlock,
      width: newWidth,
      x: newX
    })
    
    // Update tower height (move up for next block)
    this.towerHeight -= this.blockHeight
    
    // Update the global blockWidth to match the new block width
    blockWidth = newWidth
    
    // Destroy the moving block
    this.currentBlock.destroy()
    this.currentBlock = null

    // Add slice effect if block was cut
    if (alignment.overlap < blockWidth) {
      this.createSliceEffect(alignment)
    }
  }

  createSliceEffect(alignment) {
    // Create falling pieces for the sliced part
    const slicedWidth = blockWidth - alignment.overlap
    const slicedX = alignment.currentLeft < alignment.lastLeft ? 
      alignment.currentLeft : alignment.lastRight
    
    // Create falling piece
    const fallingPiece = this.add.rectangle(
      slicedX + slicedWidth / 2,
      this.towerHeight - this.blockHeight / 2,
      slicedWidth,
      this.blockHeight,
      this.colors[(this.currentColorIndex - 1) % this.colors.length]
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

  updateScore() {
    score++
    this.textScore.setText(`Score: ${score}`)
  }

  increaseDifficulty() {
    // Increase block speed every 5 blocks
    if (score % 5 === 0) {
      blockSpeed += 50
    }
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
    
    this.add.text(sizes.width / 2, sizes.height / 2 + 60 * scale, `Final Score: ${score}`, {
      font: `${fontSize}px Arial`,
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: strokeThickness
    }).setOrigin(0.5, 0.5)

    // Create retry button
    this.retryButton = this.add.text(sizes.width / 2, sizes.height / 2 + 120 * scale, 'Retry', {
      font: `${fontSize}px Arial`,
      fill: "#00FF00",
      stroke: "#000000",
      strokeThickness: strokeThickness
    }).setOrigin(0.5, 0.5)
    .setInteractive()
    .on('pointerdown', this.retryGame, this)
    .on('pointerover', () => {
      this.retryButton.setTint(0x888888)
    })
    .on('pointerout', () => {
      this.retryButton.clearTint()
    })
  }

  retryGame() {
    // Reset game variables
    score = 0
    blockSpeed = 200
    blockWidth = Math.min(400 * scale, window.innerWidth * 0.8) // Reset to responsive width
    gameOver = false
    this.currentColorIndex = 0
    this.gameStarted = false
    
    // Clear all blocks except base
    this.blocks.forEach((block, index) => {
      if (index > 0) { // Keep base block
        block.sprite.destroy()
      }
    })
    this.blocks = [this.blocks[0]] // Keep only base block
    
    // Reset tower height (same as createBaseBlock)
    this.towerHeight = sizes.height - this.blockHeight
    
    // Clear UI
    if (this.gameOverText) this.gameOverText.destroy()
    if (this.retryButton) this.retryButton.destroy()
    
    // Update score display
    this.textScore.setText(`Score: ${score}`)
    
    // Create new moving block
    this.createCurrentBlock()
  }
}

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