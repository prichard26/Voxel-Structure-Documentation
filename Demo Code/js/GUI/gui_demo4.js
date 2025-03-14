import { GUI } from "../../three/examples/jsm/libs/lil-gui.module.min.js";		

export var guiControls;

export function setupGUI(robotInstance) {
    guiControls = new function() {
        this.showTrajectory = false;
    };

    var gui = new GUI();

    // ========== MOVEMENT CONTROLS ==========
    let mvtListGui = gui.addFolder('Movement List');

    mvtListGui.add({ moveForward: () => robotInstance.enqueueAction("goForward") }, 'moveForward');
    mvtListGui.add({ moveBackward: () => robotInstance.enqueueAction("goBackward") }, 'moveBackward');
    mvtListGui.add({ turnRight: () => robotInstance.enqueueAction("turnRight") }, 'turnRight');
    mvtListGui.add({ turnLeft: () => robotInstance.enqueueAction("turnLeft") }, 'turnLeft');
    mvtListGui.add({ climbUp: () => robotInstance.enqueueAction("climbUp") }, 'climbUp');
    mvtListGui.add({ climbDown: () => robotInstance.enqueueAction("climbDown") }, 'climbDown');


    mvtListGui.add({ planTransitionConvex: () => robotInstance.enqueueAction("planTransitionConvex") }, 'planTransitionConvex');
    mvtListGui.add({ planTransitionConcave: () => robotInstance.enqueueAction("planTransitionConcave") }, 'planTransitionConcave');

    // ========== TRAJECTORY CONTROLS ==========
    let trajectoryGui = gui.addFolder('Movement Trajectory');
    
    trajectoryGui.add(guiControls, 'showTrajectory').onChange(value => {
        robotInstance.showTrajectory = value;
    });

    trajectoryGui.add({ clearTrajectory: () => robotInstance.clearTrajectory() }, 'clearTrajectory');
}