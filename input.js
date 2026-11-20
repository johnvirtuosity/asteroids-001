// input.js
const keys = {
  w: false, // Up
  x: false, // Down
  j: false, // Left
  l: false, // Right
  " ": false // Spacebar
};

window.addEventListener("keydown", (e) => {
  // If it's spacebar, use e.key directly, otherwise lowercase it
  const keyName = e.key === " " ? " " : e.key.toLowerCase();
  
  if (keyName in keys) {
    keys[keyName] = true;
    e.preventDefault(); 
  }
});

window.addEventListener("keyup", (e) => {
  const keyName = e.key === " " ? " " : e.key.toLowerCase();
  
  if (keyName in keys) {
    keys[keyName] = false;
  }
});
