// Constants
const DICE_COUNT = 16;
const MAX_COLOR_COUNT = 4;
const GRID_WIDTH = 4;
const DIE_SIZE = 40;
const ROLL_BUTTON_POS = { x: 110, y: 530 }; // Keep original positions
const PICK_BUTTON_POS = { x: 210, y: 530 };
const RESTART_BUTTON_POS = { x: 150, y: 400 };
const BUTTON_SIZE = { width: 70, height: 40 };
const SCORE_PILE_ROW_LENGTH = 8;
const SCORE_PILE_DIE_OFFSET = { x: 45, y: 45 };
const SCORE_PILE_START = { x: 22.5, y: 50 };
const DICE_COLORS = [
  "white",
  "pink",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "black",
];
const ABILITIES = {
  white: "White: When picked, select two dice in play and swap their values.",
  pink:
    "Pink: When picked, select a die in play and reroll all dice of that color in play.",
  red: "Red: When picked, double the score added from this die.",
  orange:
    "Orange: When picked, select a die in play and copy this die’s value onto it.",
  yellow: "Yellow: When picked, select a die in play and add +1 to its value.",
  green:
    "Green: When picked, immediately pick all remaining dice of this color in play.",
  blue:
    "Blue: When picked, select a die in play; it cannot be picked or rolled until after your next roll phase.",
  purple:
    "Purple: When picked, select a non-purple die in your score pile and return it to play; it can't be picked until it's rerolled.",
  black:
    "Black: When picked, select a die in your score pile and reroll its value.",
};
const SCORE_MAP = { 6: 0, 5: 1, 4: 2, 3: 3, 2: 4, 1: 5 };

// Game State Variables
let score = 0;
let playPile = [];
let scorePile = [];
let selectedDie = null;
let hasPicked = false;
let seed = generateSeed();
let seededRandom = seededRNG(seed);
// Removed:  let rollButton, pickButton, restartButton;  // No longer needed
let gameOver = false;
let gameStarted = false;

// Ability State
let abilityInProgress = false;
let abilityType = null;
let abilityTargets = { target1: null, target2: null };
let orangeDieValue = null;
let blueDieLocked = null;
let lockedByBlue = [];
let animations = [];
let returnedByPurple = [];
let pendingAbilities = [];

// --- Button Variables ---
let rollButtonRect = {
  x: ROLL_BUTTON_POS.x,
  y: ROLL_BUTTON_POS.y,
  width: BUTTON_SIZE.width,
  height: BUTTON_SIZE.height,
  color: [100, 150, 200],
  label: "ROLL",
  action: rollDice, // Function to call when clicked
};

let pickButtonRect = {
  x: PICK_BUTTON_POS.x,
  y: PICK_BUTTON_POS.y,
  width: BUTTON_SIZE.width,
  height: BUTTON_SIZE.height,
  color: [200, 230, 200],
  label: "PICK",
  action: pickDice, // Function to call
};

let restartButtonRect = {
  x: RESTART_BUTTON_POS.x,
  y: RESTART_BUTTON_POS.y,
  width: BUTTON_SIZE.width,
  height: BUTTON_SIZE.height,
  color: [255, 150, 150],
  label: "RESTART",
  action: restartGame, // Function to call
};

// --- Utility Functions ---
function generateSeed() {
  return Array.from({ length: 8 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
      Math.floor(Math.random() * 36)
    )
  ).join("");
}

function seededRNG(seed) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) {
    x = (x + seed.charCodeAt(i)) % 2147483647;
  }
  return function () {
    x = (x * 16807) % 2147483647;
    return (x % 1000) / 1000;
  };
}

function randomDieValue() {
  return Math.floor(seededRandom() * 6) + 1;
}

function randomDieColor() {
  return DICE_COLORS[Math.floor(seededRandom() * DICE_COLORS.length)];
}

// --- Setup and Initialization ---
function setup() {
  let canvas = createCanvas(400, 600);
  canvas.parent("game-container");
  textFont("Courier New");
  // Removed createButtons() - buttons are now drawn in draw()
}

