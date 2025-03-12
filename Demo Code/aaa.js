const STEP_SIZE = 3.0;  // Global step size
const INTERMEDIARY_STEPS = 20;
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

export function planTransitionConvex(resolve) {
    let startMovingLeg = this.target.position.clone();
    let movementVector = this.calculateMovementVector();
    let currentNormal = this.origin.normal.clone();

    // ✅ Step 1: Compute step distances
    let step1 = movementVector.clone().multiplyScalar(0.5 * STEP_SIZE); // Move forward
    let step2 = currentNormal.clone().multiplyScalar(1.5 * STEP_SIZE);  // Move down onto new surface

    // ✅ Step 2: Compute new normal (-90° rotation)
    let rotationAxis = new THREE.Vector3().crossVectors(movementVector, currentNormal).normalize();
    let newNormal = currentNormal.clone().applyAxisAngle(rotationAxis, -Math.PI / 2).normalize();

    // ✅ Step 3: Compute intermediary position (before full transition)
    let intermediaryPosition = startMovingLeg.clone().add(step1).sub(step2);

    // ✅ Step 4: Move first leg to intermediary position smoothly
    this.interpolateStep(startMovingLeg, intermediaryPosition, currentNormal, newNormal, 'Convex', () => {
        this.swapFixedLeg(); // ✅ Step 5: Swap fixed leg after first movement

        let startMovingLeg2 = this.target.position.clone();
        let step3 = movementVector.clone().multiplyScalar(1.5 * STEP_SIZE); // Move second leg forward
        let step4 = currentNormal.clone().multiplyScalar(0.5 * STEP_SIZE);  // Move slightly onto new surface

        let secondLegPosition = startMovingLeg2.clone().add(step3).sub(step4);

        // ✅ Step 6: Move second leg to final position
        this.interpolateStep(startMovingLeg2, secondLegPosition, currentNormal, newNormal, 'Convex',() => {
            this.swapFixedLeg(); // ✅ Step 7: Swap fixed leg after final move
            if (resolve) resolve();
        });
    });
}

export function planTransitionConcave(resolve) {
    let startMovingLeg = this.target.position.clone();

    let movementVector = this.calculateMovementVector();
    let currentNormal = this.origin.normal.clone();

    // Step 1: Move to intermediary position
    // Compute step distances
    let step1 = movementVector.clone().multiplyScalar(0.5 * STEP_SIZE);    // Move forward
    let step2 = currentNormal.clone().multiplyScalar(1.5 * STEP_SIZE); // Move onto the new surface

    // Compute perpendicular transition axis (rotation axis)
    let rotationAxis = new THREE.Vector3().crossVectors(movementVector, currentNormal).normalize();
    let quaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, Math.PI / 2);
    let newNormal = currentNormal.clone().applyQuaternion(quaternion).normalize();

    // ✅ Step 1: Move to intermediary position (before transitioning fully)
    let intermediaryPosition = startMovingLeg.clone().add(step1).add(step2);
    // console.log("intermediaryPosition",intermediaryPosition)

    this.setToTarget(intermediaryPosition.x, intermediaryPosition.y, intermediaryPosition.z, 
                     newNormal.x, newNormal.y, newNormal.z, 'Concave');
    setTimeout(() => {
        // Step 2: Swap fixed leg
        this.swapFixedLeg();

        setTimeout(() => {
            let startMovingLeg = this.target.position.clone();

            let step3 = movementVector.clone().multiplyScalar(1.5 * STEP_SIZE);    // Move forward
            let step4 = currentNormal.clone().multiplyScalar(0.5 * STEP_SIZE); // Move onto the new surface
            let intermediaryPosition2 = startMovingLeg.clone().add(step3).add(step4);

            this.setToTarget(intermediaryPosition2.x, intermediaryPosition2.y, intermediaryPosition2.z, 
                newNormal.x, newNormal.y, newNormal.z, 'Concave');

            // Step 3: Move to final position
            this.swapFixedLeg();

            if (resolve) resolve(); // ✅ Ensure resolve is called after the full transition
        }, 100);

    }, 100);
}

