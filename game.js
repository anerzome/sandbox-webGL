// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// World generation parameters
const worldWidth = 50;
const worldDepth = 50;
const worldHeight = 20;

// Set up variables for player movement and rotation
const moveSpeed = 0.1;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

const velocity = new THREE.Vector3();
const playerSize = new THREE.Vector3(0.5, 1.8, 0.5); // Player collision box size

// Player object (invisible)
const player = new THREE.Object3D();
scene.add(player);

// Camera pitch object
const cameraPitch = new THREE.Object3D();
player.add(cameraPitch);
cameraPitch.position.y = 1.5; // Eye level
cameraPitch.add(camera);

// Function to create a random color
function getRandomColor() {
    return Math.floor(Math.random() * 16777215);
}

// Function to create a block with a grid
function createBlock(x, y, z, color = getRandomColor()) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));

    const block = new THREE.Mesh(geometry, material);
    block.add(line); // Add grid lines to the block
    block.position.set(x, y, z);
    scene.add(block);
    return block;
}

// Function to remove a block
function removeBlock(block) {
    scene.remove(block);
}

// Function to generate a simple heightmap using Perlin noise
function generateHeightmap(width, depth) {
    const simplex = new SimplexNoise();
    const data = new Float32Array(width * depth);
    for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
            const value = (simplex.noise2D(x / 50, z / 50) + 1) / 2; // Perlin noise value
            data[x + z * width] = Math.floor(value * worldHeight);
        }
    }
    return data;
}

// Function to generate the world
function generateWorld() {
    const heightmap = generateHeightmap(worldWidth, worldDepth);
    for (let x = 0; x < worldWidth; x++) {
        for (let z = 0; z < worldDepth; z++) {
            const height = heightmap[x + z * worldWidth];
            for (let y = 0; y <= height; y++) {
                createBlock(x, y, z, getTerrainColor(y));
            }
        }
    }
    // Set player position after world generation
    player.position.set(worldWidth / 2, worldHeight + 2, worldDepth / 2);
}

// Function to get terrain color based on height
function getTerrainColor(height) {
    if (height < 1) return 0x0000FF; // Water
    if (height < 2) return 0xFFFF00; // Sand
    if (height < 3) return 0x00FF00; // Grass
    if (height < 4) return 0x808080; // Stone
    return 0xFFFFFF; // Snow
}

// Generate the world
generateWorld();

// Set up pointer lock
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

function startGame() {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
    renderer.domElement.requestPointerLock();
}

instructions.addEventListener('click', startGame);

document.addEventListener('pointerlockchange', lockChangeAlert, false);

function lockChangeAlert() {
    if (document.pointerLockElement === renderer.domElement) {
        console.log('Pointer lock active');
        blocker.style.display = 'none';
    } else {
        console.log('Pointer lock inactive');
        blocker.style.display = 'block';
        instructions.style.display = '';
    }
}

// Mouse move event for camera rotation
document.addEventListener('mousemove', onMouseMove, false);

function onMouseMove(event) {
    if (document.pointerLockElement === renderer.domElement) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        player.rotation.y -= movementX * 0.002;
        cameraPitch.rotation.x -= movementY * 0.002;
        cameraPitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraPitch.rotation.x));
    }
}

// Keyboard controls
const onKeyDown = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (canJump === true) velocity.y += 1.5; // Adjusted jump height
            canJump = false;
            break;
    }
};

const onKeyUp = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Set up raycaster for block selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Handle mouse click for placing/removing blocks
document.addEventListener('click', (event) => {
    if (document.pointerLockElement === renderer.domElement) {
        mouse.x = 0;
        mouse.y = 0;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            const intersect = intersects[0];
            if (event.button === 0) { // Left click to place block
                const newBlockPosition = intersect.point.add(intersect.face.normal).floor().addScalar(0.5);
                if (!checkCollision(newBlockPosition)) {
                    createBlock(newBlockPosition.x, newBlockPosition.y, newBlockPosition.z);
                }
            } else if (event.button === 2) { // Right click to remove block
                if (intersect.object !== player) {
                    removeBlock(intersect.object);
                }
            }
        }
    }
});

// Function to check collision with blocks
function checkCollision(position) {
    const min = position.clone().sub(playerSize.clone().multiplyScalar(0.5));
    const max = position.clone().add(playerSize.clone().multiplyScalar(0.5));
    
    const allBlocks = scene.children.filter(child => child.isMesh);
    
    for (let i = 0; i < allBlocks.length; i++) {
        const block = allBlocks[i];
        const blockMin = block.position.clone().subScalar(0.5);
        const blockMax = block.position.clone().addScalar(0.5);
        
        if (min.x < blockMax.x && max.x > blockMin.x &&
            min.y < blockMax.y && max.y > blockMin.y &&
            min.z < blockMax.z && max.z > blockMin.z) {
            return true;
        }
    }
    return false;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (document.pointerLockElement === renderer.domElement) {
        velocity.x -= velocity.x * 10.0 * 0.01;
        velocity.z -= velocity.z * 10.0 * 0.01;
        velocity.y -= 9.8 * 0.01; // gravity

        if (moveForward) velocity.z -= moveSpeed;
        if (moveBackward) velocity.z += moveSpeed;
        if (moveLeft) velocity.x -= moveSpeed;
        if (moveRight) velocity.x += moveSpeed;

        // Determine the direction the player is facing
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion); // Corrected forward direction
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion);

        // Apply movement in the direction the player is facing
        const newPosition = player.position.clone()
            .add(forward.multiplyScalar((velocity.z * moveSpeed)))
            .add(right.multiplyScalar((velocity.x * moveSpeed)))
            .add(new THREE.Vector3(0, velocity.y, 0));

        if (!checkCollision(newPosition)) {
            player.position.copy(newPosition);
        } else {
            velocity.y = Math.max(0, velocity.y); // Stop downward velocity on collision
            canJump = true;
        }

        player.position.y = Math.max(player.position.y, 1.5); // Prevent falling below ground
    }

    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

// Multiplayer Support
const socket = new WebSocket('ws://localhost:8080');

socket.onopen = () => {
    console.log('Connected to server');
};

socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'update') {
        // Handle other players' positions here
    }
};

socket.onclose = () => {
    console.log('Disconnected from server');
};

// Send player's position to the server
function sendPlayerPosition() {
    const playerPosition = {
        type: 'update',
        position: player.position,
        rotation: player.rotation
    };
    socket.send(JSON.stringify(playerPosition));
}

// Send player's position periodically
setInterval(sendPlayerPosition, 100);