function initializeDice() {
    playPile = []; // Clear playPile in case of re-initialization
    const colorCounts = {};
    DICE_COLORS.forEach((color) => (colorCounts[color] = 0));

    while (playPile.length < DICE_COUNT) {
        const dieColor = randomDieColor();
        if (colorCounts[dieColor] < MAX_COLOR_COUNT) {
            const dieValue = randomDieValue();
            const x = 100 + (playPile.length % GRID_WIDTH) * 50;
            const y = 300 + Math.floor(playPile.length / GRID_WIDTH) * 50;
            playPile.push(new Die(x, y, DIE_SIZE, dieValue, dieColor));
            colorCounts[dieColor]++;
        }
    }
    gameOver = false; //Reset game over if reinitializing
}

// --- Drawing Functions ---
function draw() {
  background(50);

  if (!gameStarted) {
    drawTitleScreen();
  } else {
    drawUI();
    drawDice();
    updateAnimations();

    // --- Draw the buttons ---
    drawButton(rollButtonRect, hasPicked ? [200] : rollButtonRect.color);
    drawButton(pickButtonRect);
    if (gameOver) {
      drawButton(restartButtonRect);
    }
  }
}

function drawTitleScreen() {
  textSize(48);
  fill(255);
  textAlign(CENTER, CENTER);
  text("Dice Game", width / 2, height / 2 - 40);
  textSize(20);
  text("Click to Start", width / 2, height / 2 + 20);
  textAlign(LEFT, BASELINE); // Reset alignment
}

function drawUI() {
    noStroke();
    fill(75);
    rect(20, 160, 360, 110, 10);
    textSize(15);
    fill(255);
    text(`score: ${score}`, 30, 30);
    text(`seed: ${seed}`, 250, 30);

    if (selectedDie) {
        text(ABILITIES[selectedDie.col], 50, 180, 310, 100);
    }

    if (gameOver) {
        textSize(48);
        fill(0);
        text("Game Over", 75, 225);
    }
}

function drawDice() {
  playPile.forEach((die) => die.display());
  scorePile.forEach((die, i) => {
    const rowIndex = Math.floor(i / SCORE_PILE_ROW_LENGTH);
    const col = i % SCORE_PILE_ROW_LENGTH;
    die.x = SCORE_PILE_START.x + col * SCORE_PILE_DIE_OFFSET.x;
    die.y = SCORE_PILE_START.y + rowIndex * SCORE_PILE_DIE_OFFSET.y;
    die.display();
  });
}

function updateAnimations() {
  for (let i = animations.length - 1; i >= 0; i--) {
    animations[i].update();
    animations[i].draw();
    if (animations[i].isFinished()) {
      animations.splice(i, 1);
    }
  }
}

// --- Button Drawing and Interaction ---

function drawButton(buttonRect, customColor) {
  let currentColor = customColor || buttonRect.color; // Use custom color if provided
  let isHovered = isMouseOverRect(buttonRect);

  // Change color on hover
  fill(isHovered ? currentColor[1] || currentColor[0] : currentColor[0]);

  stroke(0); // Add a black outline
  strokeWeight(1);
  rect(buttonRect.x, buttonRect.y, buttonRect.width, buttonRect.height, 5); // Draw rectangle with a small corner radius

  // Draw text
  noStroke();
  fill(255); // White text
  textSize(20);
  textAlign(CENTER, CENTER);
  text(
    buttonRect.label,
    buttonRect.x + buttonRect.width / 2,
    buttonRect.y + buttonRect.height / 2
  );
  textAlign(LEFT, BASELINE); // Reset alignment
}

function isMouseOverRect(rect) {
  return (
    mouseX > rect.x &&
    mouseX < rect.x + rect.width &&
    mouseY > rect.y &&
    mouseY < rect.y + rect.height
  );
}

// --- Input Handling ---

