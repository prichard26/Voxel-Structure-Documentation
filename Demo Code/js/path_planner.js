import * as THREE from "../three/build/three.module.min.js";
// big issue of a* in always trying to inimize the distance, often lock in deadlocks 
const LOG = false;
export async function planPathToCoordinate(goalLegPosition, goalNormal) {
    const STEP_SIZE = 1.0;
    const MAX_ITERATIONS = 50000;

    // ============================== ENSURE GOAL IS VALID ==============================
    if (! voxelExists(goalLegPosition, goalNormal)) {   // check if target position exists
        console.warn("❌ Target voxel doesn't exist:", goalLegPosition);
        return { success: false, path: [] };
    }

    // Ensure there's space for the robot to stand on the goal
    let spaceAboveGoal = goalLegPosition.clone().add(goalNormal.clone().multiplyScalar(STEP_SIZE));
    if (voxelExists(spaceAboveGoal, goalNormal)) {
        console.warn("❌ Space above goal is blocked, cannot move there:", spaceAboveGoal);
        return { success: false, path: [] };
    }

    // ====================================== INIT =======================================

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
    // startLegPosition = startLegPosition.clone().sub(startNormal.clone().multiplyScalar(0.5));

    let openSet = [{                // Set of visited positions
        position: startLegPosition, 
        normal: startNormal.clone(), 
        forward: startForward.clone(),
        path: [] 
    }];
    let visited = new Set();       // nodes to explore next                                                                       
    

    // ==================================== A* LOOP ======================================

    while (openSet.length > 0) { // A* implementation

        // Sort based on heuristic
        openSet.sort((a, b) => (heuristic(a.position) - heuristic(b.position)));
        
        // We here add to our path the best of previous actionn
        // if current is undifined skip (no action possible or target acheived)
        let current = openSet.shift();
        if (!current){
            console.warn(" current is undefined, skipping node.");
             continue;
        }

        if (current.path.length > 0) {
            let lastAction = current.path[current.path.length - 1].action;
            if(LOG)console.log(`🟢 Chosen Action: ${lastAction}, Position: ${current.position.x}, ${current.position.y}, ${current.position.z}`);
        }

        // Add it to visited node to prevent visiting it again
        let currentKey = serialize(current.position, current.normal);
        if (visited.has(currentKey)) continue;
        visited.add(currentKey);

        // Goal Reached Condition
        if (current.position.distanceTo(goalLegPosition) < 0.01 && current.normal.angleTo(goalNormal) < 0.1) {
            if(LOG)console.log("Final Path",current.path);
            return { success: true, path: current.path };
        }
        
        const possibleActions = [
            {
                action: "goForward",
                moveVec: current.forward.clone().multiplyScalar(STEP_SIZE),
                newDir: current.forward.clone(),
                newNorm: current.normal.clone()
            },
            // {
            //     action: "switchLeg",
            //     moveVec: current.forward.clone().negate().multiplyScalar(STEP_SIZE),
            //     newDir: current.forward.clone().negate(),  
            //     newNorm: current.normal.clone()
            // },
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
                    return voxelExists(secondLegFuturePos, current.normal.clone());
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

                    return !voxelExists(secondLegFuturePos, current.normal.clone());
                }
            },
            // {
            //     action: "sideStepUpRight",
            //     moveVec: new THREE.Vector3().crossVectors(current.forward, current.normal).add(current.normal.clone())
            //                                 .multiplyScalar(STEP_SIZE),
            //     newDir: current.forward.clone(),
            //     newNorm: current.normal.clone(),
            //     condition: () => {
            //         let secondLegFuturePos = current.position.clone()
            //             .add(current.forward.clone().multiplyScalar(STEP_SIZE));

            //         return !voxelExists(secondLegFuturePos, current.normal.clone());
            //     }
            // },
            // {
            //     action: "sideStepDownRight",
            //     moveVec: new THREE.Vector3().crossVectors(current.forward, current.normal).sub(current.normal.clone())
            //                                 .multiplyScalar(STEP_SIZE),
            //     newDir: current.forward.clone(),
            //     newNorm: current.normal.clone(),
            //     condition: () => {
            //         let secondLegFuturePos = current.position.clone()
            //             .add(current.forward.clone().multiplyScalar(STEP_SIZE));

            //         return !voxelExists(secondLegFuturePos, current.normal.clone());
            //     }
            // },
            // {
            //     action: "sideStepUpLeft",
            //     moveVec: new THREE.Vector3().crossVectors(current.normal,current.forward).add(current.normal.clone())
            //                                 .multiplyScalar(STEP_SIZE),
            //     newDir: current.forward.clone(),
            //     newNorm: current.normal.clone(),
            //     condition: () => {
            //         let secondLegFuturePos = current.position.clone()
            //             .add(current.forward.clone().multiplyScalar(STEP_SIZE));

            //         return !voxelExists(secondLegFuturePos, current.normal.clone());
            //     }
            // },
            // {
            //     action: "sideStepDownLeft",
            //     moveVec: new THREE.Vector3().crossVectors(current.normal,current.forward).sub(current.normal.clone())
            //                                 .multiplyScalar(STEP_SIZE),
            //     newDir: current.forward.clone(),
            //     newNorm: current.normal.clone(),
            //     condition: () => {
            //         let secondLegFuturePos = current.position.clone()
            //             .add(current.forward.clone().multiplyScalar(STEP_SIZE));

            //         return !voxelExists(secondLegFuturePos, current.normal.clone());
            //     }
            // },
            {
                action: "planTransitionConvex",
                moveVec: current.forward.clone().multiplyScalar(0.5  * STEP_SIZE).sub(current.normal.clone().multiplyScalar(1.5 * STEP_SIZE)),
                newDir: current.forward.clone().applyAxisAngle(new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(), -Math.PI / 2),
                newNorm: current.normal.clone().applyAxisAngle(new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(), -Math.PI / 2),
                condition: () => {
                    let forwardPos = current.position.clone().add(current.forward.clone().multiplyScalar(STEP_SIZE)); // Move forward
                    for (let i = 0.5; i <= 2; i += 0.5) {  // Loop through heights up to 4 blocks high
                        if((current.normal.z === 1 || current.normal.z === -1)&&( i === 0.5 || i === 1.5))continue;
                        let spaceAbove = forwardPos.clone().add(current.normal.clone().multiplyScalar(i * STEP_SIZE));
                    
                        if (voxelExists(spaceAbove, current.normal)) {
                            if(LOG)console.log(`Block detected above back leg at: ${spaceAbove.x}, ${spaceAbove.y}, ${spaceAbove.z}`);
                            return false; 
                        }
                    }
                    return true;
                }
            },
            {
                action: "planTransitionConcave",
                moveVec: current.forward.clone().multiplyScalar(0.5 * STEP_SIZE).add(current.normal.clone().multiplyScalar(1.5 * STEP_SIZE)),
                newDir: current.forward.clone().applyAxisAngle(new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(), Math.PI / 2),  
                newNorm: current.normal.clone().applyAxisAngle(new THREE.Vector3().crossVectors(current.forward, current.normal).normalize(), Math.PI / 2)
            }
        ];

        for (let move of possibleActions) {
            // if(LOG)console.log('move :',move)
            if (move.condition && !move.condition()) continue;

            // Get position after move 
            let neighborPos = current.position.clone().add(move.moveVec);
            let newNormal = move.newNorm.clone();
            let newForward = move.newDir.clone();

            // =============== Check if new position is valid ============
            // (match a voxel position)
            if(!voxelExists(neighborPos, newNormal)){
                if(LOG)console.log('no voxel at new pos');
                continue;
            }
            // (no voxel above 4 blocks to be sure the robot fits)
            let isBlocked = false;
            for (let i = 0.5; i <= 2; i += 0.5) { 
                let spaceAbove = neighborPos.clone().add(newNormal.clone().multiplyScalar(i * STEP_SIZE));
            
                if (voxelExists(spaceAbove, newNormal)) {
                    if(LOG)console.log(`Block detected at: ${spaceAbove.x}, ${spaceAbove.y}, ${spaceAbove.z}`);
                    isBlocked = true;
                    break; // Stop checking if any block is found
                }
            }
            if (isBlocked) continue; 

            // (space for other Leg)
            let secondLegPosition = getValidSecondLegPosition(neighborPos, newNormal, newForward);
            if (!secondLegPosition){
                // if(LOG)console.log('no space second leg'); 
                continue;};

            // Add it to path if doable
            let newPath = [...current.path, { 
                position: neighborPos.clone(), 
                normal: newNormal.clone(), 
                forward: newForward.clone(),
                action: move.action 
            }];
            if(LOG)console.log(`✅ Action added: ${move.action}, Position: ${neighborPos.x}, ${neighborPos.y}, ${neighborPos.z}`);

            openSet.push({ position: neighborPos, normal: newNormal.clone(), forward: newForward.clone(), path: newPath });

            if (newPath.length > MAX_ITERATIONS){console.warn('MAX ITER REACHED');break;} 
        }
    }

    console.warn(" No valid path found.");
    return { success: false, path: [] };
}

