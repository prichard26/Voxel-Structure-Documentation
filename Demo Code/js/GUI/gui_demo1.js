import { GUI } from "../../three/examples/jsm/libs/lil-gui.module.min.js";


var guiControls,  jointsParams = [], geometryParams = [], end;
export var guiControls;

var DEG_TO_RAD = Math.PI / 180;
var RAD_TO_DEG = 180 / Math.PI;

export function setupGUI(robotInstance) {
    /*
    Setup GUI to control the given robot instance.
    */
    guiControls = new function() {  
        // Initialize joint angles from the robot instance
        this.j1 = parseFloat((robotInstance.angles[0] * RAD_TO_DEG).toFixed(1));
        this.j2 = parseFloat((robotInstance.angles[1] * RAD_TO_DEG).toFixed(1));
        this.j3 = parseFloat((robotInstance.angles[2] * RAD_TO_DEG).toFixed(1));
        this.j4 = parseFloat((robotInstance.angles[3] * RAD_TO_DEG).toFixed(1));
        this.j5 = parseFloat((robotInstance.angles[4] * RAD_TO_DEG).toFixed(1));

        // Read dimensions from robot geometry
        this.leg1 = parseFloat((robotInstance.robotBones[2].position.z).toFixed(2)); 
        this.leg2 = parseFloat((robotInstance.robotBones[3].position.z).toFixed(2));
        this.offset = parseFloat((robotInstance.robotBones[4].position.z).toFixed(2)); 
    };

    var gui = new GUI();

    // ========== Robot Geometry Control ==========
    var geometryGui = gui.addFolder('Robot Geometry');
    geometryParams.push(geometryGui.add(guiControls, 'leg1', 1.00, 10.0).step(0.1).listen().onChange(() => updateRobotGeometry(robotInstance)));
    geometryParams.push(geometryGui.add(guiControls, 'leg2', 1.00, 10.0).step(0.1).listen().onChange(() => updateRobotGeometry(robotInstance)));
    geometryParams.push(geometryGui.add(guiControls, 'offset', 1.00, 10.0).step(0.1).listen().onChange(() => updateRobotGeometry(robotInstance)));

    // ========== Robot Joint Control ==========
    let jointsGui = gui.addFolder('Robot Angles');
    jointsParams.push(jointsGui.add(guiControls, 'j1', -135, 135).step(1).listen().onChange(() => robotInstance.setAngle(0, guiControls.j1 * DEG_TO_RAD)));
    jointsParams.push(jointsGui.add(guiControls, 'j2', -135, 135).step(1).listen().onChange(() => robotInstance.setAngle(1, guiControls.j2 * DEG_TO_RAD)));
    jointsParams.push(jointsGui.add(guiControls, 'j3', -135, 135).step(1).listen().onChange(() => robotInstance.setAngle(2, guiControls.j3 * DEG_TO_RAD)));
    jointsParams.push(jointsGui.add(guiControls, 'j4', -135, 135).step(1).listen().onChange(() => robotInstance.setAngle(3, guiControls.j4 * DEG_TO_RAD)));
    jointsParams.push(jointsGui.add(guiControls, 'j5', -135, 135).step(1).listen().onChange(() => robotInstance.setAngle(4, guiControls.j5 * DEG_TO_RAD)));
}

export function updateGUI(robotInstance) {
    /*
    Updates GUI controls and ensures the target moves with the robot.
    */
    guiControls.j1 = robotInstance.angles[0] * RAD_TO_DEG;
    guiControls.j2 = robotInstance.angles[1] * RAD_TO_DEG;
    guiControls.j3 = robotInstance.angles[2] * RAD_TO_DEG;
    guiControls.j4 = robotInstance.angles[3] * RAD_TO_DEG;
    guiControls.j5 = robotInstance.angles[4] * RAD_TO_DEG;

    guiControls.leg1 = robotInstance.leg1;
    guiControls.leg2 = robotInstance.leg2;
    guiControls.offset = robotInstance.offset;
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
        [-Math.PI, Math.PI],          // Joint 1
        [-Math.PI / 2, Math.PI / 2],  // Joint 2
        [-Math.PI / 2, Math.PI / 2],  // Joint 3
        [-Math.PI / 2, Math.PI / 2],  // Joint 4
        [-Math.PI / 2, Math.PI / 2]   // Joint 5
    ];

    // Call the method to completely recreate the robot
    robotInstance.updateGeometry(geo, limits);
}