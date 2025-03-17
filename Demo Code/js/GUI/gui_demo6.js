// gui_demo5.js
import * as THREE from "../../three/build/three.module.min.js";
import { GUI } from "../../three/examples/jsm/libs/lil-gui.module.min.js";

export var guiControls;
let normalArrow = null; // Arrow Helper to visualize the normal


        export function setupGUI(robotInstance, scene) {
    guiControls = new function () {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.nx = robotInstance.target.normal.x;
        this.ny = robotInstance.target.normal.y;
        this.nz = robotInstance.target.normal.z;
        this.highlightedVoxel = null;

        this.updateVoxelColor = () => {
            // ✅ Reset previous voxel color if applicable
            if (this.highlightedVoxel && this.highlightedVoxel.material) {
                this.highlightedVoxel.material.color.set(0xffffff);
            }
        
            // ✅ Define the main and below voxel positions
            let targetVoxelPos = new THREE.Vector3(this.x, this.y, this.z);
            let belowVoxelPos = new THREE.Vector3(this.x, this.y, this.z - 0.5);
        
            // ✅ Check if the main voxel exists
            const mainVoxelExists = [...window.voxelMap].some(v => v.equals(targetVoxelPos));
            const belowVoxelExists = [...window.voxelMap].some(v => v.equals(belowVoxelPos));
        
            if (!mainVoxelExists) {
                console.warn("❌ No voxel found at:", this.x, this.y, this.z);
                return;
            }
        
            // ✅ Search and highlight main voxel
            let foundVoxel = null;
            scene.traverse((object) => {
                if (object.isMesh && object.position) { 
                    let objectPos = object.position.clone().round();
                    if (objectPos.equals(targetVoxelPos)) {
                        foundVoxel = object;
                    }
                }
            });
        
            if (foundVoxel && foundVoxel.material) {
                foundVoxel.material.color.set(0xff0000); // Highlight main voxel in red
                this.highlightedVoxel = foundVoxel;
            }
        
            // Search and highlight the voxel below, if it exists
            let foundBelowVoxel = null;
            if (belowVoxelExists) {
                scene.traverse((object) => {
                    if (object.isMesh && object.position) { 
                        let objectPos = object.position.clone().round();
                        if (objectPos.equals(belowVoxelPos)) {
                            foundBelowVoxel = object;
                        }
                    }
                });
        
                if (foundBelowVoxel && foundBelowVoxel.material) {
                    foundBelowVoxel.material.color.set(0xff0000); // Highlight voxel below in red
                }
            }
        
            // ✅ Update normal arrow visualization
            this.updateNormalArrow();
        };

        this.updateNormalArrow = () => {
            // ✅ Remove previous arrow before adding a new one
            if (normalArrow) {
                scene.remove(normalArrow);
            }

            let goalPosition = new THREE.Vector3(this.x, this.y, this.z);
            let normalVector = new THREE.Vector3(this.nx, this.ny, this.nz).normalize();

            // ✅ Increase arrow size and make it **red** (0xff0000)
            normalArrow = new THREE.ArrowHelper(normalVector, goalPosition, 2, 0xff0000, 0.5, 0.5); // Bigger arrow
            scene.add(normalArrow);
        };

        this.goToTarget = async () => {
            const goalNormal = new THREE.Vector3(this.nx, this.ny, this.nz).normalize();
            const goalPosition = new THREE.Vector3(this.x, this.y, this.z).add(goalNormal.clone().multiplyScalar(0.5));

            let { success, path } = await robotInstance.planPathToCoordinate(goalPosition, goalNormal);

            if (!success || !Array.isArray(path)) {
                console.warn("❌ No valid path found!");
                return; // Exit early to prevent calling .forEach() on undefined
            }

            console.log("✅ Path found:", path);

            path.forEach(step => {
                robotInstance.enqueueAction(step.action);
            });
        };
    };

    const gui = new GUI();

    let targetFolder = gui.addFolder("Robot Target");
    targetFolder.add(guiControls, 'x', -10, 11, 1).name("X Coordinate").onChange(guiControls.updateVoxelColor);
    targetFolder.add(guiControls, 'y', -10, 11, 1).name("Y Coordinate").onChange(guiControls.updateVoxelColor);
    targetFolder.add(guiControls, 'z', 0, 6, 1).name("Z Coordinate").onChange(guiControls.updateVoxelColor);

    let normalFolder = gui.addFolder("Target Normal");
    normalFolder.add(guiControls, 'nx', -1, 1, 1).name("Normal X").onChange(guiControls.updateNormalArrow);
    normalFolder.add(guiControls, 'ny', -1, 1, 1).name("Normal Y").onChange(guiControls.updateNormalArrow);
    normalFolder.add(guiControls, 'nz', -1, 1, 1).name("Normal Z").onChange(guiControls.updateNormalArrow);

    let goToGoalFolder = gui.addFolder("Go To Target");
    goToGoalFolder.add(guiControls, 'goToTarget').name("GO to Target");

    targetFolder.open();
    normalFolder.open();
    goToGoalFolder.open(); // ✅ FIXED: Added parentheses
}