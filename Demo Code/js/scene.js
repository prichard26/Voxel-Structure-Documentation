import * as THREE from "../three/build/three.module.min.js";
import { OrbitControls } from "../three/examples/jsm/controls/OrbitControls.js";

var container, scene, camera, renderer;
export{scene, camera, renderer};

export function initScene() {
	container = document.getElementById( 'webgl' );

	renderer = new THREE.WebGLRenderer({
		antialias: true, 				// to get smoother output
		preserveDrawingBuffer: false, 	// no screenshot -> faster?
	  });
	renderer.setClearColor(0x99bbcc);

	renderer.setSize(window.innerWidth, window.innerHeight)
	container.appendChild( renderer.domElement );

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 10000)
	camera.up.set(0, 0, 1);
  	camera.position.set(15, 15, 10);
  	scene.add(camera);

	var light = new THREE.AmbientLight(0xffffff);
	scene.add(light);
	var light2 = new THREE.DirectionalLight(0xffffff);
	light2.position.set(1, 1.3, 1).normalize();
	scene.add(light2);
  
	var cameraControls = new OrbitControls(camera, renderer.domElement);
	cameraControls.addEventListener('change', () => renderer.render(scene, camera));
  
	function onWindowResize() 
	{
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.render(scene, camera);
	}
	
	window.addEventListener('resize', onWindowResize, false);

	var size = 15;
	var step = 15;

	var gridHelper = new THREE.GridHelper(size, step);
	gridHelper.rotation.x = Math.PI / 2;
	scene.add(gridHelper);

	var axisHelper = new THREE.AxesHelper(5);
	var colors = axisHelper.geometry.attributes.color.array;

	colors.set( [
		0, 1, 0,    0, 1, 0, // x-axis rgb at origin; rgb at end of segment
		1, 0, 0,    1, 0, 0, // y-axis
		0, 0, 1,    0, 0, 1  // z-axis
	] );

	scene.add(axisHelper);
	animate();
}

function animate() {
	requestAnimationFrame( animate );
	render();
}

function render(now) {
	renderer.render(scene, camera);
	
}