import * as THREE from "../three/build/three.module.min.js"; 


const STEP_SIZE = 1.0;              // Global step size should match voxel size
const INTERMEDIARY_STEPS = 25;      // number of interpolated point in each movment (reduce for faster simulation)
const DELAY = 10;                   // delay between two movement 

export function goForward(resolve) {
    let movementVector = this.calculateMovementVector();
    let newNormal = this.target.normal.clone(); 

    let startMovingLeg  = this.target.position;
    let startMovingLeg2 = this.origin.position;
    let firstLegEndPosition = startMovingLeg.clone().add(movementVector.clone().multiplyScalar(STEP_SIZE))
                                            .multiplyScalar(10).round().divideScalar(10);
    let secondLegEndPosition = startMovingLeg2.clone().add(movementVector.clone().multiplyScalar(STEP_SIZE))
                                              .multiplyScalar(10).round().divideScalar(10);

    this.moveLegBezier(startMovingLeg, firstLegEndPosition, this.target.normal, newNormal, () => {
        this.swapFixedLeg();
        this.moveLegBezier(startMovingLeg2, secondLegEndPosition, this.origin.normal, newNormal, () => {
            this.swapFixedLeg();
            if (resolve) resolve();
        });
    });
}

export function goBackward(resolve) {
    this.swapFixedLeg();    

    let movementVector = this.calculateMovementVector();
    let newNormal = this.target.normal.clone(); 

    let startMovingLeg  = this.target.position;
    let startMovingLeg2 = this.origin.position;
    let firstLegEndPosition = startMovingLeg.clone().add(movementVector.clone().multiplyScalar(STEP_SIZE))
                                            .multiplyScalar(10).round().divideScalar(10);
    let secondLegEndPosition = startMovingLeg2.clone().add(movementVector.clone().multiplyScalar(STEP_SIZE))
                                            .multiplyScalar(10).round().divideScalar(10);

    this.moveLegBezier(startMovingLeg, firstLegEndPosition, this.target.normal, newNormal, () => {
        this.swapFixedLeg();
    
        this.moveLegBezier(startMovingLeg2, secondLegEndPosition, this.origin.normal, newNormal, () => {
            if (resolve) resolve();
        });
    });
}

export function switchLeg(resolve) {
    this.swapFixedLeg();
    if (resolve) resolve();
}

export function climbUp(resolve) {
    let movementVector = this.calculateMovementVector();
    let newNormal = this.target.normal.clone(); 

    let startMovingLeg  = this.target.position;
    let startMovingLeg2 = this.origin.position;

    let step1 = movementVector.clone().multiplyScalar(1 * STEP_SIZE);                           // Move forward
    let step2 = newNormal.clone().multiplyScalar(1 * STEP_SIZE);                                // Move up 
    let firstLegEndPosition = startMovingLeg.clone().add(step1).add(step2)
                                            .multiplyScalar(10).round().divideScalar(10);       // First leg moves first
    let secondLegEndPosition = startMovingLeg2.clone().add(step1).add(step2)
                                              .multiplyScalar(10).round().divideScalar(10);     // Then second leg moves 

    this.moveLegBezier(startMovingLeg, firstLegEndPosition, this.target.normal, newNormal, () => {
        this.swapFixedLeg();
    
        this.moveLegBezier(startMovingLeg2, secondLegEndPosition, this.origin.normal, newNormal, () => {
            this.swapFixedLeg();
            if (resolve) resolve();
        });
    });
}

