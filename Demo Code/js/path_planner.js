import * as THREE from "../three/build/three.module.min.js";


export async function planPathToCoordinate(goalLegPosition, goalNormal) {
    const STEP_SIZE = 1.0;
    const MAX_ITERATIONS = 5000;
    if (! voxelExists(goalLegPosition)) {
        console.warn("❌ Target voxel doesn't exist:", goalLegPosition);
        return { success: false, path: [] };
    }

    const serialize = (pos, normal) => `${pos.x},${pos.y},${pos.z}|${normal.x},${normal.y},${normal.z}`;
    const heuristic = (pos) => pos.distanceTo(goalLegPosition);

    let startLegPosition = this.target.position.clone();
    let startNormal = this.target.normal.clone();
    let startForward = new THREE.Vector3().subVectors(this.target.position, this.origin.position)
    
    startLegPosition = startLegPosition.clone().sub(startNormal.clone().multiplyScalar(0.5));

    let openSet = [{ position: startLegPosition, normal: startNormal, forward: startForward, path: [] }];
    let visited = new Set();
    
    while (openSet.length > 0) {
        // Sort based on heuristic (A* search strategy)
        openSet.sort((a, b) => heuristic(a.position) - heuristic(b.position));
        let current = openSet.shift();
        if (!current){console.warn("⚠️ current is undefined, skipping node."); continue;}
        
        let currentKey = serialize(current.position, current.normal);
        if (visited.has(currentKey)) continue;
        visited.add(currentKey);

        // ✅ Goal Reached Condition
        if (current.position.distanceTo(goalLegPosition) < 0.01 && current.normal.angleTo(goalNormal) < 0.1) {
            return { success: true, path: current.path };
        }
        
        const possibleActions = [
            {
                action: "goForward",
                moveVec: current.forward.clone().multiplyScalar(STEP_SIZE),
                newDir: current.forward.clone(),
                newNorm: current.normal.clone()
            },
            {
                action: "switchLeg",
                moveVec: current.forward.clone().negate(),
                newDir: current.forward.clone().negate(),  
                newNorm: current.normal.clone()
            },
            {
                action: "turnRight",
                moveVec: new THREE.Vector3().crossVectors(current.forward, current.normal).normalize().multiplyScalar(STEP_SIZE),
                newDir: new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(),  // ✅ Rotate Forward
                newNorm: current.normal.clone()
            },
            {
                action: "turnLeft",
                moveVec: new THREE.Vector3().crossVectors(current.normal, current.forward).normalize().multiplyScalar(STEP_SIZE),
                newDir: new THREE.Vector3().crossVectors(current.normal, current.forward).normalize(),  // ✅ Rotate Forward
                newNorm: current.normal.clone()
            },
            {
                action: "climbUp",
                moveVec: current.forward.clone().multiplyScalar(STEP_SIZE).add(current.normal.clone().multiplyScalar(STEP_SIZE)),
                newDir: current.forward.clone(),
                newNorm: current.normal.clone()
            },
            {
                action: "climbDown",
                moveVec: current.forward.clone().multiplyScalar(STEP_SIZE).sub(current.normal.clone().multiplyScalar(STEP_SIZE)),
                newDir: current.forward.clone(),
                newNorm: current.normal.clone()
            },
            {
                action: "convexTransition",
                moveVec: current.forward.clone().multiplyScalar(1.5 * STEP_SIZE).add(current.normal.clone().multiplyScalar(0.5 * STEP_SIZE)),
                newDir: current.forward.clone(),  // ✅ Direction doesn't change
                newNorm: current.normal.clone().applyAxisAngle(new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(), -Math.PI / 2)
            },
            {
                action: "concaveTransition",
                moveVec: current.forward.clone().multiplyScalar(1.5 * STEP_SIZE).sub(current.normal.clone().multiplyScalar(0.5 * STEP_SIZE)),
                newDir: current.forward.clone(),  // ✅ Direction doesn't change
                newNorm: current.normal.clone().applyAxisAngle(new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(), Math.PI / 2)
            }
        ];

        for (let move of possibleActions) {
            let neighborPos = current.position.clone().add(move.moveVec);
            let newNormal = move.newNorm.clone();
            let newForward = move.newDir.clone();

            // ✅ Special Check for Vertical Surfaces (Normal = ±100 or ±010)
            if (Math.abs(current.normal.x) === 1 || Math.abs(current.normal.y) === 1) {
                if (!voxelExists(neighborPos, true)) continue;
            } else {
                if (!voxelExists(neighborPos)) continue;
            }

            let secondLegPosition = getValidSecondLegPosition(neighborPos, newNormal);
            if (!secondLegPosition) continue;

            let newPath = [...current.path, { 
                position: neighborPos.clone(), 
                normal: newNormal.clone(), 
                forward: newForward.clone(),
                action: move.action 
            }];

            openSet.push({ position: neighborPos, normal: newNormal.clone(), forward: newForward.clone(), path: newPath });

            if (newPath.length > MAX_ITERATIONS) break;
        }
    }

    console.warn("❌ No valid path found.");
    return { success: false, path: [] };
}

// ✅ Improved `voxelExists` for Vertical Surfaces
function voxelExists(position, isVertical = false) {
    position.x = Math.round(position.x * 1000) / 1000;
    position.y = Math.round(position.y * 1000) / 1000;
    position.z = Math.round(position.z * 1000) / 1000;

    if (isVertical) {
        let aboveVoxel = new THREE.Vector3(position.x, position.y, position.z + 0.5);
        let belowVoxel = new THREE.Vector3(position.x, position.y, position.z);
        return [...window.voxelMap].some(v => v.equals(belowVoxel)) && [...window.voxelMap].some(v => v.equals(aboveVoxel));
    }
    
    return [...window.voxelMap].some(v => v.equals(position));
}

// ✅ Improved `getValidSecondLegPosition` to Ensure Even `Z`
function getValidSecondLegPosition(firstLegPosition, normal) {
    const STEP_SIZE = 1.0;
    const possibleOffsets = [
        new THREE.Vector3(STEP_SIZE, 0, 0), 
        new THREE.Vector3(-STEP_SIZE, 0, 0),
        new THREE.Vector3(0, STEP_SIZE, 0),
        new THREE.Vector3(0, -STEP_SIZE, 0),
        new THREE.Vector3(0, 0, STEP_SIZE),
        new THREE.Vector3(0, 0, -STEP_SIZE)
    ];

    for (let offset of possibleOffsets) {
        let candidatePos = firstLegPosition.clone().add(offset);

        // ✅ Ensure that Z is even (Pair) before allowing placement
        if (Math.abs(normal.z) === 1 && Math.abs(candidatePos.z * 2) % 2 !== 0) {
            continue;
        }

        if (voxelExists(candidatePos)) {
            return candidatePos;
        }
    }

    console.warn("❌ No valid second leg position found");
    return null;
}