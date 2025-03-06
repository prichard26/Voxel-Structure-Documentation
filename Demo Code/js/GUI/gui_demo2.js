export var guiControls;
var RAD_TO_DEG = 180 / Math.PI;

export function setupGUI(robotInstance) {

    guiControls = new function() {
        this.j1 = robotInstance.angles[0] * RAD_TO_DEG;
        this.j2 = robotInstance.angles[1] * RAD_TO_DEG;
        this.j3 = robotInstance.angles[2] * RAD_TO_DEG;
        this.j4 = robotInstance.angles[3] * RAD_TO_DEG;
        this.j5 = robotInstance.angles[4] * RAD_TO_DEG;

        this.targetX = robotInstance.target.x;
        this.targetY = robotInstance.target.y;
        this.targetZ = robotInstance.target.z;

        this.Fixed_Leg = "end 1";
    };

    var gui = new dat.GUI();

    // Angles are READ-ONLY explicitly:
    let jointsGui = gui.addFolder('Robot Angles (read-only)');
    jointsGui.add(guiControls, 'j1', -180, 180).step(1).listen();
    jointsGui.add(guiControls, 'j2', -180, 180).step(1).listen();
    jointsGui.add(guiControls, 'j3', -180, 180).step(1).listen();
    jointsGui.add(guiControls, 'j4', -180, 180).step(1).listen();
    jointsGui.add(guiControls, 'j5', -180, 180).step(1).listen();

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
        robotInstance.setToTarget(guiControls.targetX, guiControls.targetY, guiControls.targetZ);
        updateGUI(robotInstance);
    }
}

export function updateGUI(robotInstance) {
    guiControls.j1 = robotInstance.angles[0] * RAD_TO_DEG;
    guiControls.j2 = robotInstance.angles[1] * RAD_TO_DEG;
    guiControls.j3 = robotInstance.angles[2] * RAD_TO_DEG;
    guiControls.j4 = robotInstance.angles[3] * RAD_TO_DEG;
    guiControls.j5 = robotInstance.angles[4] * RAD_TO_DEG;

    guiControls.targetX = robotInstance.target.x;
    guiControls.targetY = robotInstance.target.y;
    guiControls.targetZ = robotInstance.target.z;
}