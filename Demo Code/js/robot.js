import { goForward, goBackward, turnRight, turnLeft, planTransitionConcave, planTransitionConvex, moveRobot, rotateMovingLeg, calculateMovementVector, calculateRotationVector, displayTrajectory, clearTrajectory,computeLocalUp, planTransition } from "./robot_movement.js";


export class THREERobot {
    constructor(initialGeometry, limits, origin, target, scene) {
        this.scene = scene;
        this.angles = [0, 0, 0, 0, 0]; 
        this.joints = []; 
        this.robotBones = [];
    
        this.leg1 = initialGeometry[1][2];      
        this.leg2 = initialGeometry[2][2]; 
        this.offset = initialGeometry[4][2]; 
        this.fixed_leg = 0;             // can either be 0 or 4 

        this.origin = new THREE.Vector3(
            Math.round(origin.x), 
            Math.round(origin.y), 
            Math.round(origin.z)
        );

        this.target = new THREE.Vector3(
            Math.round(target.x), 
            Math.round(target.y), 
            Math.round(target.z)
        );

        this.trajectoryPoints = [];     // For visualization of the movment trajectories

        this.actionQueue = [];          //  Action queue to store movement actions
        this.isExecuting = false;       //  Track if an action is being executed

        this.colors = [0xaaaaba,0xbbbbbb,0xbcbcbc,0xcbcbcb,0xcccccc,0x000000];
    
        this.robotGroup = new THREE.Group();
        this.robotGroup.position.copy(origin); 

        this.buildRobot(initialGeometry, limits);
        this.scene.add(this.robotGroup);

        // Explicitly set initial target and compute IK
        this.updateAnglesFromTarget();

        this.target.copy(this.computeEndEffectorPosition());

        this.joints[this.fixed_leg].children[0].material.color.set(0x0000ff);

    }
    
    buildRobot(initialGeometry, limits) {
        let parentObject = this.robotGroup;
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
            this.target.set(Math.round(x), Math.round(y), Math.round(z));
        } else {
            this.target.set(x, y, z);
        }
        this.updateAnglesFromTarget();
    }

    updateAnglesFromTarget() {
        let origin1 = new THREE.Vector3(this.origin.x,this.origin.y,this.target.z);

        let angles = ik_2d(this.target.z - this.origin.z, origin1.distanceTo(this.target), this.leg1, this.leg2);

        this.setAngle(0, Math.atan2(this.target.y - this.origin.y, this.target.x - this.origin.x));
        this.setAngle(1, angles.theta1);
        this.setAngle(2, angles.theta2 - angles.theta1);
        this.setAngle(3, Math.PI - angles.theta2);

        // Explicitly update matrices BEFORE updating positions
        this.robotGroup.updateMatrixWorld(true);
    
        // update robot origin and target
        this.robotBones[0].getWorldPosition(this.origin);
        this.target.copy(this.computeEndEffectorPosition());
    }

    
    swapFixedLeg() {
        let oldBasePosition = new THREE.Vector3();
        let oldEndPosition = new THREE.Vector3();
    
        this.robotBones[0].getWorldPosition(oldBasePosition);
        this.robotBones[this.robotBones.length - 1].getWorldPosition(oldEndPosition);
    
        const shift = new THREE.Vector3().subVectors(oldEndPosition, oldBasePosition);
        this.robotGroup.position.add(shift);
        this.robotGroup.updateMatrixWorld(true);
    
        // Swap origin and target:
        this.origin.copy(oldEndPosition).set(
            Math.round(oldEndPosition.x),
            Math.round(oldEndPosition.y),
            Math.round(oldEndPosition.z)
        );

        this.target.copy(oldBasePosition).set(
            Math.round(oldBasePosition.x),
            Math.round(oldBasePosition.y),
            Math.round(oldBasePosition.z)
        );

        // Update fixed_leg and update color of fixed leg 
        this.joints[this.fixed_leg].children[0].material.color.set(0x000000);
        this.fixed_leg = this.fixed_leg === 0 ? 4 : 0;
        this.joints[0].children[0].material.color.set(0x0000ff);
    
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
THREERobot.prototype.computeLocalUp = computeLocalUp;


function ik_2d(x, y, d1, d2) {
	let dist = Math.sqrt(x ** 2 + y ** 2);
	if (dist > d1 + d2) { // rest posittion
        return { theta1: 0, theta2: Math.PI };
    }
	let theta1 = Math.atan2(y, x) - Math.acos((dist ** 2 + d1 ** 2 - d2 ** 2) / (2 * d1 * dist));
	let theta2 = Math.atan2(y - d1 * Math.sin(theta1), x - d1 * Math.cos(theta1));
	return {theta1, theta2};
}