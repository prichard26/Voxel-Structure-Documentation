import { GUI } from "../../three/examples/jsm/libs/lil-gui.module.min.js";
 
export var guiControls;
var RAD_TO_DEG = 180 / Math.PI;

export function setupGUI(robotInstance) {

    guiControls = new function() {
        this.j1 = parseFloat((robotInstance.angles[0] * RAD_TO_DEG).toFixed(1));
        this.j2 = parseFloat((robotInstance.angles[1] * RAD_TO_DEG).toFixed(1));
        this.j3 = parseFloat((robotInstance.angles[2] * RAD_TO_DEG).toFixed(1));
        this.j4 = parseFloat((robotInstance.angles[3] * RAD_TO_DEG).toFixed(1));
        this.j5 = parseFloat((robotInstance.angles[4] * RAD_TO_DEG).toFixed(1));
        
        this.targetX = parseFloat(robotInstance.target.position.x.toFixed(1));
        this.targetY = parseFloat(robotInstance.target.position.y.toFixed(1));
        this.targetZ = parseFloat(robotInstance.target.position.z.toFixed(1));
        
        this.targetNX = robotInstance.target.normal.x;
        this.targetNY = robotInstance.target.normal.y;
        this.targetNZ = robotInstance.target.normal.z;

        this.Fixed_Leg = "end 1";
    };

    var gui = new GUI();

    // Angles are READ-ONLY explicitly:
    let jointsGui = gui.addFolder('Robot Angles (read-only)');
    jointsGui.add(guiControls, 'j1', -180, 180).step(0.1).listen();
    jointsGui.add(guiControls, 'j2', -180, 180).step(0.1).listen();
    jointsGui.add(guiControls, 'j3', -180, 180).step(0.1).listen();
    jointsGui.add(guiControls, 'j4', -180, 180).step(0.1).listen();
    jointsGui.add(guiControls, 'j5', -180, 180).step(0.1).listen();

    // Target controls explicitly:
    let targetGui = gui.addFolder('Target Control');
    var targetXController = targetGui.add(guiControls, 'targetX', -5, 5).step(0.1).onChange(updateTarget);
    var targetYController = targetGui.add(guiControls, 'targetY', -5, 5).step(0.1).onChange(updateTarget);
    var targetZController = targetGui.add(guiControls, 'targetZ', -5, 5).step(0.1).onChange(updateTarget);


    targetGui.add(guiControls, 'Fixed_Leg', ["end 1", "end 2"]).onChange(() => {
        robotInstance.swapFixedLeg();
        updateGUI(robotInstance);
    
        targetXController.updateDisplay();
        targetYController.updateDisplay();
        targetZController.updateDisplay();
    });

    function updateTarget(){
        robotInstance.setToTargetIK(guiControls.targetX, guiControls.targetY, guiControls.targetZ, guiControls.targetNX, guiControls.targetNY, guiControls.targetNZ);
        updateGUI(robotInstance);
    }
}

export function updateGUI(robotInstance) {
    guiControls.j1 = parseFloat((((robotInstance.angles[0] + Math.PI) % (2 * Math.PI) - Math.PI) * RAD_TO_DEG).toFixed(1));
    guiControls.j2 = parseFloat((((robotInstance.angles[1] + Math.PI) % (2 * Math.PI) - Math.PI) * RAD_TO_DEG).toFixed(1));
    guiControls.j3 = parseFloat((((robotInstance.angles[2] + Math.PI) % (2 * Math.PI) - Math.PI) * RAD_TO_DEG).toFixed(1));
    guiControls.j4 = parseFloat((((robotInstance.angles[3] + Math.PI) % (2 * Math.PI) - Math.PI) * RAD_TO_DEG).toFixed(1));
    guiControls.j5 = parseFloat((((robotInstance.angles[4] + Math.PI) % (2 * Math.PI) - Math.PI) * RAD_TO_DEG).toFixed(1));

    guiControls.targetX = robotInstance.target.position.x;
    guiControls.targetY = robotInstance.target.position.y;
    guiControls.targetZ = robotInstance.target.position.z;
}