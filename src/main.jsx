import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://cdn.skypack.dev/dat.gui';

class InfiniteRoadCameraDemo {
  constructor() {
    this.segments = [];
    this.segmentLength = 50;
    this.cameraTravelDistance = 0;
    this.proximityThreshold = 1.5; // Adjust the threshold as needed
    this.isOverheadView = false;
    this.isSideView = false; // New property for side view

    // Add targetX and targetY as class properties
    this.targetX = 0;
    this.targetY = 0;

    this.objectsToCollect = [];

    this.init();
    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  init() {
    this.scene = new THREE.Scene();
  // Add fog to the scene

  // Set up the skybox
  this.scene.background = new THREE.Color(0x000000); // Set the background to black



    // Set up camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera_.position.set(0, 0, 0);

    // Set up renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.physicallyCorrectLights = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // Limit pixel ratio to 1 for testing
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Add lights
    this.addLighting();
    this.createKatamariBall();
    this.addCollectibleObjects();

    // Create a clock for animation
    this.clock = new THREE.Clock();

    // Path movement settings
    this.pathSpeed = .16;
    const parallaxAmount = 4; // Increase for more noticeable effect


    // Add event listener for mouse movement for parallax effect
    window.addEventListener('mousemove', (event) => {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      
      // Normalize Y to be 0 at the bottom and 1 at the top
      const normalizedY = 1 - (event.clientY / window.innerHeight); // 0 at the bottom, 1 at the top
    
      // Correct the `targetY` calculation to move the camera up when the cursor moves up
      this.targetY = normalizedY * parallaxAmount; // Positive `normalizedY` moves the camera up
    
      this.targetX = mouseX * parallaxAmount;
    
      console.log('Target X:', this.targetX, 'Target Y:', this.targetY); // Debugging log
    });

    // Create the first segment to avoid "No segments found" error
    this.createSegment(0, 0, false);
   // Add dat.GUI for view mode toggle
    // Add dat.GUI for view mode toggles
    const gui = new GUI();
    gui.add(this, 'isOverheadView').name('Overhead View');
    gui.add(this, 'isSideView').name('Side View');
  }
  createRoadSegment(segmentZ, lastRow) {
    const roadWidth = 400; // Total width of the road
    const segmentDepth = this.segmentLength + 50; // Total depth of the road segment
    const stepSize = 5; // Decreased step size for more squares (must divide evenly into roadWidth and segmentDepth)
  
    // Ensure that roadWidth and segmentDepth are divisible by stepSize
    if (roadWidth % stepSize !== 0 || segmentDepth % stepSize !== 0) {
      console.warn('roadWidth and segmentDepth should be divisible by stepSize for even squares');
    }
  
    // Create an empty geometry for the grid
    const gridGeometry = new THREE.BufferGeometry();
    const vertices = [];
  
    // Generate vertical lines
    for (let i = -roadWidth / 2; i <= roadWidth / 2; i += stepSize) {
      vertices.push(i, 0, -segmentDepth / 2);
      vertices.push(i, 0, segmentDepth / 2);
    }
  
    // Generate horizontal lines
    for (let j = -segmentDepth / 2; j <= segmentDepth / 2; j += stepSize) {
      vertices.push(-roadWidth / 2, 0, j);
      vertices.push(roadWidth / 2, 0, j);
    }
  
    // Add vertices to the geometry
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
    // Create a material for the grid with a color
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xffcc0,
      linewidth: 1.5 // Adjust as needed
    });
  
    // Create the grid as a LineSegments object
    const gridHelper = new THREE.LineSegments(gridGeometry, gridMaterial);
    gridHelper.position.set(0, 0.1, segmentZ); // Slightly above ground to prevent z-fighting
    gridHelper.frustumCulled = true;
  
    return {
      floorMesh: gridHelper,
      lastRow: lastRow
    };

  }


  createKatamariBall() {
    const ballGeometry = new THREE.SphereGeometry(1, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.katamariBall = new THREE.Mesh(ballGeometry, ballMaterial);
    this.katamariBall.position.set(0, 1, -5); // Initially place it slightly in front of the camera
    this.scene.add(this.katamariBall);
  }
  addCollectibleObjects() {
    for (let i = 0; i < 50; i++) {
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
      const object = new THREE.Mesh(geometry, material);
      object.position.set(Math.random() * 40 - 20, 0.5, Math.random() * -200 - 10); // Placed along the Z-axis
      this.scene.add(object);
      this.objectsToCollect.push(object);
    }
  }

  checkForCollisions() {
    const ballRadius = this.katamariBall.geometry.parameters.radius;
    this.objectsToCollect = this.objectsToCollect.filter((object) => {
      const distance = this.katamariBall.position.distanceTo(object.position);
      if (distance < ballRadius + 0.5) {
        this.katamariBall.add(object);
        object.position.set(
          (Math.random() - 0.5) * ballRadius * 2,
          (Math.random() - 0.5) * ballRadius * 2,
          (Math.random() - 0.5) * ballRadius * 2
        );
        return false;
      }
      return true;
    });
  }
  
  addLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10).normalize();
    this.scene.add(directionalLight);
  }


  createSegment(lastSegmentZ, lastRow, extend = false) {
    const segmentZ = lastSegmentZ - this.segmentLength;

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
    const lerpSpeed = 0.05; // Speed for parallax movement
  
    if (this.isOverheadView) {
      this.camera.position.set(0, 120, this.camera.position.z);
      this.camera.rotation.set(-Math.PI / 2, 0, 0);
    } else if (this.isSideView) {
      this.camera.position.set(50, 5, this.camera.position.z);
      this.camera.rotation.set(0, Math.PI / 2, 0);
    } else {
      // Default view with parallax
      this.camera.position.x += (this.targetX - this.camera.position.x) * lerpSpeed;
      this.camera.position.y += (this.targetY - this.camera.position.y + 2) * lerpSpeed;
  
      // Remove the minimum Y constraint for full vertical movement range
      this.camera.rotation.set(0, 0, 0);
      const lookAtPosition = new THREE.Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z - 1);
      this.camera.lookAt(lookAtPosition);
    }
    this.katamariBall.position.set(this.camera.position.x, 1, this.camera.position.z - 5);

    // Move the camera straight along the Z-axis for all views
    this.camera.position.z -= this.pathSpeed;
  
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
  
    // Rotate and move Katamari ball
    this.katamariBall.rotation.x -= 0.02;
    this.katamariBall.rotation.z -= 0.01;
    this.katamariBall.position.z += 0.05;

    // Check for collisions and grow Katamari ball
    this.checkForCollisions();
    const scaleFactor = 1 + (50 - this.objectsToCollect.length) * 0.02;
    this.katamariBall.scale.set(scaleFactor, scaleFactor, scaleFactor);

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
