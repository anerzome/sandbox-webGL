// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Create a basic ground plane
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2;
scene.add(ground);

// Create a simple cube for the player
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 1, 0);
scene.add(player);

// Set up variables for player movement and rotation
const moveSpeed = 0.1;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

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
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);

function lockChangeAlert() {
    if (document.pointerLockElement === renderer.domElement ||
        document.mozPointerLockElement === renderer.domElement ||
        document.webkitPointerLockElement === renderer.domElement) {
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
        camera.rotation.x -= movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
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
            if (canJump === true) velocity.y += 5;
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

// Function to create a block
function createBlock(x, y, z, color) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const block = new THREE.Mesh(geometry, material);
    block.position.set(x, y, z);
    scene.add(block);
    return block;
}

// Function to remove a block
function removeBlock(block) {
    scene.remove(block);
}

// Set up raycaster for block selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Handle mouse click for placing/removing blocks
document.addEventListener('click', (event) => {
    if (document.pointerLockElement === renderer.domElement) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            if (event.button === 0) { // Left click to place block
                const position = intersect.point.add(intersect.face.normal);
                createBlock(position.x, position.y, position.z, 0xff0000);
            } else if (event.button === 2) { // Right click to remove block
                removeBlock(intersect.object);
            }
        }
    }
});

// Prevent context menu on right-click
document.addEventListener('contextmenu', (event) => event.preventDefault());

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (document.pointerLockElement === renderer.domElement ||
        document.mozPointerLockElement === renderer.domElement ||
        document.webkitPointerLockElement === renderer.domElement) {

        // Reset velocity
        velocity.x = 0;
        velocity.z = 0;

        // Calculate movement direction
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        // Apply movement based on player's rotation
        if (moveForward || moveBackward) {
            velocity.z -= direction.z * moveSpeed;
        }
        if (moveLeft || moveRight) {
            velocity.x -= direction.x * moveSpeed;
        }

        // Rotate velocity vector based on player's y-rotation
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(player.rotation.y);
        velocity.applyMatrix4(rotationMatrix);

        // Apply gravity
        velocity.y -= 9.8 * 0.016; // Simplified gravity

        // Move the player
        player.position.add(velocity);

        // Ground check and jump reset
        if (player.position.y < 1) {
            velocity.y = 0;
            player.position.y = 1;
            canJump = true;
        }

        // Update camera position to match player
        camera.position.copy(player.position);
        camera.position.y += 1.5; // Offset camera above player's head
    }

    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});