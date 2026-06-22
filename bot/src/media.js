const fs = require('fs');
const path = require('path');

const MEDIA_DIR = path.join(__dirname, '../media/memes');

function getRandomMeme() {
    if (!fs.existsSync(MEDIA_DIR)) return null;
    
    const files = fs.readdirSync(MEDIA_DIR).filter(f =>
        /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
    );
    
    if (files.length === 0) return null;
    
    const random = files[Math.floor(Math.random() * files.length)];
    return path.join(MEDIA_DIR, random);
}

module.exports = { getRandomMeme };