function mousePressed() {
    if (!gameStarted) {
        gameStarted = true;
        restartGame(); // Initialize the game and reset everything
        return;
    }

    const clickedDie = getClickedDie(mouseX, mouseY);

  // Check button clicks FIRST, before die clicks
  if (!gameOver) {
    //Game is still active
    if (isMouseOverRect(rollButtonRect) && rollButtonRect.action) {
      rollButtonRect.action();
      return; // Important: Stop checking other clicks
    }
    if (isMouseOverRect(pickButtonRect) && pickButtonRect.action) {
      pickButtonRect.action();
      return; // Stop checking
    }
  } else {
    //Game is over
    if (isMouseOverRect(restartButtonRect) && restartButtonRect.action) {
      restartButtonRect.action();
      return; // Stop checking
    }
  }

  if (abilityInProgress) {
    handleAbilityClick(clickedDie);
  } else {
    if (clickedDie && playPile.includes(clickedDie) && !clickedDie.locked) {
      selectedDie = clickedDie;
    }
    if (orangeDieValue !== null && selectedDie) {
      selectedDie.value = orangeDieValue;
      orangeDieValue = null;
       calculateScore();
           checkPendingAbilities(); // Check for more abilities after orange
    }
  }
}

function getClickedDie(x, y) {
  if (abilityInProgress && abilityType === "black") {
    return scorePile.find((die) => die.contains(x, y)) || null;
  }
  if (abilityInProgress && abilityType === "purple") {
    let die = scorePile.find((die) => die.contains(x, y));
    if (die) return die;
  }
  return playPile.find((die) => die.contains(x, y)) || null;
}

// --- Game Logic ---
//(The rest of the game logic functions are identical to your original code,
//just with the button handling removed.  I'm including them for completeness.)
function rollDice() {
    if (hasPicked) {
        playPile.forEach((die) => {
            if (die !== blueDieLocked) {
                animations.push(new RollAnimation(die, die.value, randomDieValue()));
                die.locked = false;
            }
        });
        returnedByPurple = [];
        unlockBlueDie();
        hasPicked = false;
    }
}

function unlockBlueDie() {
    if (blueDieLocked) {
        blueDieLocked.locked = false;
        lockedByBlue = lockedByBlue.filter((die) => die !== blueDieLocked);
        blueDieLocked = null;
    }
}

function pickDice() {
    if (selectedDie && playPile.includes(selectedDie) && !selectedDie.locked) {
        pendingAbilities.push(selectedDie.col);
        startAbility(selectedDie);
    }
}
function startAbility(pickedDie) {
    moveDieToScorePile(pickedDie); // Always move to score pile first

    let currentAbilityType = pickedDie.col;

    // Check if ability can be activated, otherwise fizzle
    let canActivate = true;
    switch (currentAbilityType) {
        case "white":
            canActivate = playPile.length >= 2;
            break;
        case "pink":
        case "yellow":
        case "blue":
            canActivate = playPile.length >= 1;
            break;
        case "purple":
        case "black":
            canActivate = scorePile.length >= 1;
            break;
        //Red, Orange, and Green don't need a check
    }

    if (!canActivate) {
        console.log(`${currentAbilityType} ability fizzled: Not enough targets.`);
        pendingAbilities.shift(); // Remove from queue
        checkPendingAbilities();
        return;
    }

    switch (currentAbilityType) {
        case "white":
        case "pink":
        case "yellow":
        case "blue":
        case "purple":
        case "black":
            abilityInProgress = true;
            abilityType = currentAbilityType;
            abilityTargets = { target1: null, target2: null };
            break;
        case "red":
            pickedDie.redBonus = true;
            pendingAbilities.shift(); // Remove 'red' from queue
            checkPendingAbilities();
            return;
        case "orange":
            orangeDieValue = pickedDie.value;
            abilityInProgress = false;
            pendingAbilities.shift(); // Remove 'orange' from queue
            checkPendingAbilities();
            return;
        case "green":
            // Green handles its own logic
            selectedDie = null;
            pendingAbilities.shift();
            checkPendingAbilities();
            return;
        default:
            abilityInProgress = false;
            pendingAbilities.shift(); // Remove from queue
            checkPendingAbilities();
    }
}

function handleAbilityClick(clickedDie) {
    if (!clickedDie || !abilityInProgress) return;

    switch (abilityType) {
        case "white":
            handleWhiteAbility(clickedDie);
            break;
        case "pink":
            handlePinkAbility(clickedDie);
            break;
        case "yellow":
            handleYellowAbility(clickedDie);
            break;
        case "blue":
            handleBlueAbility(clickedDie);
            break;
        case "purple":
            handlePurpleAbility(clickedDie);
            break;
        case "black":
            handleBlackAbility(clickedDie);
            break;
    }
}