export function climbDown(resolve) {
    let movementVector = this.calculateMovementVector();
    let newNormal = this.target.normal.clone(); 

    let startMovingLeg  = this.target.position;
    let startMovingLeg2 = this.origin.position;

    let step1 = movementVector.clone().multiplyScalar(1 * STEP_SIZE);                           // Move forward
    let step2 = newNormal.clone().multiplyScalar(1 * STEP_SIZE);                                // Move down 
    let firstLegEndPosition = startMovingLeg.clone().add(step1).sub(step2)
                                            .multiplyScalar(10).round().divideScalar(10);       // First leg moves first
    let secondLegEndPosition = startMovingLeg2.clone().add(step1).sub(step2)
                                              .multiplyScalar(10).round().divideScalar(10);     // Then second leg moves 

    this.moveLegBezier(startMovingLeg, firstLegEndPosition, this.target.normal, newNormal, () => {
        this.swapFixedLeg();
    
        this.moveLegBezier(startMovingLeg2, secondLegEndPosition, this.origin.normal, newNormal, () => {
            this.swapFixedLeg();
            if (resolve) resolve();
        });
    });
}

export function turnRight(resolve) {
    let movementVector = this.calculateMovementVector();
    let newNormal = this.target.normal.clone(); 
    let rotationVector = new THREE.Vector3().crossVectors(movementVector, newNormal).normalize();
    
    let startMovingLeg  = this.target.position;
    let startMovingLeg2 = this.origin.position;
    let firstLegEndPosition = startMovingLeg.clone()
                                            .add(rotationVector.clone().multiplyScalar(STEP_SIZE))
                                            .multiplyScalar(10).round().divideScalar(10);

    let secondLegEndPosition = startMovingLeg2.clone()
                                              .add(movementVector.clone().multiplyScalar(STEP_SIZE))
                                              .multiplyScalar(10).round().divideScalar(10);
    this.moveLegBezier(startMovingLeg, firstLegEndPosition, this.target.normal, newNormal, () => {
        this.swapFixedLeg();
    
        this.moveLegBezier(startMovingLeg2, secondLegEndPosition, this.origin.normal, newNormal, () => {
            this.swapFixedLeg();
            if (resolve) resolve();
        });
    });
}

export function turnLeft(resolve) {
    let movementVector = this.calculateMovementVector();
    let newNormal = this.target.normal.clone(); 
    let rotationVector = new THREE.Vector3().crossVectors(newNormal,movementVector).normalize();
    
    let startMovingLeg  = this.target.position;
    let startMovingLeg2 = this.origin.position;
    let firstLegEndPosition = startMovingLeg.clone()
                                            .add(rotationVector.clone().multiplyScalar(STEP_SIZE))
                                            .multiplyScalar(10).round().divideScalar(10);
    let secondLegEndPosition = startMovingLeg2.clone()
                                              .add(movementVector.clone().multiplyScalar(STEP_SIZE))
                                              .multiplyScalar(10).round().divideScalar(10);

    this.moveLegBezier(startMovingLeg, firstLegEndPosition, this.target.normal, newNormal, () => {
        this.swapFixedLeg();
    
        this.moveLegBezier(startMovingLeg2, secondLegEndPosition, this.origin.normal, newNormal, () => {
            this.swapFixedLeg();
            if (resolve) resolve();
        });
    });
}

export function planTransitionConvex(resolve) {
    let startMovingLeg = this.target.position.clone();
    let startMovingLeg2 = this.origin.position.clone();

    let movementVector = this.calculateMovementVector();
    let currentNormal = this.origin.normal.clone(); 

     let step1 = movementVector.clone().multiplyScalar(0.5 * STEP_SIZE);        // Move forward
    let step2 = currentNormal.clone().multiplyScalar(1.5 * STEP_SIZE);          // Move up onto new surface
    
     let rotationAxis = new THREE.Vector3().crossVectors(movementVector, currentNormal).normalize();
    let newNormal = currentNormal.clone().applyAxisAngle(rotationAxis, -Math.PI / 2).normalize();
 
    let firstLegPosition = startMovingLeg.clone().add(step1).sub(step2);        // First leg moves onto the wall

    this.interpolateMovement(startMovingLeg, firstLegPosition, currentNormal, newNormal, 'Convex',() => {
        let startMovingLeg = this.target.position.clone();

        this.swapFixedLeg();                                                    // Swap fixed leg after first move
        let step3 = movementVector.clone().multiplyScalar(1.5 * STEP_SIZE);  
        let step4 = currentNormal.clone().multiplyScalar(0.5 * STEP_SIZE);  

        let secondLegPosition = startMovingLeg2.clone().add(step3).sub(step4);  // Second leg moves onto the wall

        this.interpolateMovement(startMovingLeg2, secondLegPosition, currentNormal, newNormal,'ConvexSwap', () => {
            this.swapFixedLeg();                                                // Swap fixed leg after final move
            if (resolve) resolve();
        });
    });
}

