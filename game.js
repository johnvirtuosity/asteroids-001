// game.js
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- AUTOMATIC FULLSCREEN RESIZER ---
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// --- ASSET LOADING ---
const backgroundImg = new Image();
backgroundImg.src = "background.png"; 

// Base Class
class Entity {
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.isDead = false;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// Particle Class
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 4 + 2;
    this.color = color;
    this.isDead = false;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 150 + 50;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.decay = Math.random() * 1.5 + 1.5;
  }
  update(deltaTime) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.alpha -= this.decay * deltaTime;
    if (this.alpha <= 0) this.isDead = true;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.restore();
  }
}

// Bullet / Missile Class
class Bullet extends Entity {
  constructor(x, y) {
    super(x, y, 16, 6, "#ffff00"); // Slightly thicker missile look
    this.speed = 700;
  }
  update(deltaTime) {
    this.x += this.speed * deltaTime;
    if (this.x > canvas.width) this.isDead = true;
  }
  draw() {
    // Draw missile body
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw red warhead tip
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(this.x + this.width - 4, this.y, 4, this.height);
  }
}

// Player Class (Updated with Cannon Barrel)
class Player extends Entity {
  constructor(x, y, gameEngine) {
    super(x, y, 40, 40, "#00ffcc"); 
    this.speed = 450;
    this.game = gameEngine;
    this.shootCooldown = 0;

    // Cannon barrel dimensions
    this.barrelLength = 18;
    this.barrelHeight = 10;
  }

  update(deltaTime) {
    if (keys.j) this.x -= this.speed * deltaTime; 
    if (keys.l) this.x += this.speed * deltaTime; 
    if (keys.w) this.y -= this.speed * deltaTime; 
    if (keys.x) this.y += this.speed * deltaTime; 

    // Boundaries (includes barrelLength on the right edge so it stays on-screen)
    if (this.x < 0) this.x = 0;
    if (this.x > canvas.width - this.width - this.barrelLength) {
      this.x = canvas.width - this.width - this.barrelLength;
    }
    if (this.y < 0) this.y = 0;
    if (this.y > canvas.height - this.height) {
      this.y = canvas.height - this.height;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }

    if (keys[" "] && this.shootCooldown <= 0) {
      // Launch missile directly from the tip of the cannon barrel
      const bulletX = this.x + this.width + this.barrelLength;
      const bulletY = this.y + (this.height / 2) - 3; // Centered vertically with the barrel
      this.game.bullets.push(new Bullet(bulletX, bulletY));
      this.shootCooldown = 0.20;
    }
  }

  draw() {
    // 1. Draw the main teal player block
    super.draw();

    // 2. Draw the cannon barrel extending from the front (right side)
    const barrelX = this.x + this.width;
    const barrelY = this.y + (this.height / 2) - (this.barrelHeight / 2);

    ctx.fillStyle = "#8899a6"; // Metallic grey barrel
    ctx.fillRect(barrelX, barrelY, this.barrelLength, this.barrelHeight);

    // 3. Draw a darker muzzle tip on the end of the barrel
    ctx.fillStyle = "#4a5568";
    ctx.fillRect(barrelX + this.barrelLength - 4, barrelY - 1, 4, this.barrelHeight + 2);
  }
}

// Asteroid Sphere Class
class Asteroid {
  constructor() {
    this.radius = Math.random() * 22 + 14;
    this.x = canvas.width + this.radius + 20; 
    this.y = Math.random() * (canvas.height - this.radius * 2) + this.radius; 
    this.speed = Math.random() * 250 + 150;
    this.isDead = false;
  }

  update(deltaTime) {
    this.x -= this.speed * deltaTime;
    if (this.x < -this.radius) {
      this.isDead = true;
    }
  }

  draw() {
    ctx.save();

    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.35, 
      this.y - this.radius * 0.35, 
      this.radius * 0.1,
      this.x, 
      this.y, 
      this.radius
    );
    gradient.addColorStop(0, "#b8b0a8");
    gradient.addColorStop(0.5, "#6e655f");
    gradient.addColorStop(1, "#262220");

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      this.x + this.radius * 0.25, 
      this.y + this.radius * 0.2, 
      this.radius * 0.22, 
      0, 
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fill();

    ctx.restore();
  }
}

// Main Game Manager
class GameEngine {
  constructor() {
    this.player = new Player(100, window.innerHeight / 2 - 20, this); 
    this.asteroids = [];
    this.bullets = []; 
    this.particles = []; 
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    this.score = 0;
    this.isGameOver = false;
  }

  init() {
    requestAnimationFrame((ts) => this.loop(ts));
  }

  checkCircleRectCollision(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;

    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    return distanceSquared < (circle.radius * circle.radius);
  }

  createExplosion(x, y, color) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  loop(timestamp) {
    if (this.isGameOver) return;
    const deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundImg.complete && backgroundImg.naturalWidth !== 0) {
      ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    this.spawnTimer += deltaTime;
    if (this.spawnTimer > 0.2) {
      this.asteroids.push(new Asteroid());
      this.spawnTimer = 0;
    }

    this.player.update(deltaTime);
    this.player.draw();

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update(deltaTime);
      bullet.draw();
      if (bullet.isDead) this.bullets.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaTime);
      particle.draw();
      if (particle.isDead) this.particles.splice(i, 1);
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      asteroid.update(deltaTime);
      asteroid.draw();

      if (this.checkCircleRectCollision(asteroid, this.player)) {
        this.createExplosion(this.player.x + 20, this.player.y + 20, "#ffaa00");
        this.isGameOver = true;
        this.drawGameOver();
      }

      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const bullet = this.bullets[j];
        if (this.checkCircleRectCollision(asteroid, bullet)) {
          this.createExplosion(asteroid.x, asteroid.y, "#8c827a");
          asteroid.isDead = true;
          bullet.isDead = true;
          this.score += 10; 
          this.bullets.splice(j, 1);
          break; 
        }
      }

      if (asteroid.isDead) this.asteroids.splice(i, 1);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "22px Arial";
    ctx.fillText(`Score: ${this.score}`, 20, window.innerHeight - 30);

    requestAnimationFrame((ts) => this.loop(ts));
  }

  drawGameOver() {
    setTimeout(() => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff4444";
      ctx.font = "48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "24px sans-serif";
      ctx.fillText(`Final Score: ${this.score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.fillText("Refresh the page to try again", canvas.width / 2, canvas.height / 2 + 75);
    }, 100);
  }
}

// Start Game
const game = new GameEngine();
game.init();
