// ==================================== GEOMETRY ====================================
// ============ Implemented based on https://github.com/glumb/robot-gui =============
// ==================================================================================
export var VisualRobot = undefined;

export class THREERobot {
    constructor(V_initial, limits, scene) {
        /*
        V_initial ==> Array defining the dimension of each robot link (width, height, depth)
        limits    ==> Defines the min and max joint rotation of each segment
        scene     ==> The scene to which the robot is added
        */

        this.scene = scene;
        this.angles = [0, 0, 0, 0, 0, 0];       // Store current rotation value in radians for each joint of the robot 
        this.robotBones = [];                   // Position and Mesh of the robot links
        this.joints = [];                       // actual joint position / angles
        this.fixed_leg = 0;                     

        this.colors = [
            0xaaaaba, // Light gray
            0xbbbbbb, // Slightly darker gray
            0xbcbcbc, // Medium gray
            0xcbcbcb, // Lighter gray
            0xcccccc, // Almost white
            0x000000, // Black
        ];

        // Create robot group
        this.robotGroup = new THREE.Group();
        this.buildRobot(V_initial, limits);
        this.scene.add(this.robotGroup);
    }
    
    buildRobot(V_initial, limits) {
        /*
        Fully builds the robot structure inside this.robotGroup.
        */
        let parentObject = this.robotGroup;
        let x = 0, y = 0, z = 0;

        for (let i = 0; i < V_initial.length; i++) {
            let link = V_initial[i];
            let linkGeo = this.createCube(
                x, y, z,
                link[0], link[1], link[2],
                limits[i][0], limits[i][1], i
            );
            
            x = link[0];
            y = link[1];
            z = link[2];

            parentObject.add(linkGeo);
            parentObject = linkGeo;
            this.robotBones.push(linkGeo);
        }
    }

    createCube(x, y, z, w, h, d, min, max, jointNumber) {
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

        const jointMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const jointMesh1 = new THREE.Mesh(jointGeo1, jointMaterial);
        const jointMeshMax = new THREE.Mesh(jointGeoMax, jointMaterial);
        const jointMeshMin = new THREE.Mesh(jointGeoMin, jointMaterial);

        const joint = new THREE.Group();
        joint.add(jointMeshMax, jointMeshMin, jointMesh1);
        this.joints.push(joint);

        // Set rotation axis based on joint number, this program was made for 5 joints robots
        if (jointNumber === 0 || jointNumber === 4) {
            joint.rotation.x = Math.PI / 2;
        }

        group.add(joint);
        
        return group;
    }

    updateGeometry(newGeo, limits) {
        /*
        Replace the old robot with a other one with new geometry  
        */
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
    }

    setAngle(index, angle) {
        /*
        Updates the rotations of one specified robot joint.
        */
        this.angles[index] = angle;
        this.setAngles(this.angles);
    }
    
    setAngles() {
        /*
        Updates the rotations of the robot joints based on stored angles.
        */
        this.robotBones[0].rotation.z = this.angles[0];
        this.robotBones[1].rotation.y = this.angles[1];
        this.robotBones[2].rotation.y = this.angles[2];
        this.robotBones[3].rotation.y = this.angles[3];
        this.robotBones[4].rotation.z = this.angles[4];
    }

    ik_2d(x, y, d1, d2) {
        let dist = Math.sqrt(x ** 2 + y ** 2);
        if (dist > d1 + d2) {
            return {theta1: 0, theta2: Math.PI};
        }
        let theta1 = Math.atan2(y, x) - Math.acos((dist ** 2 + d1 ** 2 - d2 ** 2) / (2 * d1 * dist));
        let theta2 = Math.atan2(y - d1 * Math.sin(theta1), x - d1 * Math.cos(theta1));
        return {theta1, theta2};
    }
  
    moveToTarget(targetX, targetY, targetZ) {
        // Convert world coordinates to local coordinates
        let localTarget = new THREE.Vector3(targetX, targetY, targetZ);
        this.robotGroup.worldToLocal(localTarget);
    
        // Compute base rotation (rotation around Z)
        let baseRotation = Math.atan2(localTarget.y, localTarget.x);
    
        // Compute projected distance in the XZ plane
        let projectedXZ = Math.sqrt(localTarget.x ** 2 + localTarget.z ** 2);
        
        // Apply inverse kinematics to find shoulder & elbow angles
        let ikSolution = this.ik_2d(localTarget.z, projectedXZ, 
                                    this.robotBones[1].position.z, 
                                    this.robotBones[2].position.z);
    
        // Assign computed angles to the correct joints
        this.angles[0] = baseRotation;      // Base rotation
        this.angles[1] = ikSolution.theta1; // Shoulder
        this.angles[2] = ikSolution.theta2 - ikSolution.theta1; // Elbow
        this.angles[3] = -ikSolution.theta2; // Wrist
    
        // Apply the new angles to the robot
        this.setAngles();
    }
    getMovingLeg() {
        return this.fixed_leg === 0 ? 4 : 0;
    }

    swapFixedLeg() {
        let oldFixedLeg = this.fixed_leg;
        this.fixed_leg = this.fixed_leg === 0 ? 4 : 0;
    
        let oldFixedPosition = new THREE.Vector3();
        this.robotBones[oldFixedLeg].getWorldPosition(oldFixedPosition);
    
        let newFixedPosition = new THREE.Vector3();
        this.robotBones[this.fixed_leg].getWorldPosition(newFixedPosition);
    
        let positionOffset = newFixedPosition.sub(oldFixedPosition);
        this.robotGroup.position.sub(positionOffset);  // Adjust position to keep fixed leg still
    
        console.log(`Fixed leg switched. Now fixed at joint: ${this.fixed_leg}`);
    }
}
