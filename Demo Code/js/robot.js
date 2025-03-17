
import * as THREE from "../three/build/three.module.min.js"; 

import {goForward, goBackward, switchLeg, turnRight, turnLeft, climbUp, climbDown, planTransitionConcave, 
        planTransitionConvex, moveRobot, rotateMovingLeg, calculateMovementVector, displayTrajectory, 
        clearTrajectory,interpolateMovement, moveLegBezier,
        sideStepUpRight, sideStepDownRight, sideStepUpLeft, sideStepDownLeft } from "./robot_movement.js";

import { planPathToCoordinate } from './path_planner.js';

const DEFAULT_GEO = [[0,0,1.25], [0,0,2], [0,0,2], [0,0,1.25], [0,0,0]]
const DEFAULT_LIMITS = [
                        [-2*Math.PI, 2*Math.PI],
                        [2*Math.PI, 2*Math.PI],
                        [2*Math.PI, 2*Math.PI],
                        [2*Math.PI, 2*Math.PI],
                        [2*Math.PI, 2*Math.PI]
                        ]

export class THREERobot{
    constructor(origin, target, normal, scene, initialGeometry = DEFAULT_GEO , limits = DEFAULT_LIMITS) {
        this.scene = scene;
        this.angles = [0, 0, 0, 0, 0]; 
        this.joints = [];                           // Contains the angle of each joint
        this.robotBones = [];                       // Contains the Three.js element of the link in the simulation
        this.initialGeometry = initialGeometry;     
        this.limits = limits;                       
        this.leg1 = initialGeometry[1][2];          
        this.leg2 = initialGeometry[2][2];          
        this.offset = initialGeometry[3][2];        // Both first qnd last link
        this.fixed_leg = 0;                         // Can either be 0 or 4 
        this.transitionType = 'None';               // Used for plan transition of the robot
        this.lastTransitionType = 'None';           // Keep track of last transition that is not None
        
        this.showTrajectory = false;                // For visualization of the movment trajectories
        this.trajectoryPoints = [];    

        this.actionQueue = [];                      //  Action queue to store movement actions
        this.isExecuting = false;                   //  Track if an action is being executed

        this.origin = {                             // Position and normal vector of the target (fixed leg)
            position: origin.clone(), 
            normal: normal.clone().normalize() 
        };

        this.target = {                             // Position and normal vector of the target (moving leg)
            position: target.clone(), 
            normal: normal.clone().normalize() 
        };

        // Direction from origin to target
        this.direction = new THREE.Vector3().subVectors(this.target.position, this.origin.position);

        this.colors = [0xffffff,0xffffff,0xffffff,0xffffff,0xffffff,0xffffff];
    
        this.robotGroup = new THREE.Group();        // Three.js group containing the robot
        this.robotGroup.position.copy(origin);      

        this.buildRobot(initialGeometry, limits);   // Build the robot and add it to the group
        this.scene.add(this.robotGroup);            // Add it to the scene
        this.robotGroup.updateMatrixWorld(true);    // Forces a world matrix update

        let currentEndEffector = new THREE.Vector3();
        this.robotBones[4].getWorldPosition(currentEndEffector);
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
        this.updateAnglesFromTarget();              // Find and apply the angle needed to reach target

        this.target.position.copy(this.computeEndEffectorPosition());
        this.joints[this.fixed_leg].children[0].material.color.set(0xff00ff); // Change fixed leg color
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
        this.target.position.copy(fixedTargetPosition);
    }

