import * as THREE from "../three/build/three.module.min.js";


export async function planPathToCoordinate(goalLegPosition, goalNormal) {
    const STEP_SIZE = 1.0;
    const MAX_ITERATIONS = 5000;
    if (! voxelExists(goalLegPosition)) {   // check if target position exists
        console.warn("❌ Target voxel doesn't exist:", goalLegPosition);
        return { success: false, path: [] };
    }

    const serialize = (pos, normal) => `${pos.x},${pos.y},${pos.z}|${normal.x},${normal.y},${normal.z}`;
    const heuristic = (pos) => {
        let baseDistance = Math.abs(pos.x - goalLegPosition.x) + 
                           Math.abs(pos.y - goalLegPosition.y) + 
                           Math.abs(pos.z - goalLegPosition.z);
        return baseDistance;
    };

    let startLegPosition = this.target.position.clone();
    let startNormal = this.target.normal.clone();
    let startForward = new THREE.Vector3().subVectors(this.target.position, this.origin.position)

    // Adjust height of the robot to match the voxel coordinates
    startLegPosition = startLegPosition.clone().sub(startNormal.clone().multiplyScalar(0.5));

    let openSet = [{                // Set of visited positions
        position: startLegPosition, 
        normal: startNormal.clone(), 
        forward: startForward.clone(),
        path: [] 
    }];
    let visited = new Set();       // nodes to explore next                                                                       
    
    while (openSet.length > 0) { // A* implementation

        // Sort based on heuristic
        openSet.sort((a, b) => (heuristic(a.position) - heuristic(b.position)) + Math.random() * 0.1);
        
        // if current is undifined skip
        let current = openSet.shift();
        if (!current){console.warn("⚠️ current is undefined, skipping node."); continue;}
        
        // if defined add it to visited 
        let currentKey = serialize(current.position, current.normal);
        if (visited.has(currentKey)) continue;
        visited.add(currentKey);

        // Goal Reached Condition
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
                moveVec: current.forward.clone().negate().multiplyScalar(STEP_SIZE),
                newDir: current.forward.clone().negate(),  
                newNorm: current.normal.clone()
            },
            {
                action: "turnRight",
                moveVec: new THREE.Vector3().crossVectors(current.forward, current.normal).normalize().multiplyScalar(STEP_SIZE),
                newDir: new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(),  
                newNorm: current.normal.clone()
            },
            {
                action: "turnLeft",
                moveVec: new THREE.Vector3().crossVectors(current.normal, current.forward).normalize().multiplyScalar(STEP_SIZE),
                newDir: new THREE.Vector3().crossVectors(current.normal, current.forward).normalize(),  
                newNorm: current.normal.clone()
            },
            {
                action: "climbUp",
                moveVec: current.forward.clone().multiplyScalar(STEP_SIZE * 2).add(current.normal.clone().multiplyScalar(STEP_SIZE)), 
                newDir: current.forward.clone(),
                newNorm: current.normal.clone(),
                condition: () => {
                    let secondLegFuturePos = current.position.clone()
                        .add(current.forward.clone().multiplyScalar(STEP_SIZE)
                        .add(current.normal.clone().multiplyScalar(STEP_SIZE)));

                    return voxelExists(secondLegFuturePos);
                }
            },
            {
                action: "climbDown",
                moveVec: current.forward.clone().multiplyScalar(STEP_SIZE * 2).sub(current.normal.clone().multiplyScalar(STEP_SIZE)), 
                newDir: current.forward.clone(),
                newNorm: current.normal.clone(),
                condition: () => {
                    let secondLegFuturePos = current.position.clone()
                        .add(current.forward.clone().multiplyScalar(STEP_SIZE));

                    return !voxelExists(secondLegFuturePos);
                }
            },
            {
                action: "sideStepUpRight",
                moveVec: new THREE.Vector3().crossVectors(current.forward, current.normal).add(current.normal.clone())
                                            .multiplyScalar(STEP_SIZE),
                newDir: current.forward.clone(),
                newNorm: current.normal.clone(),
                condition: () => {
                    let secondLegFuturePos = current.position.clone()
                        .add(current.forward.clone().multiplyScalar(STEP_SIZE));

                    return !voxelExists(secondLegFuturePos);
                }
            },
            {
                action: "sideStepDownRight",
                moveVec: new THREE.Vector3().crossVectors(current.forward, current.normal).sub(current.normal.clone())
                                            .multiplyScalar(STEP_SIZE),
                newDir: current.forward.clone(),
                newNorm: current.normal.clone(),
                condition: () => {
                    let secondLegFuturePos = current.position.clone()
                        .add(current.forward.clone().multiplyScalar(STEP_SIZE));

                    return !voxelExists(secondLegFuturePos);
                }
            },
            {
                action: "sideStepUpLeft",
                moveVec: new THREE.Vector3().crossVectors(current.normal,current.forward).add(current.normal.clone())
                                            .multiplyScalar(STEP_SIZE),
                newDir: current.forward.clone(),
                newNorm: current.normal.clone(),
                condition: () => {
                    let secondLegFuturePos = current.position.clone()
                        .add(current.forward.clone().multiplyScalar(STEP_SIZE));

                    return !voxelExists(secondLegFuturePos);
                }
            },
            {
                action: "sideStepDownLeft",
                moveVec: new THREE.Vector3().crossVectors(current.normal,current.forward).sub(current.normal.clone())
                                            .multiplyScalar(STEP_SIZE),
                newDir: current.forward.clone(),
                newNorm: current.normal.clone(),
                condition: () => {
                    let secondLegFuturePos = current.position.clone()
                        .add(current.forward.clone().multiplyScalar(STEP_SIZE));

                    return !voxelExists(secondLegFuturePos);
                }
            },
                        // {
            //     action: "convexTransition",
            //     moveVec: current.forward.clone().multiplyScalar(1.5 * STEP_SIZE).add(current.normal.clone().multiplyScalar(0.5 * STEP_SIZE)),
            //     newDir: current.forward.clone(),  // ✅ Direction doesn't change
            //     newNorm: current.normal.clone().applyAxisAngle(new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(), -Math.PI / 2)
            // },
            // {
            //     action: "concaveTransition",
            //     moveVec: current.forward.clone().multiplyScalar(1.5 * STEP_SIZE).sub(current.normal.clone().multiplyScalar(0.5 * STEP_SIZE)),
            //     newDir: current.forward.clone(),  // ✅ Direction doesn't change
            //     newNorm: current.normal.clone().applyAxisAngle(new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(), Math.PI / 2)
            // }
        ];

        for (let move of possibleActions) {
            if (move.condition && !move.condition()) continue;

            let neighborPos = current.position.clone().add(move.moveVec);
            let newNormal = move.newNorm.clone();
            let newForward = move.newDir.clone();

            // ✅ Special Check for Vertical Surfaces (Normal = ±100 or ±010)
            if (Math.abs(current.normal.x) === 1 || Math.abs(current.normal.y) === 1) {
                if (!voxelExists(neighborPos, true)) continue;
            } else {
                if (!voxelExists(neighborPos)) continue;
            }

            // Skip if something is blocking above
            let spaceAbove = neighborPos.clone().add(newNormal.clone().multiplyScalar(0.5 * STEP_SIZE));
            if (voxelExists(spaceAbove)){
                // console.log('something blocking above at:', spaceAbove); 
                continue;}

            let secondLegPosition = getValidSecondLegPosition(neighborPos, newNormal, newForward);
            if (!secondLegPosition){
                // console.log('no space second leg'); 
                continue;};

            let newPath = [...current.path, { 
                position: neighborPos.clone(), 
                normal: newNormal.clone(), 
                forward: newForward.clone(),
                action: move.action 
            }];

            openSet.push({ position: neighborPos, normal: newNormal.clone(), forward: newForward.clone(), path: newPath });

            if (newPath.length > MAX_ITERATIONS){console.warn('MAX ITER REACHED');break;} 
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

    // if (isVertical) {
    //     let aboveVoxel = new THREE.Vector3(position.x, position.y, position.z + 0.5);
    //     let belowVoxel = new THREE.Vector3(position.x, position.y, position.z);
    //     return [...window.voxelMap].some(v => v.equals(belowVoxel)) && [...window.voxelMap].some(v => v.equals(aboveVoxel));
    // }
    
    return [...window.voxelMap].some(v => v.equals(position));
}

// ✅ Direct Check for Second Leg Position
function getValidSecondLegPosition(firstLegPosition, normal, forward) {
    const STEP_SIZE = 1.0;

    let secondLegPosition = firstLegPosition.clone().sub(forward.clone().multiplyScalar(STEP_SIZE));

    if (!voxelExists(secondLegPosition)) {
        // console.warn("❌ No voxel found at second leg position:", secondLegPosition);
        return null;
    }

    return secondLegPosition;
}