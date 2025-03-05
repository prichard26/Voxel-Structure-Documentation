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
        this.j1 = robotInstance.angles[0] * RAD_TO_DEG;
        this.j2 = robotInstance.angles[1] * RAD_TO_DEG;
        this.j3 = robotInstance.angles[2] * RAD_TO_DEG;
        this.j4 = robotInstance.angles[3] * RAD_TO_DEG;
        this.j5 = robotInstance.angles[4] * RAD_TO_DEG;

        // Read dimensions from robot geometry
        this.leg1 = robotInstance.robotBones[2].position.z; 
        this.leg2 = robotInstance.robotBones[3].position.z;
        this.offset = robotInstance.robotBones[4].position.z; 

        this.Fixed_Leg = "end 1";
    };

    var gui = new dat.GUI();

    var geometryGui = gui.addFolder('Robot Geometry');
    geometryParams.push(geometryGui.add(guiControls, 'leg1', 1.00, 10.0).step(0.1).listen());
    geometryParams.push(geometryGui.add(guiControls, 'leg2', 1.00, 10.0).step(0.1).listen());
    geometryParams.push(geometryGui.add(guiControls, 'offset', 1.00, 10.0).step(0.1).listen());

    var jointsGui = gui.addFolder('Robot Joints');
    jointsParams.push(jointsGui.add(guiControls, 'j1', 0.00, 360.0).step(0.5).listen());
    jointsParams.push(jointsGui.add(guiControls, 'j2', 0.00, 360.0).step(0.5).listen());
    jointsParams.push(jointsGui.add(guiControls, 'j3', 0.00, 360.0).step(0.5).listen());
    jointsParams.push(jointsGui.add(guiControls, 'j4', 0.00, 360.0).step(0.5).listen());
    jointsParams.push(jointsGui.add(guiControls, 'j5', 0.00, 360.0).step(0.5).listen());

    var endtarget = gui.addFolder('Target End');
    end = endtarget.add(guiControls, 'Fixed_Leg', ["end 1", "end 2"]);
}

export function updateGUI(robotInstance) {
    /*
    Updates GUI controls and ensures the target moves with the robot.
    */
    
    // 🔹 Step 1: Refresh GUI values based on the updated robot instance
    guiControls.j1 = robotInstance.angles[0] * RAD_TO_DEG;
    guiControls.j2 = robotInstance.angles[1] * RAD_TO_DEG;
    guiControls.j3 = robotInstance.angles[2] * RAD_TO_DEG;
    guiControls.j4 = robotInstance.angles[3] * RAD_TO_DEG;
    guiControls.j5 = robotInstance.angles[4] * RAD_TO_DEG;

    // 🔹 Step 2: Apply onChange listeners
    for (let i = 0; i < jointsParams.length; i++) {
        jointsParams[i].onChange(() => {
            if (robotInstance) {
                robotInstance.setAngle(i, guiControls[`j${i+1}`] * DEG_TO_RAD);
            }
        });
    }
    for (let i = 0; i < geometryParams.length; i++) {
        geometryParams[i].onChange(() => {
            updateRobotGeometry(robotInstance);
        });
    }
    end.onChange(() => {
        robotInstance.swapFixedLeg();
        
        // 🔹 Step 3: Refresh the GUI again after swapping the leg
        guiControls.j1 = robotInstance.angles[0] * RAD_TO_DEG;
        guiControls.j2 = robotInstance.angles[1] * RAD_TO_DEG;
        guiControls.j3 = robotInstance.angles[2] * RAD_TO_DEG;
        guiControls.j4 = robotInstance.angles[3] * RAD_TO_DEG;
        guiControls.j5 = robotInstance.angles[4] * RAD_TO_DEG;
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
        [-Math.PI, Math.PI],          // Joint 1
        [-Math.PI / 2, Math.PI / 2],  // Joint 2
        [-Math.PI / 2, Math.PI / 2],  // Joint 3
        [-Math.PI / 2, Math.PI / 2],  // Joint 4
        [-Math.PI / 2, Math.PI / 2]   // Joint 5
    ];

    // Call the method to completely recreate the robot
    robotInstance.updateGeometry(geo, limits);
}