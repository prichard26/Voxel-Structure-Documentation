// ======================================= GUI ======================================
import {scene, camera, renderer} from "./scene.js"

var guiControls, targetParams = [], jointsParams = [], geometryParams = [], end;
export var guiControls;

var DEG_TO_RAD = Math.PI / 180;
var RAD_TO_DEG = 180 / Math.PI;


export function setupGUI(robotInstance) {
    /*
    Setup GUI to control the given robot instance.
    */
    let endEffector = new THREE.Vector3();
    robotInstance.robotGroup.updateMatrixWorld(true);

    let movingLeg = robotInstance.getMovingLeg();
    if (robotInstance.robotBones[movingLeg]) {
        robotInstance.robotBones[movingLeg].getWorldPosition(endEffector);
    } else {
        console.error(`Error: robotBones[${movingLeg}] is undefined.`);
    }

    guiControls = new function() {  

        this.x = endEffector.x;
        this.y = endEffector.y;
        this.z = endEffector.z;

        // // Initialize joint angles from the robot instance
        // this.j1 = robotInstance.angles[0] * RAD_TO_DEG;
        // this.j2 = robotInstance.angles[1] * RAD_TO_DEG;
        // this.j3 = robotInstance.angles[2] * RAD_TO_DEG;
        // this.j4 = robotInstance.angles[3] * RAD_TO_DEG;
        // this.j5 = robotInstance.angles[4] * RAD_TO_DEG;

        // Read dimensions from robot geometry
        this.leg1 = robotInstance.robotBones[2].position.z; 
        this.leg2 = robotInstance.robotBones[3].position.z;
        this.offset = robotInstance.robotBones[4].position.z; 

        this.targetEnd = "end 1";
    };

    var gui = new dat.GUI();

    var geometryGui = gui.addFolder('Robot Geometry');
    geometryParams.push(geometryGui.add(guiControls, 'leg1', 1.00, 10.0).step(0.1).listen());
    geometryParams.push(geometryGui.add(guiControls, 'leg2', 1.00, 10.0).step(0.1).listen());
    geometryParams.push(geometryGui.add(guiControls, 'offset', 1.00, 10.0).step(0.1).listen());

    // var jointsGui = gui.addFolder('Robot Joints');
    // jointsParams.push(jointsGui.add(guiControls, 'j1', 0.00, 360.0).step(0.5).listen());
    // jointsParams.push(jointsGui.add(guiControls, 'j2', 0.00, 360.0).step(0.5).listen());
    // jointsParams.push(jointsGui.add(guiControls, 'j3', 0.00, 360.0).step(0.5).listen());
    // jointsParams.push(jointsGui.add(guiControls, 'j4', 0.00, 360.0).step(0.5).listen());
    // jointsParams.push(jointsGui.add(guiControls, 'j5', 0.00, 360.0).step(0.5).listen());

    var targetGui = gui.addFolder('Target');
    targetParams.push(targetGui.add(guiControls, 'x', -10.0, 10.0).step(0.1).listen());
    targetParams.push(targetGui.add(guiControls, 'y', -10.0, 10.0).step(0.1).listen());
    targetParams.push(targetGui.add(guiControls, 'z', -10.0, 10.0).step(0.1).listen());

    var endtarget = gui.addFolder('Target End');
    end = endtarget.add(guiControls, 'targetEnd', ["end 1", "end 2"]);

}

export function updateGUI(robotInstance) {
    /*
    Updates GUI controls and ensures the target moves with the robot.
    */
    for (let i = 0; i < targetParams.length; i++) {
        targetParams[i].onChange(() => {
            robotInstance.moveToTarget(guiControls.x, guiControls.y, guiControls.z);
        });
    }
    // for (let i = 0; i < jointsParams.length; i++) {
    //     jointsParams[i].onChange(() => {
    //         if (robotInstance) {
    //             robotInstance.setAngle(i, guiControls[`j${i+1}`] * DEG_TO_RAD);
    //             robotInstance.setAngles();
    //             updateControlEndEffector(robotInstance);
    //         }
    //     });
    // }
    for (let i = 0; i < geometryParams.length; i++) {
        geometryParams[i].onChange(() => {
            updateRobotGeometry(robotInstance);
        });
    }
    end.onChange(() => {
        changeEnd(robotInstance);
    });
}