function handleWhiteAbility(clickedDie) {
    if (!abilityTargets.target1) {
        abilityTargets.target1 = clickedDie;
    } else if (!abilityTargets.target2 && clickedDie !== abilityTargets.target1) {
        abilityTargets.target2 = clickedDie;
        animations.push(new SwapAnimation(abilityTargets.target1, abilityTargets.target2));
        const tempValue = abilityTargets.target1.value;
        abilityTargets.target1.value = abilityTargets.target2.value;
        abilityTargets.target2.value = tempValue;
        calculateScore();
        abilityInProgress = false;
        pendingAbilities.shift(); // Ability done, remove from queue
        abilityTargets = { target1: null, target2: null };
        checkPendingAbilities();
    }
}

function handlePinkAbility(clickedDie) {
    const colorToReroll = clickedDie.col;
    playPile.filter((die) => die.col === colorToReroll)
        .forEach((die) => animations.push(new RollAnimation(die, die.value, randomDieValue())));
    abilityInProgress = false;
    pendingAbilities.shift();
    checkPendingAbilities();
}

function handleYellowAbility(clickedDie) {
    if (!abilityTargets.target1) {
        abilityTargets.target1 = clickedDie;
        let startValue = abilityTargets.target1.value;
        let newValue = Math.min(startValue + 1, 6);
        animations.push(new ValueChangeAnimation(abilityTargets.target1, startValue, newValue));
        abilityTargets.target1.value = newValue;
        calculateScore();
        abilityInProgress = false;
        pendingAbilities.shift();
        abilityTargets.target1 = null;
        checkPendingAbilities();

    }
}

function handleBlueAbility(clickedDie) {
    if (!abilityTargets.target1) {
        abilityTargets.target1 = clickedDie;
        abilityTargets.target1.locked = true;
        blueDieLocked = abilityTargets.target1;
        lockedByBlue.push(blueDieLocked);
        abilityInProgress = false;
        pendingAbilities.shift();
        abilityTargets.target1 = null;
        checkPendingAbilities();
    }
}

function handlePurpleAbility(clickedDie) {
if (!abilityTargets.target1 && clickedDie && clickedDie.col !== "purple" && scorePile.includes(clickedDie)) {
        abilityTargets.target1 = clickedDie;
        scorePile.splice(scorePile.indexOf(clickedDie), 1);
        let targetIndex = findPlayPilePosition();
        playPile.push(clickedDie);
        animations.push(new MoveAnimation(clickedDie, clickedDie.x, clickedDie.y, targetIndex, true));
        clickedDie.locked = true;
        returnedByPurple.push(clickedDie);
        calculateScore();
        abilityInProgress = false;
        pendingAbilities.shift();
        abilityTargets.target1 = null;
        checkPendingAbilities();
    }
}

function findPlayPilePosition() {
    let grid = Array(GRID_WIDTH).fill(null).map(() => Array(GRID_WIDTH).fill(false));
    for (let die of playPile) {
        let col = Math.floor((die.x - 100) / 50);
        let row = Math.floor((die.y - 300) / 50);
        if (row >= 0 && row < GRID_WIDTH && col >= 0 && col < GRID_WIDTH) {
            grid[row][col] = true;
        }
    }
    for (let row = 0; row < GRID_WIDTH; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (!grid[row][col]) {
                return row * GRID_WIDTH + col;
            }
        }
    }
    return playPile.length;
}

function handleBlackAbility(clickedDie) {
    if (!abilityTargets.target1) {
        abilityTargets.target1 = clickedDie;
        const startValue = abilityTargets.target1.value;
        const newValue = randomDieValue();
        animations.push(new RollAnimation(abilityTargets.target1, startValue, newValue));
        abilityTargets.target1.value = newValue;
        calculateScore();
        abilityInProgress = false;
        pendingAbilities.shift();
        abilityTargets.target1 = null;
        checkPendingAbilities();
    }
}

