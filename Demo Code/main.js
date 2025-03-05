import { initScene, scene } from "./js/scene.js";
import { setupGUI, updateGUI} from "./js/gui.js"; //, controlEndEffector 
import { THREERobot } from "./js/robot.js";


// First initialize the scene with the camera angle, the light, the background color and the grid
initScene();

// Then initialize our robot 
var VisualRobot = new THREERobot(
    [ // Geometry
        [0, 0, 2],    
        [0, 0, 5],
        [0, 0, 5],
        [0, 0, 2],
        [0, 0, 0],
    ],
    [ // Limits on joint angles
        [-190 / 180 * Math.PI, 190 / 180 * Math.PI],
        [-58 / 180 * Math.PI, 90 / 180 * Math.PI],
        [-135 / 180 * Math.PI, 40 / 180 * Math.PI],
        [-90 / 180 * Math.PI, 75 / 180 * Math.PI],
        [-139 / 180 * Math.PI, 20 / 180 * Math.PI],
    ],
    scene
);

// Initial robot position
VisualRobot.setAngle(1,15*Math.PI/8); 
VisualRobot.setAngle(2,Math.PI/2);
VisualRobot.setAngle(3,Math.PI/2);


// Finally setup and update the GIU
setupGUI(VisualRobot);
updateGUI(VisualRobot);