    createJointBone(x, y, z, w, h, d, min, max, jointNumber) {
        // Thickening factor to avoid rendering issues
        const thicken = 0.5;
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
        const jointGeo1 = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16, 16, false, -min, 2 * Math.PI - max + min);
        const jointGeoMax = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16, 16, false, -max, max);
        const jointGeoMin = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16, 16, false, 0, -min);

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
        this.joints[this.fixed_leg].children[0].material.color.set(0xff00ff);
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
    
    setToTargetIK(px, py, pz, nx,ny,nz, transitionType = null) {
        this.target.position.set(px, py, pz);
        this.target.normal.set(nx,ny,nz);
        this.transitionType = transitionType;
        this.updateAnglesFromTarget();
    }
    
    updateAnglesFromTarget() {
        let normal = this.origin.normal.clone().normalize();
    
        // Project the Target onto the Plane Defined by `origin.normal`
        let diff = this.target.position.clone().sub(this.origin.position);
        let distanceToPlane = diff.dot(normal);
        let projectedTarget = this.target.position.clone().sub(normal.clone().multiplyScalar(distanceToPlane));

        // Compute Rotation Angle θ0 (Yaw Rotation)
        let crossProduct = new THREE.Vector3().crossVectors(this.direction, projectedTarget.clone().sub(this.origin.position).normalize()).dot(normal);
        let dotProduct = this.direction.dot(projectedTarget.clone().sub(this.origin.position).normalize());
        let theta0 = Math.atan2(crossProduct, dotProduct);

        // Compute Rotation Angle θ0 (Yaw Rotation)
        let aAxis = projectedTarget.clone().sub(this.origin.position).normalize();
        let bAxis = normal.clone();
   
        this.setAngle(0, theta0);

        // Convert Target Position to Local Coordinates (A-B Plane)
        let targetPoint = new THREE.Vector2(
            this.target.position.clone().sub(this.origin.position).dot(aAxis),
            this.target.position.clone().sub(this.origin.position).dot(bAxis)
        );
     
        // Compute End-Effector Angle (Corrected)
        let normalA = this.origin.normal.clone().normalize();
        let normalB = this.target.normal.clone().normalize();
        let crossAB = new THREE.Vector3().crossVectors(normalA, normalB);
        let angleEndEffector = Math.acos(normalA.dot(normalB));

        if(this.transitionType == 'Concave' || this.transitionType == "ConcaveSwap" ){angleEndEffector *= -1;}
        
        // Solve IK for the 3R Leg
        let angles = this.ik3R(targetPoint.y, targetPoint.x, this.offset, this.leg1, this.leg2, this.offset, angleEndEffector + Math.PI);
    
        // Apply the Computed Angles
        this.setAngle(1, angles.theta1);
        this.setAngle(2, angles.theta2);
        this.setAngle(3, angles.theta3);
        if (this.transitionType != 'None')this.lastTransitionType = this.transitionType;
        this.transitionType = 'None';

        this.robotGroup.updateMatrixWorld(true);
    }

    ik3R(x, y, L0, L1, L2, L3, psi) {
        let x2, y2;

        if(this.transitionType == 'Convex'){
            x2 = x - L3 * Math.sin(-psi);
            y2 = y - L3 * Math.cos(-psi) + L0; 
        }
        else if(this.transitionType == 'ConvexSwap'){
            x2 = x - L3 * Math.sin(-psi);
            y2 = y - L3 * Math.cos(psi) + L0; 
        }
        else if(this.transitionType == "ConcaveSwap"){
            x2 = x - L3 * Math.sin(psi);
            y2 = y - L3 * Math.cos(-psi) - L0;
        }
        else{
            x2 = x - L3 * Math.sin(psi);
            y2 = y - L3 * Math.cos(psi) - L0; 
        }
        let dSquared = x2 ** 2 + y2 ** 2;
        let cosTheta2 = (dSquared - L1 ** 2 - L2 ** 2) / (2 * L1 * L2);
        
        cosTheta2 = Math.min(1, Math.max(-1, cosTheta2));
    
        let theta2 = Math.acos(cosTheta2);
        let theta1 = Math.atan2(y2, x2) - Math.atan2(L2 * Math.sin(theta2), L1 + L2 * Math.cos(theta2));    
        let theta3 = psi - (theta1 + theta2);
        return { theta1, theta2, theta3 };
    }

    swapFixedLeg() {
        let newOrigin = this.target.position.clone();
        let newOriginNormal = this.target.normal.clone();
        let newTarget = this.origin.position.clone();
        let newTargetNormal = this.origin.normal.clone();

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

        if (this.robotGroup) {
            while (this.robotGroup.children.length > 0) {
                let child = this.robotGroup.children.pop();
                
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
                this.robotGroup.remove(child);
            }
            this.scene.remove(this.robotGroup); 
        }
        this.origin = { position: newOrigin.clone(), normal: newOriginNormal.clone() };
        this.target = { position: newTarget.clone(), normal: newTargetNormal.clone() };
        this.fixed_leg = this.fixed_leg === 0 ? 4 : 0;

        // Rebuild robot structure
        this.robotGroup = new THREE.Group();
        this.robotGroup.position.copy(this.origin.position);
        this.joints = []; // Reset joints to avoid keeping old references
        this.joints = []; 
        this.robotBones = [];
        this.transitionType = 'None';

        // Restore State Variables
        this.angles = savedState.angles;
        this.trajectoryPoints = savedState.trajectoryPoints;
        this.actionQueue = savedState.actionQueue;
        this.isExecuting = savedState.isExecuting;

        if(this.lastTransitionType == "Concave"){this.transitionType = "ConcaveSwap"}
        if(this.lastTransitionType == "Convex"){this.transitionType = "ConvexSwap"}

        this.showTrajectory = savedState.showTrajectory;
        this.initialGeometry = savedState.initialGeometry
        this.limits = savedState.limits

        this.buildRobot(this.initialGeometry, this.limits);
        this.scene.add(this.robotGroup);


        let currentEndEffector = new THREE.Vector3();
        this.robotBones[4].getWorldPosition(currentEndEffector);
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

        this.joints[0].children[0].material.color.set(0x6a0088);

        this.target.position.copy(newTarget.clone());
        this.target.normal.copy(newTargetNormal.clone()); 
        
        this.updateAnglesFromTarget();
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
        await this.executeAction(action);
        this.processNextAction();
    }

    async executeAction(action) {
        return new Promise((resolve) => {
            console.log(`Executing: ${action}`);
    
            if (action === "goForward") this.goForward(resolve);
            else if (action === "goBackward") this.goBackward(resolve);
            else if (action === "switchLeg") this.switchLeg(resolve);
            else if (action === "turnRight") this.turnRight(resolve);
            else if (action === "turnLeft") this.turnLeft(resolve);
            else if (action === "climbUp") this.climbUp(resolve);
            else if (action === "climbDown") this.climbDown(resolve);
            else if (action ==="sideStepDownRight") this.sideStepDownRight(resolve);
            else if (action ==="sideStepUpRight") this.sideStepUpRight(resolve);
            else if (action ==="sideStepDownLeft") this.sideStepDownLeft(resolve);
            else if (action ==="sideStepUpLeft") this.sideStepUpLeft(resolve);
            else if (action === "planTransitionConcave") this.planTransitionConcave(resolve);
            else if (action === "planTransitionConvex") this.planTransitionConvex(resolve);
            else resolve(); 
        });
    }
}