function checkPendingAbilities() {
    if (pendingAbilities.length > 0) {
        // If there are pending abilities, start the next one
        abilityType = pendingAbilities[0]; // Now we set the global abilityType

        if(abilityType === "green"){
                // Find a green die in the score pile.
                let greenDie = scorePile.find(die => die.col === "green");
                if(greenDie){
                    startAbility(greenDie);
                } else {
                    //If no green dice found (shouldn't happen) clear the ability
                    pendingAbilities.shift();
                    checkPendingAbilities();
                }
        } else {
            // This section is likely not necessary, as each ability handler
            // should call checkPendingAbilities(), but kept for safety.
              let nextDie = scorePile.slice().reverse().find(die => die.col === abilityType); //Find last die of color
               if(nextDie) {
                    startAbility(nextDie);
               } else {
                    //If no matching die is found
                    pendingAbilities.shift();
                    checkPendingAbilities();
               }
        }

    } else if (playPile.length === 0){
        // If no pending abilities, and play pile is empty, game over
        gameOver = true;
    }
}

function moveDieToScorePile(die) {
    if (lockedByBlue.includes(die)) {
        console.log("This die is locked by blue and cannot be moved yet!");
        return;
    }
    if (die.col === "green") {
        playPile.filter((greenDie) => greenDie.col === "green")
            .forEach((greenDie) => {
                if (playPile.includes(greenDie)) {
                    const scorePileIndex = scorePile.length;
                    animations.push(new MoveAnimation(greenDie, greenDie.x, greenDie.y, scorePileIndex));
                    let greenDieScore = SCORE_MAP[greenDie.value];
                    animations.push(new ScoreAnimation(greenDieScore, greenDie.x + greenDie.s / 2, greenDie.y + greenDie.s / 2));
                    playPile.splice(playPile.indexOf(greenDie), 1);
                    scorePile.push(greenDie);
                }
            });
        calculateScore();
        hasPicked = true;
        selectedDie = null; // Clear selectedDie after Green ability
    } else if (playPile.includes(die)) {
        const scorePileIndex = scorePile.length;
        animations.push(new MoveAnimation(die, die.x, die.y, scorePileIndex));
        let dieScore = SCORE_MAP[die.value];
        if (die.col === "red" && die.redBonus) {
            dieScore *= 2;
        }
        animations.push(new ScoreAnimation(dieScore, die.x + die.s / 2, die.y + die.s / 2));
        playPile.splice(playPile.indexOf(die), 1);
        scorePile.push(die);
        calculateScore();
        hasPicked = true;
        selectedDie = null; // Clear selectedDie after moving a die

    }

}

function calculateScore() {
    score = 0;
    scorePile.forEach((die) => {
        let dieScore = SCORE_MAP[die.value];
        if (die.col === "red" && die.redBonus) {
            dieScore *= 2;
        }
        score += dieScore;
    });
}

function restartGame() {
    score = 0;
    scorePile = [];
    selectedDie = null;
    hasPicked = false;
    seed = generateSeed();
    seededRandom = seededRNG(seed);
    abilityInProgress = false;
    abilityType = null;
    abilityTargets = { target1: null, target2: null };
    orangeDieValue = null;
    blueDieLocked = null;
    lockedByBlue = [];
    animations = [];
    returnedByPurple = [];
    gameOver = false;
    pendingAbilities = []; // Clear pending abilities
    initializeDice();
}

// --- Die and Animation Classes ---

class Die {
    constructor(x, y, s, value, col) {
        this.x = x;
        this.y = y;
        this.s = s;
        this.value = value;
        this.col = col;
        this.locked = false;
        this.redBonus = false;
    }

    display() {
        this.drawOutline();
        fill(this.locked ? "grey" : this.col);
        rect(this.x, this.y, this.s, this.s, 10);
        noStroke();
        fill(["white", "pink", "orange", "yellow"].includes(this.col) ? 0 : 255);
        this.drawPips();
    }

    drawOutline() {
        strokeWeight(selectedDie === this || abilityTargets.target1 === this || abilityTargets.target2 === this ? 5 : 0);
        stroke("brown");
    }

