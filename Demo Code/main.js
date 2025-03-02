// main.js (Simulation Entry Point)
import { initScene, scene } from "./js/scene.js";
import { setupGUI, updateGUI, controlEndEffector } from "./js/gui.js";
import { THREERobot } from "./js/robot.js";

initScene();

var VisualRobot = new THREERobot(
    [
        [0, 0, 2],
        [0, 0, 5],
        [0, 0, 5],
        [0, 0, 2],
        [0, 0, 0],
    ],
    [
        [-190 / 180 * Math.PI, 190 / 180 * Math.PI],
        [-58 / 180 * Math.PI, 90 / 180 * Math.PI],
        [-135 / 180 * Math.PI, 40 / 180 * Math.PI],
        [-90 / 180 * Math.PI, 75 / 180 * Math.PI],
        [-139 / 180 * Math.PI, 20 / 180 * Math.PI],
    ],
    scene
);

VisualRobot.setAngle(1,-Math.PI/8);
VisualRobot.setAngle(2,Math.PI/2);
VisualRobot.setAngle(3,Math.PI/2);

setupGUI(VisualRobot);
updateGUI(VisualRobot);

controlEndEffector(VisualRobot);


// QUESTIONS 

// There is 5 vertices and used to be 6 But on the robot only 4 are visible what is the fith one
// Joints Limits are Randomly Set ? 

// For extemple here why is there the 5th and 6th one \
// Work without the last one
// geo = [
// 	[0, 0, guiControls.offset],
// 	[0, 0, guiControls.leg1],
// 	[0, 0, guiControls.leg2],
// 	[0, 0, guiControls.offset],
// 	[0, 0, 0],
// 	[0, 0, 0],
// ];