// Attach movement functions dynamically
THREERobot.prototype.goForward = goForward;
THREERobot.prototype.goBackward = goBackward;
THREERobot.prototype.switchLeg = switchLeg;
THREERobot.prototype.turnRight = turnRight;
THREERobot.prototype.turnLeft = turnLeft;
THREERobot.prototype.planTransitionConcave = planTransitionConcave;
THREERobot.prototype.planTransitionConvex = planTransitionConvex;
THREERobot.prototype.climbDown = climbDown;
THREERobot.prototype.climbUp = climbUp;

THREERobot.prototype.moveRobot = moveRobot;
THREERobot.prototype.calculateMovementVector = calculateMovementVector;
THREERobot.prototype.displayTrajectory = displayTrajectory;
THREERobot.prototype.clearTrajectory = clearTrajectory;
THREERobot.prototype.rotateMovingLeg = rotateMovingLeg;
THREERobot.prototype.moveLegBezier = moveLegBezier;
THREERobot.prototype.sideStepDownRight = sideStepDownRight;
THREERobot.prototype.sideStepUpRight = sideStepUpRight;
THREERobot.prototype.sideStepDownLeft = sideStepDownLeft;
THREERobot.prototype.sideStepUpLeft = sideStepUpLeft;

THREERobot.prototype.interpolateMovement = interpolateMovement;
// THREERobot.prototype.planPathToCoordinate = planPathToCoordinate;
THREERobot.prototype.planPathToCoordinate = function(goalPos, goalNormal) {
    return planPathToCoordinate.call(this, goalPos, goalNormal); // Bind function to robot instance
};
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
 