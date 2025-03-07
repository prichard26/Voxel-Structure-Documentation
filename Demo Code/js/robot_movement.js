const STEP_SIZE = 3.0;  // Global step size

export function goForward() {
    console.log("Moving forward...");
    let movementVector = this.calculateMovementVector();
    this.moveRobot(movementVector);
}

export function goBackward() {
    console.log("Moving backward...");
    this.swapFixedLeg();
    let movementVector = this.calculateMovementVector();    
    this.moveRobot(movementVector);

    this.moveRobot(movementVector, () => {
        this.swapFixedLeg(); 
        resolve(); 
    });
}

export function turnRight() {
    console.log("Turning right...");
    let movementVector = this.calculateRotationVector(Math.PI / 2);
    this.rotateMovingLeg(movementVector);
}

export function turnLeft() {
    console.log("Turning left...");
    let movementVector = this.calculateRotationVector(-Math.PI / 2);
    this.rotateMovingLeg(movementVector);
}

export function moveRobot(movementVector) {
    let steps = 10;
    let delay = 50;

    // ✅ Track if both legs have moved
    if (this.legMoved === undefined) this.legMoved = false;

    let startMovingLeg = this.target.clone();
    let endMovingLeg = startMovingLeg.clone().add(movementVector.clone().multiplyScalar(STEP_SIZE));

    let midPoint = startMovingLeg.clone().lerp(endMovingLeg, 0.5).add(new THREE.Vector3(0, 0, STEP_SIZE / 2));

    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= steps) {
            let t = stepIndex / steps;
            let interpolatedMovingLeg = quadraticBezier(startMovingLeg, midPoint, endMovingLeg, t);

            this.setToTarget(interpolatedMovingLeg.x, interpolatedMovingLeg.y, interpolatedMovingLeg.z);
            this.displayTrajectory();

            stepIndex++;
            setTimeout(step, delay);
        } else {
            this.swapFixedLeg();
            if (!this.legMoved) {
                this.legMoved = true;  // ✅ Now the next call will stop
                this.moveRobot(movementVector);
            } else {
                this.legMoved = false; // ✅ Reset after both legs have moved
            }
        }
    };

    step();
}

export function rotateMovingLeg(rotationVector) {
    let steps = 10;
    let delay = 50;

    let startMovingLeg = this.target.clone();
    let endMovingLeg = startMovingLeg.clone().add(rotationVector.clone().multiplyScalar(STEP_SIZE));

    let stepIndex = 0;

    const step = () => {
        if (stepIndex <= steps) {
            let interpolatedMovingLeg = startMovingLeg.clone().lerp(endMovingLeg, stepIndex / steps);

            this.setToTarget(interpolatedMovingLeg.x, interpolatedMovingLeg.y, interpolatedMovingLeg.z);

            if (this.showTrajectory) this.displayTrajectory();

            stepIndex++;
            setTimeout(step, delay);
        } else {
            this.swapFixedLeg();
        }
    };

    step();
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


function quadraticBezier(p0, p1, p2, t) {
    let pA = p0.clone().lerp(p1, t);
    let pB = p1.clone().lerp(p2, t);
    return pA.clone().lerp(pB, t);
}


// ===================== VISUALIZATION FUNCTION =====================


export function displayTrajectory() {
    if (!this.showTrajectory) return; 

    console.log("Displaying movement trajectory...");
    
    let markerGeometry = new THREE.SphereGeometry(0.1, 10, 10);
    let markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    let marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(this.target);
    this.scene.add(marker);
    this.trajectoryPoints.push(marker);  

    console.log("Trajectory point added at:", this.target);
}

export function clearTrajectory() {
    console.log("Clearing all trajectory points...");
    this.trajectoryPoints.forEach(point => this.scene.remove(point));
    this.trajectoryPoints = [];
}