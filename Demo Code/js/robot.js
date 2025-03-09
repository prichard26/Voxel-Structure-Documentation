import { goForward, goBackward, turnRight, turnLeft, planTransitionConcave, planTransitionConvex, moveRobot, rotateMovingLeg, calculateMovementVector, calculateRotationVector, displayTrajectory, clearTrajectory, planTransition } from "./robot_movement.js";
import { InverseKinematics } from './IK.js';

export class THREERobot {
    constructor(initialGeometry, limits, origin, target, normal, scene) {
        this.scene = scene;
        this.angles = [0, 0, 0, 0, 0]; 
        this.joints = []; 
        this.robotBones = [];

        this.leg1 = initialGeometry[1][2];      
        this.leg2 = initialGeometry[2][2]; 
        this.offset = initialGeometry[4][2]; 
        this.fixed_leg = 0;             // can either be 0 or 4 

        this.origin = { 
            position: origin.clone(), 
            normal: normal.clone().normalize() 
        };

        this.target = { 
            position: target.clone(), 
            normal: normal.clone().normalize() 
        };
        console.log('taget1', this.target.position.y)
        console.log(this.target.position)
        console.log(this.target)
        this.trajectoryPoints = [];     // For visualization of the movment trajectories

        this.actionQueue = [];          //  Action queue to store movement actions
        this.isExecuting = false;       //  Track if an action is being executed

        this.colors = [0xaaaaba,0xbbbbbb,0xbcbcbc,0xcbcbcb,0xcccccc,0x000000];
    
        this.robotGroup = new THREE.Group();
        this.robotGroup.position.copy(origin); 

        this.buildRobot(initialGeometry, limits);
        this.scene.add(this.robotGroup);

        this.updateAnglesFromTarget();

        this.target.position.copy(this.computeEndEffectorPosition());

        this.joints[this.fixed_leg].children[0].material.color.set(0x0000ff);
    }
    
    buildRobot(initialGeometry, limits) {
        let parentObject = this.robotGroup;
    
        // ✅ Save target position BEFORE applying rotation
        let fixedTargetPosition = this.target.position.clone(); 
    
        // ✅ Compute rotation needed to align the robot with the normal
        let defaultNormal = new THREE.Vector3(0, 0, 1);  // Default normal along Z-axis
        let rotationQuaternion = new THREE.Quaternion();
        if (!this.origin.normal.equals(defaultNormal)) {
            rotationQuaternion.setFromUnitVectors(defaultNormal, this.origin.normal);
        }
    
        // ✅ Apply rotation ONLY to robot group (Not the target)
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
    
    setToTarget(x, y, z, shouldRound = true) {
        if (shouldRound) {
            this.target.position.set(Math.round(x), Math.round(y), Math.round(z));
        } else {
            this.target.position.set(x, y, z);
        }
        this.updateAnglesFromTarget();
    }

    
    updateAnglesFromTarget() {
        // Compute movement direction
        console.trace("🔍 Checking updateAnglesFromTarget - Before:", this.target.position.clone());

        let currentEndEffector = this.robotBones[4].getWorldPosition();

        let direction = currentEndEffector.clone().sub(this.origin.position).normalize();

        // Ensure direction is valid
        let normal = this.origin.normal;
        if (Math.abs(direction.dot(normal) - 1) < 1e-6) {  
            if(this.target.normal.z <= 0){direction.set(-1,0,0)}
            else{direction.set(1, 0, 0);} // Assign a default direction}
        }

        // Project target onto movement plane
        let targetPosition = this.target.position.clone();
        let diff = targetPosition.clone().sub(this.origin.position);
        let distance = diff.dot(normal);
        let projectedTarget = targetPosition.clone().sub(normal.clone().multiplyScalar(distance));

        // Compute new movement direction
        let direction_new = projectedTarget.clone().sub(this.origin.position).normalize();

        //Compute rotation angle θ0
        let dotProduct = direction.dot(direction_new);
        let crossProduct = new THREE.Vector3().crossVectors(direction, direction_new).dot(normal);
        let theta0 = Math.atan2(crossProduct, dotProduct);

        this.setAngle(0, theta0);

        // Define a Local Coordinate System
        let bAxis = normal.clone(); // B-axis is along normal
        let aAxis = direction_new.clone().sub(bAxis.clone().multiplyScalar(direction_new.clone().dot(bAxis))).normalize(); 

        let targetPoint = new THREE.Vector2(
            this.target.position.clone().sub(this.origin.position.clone()).dot(aAxis),
            this.target.position.clone().sub(this.origin.position.clone()).dot(bAxis)
        );
        let angles = this.ik3R(targetPoint.y, targetPoint.x, this.offset, this.leg1, this.leg2, this.offset, Math.PI);
        console.log("Theta1:", angles.theta1, "Theta2:", angles.theta2, "Theta3:", angles.theta3);

        // Apply IK Angles
        this.setAngle(1, angles.theta1);
        this.setAngle(2, angles.theta2);
        this.setAngle(3, angles.theta3);

        // Update World Matrix
        this.robotGroup.updateMatrixWorld(true);
        console.log("Projected Target:", projectedTarget);
        console.log("Target in Local A-B Plane:", targetPoint);
        console.log("IK Angles:", angles);
        console.log("Final End-Effector Position:", this.robotBones[4].getWorldPosition());   
    }

    ik3R(x, y, L0, L1, L2, L3, psi) {
        // Step 1: Compute the intermediate target position (x2, y2) without L3
        let x2 = x - L3 * Math.sin(psi);
        let y2 = y - L3 * Math.cos(psi) - L0;
    
        // Step 2: Compute distance from origin to (x2, y2)
        let dSquared = x2 ** 2 + y2 ** 2;
        let d = Math.sqrt(dSquared);
    
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
        let oldBasePosition = new THREE.Vector3();
        let oldEndPosition = new THREE.Vector3();
    
        this.robotBones[0].getWorldPosition(oldBasePosition);
        this.robotBones[this.robotBones.length - 1].getWorldPosition(oldEndPosition);
    
        const shift = new THREE.Vector3().subVectors(oldEndPosition, oldBasePosition);
        this.robotGroup.position.add(shift);
        this.robotGroup.updateMatrixWorld(true);
    
            // ✅ Swap origin and target and ensure rounding
        let temp = { ...this.origin };
        this.origin = {
            position: new THREE.Vector3(
                Math.round(this.target.position.x),
                Math.round(this.target.position.y),
                Math.round(this.target.position.z)
            ),
            normal: this.target.normal.clone()
        };

        this.target = {
            position: new THREE.Vector3(
                Math.round(temp.position.x),
                Math.round(temp.position.y),
                Math.round(temp.position.z)
            ),
            normal: temp.normal.clone()
        };
    
        // Update fixed_leg and update color of fixed leg 
        this.joints[this.fixed_leg].children[0].material.color.set(0x000000);
        this.fixed_leg = this.fixed_leg === 0 ? 4 : 0;
        this.joints[0].children[0].material.color.set(0x0000ff);
    
        this.updateAnglesFromTarget();
    }

    

    // ik_2d(x, y, d1, d2) {
    //     let dist = Math.sqrt(x ** 2 + y ** 2)
    //     if (dist > d1 + d2) {
    //         console.log("⚠️ Target is unreachable! Reducing to max reach.");
    //     }
    //     let theta1 = Math.atan2(y, x) - Math.acos((dist ** 2 + d1 ** 2 - d2 ** 2) / (2 * d1 * dist));
    //     let theta2 = Math.atan2(y - d1 * Math.sin(theta1), x - d1 * Math.cos(theta1));

    //     return {theta1, theta2};
    // }

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
            else if (action === "planTransitionConcave") this.planTransitionConcave(resolve);
            else if (action === "planTransitionConvex") this.planTransitionConvex(resolve);
            else resolve(); 
        });
    }
}

