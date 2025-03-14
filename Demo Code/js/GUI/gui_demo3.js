import { GUI } from "../../three/examples/jsm/libs/lil-gui.module.min.js";
import { Voxel } from "../voxel.js";
import { scene } from "../scene.js";

export function setupGUI() {
    const gui = new GUI();
    
    let voxelParams = {
        x: 0, y: 0, z: 0,
        placeVoxel: function () {
            new Voxel(voxelParams.x, voxelParams.y, voxelParams.z, scene);
        }
    };

    let folder = gui.addFolder('Voxel Placement');
    folder.add(voxelParams, 'x', -5, 5, 0.5);
    folder.add(voxelParams, 'y', -5, 5, 0.5);
    folder.add(voxelParams, 'z', 0, 10, 0.5);
    folder.add(voxelParams, 'placeVoxel').name('Add Voxel');
}