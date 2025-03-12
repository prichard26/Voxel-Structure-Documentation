import { goForward, goBackward, turnRight, turnLeft, climbUp, climbDown, planTransitionConcave, planTransitionConvex, moveRobot, rotateMovingLeg, calculateMovementVector, displayTrajectory, clearTrajectory,interpolateMovement, moveLegBezier } from "./robot_movement.js";

export class THREERobot {
    constructor(initialGeometry, limits, origin, target, normal, scene) {
        this.scene = scene;
        this.angles = [0, 0, 0, 0, 0]; 
        this.joints = []; 
        this.robotBones = [];
        this.initialGeometry = initialGeometry;
        this.limits=limits;
        this.leg1 = initialGeometry[1][2];      
        this.leg2 = initialGeometry[2][2]; 
        this.offset = initialGeometry[3][2]; 
        this.fixed_leg = 0;             // can either be 0 or 4 
        this.transitionType = 'None';
        this.lastTransitionType = 'None';
        this.showTrajectory = false;
        this.trajectoryPoints = [];     // For visualization of the movment trajectories

        this.actionQueue = [];          //  Action queue to store movement actions
        this.isExecuting = false;       //  Track if an action is being executed

        this.origin = { 
            position: origin.clone(), 
            normal: normal.clone().normalize() 
        };

        this.target = { 
            position: target.clone(), 
            normal: normal.clone().normalize() 
        };

        this.direction = new THREE.Vector3().subVectors(this.target.position, this.origin.position);

        this.colors = [0xaaaaba,0xbbbbbb,0xbcbcbc,0xcbcbcb,0xcccccc,0x000000];
    
        this.robotGroup = new THREE.Group();
        this.robotGroup.position.copy(origin); 

        this.buildRobot(initialGeometry, limits);
        this.scene.add(this.robotGroup);


        let currentEndEffector = this.robotBones[4].getWorldPosition();
        this.direction = currentEndEffector.clone().sub(this.origin.position).normalize();

        // Ensure `this.direction` is always valid
        if (Math.abs(this.direction.dot(normal) - 1) < 1e-6) {  
            if (this.origin.normal.x > 0.9) this.direction.set(0, 0, -1);
            else if (this.origin.normal.x < -0.9) this.direction.set(0, 0, 1);
            else if (this.origin.normal.y > 0.9) this.direction.set(1, 0, 0);
            else if (this.origin.normal.y < -0.9) this.direction.set(1, 0, 0);
            else if (this.origin.normal.z > 0.9) this.direction.set(1, 0, 0);
            else if (this.origin.normal.z < -0.9) this.direction.set(-1, 0, 0);
        }
        this.updateAnglesFromTarget();

        this.target.position.copy(this.computeEndEffectorPosition());

        this.joints[this.fixed_leg].children[0].material.color.set(0x0000ff);
    }
    