// ✅ Attach movement functions dynamically
THREERobot.prototype.goForward = goForward;
THREERobot.prototype.goBackward = goBackward;
THREERobot.prototype.turnRight = turnRight;
THREERobot.prototype.turnLeft = turnLeft;
THREERobot.prototype.planTransitionConcave = planTransitionConcave;
THREERobot.prototype.planTransitionConvex = planTransitionConvex;
THREERobot.prototype.planTransition = planTransition;
THREERobot.prototype.moveRobot = moveRobot;
THREERobot.prototype.calculateMovementVector = calculateMovementVector;
THREERobot.prototype.calculateRotationVector = calculateRotationVector;
THREERobot.prototype.displayTrajectory = displayTrajectory;
THREERobot.prototype.clearTrajectory = clearTrajectory;
THREERobot.prototype.rotateMovingLeg = rotateMovingLeg;

// function ik_2d(x, y, d1, d2) {
// 	let dist = Math.sqrt(x ** 2 + y ** 2);
// 	if (dist > d1 + d2) { // rest posittion
//         return { theta1: 0, theta2: Math.PI };
//     }
// 	let theta1 = Math.atan2(y, x) - Math.acos((dist ** 2 + d1 ** 2 - d2 ** 2) / (2 * d1 * dist));
// 	let theta2 = Math.atan2(y - d1 * Math.sin(theta1), x - d1 * Math.cos(theta1));
// 	return {theta1, theta2};
// }

// function ik_3d(targetPos, originPos, d1, d2, normal, newNormal) {
//     // ✅ Compute movement direction (along which the leg moves)
//     let movementVector = targetPos.clone().sub(originPos).normalize();

//     // ✅ Compute the corrected movement plane perpendicular to newNormal
//     let perpendicular = new THREE.Vector3().crossVectors(movementVector, newNormal).normalize();
    
//     if (perpendicular.lengthSq() === 0) {
//         console.warn("⚠️ Perpendicular axis is zero! Check normal computation.");
//         return { theta1: 0, theta2: Math.PI, quaternion: new THREE.Quaternion() };
//     }

