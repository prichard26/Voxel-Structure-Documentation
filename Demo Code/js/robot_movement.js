const STEP_SIZE = 3.0;  // Global step size
const INTERMEDIARY_STEPS = 50;
const DELAY = 10;

export function goForward(resolve) {
    console.log("Moving forward...");      
    let movementVector = this.calculateMovementVector();
    let newNormal = this.target.normal.clone(); 
    this.moveRobot(movementVector, newNormal, () => {
        resolve();  
    });
}

export function goBackward(resolve) {
    console.log("Moving backward...");
    this.swapFixedLeg();    

    let movementVector = this.calculateMovementVector();
    let newNormal = this.target.normal.clone(); 
    this.moveRobot(movementVector, newNormal, () => {
        this.swapFixedLeg();  
        resolve();  
    });
}

export function turnRight(resolve) {
    console.log("Turning right...");
    let rotationAxis = this.origin.normal.clone();
    this.rotateMovingLeg(rotationAxis, -Math.PI / 2, resolve);
}

export function turnLeft(resolve) {
    console.log("Turning left...");
    let rotationAxis = this.origin.normal.clone();
    this.rotateMovingLeg(rotationAxis, Math.PI / 2, resolve);
}

export function halfturn(resolve) {
    console.log("Turning Half...");
    let rotationAxis = this.origin.normal.clone();

    this.rotateMovingLeg(rotationAxis, Math.PI, resolve);
}


// export function planTransitionConvex(resolve) {
//     let startMovingLeg = this.target.position.clone();

//     let movementVector = this.calculateMovementVector();
//     let currentNormal = this.origin.normal.clone();

//     // Step 1: Move to intermediary position
//     // Compute step distances
//     let step1 = movementVector.clone().multiplyScalar(0.5 * STEP_SIZE);    // Move forward
//     let step2 = currentNormal.clone().multiplyScalar(1.5 * STEP_SIZE); // Move onto the new surface

//     // Compute perpendicular transition axis (rotation axis)
//     let rotationAxis = new THREE.Vector3().crossVectors(movementVector, currentNormal).normalize();
//     let quaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, -Math.PI / 2);
//     let newNormal = currentNormal.clone().applyQuaternion(quaternion).normalize();

//     // ✅ Step 1: Move to intermediary position (before transitioning fully)
//     let intermediaryPosition = startMovingLeg.clone().add(step1).sub(step2);

//     this.setToTarget(intermediaryPosition.x, intermediaryPosition.y, intermediaryPosition.z, 
//                      newNormal.x, newNormal.y, newNormal.z, 'Convex');
//     console.log("intermediaryPosition",intermediaryPosition)
//     console.log(" EN POS AFTER SET TO TARGEdddddddT ",this.robotBones[4].getWorldPosition())

//     setTimeout(() => {
//         // Step 2: Swap fixed leg
//         this.swapFixedLeg();

//         setTimeout(() => {
//             let startMovingLeg = this.target.position.clone();

//             let step3 = movementVector.clone().multiplyScalar(1.5 * STEP_SIZE);    // Move forward
//             let step4 = currentNormal.clone().multiplyScalar(0.5 * STEP_SIZE); // Move onto the new surface
//             let intermediaryPosition2 = startMovingLeg.clone().add(step3).sub(step4);

//             this.setToTarget(intermediaryPosition2.x, intermediaryPosition2.y, intermediaryPosition2.z, 
//                 newNormal.x, newNormal.y, newNormal.z, 'Convexswap');

//             // Step 3: Move to final position
//             this.swapFixedLeg();

//             if (resolve) resolve(); // ✅ Ensure resolve is called after the full transition
//         }, 3000);