    buildRobot(initialGeometry, limits) {
        let parentObject = this.robotGroup;
    
        let fixedTargetPosition = this.target.position.clone(); 

        let defaultNormal = new THREE.Vector3(0, 0, 1); 
        let rotationQuaternion = new THREE.Quaternion();
        if (!this.origin.normal.equals(defaultNormal)) {
            rotationQuaternion.setFromUnitVectors(defaultNormal, this.origin.normal);
        }
    
        this.robotGroup.quaternion.copy(rotationQuaternion);
    
        let x = 0, y = 0, z = 0;
        for (let i = 0; i < initialGeometry.length; i++) {
            let link = initialGeometry[i];
            let jointLimits = limits[i];
    
            let linkGeo = this.createJointBone(
                x, y, z,
                link[0], link[1], link[2],
                jointLimits[0], jointLimits[1], i
            );
    
            x = link[0];
            y = link[1];
            z = link[2];
    
            parentObject.add(linkGeo);
            parentObject = linkGeo;
            this.robotBones.push(linkGeo);
        }
    

        this.robotGroup.updateMatrixWorld(true);
    
        // ✅ Restore target position AFTER applying rotation
        this.target.position.copy(fixedTargetPosition);
    }
    createJointBone(x, y, z, w, h, d, min, max, jointNumber) {
        // Thickening factor to avoid rendering issues
        const thicken = 1;
        const w_thickened = Math.abs(w) + thicken;
        const h_thickened = Math.abs(h) + thicken;
        const d_thickened = Math.abs(d) + thicken;

        // Create link
        const material = new THREE.MeshLambertMaterial({ color: this.colors[jointNumber] });
        const geometry = new THREE.BoxGeometry(w_thickened, h_thickened, d_thickened);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(w / 2, h / 2, d / 2);

        const group = new THREE.Object3D();
        group.position.set(x, y, z);
        group.add(mesh);

        // Create joint
        const jointGeo1 = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 32, 32, false, -min, 2 * Math.PI - max + min);
        const jointGeoMax = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 32, 32, false, -max, max);
        const jointGeoMin = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 32, 32, false, 0, -min);

        var jointMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const jointMesh1 = new THREE.Mesh(jointGeo1, jointMaterial);
        const jointMeshMax = new THREE.Mesh(jointGeoMax, jointMaterial);
        const jointMeshMin = new THREE.Mesh(jointGeoMin, jointMaterial);

        const joint = new THREE.Group();
        joint.add(jointMeshMax, jointMeshMin, jointMesh1);
        this.joints.push(joint);

        // Set rotation axis based on joint number, this program was made for 5 joints robots where joint 0 and 4 turn around x other around z
        if (jointNumber === 0 || jointNumber === 4) { 
            joint.rotation.x = Math.PI / 2;
        }
        group.add(joint);
        return group;
    }

    updateGeometry(newGeo, limits) {
        let currentAngles = [...this.angles];

        this.scene.remove(this.robotGroup);
        this.robotBones = [];
        this.joints = [];
    
        // Create a new robot group
        this.robotGroup = new THREE.Group();
        this.buildRobot(newGeo, limits);
        this.scene.add(this.robotGroup);
    
        // Restore previous angles
        for (let i = 0; i < currentAngles.length; i++) {
            this.setAngle(i, currentAngles[i]);
        }
        this.joints[this.fixed_leg].children[0].material.color.set(0x0000ff);
    }
    
    setAngles(angles1) {
		this.angles = angles1;
		this.robotBones[0].rotation.z = this.angles[0];
		this.robotBones[1].rotation.y = this.angles[1];
		this.robotBones[2].rotation.y = this.angles[2];
		this.robotBones[3].rotation.y = this.angles[3];
		this.robotBones[4].rotation.z = this.angles[4];
    }
	
    setAngle(index, angle) {
        this.angles[index] = angle;
        this.setAngles(this.angles);
    }
    
    setToTarget(px, py, pz, nx,ny,nz, transitionType = null) {
        // console.log(" EN POS RECEIVED ",px, py, pz, nx,ny,nz)

        this.target.position.set(px, py, pz);
        this.target.normal.set(nx,ny,nz);
        this.transitionType = transitionType;
        this.updateAnglesFromTarget();
        // console.log(" EN POS AFTER SET TO TARGET ",this.robotBones[4].getWorldPosition())
    }
    
    updateAnglesFromTarget() {
        // console.log("origin angleupdate",this.origin)
        // console.log('target angleupdate', this.target)        // ✅ Step 1: Define the Normal and Movement Direction


        let normal = this.origin.normal.clone().normalize();
    
        // ✅ Step 2: Project the Target onto the Plane Defined by `origin.normal`
        let diff = this.target.position.clone().sub(this.origin.position);
        let distanceToPlane = diff.dot(normal);
        let projectedTarget = this.target.position.clone().sub(normal.clone().multiplyScalar(distanceToPlane));
    
        // ✅ Step 3: Compute Rotation Angle θ0 (Yaw Rotation)
        let crossProduct = new THREE.Vector3().crossVectors(this.direction, projectedTarget.clone().sub(this.origin.position).normalize()).dot(normal);
        let dotProduct = this.direction.dot(projectedTarget.clone().sub(this.origin.position).normalize());
        let theta0 = Math.atan2(crossProduct, dotProduct);

        // ✅ Step 3: Compute Rotation Angle θ0 (Yaw Rotation)
        let aAxis = projectedTarget.clone().sub(this.origin.position).normalize();
        let bAxis = normal.clone();
   
        this.setAngle(0, theta0);

        // ✅ Step 4: Convert Target Position to Local Coordinates (A-B Plane)
        let targetPoint = new THREE.Vector2(
            this.target.position.clone().sub(this.origin.position).dot(aAxis),
            this.target.position.clone().sub(this.origin.position).dot(bAxis)
        );
     
        // ✅ Step 5: Compute End-Effector Angle (Corrected)
        let normalA = this.origin.normal.clone().normalize();
        let normalB = this.target.normal.clone().normalize();
        let crossAB = new THREE.Vector3().crossVectors(normalA, normalB);
        let angleEndEffector = Math.acos(normalA.dot(normalB));

        if(this.transitionType == 'Concave' || this.transitionType == "ConcaveSwap" ){angleEndEffector *= -1;}
        
        // ✅ Step 6: Solve IK for the 3R Leg
        let angles = this.ik3R(targetPoint.y, targetPoint.x, this.offset, this.leg1, this.leg2, this.offset, angleEndEffector + Math.PI);
    
        // console.log("Computed Joint Angles:", angles);
    // 
        // ✅ Step 7: Apply the Computed Angles
        this.setAngle(1, angles.theta1);
        this.setAngle(2, angles.theta2);
        this.setAngle(3, angles.theta3);
        if (this.transitionType != 'None')this.lastTransitionType = this.transitionType;
        this.transitionType = 'None';

        this.robotGroup.updateMatrixWorld(true);

        // console.log("New End-Effector Position:", this.robotBones[4].getWorldPosition());
    }

    ik3R(x, y, L0, L1, L2, L3, psi) {
        // console.log("PSY",psi, 'cos :',Math.cos(psi),'sin ', Math.sin(psi))
        let x2, y2;
        // console.log("GOOOAAAAALLL",x,y,psi)

        // Step 1: Compute the intermediate target position (x2, y2) without L3
        if(this.transitionType == 'Convex'){
            x2 = x - L3 * Math.sin(-psi);
            y2 = y - L3 * Math.cos(-psi) + L0; // concave working
            // console.log(`hneighoygoygoyguyguy===============--==-=-==-=-=-=-=-=-=-=-`)
        }
        else if(this.transitionType == 'ConvexSwap'){
            x2 = x - L3 * Math.sin(-psi);
            y2 = y - L3 * Math.cos(psi) + L0; // concave working
            // console.log(`hneighoygoygoyguyguy===============--==-=1454-==-=-=-=-=-=-=-=-`, x2,y2)
        }
        
        else if(this.transitionType == "ConcaveSwap"){
            x2 = x - L3 * Math.sin(psi);
            y2 = y - L3 * Math.cos(-psi) - L0;
        }
        else{
            x2 = x - L3 * Math.sin(psi);
            y2 = y - L3 * Math.cos(psi) - L0; // concave working
        }
        
        
        // console.log('x2 y2', x2, y2)
        // console.log('x y', x, y)
        // console.log(L0,L3)
        // Step 2: Compute distance from origin to (x2, y2)
        let dSquared = x2 ** 2 + y2 ** 2;
    
        // Step 3: Solve for theta2 using the Law of Cosines
        let cosTheta2 = (dSquared - L1 ** 2 - L2 ** 2) / (2 * L1 * L2);
        
        // Ensure cosTheta2 is within valid range for acos to avoid NaN errors
        cosTheta2 = Math.min(1, Math.max(-1, cosTheta2));
    
        let theta2 = Math.acos(cosTheta2);
    
        // Step 4: Solve for theta1
        let theta1 = Math.atan2(y2, x2) - Math.atan2(L2 * Math.sin(theta2), L1 + L2 * Math.cos(theta2));    
    
        // Step 5: Compute theta3
        let theta3 = psi - (theta1 + theta2);
    
        // Return the computed joint angles in radians
        return { theta1, theta2, theta3 };
    }

























    swapFixedLeg() {
        // if (this.target.normal.equals(this.origin.normal)) {
        //     // ✅ If the normals are the same, just swap positions and continue as before.
        //     let oldBasePosition = new THREE.Vector3();
        //     let oldEndPosition = new THREE.Vector3();
    
        //     this.robotBones[0].getWorldPosition(oldBasePosition);
        //     this.robotBones[this.robotBones.length - 1].getWorldPosition(oldEndPosition);
    
        //     const shift = new THREE.Vector3().subVectors(oldEndPosition, oldBasePosition);
        //     this.robotGroup.position.add(shift);
        //     this.robotGroup.updateMatrixWorld(true);
    
        //     let temp = { ...this.origin };
        //     this.origin = {
        //         position: this.target.position.clone().round(),
        //         normal: this.target.normal.clone()
        //     };
    
        //     this.target = {
        //         position: temp.position.clone().round(),
        //         normal: temp.normal.clone()
        //     };
    
        //     this.joints[this.fixed_leg].children[0].material.color.set(0x000000);
        //     this.fixed_leg = this.fixed_leg === 0 ? 4 : 0;
        //     this.joints[0].children[0].material.color.set(0x0000ff);
    
        //     this.updateAnglesFromTarget();
        // } else {
            // Rebuit the robot swaping the fixed and mooving leg.
            this.reinitializeRobot();
        // }
    }
    
    reinitializeRobot() {
        let newOrigin = this.target.position.clone();
        let newOriginNormal = this.target.normal.clone();
        let newTarget = this.origin.position.clone();
        let newTargetNormal = this.origin.normal.clone();


        // console.log('new origin', newOrigin);
        // console.log('new target', newTarget);
        // console.log('new target', newTargetNormal);
        // console.log("🔄 Reinitializing Robot with New Fixed Leg");
        // ✅ Preserve Important Variables
        let savedState = {
            angles: [...this.angles], 
            trajectoryPoints: [...this.trajectoryPoints], 
            actionQueue: [...this.actionQueue], 
            isExecuting: this.isExecuting,
            lastTransitionType : this.lastTransitionType,
            showTrajectory: this.showTrajectory,
            initialGeometry: this.initialGeometry,
            limits: this.limits
        };

        // ✅ Remove current robot from scene
        this.scene.remove(this.robotGroup);

        // // ✅ Remove All Children
        while (this.robotGroup.children.length > 0) {
            let child = this.robotGroup.children.pop();
            this.robotGroup.remove(child);
        }    
        // console.log("origin old", this.origin);
        // console.log('target old', this.target);
        // console.log('fixed leg', this.fixed_leg)
        // // ✅ Reset essential properties
        this.origin = { position: newOrigin.clone(), normal: newOriginNormal.clone() };
        this.target = { position: newTarget.clone(), normal: newTargetNormal.clone() };
        this.fixed_leg = this.fixed_leg === 0 ? 4 : 0;
    
        // console.log("origin new", this.origin);
        // console.log("target new", this.target);
        // console.log('fixed leg', this.fixed_leg)

        // // ✅ Rebuild robot structure
        this.robotGroup = new THREE.Group();
        this.robotGroup.position.copy(this.origin.position);
        this.joints = []; // ✅ Reset joints to avoid keeping old references
        this.joints = []; 
        this.robotBones = [];
        this.transitionType = 'None';

        // ✅ Restore State Variables
        this.angles = savedState.angles;
        this.trajectoryPoints = savedState.trajectoryPoints;
        this.actionQueue = savedState.actionQueue;
        this.isExecuting = savedState.isExecuting;
        // console.log("tTTTT",this.transitionType);
        if(this.lastTransitionType == "Concave"){this.transitionType = "ConcaveSwap"}
        if(this.lastTransitionType == "Convex"){this.transitionType = "ConvexSwap"}

        this.showTrajectory = savedState.showTrajectory;
        this.initialGeometry = savedState.initialGeometry
        this.limits = savedState.limits

        this.buildRobot(this.initialGeometry, this.limits);
        this.scene.add(this.robotGroup);

        let currentEndEffector = this.robotBones[4].getWorldPosition();
        this.direction = currentEndEffector.clone().sub(this.origin.position).normalize();

        let defaultNormal = new THREE.Vector3(0, 0, 1); 
        let rotationQuaternion = new THREE.Quaternion();
        if (!this.origin.normal.equals(defaultNormal)) {
            rotationQuaternion.setFromUnitVectors(defaultNormal, this.origin.normal);
        }
    
        this.robotGroup.quaternion.copy(rotationQuaternion);

        if (Math.abs(this.direction.dot(this.origin.normal) - 1) < 1e-6) {  
            if (this.origin.normal.x > 0.9) this.direction.set(0, 0, -1);
            else if (this.origin.normal.x < -0.9) this.direction.set(0, 0, 1);
            else if (this.origin.normal.y > 0.9) this.direction.set(1, 0, 0);
            else if (this.origin.normal.y < -0.9) this.direction.set(1, 0, 0);
            else if (this.origin.normal.z > 0.9) this.direction.set(1, 0, 0);
            else if (this.origin.normal.z < -0.9) this.direction.set(-1, 0, 0);
        }
    

        console.log(this.joints[0].children[0]);
        this.joints[0].children[0].material.color.set(0x0000ff);
        // console.log("Updated target before reinitialization", this.target);

        // // ✅ Reassign target after building robot to ensure it's correct
        this.target.position.copy(newTarget.clone());
        this.target.normal.copy(newTargetNormal.clone());
    
        // console.log("Updated target after reinitialization", this.target);
    
    
        // console.log('SWAP1', currentEndEffector);
    
        // Ensur
        // console.log("direction after reinitialization", this.direction);
        
        this.updateAnglesFromTarget();
        // let currentEndEffector2 = this.robotBones[4].getWorldPosition();
        // console.log('SWAP2', currentEndEffector2);
    }
    computeEndEffectorPosition() {
        const lastBone = this.robotBones[this.robotBones.length - 1];
        lastBone.updateMatrixWorld(true);
        return lastBone.getWorldPosition(new THREE.Vector3());
    }

    enqueueAction(action) {
        this.actionQueue.push(action);
        if (!this.isExecuting) {
            this.processNextAction();
        }
    }

    async processNextAction() {
        if (this.actionQueue.length === 0) {
            this.isExecuting = false;
            return;
        }
        this.isExecuting = true;
        
        let action = this.actionQueue.shift();
        console.log(`Executing: ${action}`);

        await this.executeAction(action);
        
        this.processNextAction();
    }

    async executeAction(action) {
        return new Promise((resolve) => {
            console.log(`Executing: ${action}`);
    
            if (action === "goForward") this.goForward(resolve);
            else if (action === "goBackward") this.goBackward(resolve);
            else if (action === "turnRight") this.turnRight(resolve);
            else if (action === "turnLeft") this.turnLeft(resolve);
            else if (action === "climbUp") this.climbUp(resolve);
            else if (action === "climbDown") this.climbDown(resolve);
            else if (action === "planTransitionConcave") this.planTransitionConcave(resolve);
            else if (action === "planTransitionConvex") this.planTransitionConvex(resolve);
            else resolve(); 
        });
    }
}

