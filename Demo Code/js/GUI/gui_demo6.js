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

            // ✅ Check if voxel exists in voxelMap before modifying the scene
            const voxelExists = [...window.voxelMap].some(v =>
                v.equals(new THREE.Vector3(this.x, this.y, this.z))
            );

            if (!voxelExists) {
                console.warn("❌ No voxel found at:", this.x, this.y, this.z);
                return;
            }

            // ✅ Search for voxel object in the scene at the given coordinates
            let foundVoxel = null;
            scene.traverse((object) => {
                if (object.isMesh && object.position) { // ✅ Only check meshes
                    let objectPos = object.position.clone().round(); // ✅ Round to avoid precision issues
                    let targetPos = new THREE.Vector3(this.x, this.y, this.z).round();
        
                    if (objectPos.equals(targetPos)) {
                        foundVoxel = object;
                    }
                }
            });

            if (foundVoxel && foundVoxel.material) {
                foundVoxel.material.color.set(0xff0000); // Highlight voxel in red
                this.highlightedVoxel = foundVoxel;
            } else {
                console.warn(`⚠️ Voxel exists in voxelMap but not found in scene at (${this.x}, ${this.y}, ${this.z})`);
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
            const goalPosition = new THREE.Vector3(this.x, this.y, this.z);
            const goalNormal = new THREE.Vector3(this.nx, this.ny, this.nz).normalize();

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
    targetFolder.add(guiControls, 'x', -10, 10, 1).name("X Coordinate").onChange(guiControls.updateVoxelColor);
    targetFolder.add(guiControls, 'y', -10, 10, 1).name("Y Coordinate").onChange(guiControls.updateVoxelColor);
    targetFolder.add(guiControls, 'z', 0, 5, 0.5).name("Z Coordinate").onChange(guiControls.updateVoxelColor);

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