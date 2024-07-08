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
player.position.set(0, 2, 0);
scene.add(player);

// Camera pitch object
const cameraPitch = new THREE.Object3D();
player.add(cameraPitch);
cameraPitch.position.y = 1.5; // Eye level
cameraPitch.add(camera);

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

        // Rotate player (and camera) horizontally
        player.rotation.y -= movementX * 0.002;

        // Rotate camera vertically
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

// Function to create a random color
function getRandomColor() {
    return Math.floor(Math.random()*16777215);
}

// Function to create a block
function createBlock(x, y, z) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: getRandomColor() });
    const block = new THREE.Mesh(geometry, material);
    block.position.set(Math.round(x), Math.round(y), Math.round(z));
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
                createBlock(position.x, position.y, position.z);
            } else if (event.button === 2) { // Right click to remove block
                removeBlock(intersect.object);
            }
        }
    }
});

// Prevent context menu on right-click
document.addEventListener('contextmenu', (event) => event.preventDefault());

// Function to check collision with blocks
function checkBlockCollision(position) {
    const playerMin = new THREE.Vector3(
        position.x - playerSize.x / 2,
        position.y,
        position.z - playerSize.z / 2
    );
    const playerMax = new THREE.Vector3(
        position.x + playerSize.x / 2,
        position.y + playerSize.y,
        position.z + playerSize.z / 2
    );

    for (let i = 0; i < scene.children.length; i++) {
        const object = scene.children[i];
        if (object.isMesh && object !== ground) {
            const box = new THREE.Box3().setFromObject(object);
            if (box.intersectsBox(new THREE.Box3(playerMin, playerMax))) {
                return true;
            }
        }
    }
    return false;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (document.pointerLockElement === renderer.domElement ||
        document.mozPointerLockElement === renderer.domElement ||
        document.webkitPointerLockElement === renderer.domElement) {

        // Reset velocity
        velocity.x = 0;
        velocity.z = 0;

        // Apply movement based on direction
        if (moveForward) {
            velocity.z -= moveSpeed * Math.cos(player.rotation.y);
            velocity.x -= moveSpeed * Math.sin(player.rotation.y);
        }
        if (moveBackward) {
            velocity.z += moveSpeed * Math.cos(player.rotation.y);
            velocity.x += moveSpeed * Math.sin(player.rotation.y);
        }
        if (moveLeft) {
            velocity.x -= moveSpeed * Math.cos(player.rotation.y);
            velocity.z += moveSpeed * Math.sin(player.rotation.y);
        }
        if (moveRight) {
            velocity.x += moveSpeed * Math.cos(player.rotation.y);
            velocity.z -= moveSpeed * Math.sin(player.rotation.y);
        }

        // Apply gravity
        velocity.y -= 9.8 * 0.016; // Simplified gravity

        // Check collisions and move the player
        const newPosition = player.position.clone().add(velocity);
        if (!checkBlockCollision(newPosition)) {
            player.position.copy(newPosition);
        } else {
            velocity.y = 0; // Stop vertical movement if there's a collision
        }

        // Ground check and jump reset
        if (player.position.y < 2) {
            velocity.y = 0;
            player.position.y = 2;
            canJump = true;
        }
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