export function planTransitionConcave(resolve) {
    let startMovingLeg = this.target.position.clone();
    let startMovingLeg2 = this.origin.position.clone();

    let movementVector = this.calculateMovementVector();
    let currentNormal = this.origin.normal.clone(); 

    let step1 = movementVector.clone().multiplyScalar(0.5 * STEP_SIZE);  
    let step2 = currentNormal.clone().multiplyScalar(1.5 * STEP_SIZE);  
    
    let rotationAxis = new THREE.Vector3().crossVectors(movementVector, currentNormal).normalize();
    let newNormal = currentNormal.clone().applyAxisAngle(rotationAxis, Math.PI / 2).normalize();

    let firstLegPosition = startMovingLeg.clone().add(step1).add(step2);        // First leg moves onto the wall

     this.interpolateMovement(startMovingLeg, firstLegPosition, currentNormal, newNormal, 'Concave',() => {
        this.swapFixedLeg();                                                    // Swap fixed leg after first move
        let step3 = movementVector.clone().multiplyScalar(1.5 * STEP_SIZE); 
        let step4 = currentNormal.clone().multiplyScalar(0.5 * STEP_SIZE);  

        let secondLegPosition = startMovingLeg2.clone().add(step3).add(step4);  // Second leg moves onto the wall

        this.interpolateMovement(startMovingLeg2, secondLegPosition, currentNormal, newNormal,'ConcaveSwap', () => {
            this.swapFixedLeg();                                                // switch leg again
            if (resolve) resolve();
        });
    });
}


export function moveRobot(movementVector, newNormal, resolve = () => {}) { // function to moove forward on a plan 

    if (this.legMoved === undefined) this.legMoved = false;

    let startMovingLeg = this.target.position.clone();
    let endMovingLeg = startMovingLeg.clone().add(movementVector.clone().multiplyScalar(STEP_SIZE))
                                     .multiplyScalar(10).round().divideScalar(10);

    let control1Moving = startMovingLeg.clone().lerp(endMovingLeg, 0.33).add(newNormal.clone().multiplyScalar(STEP_SIZE ));
    let control2Moving = startMovingLeg.clone().lerp(endMovingLeg, 0.66).add(newNormal.clone().multiplyScalar(STEP_SIZE ));

    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {
            let t = stepIndex / INTERMEDIARY_STEPS;
            let interpolatedMovingLeg = cubicBezier(startMovingLeg, control1Moving, control2Moving, endMovingLeg, t);
            
            this.setToTargetIK(interpolatedMovingLeg.x, interpolatedMovingLeg.y, interpolatedMovingLeg.z, newNormal.x, newNormal.y, newNormal.z);
            this.displayTrajectory();

            stepIndex++;
            setTimeout(step, DELAY);
        } else {
            this.setToTargetIK(endMovingLeg.x, endMovingLeg.y, endMovingLeg.z, newNormal.x, newNormal.y, newNormal.z);
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

export function moveLegBezier(startPos, endPos, startNormal, endNormal, resolve = () => {}) {
    let stepIndex = 0;
    let timeoutID;

    // Define Bezier Control Points for a Smooth Arc
    let control1 = startPos.clone().lerp(endPos, 0.33).add(startNormal.clone().multiplyScalar(STEP_SIZE * 0.5));
    let control2 = startPos.clone().lerp(endPos, 0.66).add(endNormal.clone().multiplyScalar(STEP_SIZE * 0.5));

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {

            let t = (1 - Math.cos((stepIndex / INTERMEDIARY_STEPS) * Math.PI)) / 2; 

            let interpolatedPos = cubicBezier(startPos, control1, control2, endPos, t);
            let interpolatedNormal = startNormal.clone().lerp(endNormal, t).normalize();
            this.setToTargetIK(interpolatedPos.x, interpolatedPos.y, interpolatedPos.z, 
                             interpolatedNormal.x, interpolatedNormal.y, interpolatedNormal.z);

            this.displayTrajectory();
            stepIndex++;

            clearTimeout(timeoutID);
            timeoutID = setTimeout(step, DELAY);
        } else { // ensure final pos is reached 
            this.setToTargetIK(endPos.x, endPos.y, endPos.z, endNormal.x, endNormal.y, endNormal.z);
            this.displayTrajectory()

            if (resolve) resolve();
        }
    };
    step();
}


export function interpolateMovement(startPos, endPos, startNormal, endNormal, transitionType, callback) {
    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {

            let t = stepIndex / INTERMEDIARY_STEPS;
            let interpolatedPos = startPos.clone().lerp(endPos, t);
            let interpolatedNormal = startNormal.clone().lerp(endNormal, t).normalize();

            this.setToTargetIK(interpolatedPos.x, interpolatedPos.y, interpolatedPos.z, 
                             interpolatedNormal.x, interpolatedNormal.y, interpolatedNormal.z, transitionType);
            
            this.displayTrajectory()

            stepIndex++;
            setTimeout(step, DELAY);
        } else {
            if (callback) callback();
        }
    };
    step();
}


