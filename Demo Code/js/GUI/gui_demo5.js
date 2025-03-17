// gui_demo5.js
import * as THREE from "../../three/build/three.module.min.js";
import { GUI } from "../../three/examples/jsm/libs/lil-gui.module.min.js";

export var guiControls;

export function setupGUI(robotInstance, scene) {
    guiControls = new function () {
        this.x = 0;
        this.y = 0;
        this.highlightedVoxel = null;

        this.getHighestVoxel = () => {
            let maxZ = -Infinity; 
            let highestVoxel = null;

            // ✅ Iterate through the voxel map to find the highest voxel at (x, y)
            for (let voxel of window.voxelMap) {
                if (voxel.x === this.x && voxel.y === this.y && voxel.z > maxZ) {
                    maxZ = voxel.z;
                    highestVoxel = voxel;
                }
            }

            return highestVoxel ? new THREE.Vector3(highestVoxel.x, highestVoxel.y, highestVoxel.z) : null;
        };

        this.updateVoxelColor = () => {
            // ✅ Reset previous voxel color if applicable
            if (this.highlightedVoxel && this.highlightedVoxel.material) {
                this.highlightedVoxel.material.color.set(0xffffff);
            }

            let highestVoxelPos = this.getHighestVoxel();

            if (!highestVoxelPos) {
                console.warn("❌ No voxel found at:", this.x, this.y);
                return;
            }

            let foundVoxel = null;
            scene.traverse((object) => {
                if (object.isMesh && object.position) { // ✅ Only check meshes
                    let objectPos = object.position.clone().round();
                    if (objectPos.equals(highestVoxelPos)) {
                        foundVoxel = object;
                    }
                }
            });

            if (foundVoxel && foundVoxel.material) {
                foundVoxel.material.color.set(0xff0000); // Highlight voxel in red
                this.highlightedVoxel = foundVoxel;
            } else {
                console.warn(`⚠️ Voxel exists in voxelMap but not found in scene at (${this.x}, ${this.y}, ${highestVoxelPos.z})`);
            }
        };

        this.goToTarget = async () => {
            let highestVoxelPos = this.getHighestVoxel();
            if (!highestVoxelPos) {
                console.warn("❌ No valid target voxel found!");
                return;
            }

            const goalPosition = highestVoxelPos.clone();
            const goalNormal = new THREE.Vector3(0, 0, 1); // Assume upward normal

            let { success, path } = await robotInstance.planPathToCoordinate(goalPosition, goalNormal);

            if (!success || !Array.isArray(path)) {
                console.warn("❌ No valid path found!");
                return;
            }

            console.log("✅ Path found:", path);

            path.forEach(step => {
                robotInstance.enqueueAction(step.action);
            });
        };
    };

    const gui = new GUI();

    let targetFolder = gui.addFolder("Robot Target");
    targetFolder.add(guiControls, 'x', -8, 8, 1).name("X Coordinate").onChange(guiControls.updateVoxelColor);
    targetFolder.add(guiControls, 'y', -8, 8, 1).name("Y Coordinate").onChange(guiControls.updateVoxelColor);

    let goToGoalFolder = gui.addFolder("Go To Target");
    goToGoalFolder.add(guiControls, 'goToTarget').name("GO to Target");

    targetFolder.open();
    goToGoalFolder.open();
}