// ============================= UPDATE ROBOT WITH GUI ==============================

function updateRobotGeometry(robotInstance) {
    /*
    Calls updateGeometry() on the robot instance with new geometry values.
    */

    if (!robotInstance) return;

    let geo = [
        [0, 0, guiControls.offset],
        [0, 0, guiControls.leg1],
        [0, 0, guiControls.leg2],
        [0, 0, guiControls.offset],
        [0, 0, 0]
    ];

    let limits = [
        [-Math.PI, Math.PI],  // Joint 1
        [-Math.PI / 2, Math.PI / 2],  // Joint 2
        [-Math.PI / 2, Math.PI / 2],  // Joint 3
        [-Math.PI / 2, Math.PI / 2],  // Joint 4
        [-Math.PI / 2, Math.PI / 2]   // Joint 5
    ];

    // Call the method to completely recreate the robot
    robotInstance.updateGeometry(geo, limits);
}


// ================================= TARGET CONTROL =================================

export function controlEndEffector(robotInstance) {
    /*
    Creates a draggable target linked to the robot's end effector.
    */
    // let movingLeg = robotInstance.getMovingLeg();
    // let endEffector = new THREE.Vector3();

    // if (!robotInstance.robotBones[movingLeg]) {
    //     console.error(`Error: robotBones[${movingLeg}] is undefined.`);
    //     return;
    // }

    // robotInstance.robotBones[movingLeg].updateMatrixWorld(true);
    // robotInstance.robotBones[movingLeg].getWorldPosition(endEffector);


    var drag_end = new THREE.Group();
    scene.add(drag_end);

    var control = new THREE.TransformControls(camera, renderer.domElement);
	drag_end.position.x = guiControls.x;
	drag_end.position.y = guiControls.y;
	drag_end.position.z = guiControls.z;

    control.size = 0.5;
    control.space = "local";
    drag_end.rotation.y = 180 * DEG_TO_RAD;
    drag_end.rotation.z = 90 * DEG_TO_RAD;

    control.addEventListener("change", () => {
        guiControls.x = drag_end.position.x;
        guiControls.y = drag_end.position.y;
        guiControls.z = drag_end.position.z;
        robotInstance.moveToTarget(guiControls.x, guiControls.y,  guiControls.z);
    });

    control.attach(drag_end);
    scene.add(control);
}

// export function updateControlEndEffector(robotInstance) {
//     /*
//     Updates the draggable control position based on the end-effector's real position.
//     */
//     let movingLeg = robotInstance.getMovingLeg();
//     let endEffector = new THREE.Vector3();

//     if (!robotInstance.robotBones[movingLeg]) {
//         console.error(`Error: robotBones[${movingLeg}] is undefined.`);
//         return;
//     }

//     robotInstance.robotBones[movingLeg].updateMatrixWorld(true);
//     robotInstance.robotBones[movingLeg].getWorldPosition(endEffector);

//     guiControls.x = endEffector.x;
//     guiControls.y = endEffector.y;
//     guiControls.z = endEffector.z;
// }


// ================================ CHANGE FIXED END ================================

function changeEnd(robotInstance) {
    /*
    Swaps the fixed leg and updates GUI accordingly.
    */
    robotInstance.swapFixedLeg();

    let endEffector = new THREE.Vector3();
    robotInstance.robotGroup.updateMatrixWorld(true);

    let movingLeg = robotInstance.getMovingLeg();
    if (!robotInstance.robotBones[movingLeg]) {
        console.error(`Error: robotBones[${movingLeg}] is undefined.`);
        return;
    }

    robotInstance.robotBones[movingLeg].getWorldPosition(endEffector);

    guiControls.x = endEffector.x;
    guiControls.y = endEffector.y;
    guiControls.z = endEffector.z;

    robotInstance.moveToTarget(guiControls.x, guiControls.y, guiControls.z);
}