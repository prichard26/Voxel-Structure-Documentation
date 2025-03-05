export class THREERobot {
    constructor(initialGeometry, limits, scene) {
        /*
        initialGeometry ==> Array defining the dimension of each robot link (width, height, depth)
        limits    ==> Defines the min and max joint rotation of each segment
        scene     ==> The scene to which the robot is added
        */

        this.scene = scene;
        this.angles = [0, 0, 0, 0, 0, 0];       // Store current rotation value in radians for each joint of the robot 
        this.joints = [];                       // actual joint position / angles
        this.robotBones = [];                   // Position and Mesh of the robot links

        this.leg1 = initialGeometry[2][2];      // Length of leg 1
        this.leg2 = initialGeometry[3][2];      // Length of leg 2
        this.offset = initialGeometry[4][2];    // Offset length
        this.fixed_leg = 0;                     // Either 0 == Back leg or 4 == Front leg

        this.originalGeometry = initialGeometry.map(row => [...row]);
        this.originalLimits = limits.map(row => [...row]);

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
        this.buildRobot(initialGeometry, limits);
        this.scene.add(this.robotGroup);

        // For visualization purposes we init the fixed leg blue:
        this.joints[this.fixed_leg].children[0].material.color.set(0x0000ff);
    }
    
    buildRobot(initialGeometry, limits, initial_pos) {
        /*
        Fully builds the robot structure inside this.robotGroup.
        */
        let parentObject = this.robotGroup;
        let x = 0, y = 0, z = 0;

        for (let i = 0; i < initialGeometry.length; i++) {
            let link = initialGeometry[i];
            let linkGeo = this.createJointBone(
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


    // ===================== MODIFY CURRENT ROBOT GEOMETRY OR ANGLES =====================

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
            this.robotBones[0].rotation.z = this.angles[0];
            this.robotBones[1].rotation.y = this.angles[1];
            this.robotBones[2].rotation.y = this.angles[2];
            this.robotBones[3].rotation.y = this.angles[3];
            this.robotBones[4].rotation.z = this.angles[4];
    }

    // =============== CALCULATED NEEDED ANGLES FOR A TARGET POSITION =====================


    
    // swapFixedLeg() {
    //     // 1️⃣ Remove the old fixed leg color
    //     this.joints[this.fixed_leg].children[0].material.color.set(0x000000);
    //     console.log(this.robotBones.length);
    //     console.log('1', this.robotBones[0]);
    //     console.log(this.robotBones[1]);
    //     console.log(this.robotBones[2]);
    //     console.log(this.robotBones[3]);        
    //     console.log('5',this.robotBones[4]);        
        
    //     console.log('JOINTTSS',this.joints.length);
    //     console.log('1', this.joints[0]);
    //     console.log(this.joints[1]);
    //     console.log(this.joints[2]);
    //     console.log(this.joints[3]);        
    //     console.log('5',this.joints[4]);
    //     // 2️⃣ Toggle fixed leg (0 ↔ 4)
    //     this.fixed_leg = this.fixed_leg === 0 ? 4 : 0;
    
    //     // 9️⃣ Set the new fixed leg color
    //     this.joints[this.fixed_leg].children[0].material.color.set(0x0000ff);
    // }
    
    swapFixedLeg() {
        // Remove the old fixed leg color
        this.joints[0].children[0].material.color.set(0x000000);
    
        // Toggle fixed leg (0 ↔ 4)
        let old_fixed_leg = this.fixed_leg;
        this.fixed_leg = this.fixed_leg === 0 ? 4 : 0;

        // Rotate the first bone to align correctly in world space
        let correctionQuaternionY = new THREE.Quaternion();
        correctionQuaternionY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Adjust for correct axis

        let correctionQuaternionZ = new THREE.Quaternion();
        correctionQuaternionZ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI); // Adjust for correct axis


        let firstBone = this.robotBones[this.fixed_leg];
        firstBone.quaternion.premultiply(correctionQuaternionY);
        firstBone.updateMatrixWorld(true); // Ensure transform is updated   
        let fixedPosition = this.robotBones[4].getWorldPosition(new THREE.Vector3());
        let fixedQuaternion = this.robotBones[4].getWorldQuaternion(new THREE.Quaternion());
    

        // this.robotBones[3].quaternion.premultiply(correctionQuaternionZ);
        // this.robotBones[3].updateMatrixWorld(true); // Ensure transform is updated   
        // let fixedPosition1 = this.robotBones[3].getWorldPosition(new THREE.Vector3());
        // let fixedQuaternion1 = this.robotBones[3].getWorldQuaternion(new THREE.Quaternion());

        // this.robotBones[2].quaternion.premultiply(correctionQuaternionZ);
        // this.robotBones[2].updateMatrixWorld(true); // Ensure transform is updated
        // let fixedPosition2 = this.robotBones[2].getWorldPosition(new THREE.Vector3());
        // let fixedQuaternion2 = this.robotBones[2].getWorldQuaternion(new THREE.Quaternion());


        // this.robotBones[1].quaternion.premultiply(correctionQuaternionZ);
        // this.robotBones[1].updateMatrixWorld(true); // Ensure transform is updated
        // let fixedPosition3 = this.robotBones[1].getWorldPosition(new THREE.Vector3());
        // let fixedQuaternion3 = this.robotBones[1].getWorldQuaternion(new THREE.Quaternion());


        // let lastBone = this.robotBones[old_fixed_leg];
        // lastBone.quaternion.premultiply(correctionQuaternionY);
        // lastBone.updateMatrixWorld(true); // Ensure transform is updated   
        // let fixedPosition4 = this.robotBones[0].getWorldPosition(new THREE.Vector3());
        // let fixedQuaternion4 = this.robotBones[0].getWorldQuaternion(new THREE.Quaternion() );
    
        // // // Step 2: Reset hierarchy
        // // while (this.robotGroup.children.length > 0) {
        // //     this.robotGroup.remove(this.robotGroup.children[0]);
        // // }

    
        // Step 3: Rebuild the hierarchy with proper linking
        this.robotBones[4].position.copy(fixedPosition4);
        this.robotBones[4].quaternion.copy(fixedQuaternion4);
        parentObject.add(this.robotBones[4]);         
        let parentObject = this.robotBones[4];

        this.robotBones[3].position.copy(fixedPosition3);
        this.robotBones[3].quaternion.copy(fixedQuaternion3);
        parentObject.add(this.robotBones[3]);   
        parentObject = this.robotBones[3];

        this.robotBones[2].position.copy(fixedPosition2);
        this.robotBones[2].quaternion.copy(fixedQuaternion2);
        parentObject.add(this.robotBones[2]);    
        parentObject = this.robotBones[2];

        this.robotBones[1].position.copy(fixedPosition1);
        this.robotBones[1].quaternion.copy(fixedQuaternion1);
        parentObject.add(this.robotBones[1]);    
        parentObject = this.robotBones[1];
    
        this.robotBones[0].position.copy(fixedPosition);
        this.robotBones[0].quaternion.copy(fixedQuaternion);
        this.robotGroup.add(this.robotBones[0]);    
        parentObject = this.robotBones[0];
    
    
        // Step 4: Apply correct angles
        this.setAngles();
        // Step 5: Set the new fixed leg color
        this.joints[0].children[0].material.color.set(0x0000ff);
    }
}   
// ==================================== GEOMETRY ====================================
// ============ Implemented based on https://github.com/glumb/robot-gui =============
// ==================================================================================