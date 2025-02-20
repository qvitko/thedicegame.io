let dicePool = [];
let pickedDice = [];
let colors = ['White', 'Pink', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Brown', 'Black'];
let colorCount = {};

function setup() {
    createCanvas(800, 600);
    textSize(16);
    generateDicePool();
}

function draw() {
    background(220);
    displayDicePool();
    displayPickedDice();
    displayScore();
}

function generateDicePool() {
    dicePool = [];
    colorCount = {};
    while (dicePool.length < 16) {
        let color = random(colors);
        if (!colorCount[color]) colorCount[color] = 0;
        if (colorCount[color] < 4) {
            let value = int(random(1, 7));
            dicePool.push({ color, value, picked: false });
            colorCount[color]++;
        }
    }
}

function displayDicePool() {
    fill(0);
    text("Dice Pool:", 50, 50);
    for (let i = 0; i < dicePool.length; i++) {
        let die = dicePool[i];
        if (!die.picked) {
            fill(die.color);
            rect(50 + i * 50, 70, 40, 40);
            fill(0);
            text(die.value, 65 + i * 50, 95);
        }
    }
}

function displayPickedDice() {
    fill(0);
    text("Picked Dice:", 50, 150);
    for (let i = 0; i < pickedDice.length; i++) {
        let die = pickedDice[i];
        fill(die.color);
        rect(50 + i * 50, 170, 40, 40);
        fill(0);
        text(die.value, 65 + i * 50, 195);
    }
}

function displayScore() {
    let score = pickedDice.reduce((acc, die) => acc + getScore(die.value), 0);
    fill(0);
    text(`Score: ${score}`, 50, 250);
}

function getScore(value) {
    let scoreMap = { 6: 0, 5: 1, 4: 2, 3: 3, 2: 4, 1: 5 };
    return scoreMap[value];
}

function mousePressed() {
    for (let i = 0; i < dicePool.length; i++) {
        let die = dicePool[i];
        if (!die.picked && mouseX > 50 + i * 50 && mouseX < 90 + i * 50 && mouseY > 70 && mouseY < 110) {
            die.picked = true;
            pickedDice.push(die);
            applyAbility(die);
            break;
        }
    }
}

function applyAbility(die) {
    switch (die.color) {
        case 'White':
            // Implement swap logic
            break;
        case 'Pink':
            // Reroll all of a color
            break;
        case 'Red':
            die.value *= 2;
            break;
        case 'Orange':
            // Copy value logic
            break;
        case 'Yellow':
            // Add +1 logic
            break;
        case 'Green':
            // Pick all green
            break;
        case 'Blue':
            // Freeze logic
            break;
        case 'Purple':
            // Return another die
            break;
        case 'Brown':
            // Must pick another brown next
            break;
        case 'Black':
            // Reroll a picked die
            break;
    }
}