// ======================== HELPER FUNCTION ========================

export function calculateMovementVector() {
    let movementVector = new THREE.Vector3().subVectors(this.target.position, this.origin.position).normalize();
    movementVector.normalize();
    return movementVector;
}


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
    let markerGeometry = new THREE.SphereGeometry(0.1, 10, 10);
    let markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    let marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(this.target.position);
    this.scene.add(marker);
    this.trajectoryPoints.push(marker);  
}

export function clearTrajectory() {
    this.trajectoryPoints.forEach(point => this.scene.remove(point));
    this.trajectoryPoints = [];
}


// ================= TEST MOVEMENT ( NOT NECESSARY ) ==================

export function halfturn(resolve) {
    let rotationAxis = this.origin.normal.clone();

    this.rotateMovingLeg(rotationAxis, Math.PI, resolve);
}

export function rotateMovingLeg(rotationAxis, angleOffset, resolve = () => {}) {  
    let startMovingLeg = this.target.position.clone();
    let fixedLeg = this.origin.position.clone();

    let relativeStart = startMovingLeg.clone().sub(fixedLeg);   // Vector from fixed to moving leg
    let angleStep = angleOffset / INTERMEDIARY_STEPS;           // Rotation increment per step

    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {
            let angle = stepIndex * angleStep;                                                  // Compute the incremental rotation
            let quaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);      // Rotate around the correct axis
            let rotatedVector = relativeStart.clone().applyQuaternion(quaternion);              // Apply rotation
            let interpolatedMovingLeg = fixedLeg.clone().add(rotatedVector);                    // Compute new moving leg position

            let lift = Math.sin(Math.PI * (stepIndex / INTERMEDIARY_STEPS)) * (STEP_SIZE / 3);
            interpolatedMovingLeg.add(rotationAxis.clone().normalize().multiplyScalar(lift));   // Apply elevation smoothly

            this.setToTargetIK(interpolatedMovingLeg.x, interpolatedMovingLeg.y, interpolatedMovingLeg.z, this.target.normal.x,this.target.normal.y,this.target.normal.z);

            if (this.showTrajectory) this.displayTrajectory();

            stepIndex++;
            setTimeout(step, DELAY);
        } else {
            if (resolve) resolve(); 
        }
    };
    step();
}