    drawPips() {
        const pipSize = this.s / 5;
        const offset = this.s / 4;
        const center = this.s / 2;
        const pipColor = ["white", "pink", "orange", "yellow"].includes(this.col) ? 0 : 255;
        fill(pipColor);
        const positions = {
            1: [[center, center]],
            2: [[offset, offset], [this.s - offset, this.s - offset]],
            3: [[offset, offset], [center, center], [this.s - offset, this.s - offset]],
            4: [[offset, offset], [this.s - offset, offset], [offset, this.s - offset], [this.s - offset, this.s - offset]],
            5: [[offset, offset], [this.s - offset, offset], [center, center], [offset, this.s - offset], [this.s - offset, this.s - offset]],
            6: [[offset, offset], [this.s - offset, offset], [offset, center], [this.s - offset, center], [offset, this.s - offset], [this.s - offset, this.s - offset]],
        };
        for (const pos of positions[this.value]) {
            ellipse(this.x + pos[0], this.y + pos[1], pipSize, pipSize);
        }
    }

    contains(mx, my) {
        return mx > this.x && mx < this.x + this.s && my > this.y && my < this.y + this.s;
    }
}

class Animation {
    constructor() {
        this.finished = false;
    }
    isFinished() {
        return this.finished;
    }
    update() {}
    draw() {}
}

class MoveAnimation extends Animation {
    constructor(die, startX, startY, targetIndex, isReturning = false) {
        super();
        this.die = die;
        this.startX = startX;
        this.startY = startY;
        this.isReturning = isReturning;
        if (isReturning) {
            this.endX = 100 + (targetIndex % GRID_WIDTH) * 50;
            this.endY = 300 + Math.floor(targetIndex / GRID_WIDTH) * 50;
        } else {
            const rowIndex = Math.floor(targetIndex / SCORE_PILE_ROW_LENGTH);
            const col = targetIndex % SCORE_PILE_ROW_LENGTH;
            this.endX = SCORE_PILE_START.x + col * SCORE_PILE_DIE_OFFSET.x;
            this.endY = SCORE_PILE_START.y + rowIndex * SCORE_PILE_DIE_OFFSET.y;
        }
        this.speed = 5;
    }

    update() {
        const dx = this.endX - this.die.x;
        const dy = this.endY - this.die.y;
        if (Math.abs(dx) < this.speed && Math.abs(dy) < this.speed) {
            this.die.x = this.endX;
            this.die.y = this.endY;
            this.finished = true;
        } else {
            this.die.x += Math.sign(dx) * Math.min(Math.abs(dx), this.speed);
            this.die.y += Math.sign(dy) * Math.min(Math.abs(dy), this.speed);
        }
    }
}

class RollAnimation extends Animation {
    constructor(die, startValue, endValue) {
        super();
        this.die = die;
        this.startValue = startValue;
        this.endValue = endValue;
        this.duration = 20;
        this.timer = 0;
    }

    update() {
        if (++this.timer >= this.duration) {
            this.die.value = this.endValue;
            this.finished = true;
        } else {
            this.die.value = Math.floor(random(1, 7));
        }
    }
}

class SwapAnimation extends Animation {
    constructor(die1, die2) {
        super();
        this.die1 = die1;
        this.die2 = die2;
        this.duration = 30;
        this.timer = 0;
    }

    update() {
        if (++this.timer >= this.duration) {
            this.finished = true;
        }
    }

    draw() {
        stroke("yellow");
        strokeWeight(5);
        noFill();
        rect(this.die1.x, this.die1.y, this.die1.s, this.die1.s, 10);
        rect(this.die2.x, this.die2.y, this.die2.s, this.die2.s, 10);
    }
}

class ValueChangeAnimation extends Animation {
    constructor(die, startValue, endValue) {
        super();
        this.die = die;
        this.startValue = startValue;
        this.endValue = endValue;
        this.duration = 30;
        this.timer = 0;
    }

    update() {
        if (++this.timer >= this.duration) {
            this.finished = true;
        }
    }

    draw() {
        stroke("lime");
        strokeWeight(5);
        noFill();
        rect(this.die.x, this.die.y, this.die.s, this.die.s, 10);
    }
}

class ScoreAnimation extends Animation {
    constructor(value, x, y) {
        super();
        this.value = value;
        this.x = x;
        this.y = y;
        this.opacity = 255;
        this.lifespan = 60;
    }

    update() {
        this.y -= 1;
        this.opacity -= 255 / this.lifespan;
        this.finished = this.opacity <= 0;
    }

    draw() {
        textSize(20);
        fill(255, this.opacity);
        text(`+${this.value}`, this.x - 12.5, this.y);
    }
}