//     }, 3000);
// }
export function planTransitionConvex(resolve) {
    let startMovingLeg = this.target.position.clone();
    let startMovingLeg2 = this.origin.position.clone();
    console.log('startMovingLeg',startMovingLeg);
    let movementVector = this.calculateMovementVector();
    let currentNormal = this.origin.normal.clone(); 

    // ✅ Compute step distances
    let step1 = movementVector.clone().multiplyScalar(0.5 * STEP_SIZE); // Move forward
    let step2 = currentNormal.clone().multiplyScalar(1.5 * STEP_SIZE);  // Move up onto new surface
    
    // ✅ Compute new normal (90° rotation)
    let rotationAxis = new THREE.Vector3().crossVectors(movementVector, currentNormal).normalize();
    let newNormal = currentNormal.clone().applyAxisAngle(rotationAxis, -Math.PI / 2).normalize();

    // ✅ Define target positions for all movement phases
    let firstLegPosition = startMovingLeg.clone().add(step1).sub(step2);   // First leg moves onto the wall
    console.log('startMovingLeg',startMovingLeg);
    console.log('firstLegPosition',firstLegPosition);
    console.log('currentNormal',currentNormal);
    console.log('newNormal',newNormal);

    // ✅ Step 1: Move first leg to intermediary position (pre-transition)
    this.interpolateMovement(startMovingLeg, firstLegPosition, currentNormal, newNormal, 'Convex',() => {
        let startMovingLeg = this.target.position.clone();

        console.log('startMovingLeg',startMovingLeg);
        console.log('REQL POS',this.robotBones[4].getWorldPosition())

        this.swapFixedLeg(); // ✅ Step 2: Swap fixed leg after first move
        let step3 = movementVector.clone().multiplyScalar(1.5 * STEP_SIZE); // Move second leg forward
        let step4 = currentNormal.clone().multiplyScalar(0.5 * STEP_SIZE);  // Adjust second leg

        let secondLegPosition = startMovingLeg2.clone().add(step3).sub(step4); // Second leg moves onto the wall

        // ✅ Step 3: Move second leg to intermediary position
        this.interpolateMovement(startMovingLeg2, secondLegPosition, currentNormal, newNormal,'ConvexSwap', () => {
            this.swapFixedLeg(); // ✅ Step 4: Swap fixed leg after final move
            if (resolve) resolve();
        });
    });
}

export function planTransitionConcave(resolve) {
    let startMovingLeg = this.target.position.clone();
    let startMovingLeg2 = this.origin.position.clone();

    let movementVector = this.calculateMovementVector();
    let currentNormal = this.origin.normal.clone(); 

    // ✅ Compute step distances
    let step1 = movementVector.clone().multiplyScalar(0.5 * STEP_SIZE); // Move forward
    let step2 = currentNormal.clone().multiplyScalar(1.5 * STEP_SIZE);  // Move up onto new surface
    
    // ✅ Compute new normal (90° rotation)
    let rotationAxis = new THREE.Vector3().crossVectors(movementVector, currentNormal).normalize();
    let newNormal = currentNormal.clone().applyAxisAngle(rotationAxis, Math.PI / 2).normalize();

    // ✅ Define target positions for all movement phases
    let firstLegPosition = startMovingLeg.clone().add(step1).add(step2);   // First leg moves onto the wall

    // ✅ Step 1: Move first leg to intermediary position (pre-transition)
    this.interpolateMovement(startMovingLeg, firstLegPosition, currentNormal, newNormal, 'Concave',() => {
        this.swapFixedLeg(); // ✅ Step 2: Swap fixed leg after first move
        let step3 = movementVector.clone().multiplyScalar(1.5 * STEP_SIZE); // Move second leg forward
        let step4 = currentNormal.clone().multiplyScalar(0.5 * STEP_SIZE);  // Adjust second leg

        let secondLegPosition = startMovingLeg2.clone().add(step3).add(step4); // Second leg moves onto the wall

        // ✅ Step 3: Move second leg to intermediary position
        this.interpolateMovement(startMovingLeg2, secondLegPosition, currentNormal, newNormal,'ConcaveSwap', () => {
            this.swapFixedLeg(); // ✅ Step 4: Swap fixed leg after final move
            if (resolve) resolve();
        });
    });
}

export function interpolateMovement(startPos, endPos, startNormal, endNormal, transitionType, callback) {
    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {
            let t = stepIndex / INTERMEDIARY_STEPS;
            console.log('REQL POS',this.robotBones[4].getWorldPosition())
            // ✅ Interpolate position
            let interpolatedPos = startPos.clone().lerp(endPos, t);
            console.log(`interpolatedPos`,interpolatedPos)
            // ✅ Interpolate normal (smooth transition)
            let interpolatedNormal = startNormal.clone().lerp(endNormal, t).normalize();

            this.setToTarget(interpolatedPos.x, interpolatedPos.y, interpolatedPos.z, 
                             interpolatedNormal.x, interpolatedNormal.y, interpolatedNormal.z, transitionType);

            stepIndex++;
            setTimeout(step, DELAY);
        } else {
            if (callback) callback();
        }
    };
    step();
}

