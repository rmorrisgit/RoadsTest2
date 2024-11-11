import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class InfiniteRoadCameraDemo {
  constructor() {
    this.segments = [];
    this.segmentLength = 50;
    this.cameraTravelDistance = 0;
    this.orbitEnabled = false;
    this.proximityThreshold = 10; // Adjust the threshold as needed

    this.init();
    this.setupInfiniteRoadPath();
    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Add event listener to toggle orbit controls on 'o' key press
    window.addEventListener('keydown', this.onKeyDown.bind(this));
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
    this.pathSpeed = .2;
    this.cameraHeight = 5;

    // Initialize orbit controls
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enabled = false; // Start with orbit controls disabled

    // Create the first segment to avoid "No segments found" error
    // this.createSegment(0, 0, false);
  }

  addLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    this.scene.add(directionalLight);

    this.targetLight = new THREE.PointLight(0xff0000, 1, 50);
    this.scene.add(this.targetLight);

    this.lightHelper = new THREE.PointLightHelper(this.targetLight, 1);
    this.scene.add(this.lightHelper);
  }

  setupInfiniteRoadPath() {
    // Create path points
    this.pathPoints = [];
    for (let i = 0; i < 2000; i++) {
      const xOffset = Math.sin(i * 0.1) * 5;
      this.pathPoints.push(new THREE.Vector3(xOffset, 0, -i * 10));
    }
    this.path = new THREE.CatmullRomCurve3(this.pathPoints, false);

    // Create a line to visualize the path
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Green color for the path
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(this.path.getPoints(1000));
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    this.scene.add(pathLine);

    // Create the boxy tunnel
    const tunnelMesh = this.createBoxyTunnel();
    this.scene.add(tunnelMesh);

    // Create the left wall
    const leftWallMesh = this.createLeftWall();
    this.scene.add(leftWallMesh);
  }

  onKeyDown(event) {
    if (event.key === 'o') {
      // Toggle orbit controls
      this.orbitControls.enabled = !this.orbitControls.enabled;
    }
  }

  createLeftWall() {
    const tunnelHeight = 58; // Height of the wall
    const wallThickness = 1; // Thickness of the wall

    // Define the shape of the left wall
    const wallShape = new THREE.Shape();
    wallShape.moveTo(0, -tunnelHeight / 2);
    wallShape.lineTo(0, tunnelHeight / 2);
    wallShape.lineTo(wallThickness, tunnelHeight / 2);
    wallShape.lineTo(wallThickness, -tunnelHeight / 2);
    wallShape.closePath();

    // Extrude the shape along the path
    const extrudeSettings = {
      steps: 500,
      extrudePath: this.path,
    };

    const wallGeometry = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff444, // Yellow color
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: true,

    });

    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(-7.5, 0, 0); // Offset the wall to the left

    return wallMesh;
  }

  createBoxyTunnel() {
    const tunnelWidth = 21; // Width of the tunnel
    const tunnelHeight = 1; // Height of the tunnel

    // Define the shape of the tunnel (rectangular cross-section)
    const tunnelShape = new THREE.Shape();
    tunnelShape.moveTo(-tunnelWidth / 2, -tunnelHeight / 2);
    tunnelShape.lineTo(tunnelWidth / 2, -tunnelHeight / 2);
    tunnelShape.lineTo(tunnelWidth / 2, tunnelHeight / 2);
    tunnelShape.lineTo(-tunnelWidth / 2, tunnelHeight / 2);
    tunnelShape.closePath();

    // Extrude the shape along the path
    const extrudeSettings = {
      steps: 1000,
      extrudePath: this.path,
    };

    const tunnelGeometry = new THREE.ExtrudeGeometry(tunnelShape, extrudeSettings);
    const tunnelMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff444, // Yellow color
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: true,
    });

    const tunnelMesh = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
    tunnelMesh.position.set(tunnelWidth / 1, tunnelHeight / 2 + 9, 0); // Adjust the '10' to your desired value

    return tunnelMesh;
  }

  // Create road segment method
  // createRoadSegment(segmentZ, lastRow) {
  //   const roadWidth = 50; // Adjust the width of the road here
  //   const geometry = new THREE.BoxGeometry(roadWidth, 1, this.segmentLength + 50); // Use roadWidth for the width of the road
  //   const material = new THREE.MeshStandardMaterial({
  //     color: 0x888888, // Grey for the road
  //     roughness: 0.7,
  //     metalness: 0.1
  //   });

  //   const floorMesh = new THREE.Mesh(geometry, material);
  //   floorMesh.position.set(0, 0, segmentZ); // Position the road segment along the Z-axis

  //   return {
  //     floorMesh: floorMesh,
  //     lastRow: lastRow
  //   };
  // }

  // createSegment(lastSegmentZ, lastRow, extend = false) {
  //   const segmentZ = lastSegmentZ - this.segmentLength;

  //   // Create a new road segment here and add it to the scene
  //   const segment = this.createRoadSegment(segmentZ, lastRow);

  //   // Ensure the segment has a floorMesh and other necessary properties
  //   if (!segment || !segment.floorMesh) {
  //     console.error('Failed to create segment or floorMesh is missing');
  //     return;
  //   }

  //   if (extend) {
  //     // If extending, modify the segment to continue the path further
  //     segment.lastRow = lastRow + 1; // For example, increment the row number or update the geometry
  //   }

  //   // Push the new segment to the array
  //   this.segments.push(segment);

  //   // Add the segment to the scene
  //   this.scene.add(segment.floorMesh);
  // }

  animate() {
    if (!this.orbitControls.enabled) {
      const timeElapsed = this.clock.getElapsedTime();
      const distanceTraveled = timeElapsed * this.pathSpeed;
  
      // Calculate the path position based on the total distance traveled
      const t = (distanceTraveled / this.segmentLength) % 1; // The value of t remains between 0 and 1
  
      if (this.path) {
        const position = this.path.getPointAt(t); // Get the point on the path based on t
        const lookAtPosition = this.path.getPointAt((t + 0.01) % 1); // Look slightly ahead of the current position
  
        // Update camera position
        this.camera.position.set(position.x, position.y + this.cameraHeight, position.z);
        this.camera.lookAt(lookAtPosition);
  
        // Update light position to follow the camera
        this.targetLight.position.copy(this.camera.position.clone().add(new THREE.Vector3(0, 0, -5)));
        this.lightHelper.update();
      }
  
      // Generate new road segments if the camera is near the end of the current segment
      // const lastSegmentZ = this.segments[this.segments.length - 1].floorMesh.position.z;
      // const distanceToLastSegment = Math.abs(this.camera.position.z - lastSegmentZ);
  
      // if (distanceToLastSegment < this.proximityThreshold) {
      //   // Add a new segment in front of the camera
      //   this.createSegment(lastSegmentZ - this.segmentLength, this.segments[this.segments.length - 1].lastRow, true);
  
      //   // If there are too many segments, remove the oldest one
      //   if (this.segments.length > 10) {
      //     const oldSegment = this.segments.shift();
      //     if (oldSegment && oldSegment.floorMesh) {
      //       this.scene.remove(oldSegment.floorMesh);
      //     }
      //   }
      // }
    } else {
      this.orbitControls.update();
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
