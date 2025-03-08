const STEP_SIZE = 3.0;  // Global step size
const INTERMEDIARY_STEPS = 200;
const DELAY = 10;

export function goForward(resolve) {
    console.log("Moving forward...");
    let movementVector = this.calculateMovementVector();
    this.moveRobot(movementVector, resolve);
}

export function goBackward(resolve) {
    console.log("Moving backward...");

    this.swapFixedLeg();        // Swap before moving

    let movementVector = this.calculateMovementVector();
    this.moveRobot(movementVector, () => {
        this.swapFixedLeg();    // Swap again to restore original stepping
        resolve();              //  Notify queue that action is complete
    });
}

export function turnRight(resolve) {
    console.log("Turning right...");
    this.rotateMovingLeg(-Math.PI / 2, resolve);
}

export function turnLeft(resolve) {
    console.log("Turning left...");
    this.rotateMovingLeg(Math.PI / 2, resolve);
}

export function halfturn(resolve) {
    console.log("Turning Half...");
    this.rotateMovingLeg(Math.PI, resolve);
}

export function planTransitionConvex(resolve){
    console.log("Plan Transition Convex...");
    this.planTransition('Convex', resolve)
}

export function planTransitionConcave(resolve){
    console.log("Plan Transition Concave...");
    this.planTransition('Concave', resolve)
}

export function moveRobot(movementVector, resolve) {

    if (this.legMoved === undefined) this.legMoved = false; // Track if both legs have moved 

    let startMovingLeg = this.target.clone();
    let endMovingLeg = startMovingLeg.clone().add(movementVector.clone().multiplyScalar(STEP_SIZE));

    let localUp = this.computeLocalUp();

    let control1Moving = startMovingLeg.clone().lerp(endMovingLeg, 0.33).add(localUp.clone().multiplyScalar(STEP_SIZE / 2));
    let control2Moving = startMovingLeg.clone().lerp(endMovingLeg, 0.66).add(localUp.clone().multiplyScalar(STEP_SIZE / 2));

    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {
            let t = stepIndex / INTERMEDIARY_STEPS;
            let interpolatedMovingLeg = cubicBezier(startMovingLeg, control1Moving, control2Moving, endMovingLeg, t);

            this.setToTarget(interpolatedMovingLeg.x, interpolatedMovingLeg.y, interpolatedMovingLeg.z, false); 

            this.displayTrajectory();
            stepIndex++;
            setTimeout(step, DELAY);
        } else {
            this.setToTarget(endMovingLeg.x, endMovingLeg.y, endMovingLeg.z, true); 

            this.swapFixedLeg();
            if (!this.legMoved) {
                this.legMoved = true;  
                this.moveRobot(movementVector, resolve);
            } else {
                this.legMoved = false;
                resolve();
            }
        }
    };
    step();
}

export function rotateMovingLeg(angleOffset, resolve) {
    let startMovingLeg = this.target.clone();
    let fixedLeg = this.origin.clone();

    // ✅ Compute local UP direction
    let localUp = this.computeLocalUp();

    // ✅ Compute the initial relative position
    let relativeStart = startMovingLeg.clone().sub(fixedLeg); // Vector from fixed to moving leg
    let angleStep = angleOffset / INTERMEDIARY_STEPS; // Rotation increment per step

    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= INTERMEDIARY_STEPS) {
            let angle = stepIndex * angleStep; // Compute the incremental rotation
            let quaternion = new THREE.Quaternion().setFromAxisAngle(localUp, angle); // Rotation quaternion
            let rotatedVector = relativeStart.clone().applyQuaternion(quaternion); // Apply rotation
            let interpolatedMovingLeg = fixedLeg.clone().add(rotatedVector); // Compute new moving leg position

            // ✅ Introduce smooth arc elevation
            let lift = Math.sin(Math.PI * (stepIndex / INTERMEDIARY_STEPS)) * (STEP_SIZE / 3);
            interpolatedMovingLeg.add(localUp.clone().multiplyScalar(lift)); // Apply elevation smoothly

            this.setToTarget(interpolatedMovingLeg.x, interpolatedMovingLeg.y, interpolatedMovingLeg.z, false);

            if (this.showTrajectory) this.displayTrajectory();

            stepIndex++;
            setTimeout(step, DELAY);
        } else {
            resolve();
        }
    };
    step();
}

export function planTransition(type, resolve) {
    let movementVector = this.calculateMovementVector();
    let localUp = this.computeLocalUp();  // Normal vector of the surface

    let perpendicular = new THREE.Vector3().crossVectors(movementVector, localUp).normalize();

    if (type === "Concave") {
        console.log("Performing Concave Transition...");

        // Step 1: Rotate the moving leg to the new surface
        let rotationAxis = perpendicular;
        this.rotateMovingLeg(Math.PI / 2, rotationAxis, () => {
            
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
                this.swapFixedLeg();  // Restore stepping
                resolve();
            });
        });
    }
}
export function calculateMovementVector() {
    let legVector = new THREE.Vector3().subVectors(this.target, this.origin);
    legVector.normalize();
    return legVector;
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

export function computeLocalUp() {
    let origin = this.origin.clone();
    let target = this.target.clone();

    this.robotGroup.updateMatrixWorld(true);

    let j2 = new THREE.Vector3;
    this.robotBones[2].getWorldPosition(j2);

    // ✅ Compute movement direction
    let direction = target.clone().sub(origin).normalize();

    // ✅ Project J2 onto the movement line
    let toJ2 = j2.clone().sub(origin);
    let projectionLength = toJ2.dot(direction);
    let projectionPoint = origin.clone().add(direction.clone().multiplyScalar(projectionLength));

    // ✅ Compute local up direction from projection to J2
    let localUp = j2.clone().sub(projectionPoint);

    
    localUp.x = Math.round(localUp.x);     
    localUp.y = Math.round(localUp.y);     
    localUp.z = Math.round(localUp.z);     

    localUp.normalize();
    console.log(localUp)
    return localUp; 
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