// Attach movement functions dynamically
THREERobot.prototype.goForward = goForward;
THREERobot.prototype.goBackward = goBackward;
THREERobot.prototype.turnRight = turnRight;
THREERobot.prototype.turnLeft = turnLeft;
THREERobot.prototype.planTransitionConcave = planTransitionConcave;
THREERobot.prototype.planTransitionConvex = planTransitionConvex;
THREERobot.prototype.moveRobot = moveRobot;
THREERobot.prototype.calculateMovementVector = calculateMovementVector;
THREERobot.prototype.displayTrajectory = displayTrajectory;
THREERobot.prototype.clearTrajectory = clearTrajectory;
THREERobot.prototype.rotateMovingLeg = rotateMovingLeg;
THREERobot.prototype.moveLegBezier =moveLegBezier;
THREERobot.prototype.climbDown = climbDown;
THREERobot.prototype.climbUp = climbUp;

THREERobot.prototype.interpolateMovement =interpolateMovement;
// The planTransition function will handle the transition between two adjacent surfaces by adjusting the robot’s legs to match the new surface orientation. There are two cases:
// 	1.	Concave Transition:
// 	•	The robot transitions from a surface to another at a 90-degree inward angle.
// 	•	It moves the moving leg first, performing a 90-degree rotation around the vector perpendicular to the two surface normals.
// 	•	The leg is placed two step sizes away on the new surface.
// 	•	The fixed leg is then moved one step size to follow.
// 	2.	Convex Transition:
// 	•	The robot transitions from a surface to another at a 90-degree outward angle.
// 	•	It moves in the direction of the normal to the current surface.
// 	•	The movement is performed around the intersection vector of the current and target surface normals.
// 	•	The leg follows a parabolic path, lifting the robot over the edge smoothly.
// 	•	The fixed leg follows after the moving leg reaches the new surface.
 