export function moveRobot(movementVector, newNormal, resolve = () => {}) {  // Ensure resolve is always defined
    if (this.legMoved === undefined) this.legMoved = false;

    let startMovingLeg = this.target.position.clone();
    console.log('startmovingleg',startMovingLeg);
    let endMovingLeg = startMovingLeg.clone().add(movementVector.clone().multiplyScalar(STEP_SIZE)).round();
    console.log('endmovingleg',endMovingLeg);

    let control1Moving = startMovingLeg.clone().lerp(endMovingLeg, 0.33).add(newNormal.clone().multiplyScalar(STEP_SIZE ));
    let control2Moving = startMovingLeg.clone().lerp(endMovingLeg, 0.66).add(newNormal.clone().multiplyScalar(STEP_SIZE ));
    console.log('control1Moving',control1Moving);
    console.log('control2Moving',control2Moving);

    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {
            let t = stepIndex / INTERMEDIARY_STEPS;
            let interpolatedMovingLeg = cubicBezier(startMovingLeg, control1Moving, control2Moving, endMovingLeg, t);
            // console.log('interpolatedMovingLeg',interpolatedMovingLeg);
            
            this.setToTarget(interpolatedMovingLeg.x, interpolatedMovingLeg.y, interpolatedMovingLeg.z, newNormal.x, newNormal.y, newNormal.z);
            this.displayTrajectory();

            stepIndex++;
            setTimeout(step, DELAY);
        } else {
            this.setToTarget(endMovingLeg.x, endMovingLeg.y, endMovingLeg.z, newNormal.x, newNormal.y, newNormal.z);
            this.swapFixedLeg();
            if (!this.legMoved) {
                this.legMoved = true;
                this.moveRobot(movementVector, newNormal, resolve);
            } else {
                this.legMoved = false;
                if (resolve) resolve(); 
            }
        }
    };
    step();
}


export function rotateMovingLeg(rotationAxis, angleOffset, resolve = () => {}) {  
    let startMovingLeg = this.target.position.clone();
    let fixedLeg = this.origin.position.clone();

    // ✅ Compute the initial relative position
    let relativeStart = startMovingLeg.clone().sub(fixedLeg); // Vector from fixed to moving leg
    let angleStep = angleOffset / INTERMEDIARY_STEPS; // Rotation increment per step

    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {
            let angle = stepIndex * angleStep; // Compute the incremental rotation
            let quaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle); // Rotate around the correct axis
            let rotatedVector = relativeStart.clone().applyQuaternion(quaternion); // Apply rotation
            let interpolatedMovingLeg = fixedLeg.clone().add(rotatedVector); // Compute new moving leg position

            // ✅ Introduce smooth arc elevation
            let lift = Math.sin(Math.PI * (stepIndex / INTERMEDIARY_STEPS)) * (STEP_SIZE / 3);
            interpolatedMovingLeg.add(rotationAxis.clone().normalize().multiplyScalar(lift)); // Apply elevation smoothly

            this.setToTarget(interpolatedMovingLeg.x, interpolatedMovingLeg.y, interpolatedMovingLeg.z, this.target.normal.x,this.target.normal.y,this.target.normal.z);

            if (this.showTrajectory) this.displayTrajectory();

            stepIndex++;
            setTimeout(step, DELAY);
        } else {
            if (resolve) resolve(); // ✅ Ensure resolve is called safely
        }
    };
    step();
}

export function calculateMovementVector() {
    let movementVector = new THREE.Vector3().subVectors(this.target.position, this.origin.position).normalize();
    movementVector.normalize();
    return movementVector;
}



// ======================== HELPER FUNCTION ========================

function cubicBezier(p0, p1, p2, p3, t) {
    let pA = p0.clone().lerp(p1, t);
    let pB = p1.clone().lerp(p2, t);
    let pC = p2.clone().lerp(p3, t);
    let pD = pA.clone().lerp(pB, t);
    let pE = pB.clone().lerp(pC, t);
    return pD.clone().lerp(pE, t);
}

// ===================== VISUALIZATION FUNCTION =====================


export function displayTrajectory() {
    if (!this.showTrajectory) return; 

    // console.log("Displaying movement trajectory...");
    
    let markerGeometry = new THREE.SphereGeometry(0.1, 10, 10);
    let markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    let marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(this.target);
    this.scene.add(marker);
    this.trajectoryPoints.push(marker);  

    // console.log("Trajectory point added at:", this.target);
}

export function clearTrajectory() {
    // console.log("Clearing all trajectory points...");
    this.trajectoryPoints.forEach(point => this.scene.remove(point));
    this.trajectoryPoints = [];
}