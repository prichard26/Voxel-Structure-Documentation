export var guiControls;

export function setupGUI(robotInstance) {
    guiControls = new function() {
        this.showTrajectory = false;
    };

    var gui = new dat.GUI();

    // ========== MOVEMENT CONTROLS ==========
    let mvtListGui = gui.addFolder('Movement List');
    mvtListGui.add({ moveForward: () => robotInstance.goForward() }, 'moveForward');
    mvtListGui.add({ moveBackward: () => robotInstance.goBackward() }, 'moveBackward');
    mvtListGui.add({ turnRight: () => robotInstance.turnRight() }, 'turnRight');
    mvtListGui.add({ turnLeft: () => robotInstance.turnLeft() }, 'turnLeft');

    // ========== TRAJECTORY CONTROLS ==========
    let trajectoryGui = gui.addFolder('Movement Trajectory');
    
    trajectoryGui.add(guiControls, 'showTrajectory').onChange(value => {
        robotInstance.showTrajectory = value;
    });

    trajectoryGui.add({ clearTrajectory: () => robotInstance.clearTrajectory() }, 'clearTrajectory');
}