// ✅ Improved `voxelExists` for Vertical Surfaces
function voxelExists(position, normal) {
    position.x = Math.round(position.x * 1000) / 1000;
    position.y = Math.round(position.y * 1000) / 1000;
    position.z = Math.round(position.z * 1000) / 1000;

    normal.x = Math.round(normal.x * 1000) / 1000;
    normal.y = Math.round(normal.y * 1000) / 1000;
    normal.z = Math.round(normal.z * 1000) / 1000;    
    
    let positionVoxel = position.clone().sub(normal.clone().multiplyScalar(0.5));

    let normalStr = `${normal.x},${normal.y},${normal.z}`;
    // if(LOG)console.log(normalStr)
    if (normalStr !== "0,0,1" && normalStr !== "0,0,-1") {
        let aboveVoxel = positionVoxel.clone();
        let belowVoxel = positionVoxel.clone().sub(new THREE.Vector3(0, 0, 0.5));
        // if(LOG)console.log("belowVoxel",belowVoxel);
        // if(LOG)console.log("aboveVoxel",aboveVoxel);
        // if(LOG)console.log('Checking below voxel:', belowVoxel);
        return [...window.voxelMap].some(v => v.equals(belowVoxel)) && 
               [...window.voxelMap].some(v => v.equals(aboveVoxel));
    }
    
    return [...window.voxelMap].some(v => v.equals(positionVoxel));
}

// ✅ Direct Check for Second Leg Position
function getValidSecondLegPosition(firstLegPosition, normal, forward) {
    const STEP_SIZE = 1.0;

    let secondLegPosition = firstLegPosition.clone().sub(forward.clone().multiplyScalar(STEP_SIZE));

    if (!voxelExists(secondLegPosition, normal)) {
        console.warn("❌ No voxel found at second leg position:", secondLegPosition);
        return null;
    }
    // Check if there is enough vertical space for the back leg
    for (let i = 0.5; i <= 2; i += 0.5) {  // Loop through heights up to 4 blocks high
        if((normal.z === 1 || normal.z === -1)&&( i === 0.5 || i === 1.5))continue;
        let spaceAbove = secondLegPosition.clone().add(normal.clone().multiplyScalar(i * STEP_SIZE));
    
        if (voxelExists(spaceAbove, normal)) {
            if(LOG)console.log(`Block detected above back leg at: ${spaceAbove.x}, ${spaceAbove.y}, ${spaceAbove.z}`);
            return null; 
        }
    }
    return secondLegPosition;
}