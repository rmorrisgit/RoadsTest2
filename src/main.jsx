import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class InfiniteRoadCameraDemo {
  constructor() {
    this.segments = [];
    this.segmentLength = 50;
    this.cameraTravelDistance = 0;
    this.proximityThreshold = 80; // Adjust the threshold as needed

    this.init();
    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
  }

  init() {
    this.scene = new THREE.Scene();

    // Set up the skybox
    const textureLoader = new THREE.CubeTextureLoader();
    this.scene.background = textureLoader.load([
      'resources/skybox/Cold_Sunset__Cam_2_Left+X.png',
      'resources/skybox/Cold_Sunset__Cam_3_Right-X.png',
      'resources/skybox/Cold_Sunset__Cam_4_Up+Y.png',
      'resources/skybox/Cold_Sunset__Cam_5_Down-Y.png',
      'resources/skybox/Cold_Sunset__Cam_0_Front+Z.png',
      'resources/skybox/Cold_Sunset__Cam_1_Back-Z.png'
    ]);

    // Set up camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera_.position.set(0, 2, 0);

    // Set up renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.physicallyCorrectLights = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Add lights
    this.addLighting();

    // Create a clock for animation
    this.clock = new THREE.Clock();

    // Path movement settings
    this.pathSpeed = .8;
    this.cameraHeight = 5;

  
    // Create the first segment to avoid "No segments found" error
    this.createSegment(0, 0, false);
  }
  createRoadSegment(segmentZ, lastRow) {
    const roadWidth = 150;
    const segmentDepth = this.segmentLength + 50;
    const gridSize = 20; // Adjust this for the number of segments per road section
  
    // Create an empty geometry for the grid
    const gridGeometry = new THREE.BufferGeometry();
    const vertices = [];
  
    // Generate vertices for the quad grid
    for (let i = -roadWidth / 2; i <= roadWidth / 2; i += roadWidth / gridSize) {
      // Vertical lines
      vertices.push(i, 0, -segmentDepth / 2);
      vertices.push(i, 0, segmentDepth / 2);
    }
    for (let j = -segmentDepth / 2; j <= segmentDepth / 2; j += segmentDepth / gridSize) {
      // Horizontal lines
      vertices.push(-roadWidth / 2, 0, j);
      vertices.push(roadWidth / 2, 0, j);
    }
  
    // Add vertices to the geometry
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
    // Create a material for the grid
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xf0cff0, // Neon pink color
      linewidth: 1.5 // Adjust as needed
    });
  
    // Create the grid as a LineSegments object
    const gridHelper = new THREE.LineSegments(gridGeometry, gridMaterial);
    gridHelper.position.set(0, 0.1, segmentZ); // Slightly above ground to prevent z-fighting
  
    return {
      floorMesh: gridHelper,
      lastRow: lastRow
    };
  }
  
  addLighting() {
    // Lower ambient light to keep a darker background
    const ambientLight = new THREE.AmbientLight(0x330066, 0.1);
    this.scene.add(ambientLight);
  
    // Add colored directional lights to simulate neon lighting
    // const neonLight1 = new THREE.PointLight(0xff00ff, 0.5, 100);
    // neonLight1.position.set(20, 30, 10);
    // this.scene.add(neonLight1);
  
    // const neonLight2 = new THREE.PointLight(0x00ffff, 0.5, 100);
    // neonLight2.position.set(-20, 30, -10);
    // this.scene.add(neonLight2);
  }
  
  

  createSegment(lastSegmentZ, lastRow, extend = false) {
    const segmentZ = lastSegmentZ - (this.segmentLength);

    // Create a new road segment here and add it to the scene
    const segment = this.createRoadSegment(segmentZ, lastRow);

    // Ensure the segment has a floorMesh and other necessary properties
    if (!segment || !segment.floorMesh) {
      console.error('Failed to create segment or floorMesh is missing');
      return;
    }

    if (extend) {
      // If extending, modify the segment to continue the path further
      segment.lastRow = lastRow + 1; // For example, increment the row number or update the geometry
    }

    // Push the new segment to the array
    this.segments.push(segment);

    // Add the segment to the scene
    this.scene.add(segment.floorMesh);
  }

  animate() {

      const timeElapsed = this.clock.getElapsedTime();
      // Move the camera straight along the Z-axis
      this.camera.position.z -= this.pathSpeed; // Move the camera forward
      this.camera.position.y = this.cameraHeight; // Keep the camera at a fixed height
  
      const lookAtPosition = new THREE.Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z - 1);
      this.camera.lookAt(lookAtPosition);
  
      const lastSegmentZ = this.segments[this.segments.length - 1].floorMesh.position.z;
      const distanceToLastSegment = Math.abs(this.camera.position.z - lastSegmentZ);
  
      if (distanceToLastSegment < this.proximityThreshold) {
        // Add a new segment in front of the camera
        this.createSegment(lastSegmentZ - this.segmentLength, this.segments[this.segments.length - 1].lastRow, true);
  
        // If there are too many segments, remove the oldest one
        if (this.segments.length > 10) {
          const oldSegment = this.segments.shift();
          if (oldSegment && oldSegment.floorMesh) {
            this.scene.remove(oldSegment.floorMesh);
          }
        }
 
    }
  
    this.renderer.render(this.scene, this.camera);
  }
  
  
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Initialize the app
window.addEventListener('DOMContentLoaded', () => {
  new InfiniteRoadCameraDemo();
});
