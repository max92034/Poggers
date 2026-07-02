const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const CHARACTERS = [
  {
    id: 'schoolgirl',
    name: 'Aoi',
    primary: '#1a2a4f',
    secondary: '#f5f7fa',
    accent: '#d63031',
    desc: 'School Girl'
  },
  {
    id: 'magicalgirl',
    name: 'Lumina',
    primary: '#ff8fb1',
    secondary: '#b18cff',
    accent: '#ffd166',
    desc: 'Magic Girl'
  },
  {
    id: 'oldersister',
    name: 'Kuroe',
    primary: '#8b1e3f',
    secondary: '#1a1a1a',
    accent: '#c9a14a',
    desc: 'Older Sister'
  }
];

const ACTIONS = ['critical', 'defeat', 'taunt'];

function generatePogTexture(char, outputPath) {
  const size = 512;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = char.primary;
  ctx.fillRect(0, 0, size, size);

  // Circular mask
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 20, 0, Math.PI * 2);
  ctx.clip();

  // Inner circle background
  ctx.fillStyle = char.secondary;
  ctx.fillRect(0, 0, size, size);

  // Decorative circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
  ctx.strokeStyle = char.accent;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Character initial
  ctx.fillStyle = char.primary;
  ctx.font = 'bold 180px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.name[0], size / 2, size / 2);

  // Name below
  ctx.fillStyle = char.accent;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(char.name, size / 2, size / 2 + 140);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

function generatePopup(char, action, outputPath) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = char.primary;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = char.accent;
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Action text
  ctx.fillStyle = char.secondary;
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(action.toUpperCase(), width / 2, height / 3);

  // Character name
  ctx.fillStyle = char.accent;
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText(char.name, width / 2, height / 2);

  // Description
  ctx.fillStyle = char.secondary;
  ctx.font = '40px sans-serif';
  ctx.fillText(char.desc, width / 2, height * 2 / 3);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

const artDir = path.join(__dirname, '..', 'public', 'art');

// Ensure directory exists
if (!fs.existsSync(artDir)) {
  fs.mkdirSync(artDir, { recursive: true });
}

// Generate pog textures and popups for each character
CHARACTERS.forEach(char => {
  // Pog texture
  generatePogTexture(char, path.join(artDir, `${char.id}-pog.png`));

  // Popups
  ACTIONS.forEach(action => {
    generatePopup(char, action, path.join(artDir, `${char.id}-popup-${action}.png`));
  });
});

console.log('\nAll placeholder art generated!');
