import * as THREE from "../three/build/three.module.min.js";
import { STLLoader } from "../three/examples/jsm/loaders/STLLoader.js";

export class Voxel {
    constructor(x, y, z, scene, path = "../voxel.stl") {
        if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") {
            console.error(" Error: Voxel coordinates must be numbers.");
            return;
        }

        this.scene = scene;
        this.path = path;
        this.position = new THREE.Vector3(x, y, z);
        this.loader = new STLLoader();

        if (!window.voxelMap){window.voxelMap = new Set();}

        this.loadVoxel();
    }

    loadVoxel() {
        this.loader.load(
            this.path, 
            (geometry) => this.onVoxelLoaded(geometry), 
            undefined, 
            (error) => console.error("Error loading voxel:", error)
        );
    }

    onVoxelLoaded(geometry) {
        let material = new THREE.MeshStandardMaterial({ color: 0xfffffff, metalness: 0.8, roughness: 0.6 });
        let voxelMesh = new THREE.Mesh(geometry, material);

        let bbox = new THREE.Box3().setFromObject(voxelMesh);
        let size = new THREE.Vector3();
        bbox.getSize(size);

        // Normalize scale: Ensure X and Y are 1, and Z is proportional
        const scaleFactor = new THREE.Vector3(1 / size.x, 1 / size.x, 1 / size.x);
        voxelMesh.scale.set(scaleFactor.x, scaleFactor.y, scaleFactor.z);
        // Adjust position after scaling
        bbox = new THREE.Box3().setFromObject(voxelMesh);
        let bboxCenter = new THREE.Vector3();
        bbox.getCenter(bboxCenter);
        voxelMesh.position.copy(this.position).sub(bboxCenter).add(new THREE.Vector3(0, 0, 0.125));


        // Enable shadows
        voxelMesh.castShadow = true;
        voxelMesh.receiveShadow = true;

        // Add voxel to the scene
        this.scene.add(voxelMesh);

        // Add it to global voxelMap
        window.voxelMap.add(new THREE.Vector3(this.position.x, this.position.y, this.position.z));

        // console.log(`✅ Voxel placed at (${this.position.x}, ${this.position.y}, ${this.position.z})`);
    }
}