//     // ✅ Compute the projection of target onto the correct plane (perpendicular to newNormal)
//     let projectedTarget = targetPos.clone().sub(
//         newNormal.clone().multiplyScalar(targetPos.clone().sub(originPos).dot(newNormal))
//     );

//     // ✅ Now compute 2D IK using the **projected plane**
//     let dx = projectedTarget.clone().sub(originPos).length();
//     let dz = targetPos.clone().sub(projectedTarget).dot(newNormal); // Height difference

//     let angles = ik_2d(dz, dx, d1, d2);

//     // ✅ Compute the required rotation from `normal` to `newNormal`
//     let fullRotation = new THREE.Quaternion();
//     if (!normal.equals(newNormal)) {  
//         fullRotation.setFromUnitVectors(normal.clone().normalize(), newNormal.clone().normalize());
//     } else {
//         fullRotation.set(0, 0, 0, 1); // ✅ Identity quaternion
//     }

//     console.log("Computed Rotation:", fullRotation);
//     console.log("Theta1:", angles.theta1, "Theta2:", angles.theta2);

//     return {
//         theta1: angles.theta1,
//         theta2: angles.theta2,
//         quaternion: fullRotation
//     };
// }


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


// console.log('Global moving foot:', this.robotBones[4].getWorldPosition());
    
// // // Step 1: Compute movement direction
// let currentEndEffector = this.robotBones[4].getWorldPosition().clone();
// let direction = currentEndEffector.sub(this.origin.position).normalize();
// console.log('direction',direction)
// // Step 2: Project the target onto the movement plane
// let normal = this.origin.normal.clone().normalize();    // Ensure normal is a unit vector
// let pointOnPlane = this.origin.position.clone();        // Reference point on the plane
// let targetPosition = this.target.position.clone();      // The point to be projected

// if (Math.abs(direction.dot(normal) - 1) < 1e-6) {  
//     direction = new THREE.Vector3(0, 1, 0); // Assign a default direction
// }

// let diff = targetPosition.clone().sub(pointOnPlane);  // Vector from plane to target
// let distance = diff.dot(normal) / normal.lengthSq();  // Projection length


// let projectedTarget = targetPosition.clone().sub(normal.clone().multiplyScalar(distance));

// // Step 3: Compute new movement direction (from origin to projected target)
// console.log("Projected Target:", projectedTarget);

// // ✅ Step 3: Compute new movement direction (from origin to projected target)
// let direction_new = projectedTarget.clone().sub(this.origin.position).normalize();

// let norm_dir = direction.clone().normalize();
// let norm_new_dir = direction_new.clone().normalize();

// // Compute dot product
// let dotProduct = norm_dir.dot(norm_new_dir);

// // Clamp to avoid floating point errors causing NaN (due to precision issues)
// dotProduct = Math.min(1, Math.max(-1, dotProduct));

// // Compute angle in radians
// let cross = new THREE.Vector3().crossVectors(direction, direction_new).dot(normal);
// let theta0 = Math.atan2(cross, dotProduct);
// console.log('theto0',theta0);
// this.setAngle(0, -theta0);


        // // ✅ Step 4: Define a Local Coordinate System
        // let bAxis = normal; // B-axis is along normal
        // let aAxis = direction_new.clone().sub(bAxis.clone().multiplyScalar(direction_new.dot(bAxis))).normalize(); // A-axis in same plane but perpendicular counterclock-wise 
        // console.log("A-axis:", aAxis);
        // console.log("B-axis:", bAxis);
 
        // // ✅ Step 5: Convert Target into Local (A-B) Frame
        // let targetInAB = new THREE.Vector2(
        //     projectedTarget.clone().sub(this.origin.position).dot(aAxis),
        //     projectedTarget.clone().sub(this.origin.position).dot(bAxis)
        // );
        // console.log("Target in Local A-B Plane:", targetInAB);

        // // ✅ Step 6: Solve IK using Law of Cosines in Local A-B Frame

        // let ikResult = InverseKinematics.ik2D(targetInAB.x, targetInAB.y, this.leg1, this.leg2);
        // let theta1 = ikResult.theta1;
        // let theta2 = ikResult.theta2;

        // // ✅ Step 7: Compute Final Foot Orientation
        // let finalNormal = this.target.normal.clone().normalize();
        // let finalAngle = Math.atan2(finalNormal.dot(bAxis), finalNormal.dot(aAxis));

        // console.log("Theta1:", theta1);
        // console.log("Theta2:", theta2);
        // console.log("Final Foot Angle:", finalAngle);

        // // ✅ Step 8: Apply Angles
        // this.setAngle(1, theta1);
        // this.setAngle(2, theta2 - theta1);

        // // ✅ Enforce correct final foot orientation
        // let footCorrection = finalAngle - theta2;
        // this.setAngle(3, footCorrection);

        // this.robotGroup.updateMatrixWorld(true);
        // console.log("After IK: Computed End-Effector Position:", this.computeEndEffectorPosition());