export function moveRobot(movementVector, newNormal, resolve = () => {}) {  // Ensure resolve is always defined
    if (this.legMoved === undefined) this.legMoved = false;

    let startMovingLeg = this.target.position.clone();
    let endMovingLeg = startMovingLeg.clone().add(movementVector.clone().multiplyScalar(STEP_SIZE)).round();

    let control1Moving = startMovingLeg.clone().lerp(endMovingLeg, 0.33).add(newNormal.clone().multiplyScalar(STEP_SIZE ));
    let control2Moving = startMovingLeg.clone().lerp(endMovingLeg, 0.66).add(newNormal.clone().multiplyScalar(STEP_SIZE ));

    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {
            let t = stepIndex / INTERMEDIARY_STEPS;
            let interpolatedMovingLeg = cubicBezier(startMovingLeg, control1Moving, control2Moving, endMovingLeg, t);
            
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
                resolve(); 
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

export function planTransition(type, resolve) {
    let movementVector = this.calculateMovementVector();
    let localUp = this.target.normal.clone();  // Normal vector of the surface

    let perpendicular = new THREE.Vector3().crossVectors(movementVector, localUp).normalize();

    if (type === "Concave") {
        console.log("Performing Concave Transition...");

        // Step 1: Rotate the moving leg to the new surface
        this.rotateMovingLeg(Math.PI / 2, () => {
            
            // Step 2: Move the fixed leg onto the new surface
            this.swapFixedLeg();
            this.moveRobot(movementVector.clone().multiplyScalar(1), () => {
                this.swapFixedLeg();  // Restore stepping
                resolve();
            });
        });

    } else if (type === "Convex") {
        console.log("Performing Convex Transition...");

        // Step 1: Move the moving leg over the edge
        let transitionVector = localUp.clone().negate().multiplyScalar(STEP_SIZE);
        this.moveRobot(transitionVector, () => {

            // Step 2: Move the fixed leg onto the new surface after the first leg lands
            this.swapFixedLeg();
            this.moveRobot(movementVector.clone().multiplyScalar(1), () => {
                resolve();
            });
        });
    }
}

export function calculateMovementVector() {
    let movementVector = new THREE.Vector3().subVectors(this.target.position, this.origin.position).normalize();
    movementVector.normalize();
    return movementVector;
}

export function calculateRotationVector(angleOffset) {
    let legVector = this.calculateMovementVector();
    return new THREE.Vector3(
        legVector.x * Math.cos(angleOffset) - legVector.y * Math.sin(angleOffset),
        legVector.x * Math.sin(angleOffset) + legVector.y * Math.cos(angleOffset),
        legVector.z
    );
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

// export function computeLocalUp() {
//     let origin = this.origin.clone();
//     let target = this.target.clone();

//     this.robotGroup.updateMatrixWorld(true);

//     let j2 = new THREE.Vector3;
//     this.robotBones[2].getWorldPosition(j2);

//     let direction = target.clone().sub(origin).normalize();

//     let toJ2 = j2.clone().sub(origin);
//     let projectionLength = toJ2.dot(direction);
//     let projectionPoint = origin.clone().add(direction.clone().multiplyScalar(projectionLength));

//     let localUp = j2.clone().sub(projectionPoint);

//     localUp.x = Math.round(localUp.x);     
//     localUp.y = Math.round(localUp.y);     
//     localUp.z = Math.round(localUp.z);

//     localUp.normalize();
    
//     if (localUp.lengthSq() === 0) {
//         console.warn("⚠️ Local up vector is zero! Using default up direction.");
//         return new THREE.Vector3(0, 0, 1); // Default fallback
//     }
//     return localUp; 
// }

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