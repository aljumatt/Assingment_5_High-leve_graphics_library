import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';



function main() {




    // --- setup stuff ---
    // get canvas
    const canvas = document.querySelector('#c');

    // setup rendering
    //const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas,
        logarithmicDepthBuffer: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight); // makes it fill full screen (kinda gets streched though)

    // setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('black');

    // setup ui
    const gui = new GUI();





    // --- camera shit ---


    // create main camera
    /*
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;  // the canvas default is 2 but overide because I made it fill full window
    const near = 0.1;
    const far = 30;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    */
    const left = -1;
    const right = 1;
    const top = 1;
    const bottom = -1;
    const near = 0.1;
    const far = 50;
    const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
    camera.zoom = 0.2;

    // move camera back slighlty so we can actualy see
    camera.position.y = 3;
    camera.position.z = 10;

    // create camera helper
    const cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);

    // get the two canvas views
    const view1Elem = document.querySelector('#view1');
    const view2Elem = document.querySelector('#view2');

    // setup split
    const layoutSettings = {
        leftWidthPercent: 50
    };

    // 2. Set the initial CSS widths so they match the starting value
    view1Elem.style.width = `${layoutSettings.leftWidthPercent}%`;
    view2Elem.style.width = `${100 - layoutSettings.leftWidthPercent}%`;

    // 3. Add it to the GUI
    const layoutGui = gui.addFolder('Layout');
    layoutGui.add(layoutSettings, 'leftWidthPercent', 0, 100, 1)
        .name('Left View %')
        .onChange((value) => {
            view1Elem.style.width = `${value}%`;
            view2Elem.style.width = `${100 - value}%`;
        });
    layoutGui.close()



    // camera stuff for gui thing in top right
    class MinMaxGUIHelper {
        constructor(obj, minProp, maxProp, minDif) {
            this.obj = obj;
            this.minProp = minProp;
            this.maxProp = maxProp;
            this.minDif = minDif;
        }
        get min() {
            return this.obj[this.minProp];
        }
        set min(v) {
            this.obj[this.minProp] = v;
            this.obj[this.maxProp] = Math.max(this.obj[this.maxProp], v + this.minDif);
        }
        get max() {
            return this.obj[this.maxProp];
        }
        set max(v) {
            this.obj[this.maxProp] = v;
            this.min = this.min;  // this will call the min setter
        }
    }
    const camGui = gui.addFolder('camera');
    camGui.add(camera, 'zoom', 0.01, 1, 0.01).listen();
    //gui.add(camera, 'fov', 1, 180)
    const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.1);
    camGui.add(minMaxGUIHelper, 'min', 0.1, 50, 0.1).name('near')
    camGui.add(minMaxGUIHelper, 'max', 0.1, 50, 0.1).name('far')
    camGui.close()


    // setup camera controlls
    const controls = new OrbitControls(camera, view1Elem);
    controls.update();


    // setup second camera
    const camera2 = new THREE.PerspectiveCamera(
        60,  // fov
        2,   // aspect
        0.1, // near
        500, // far
    );
    camera2.position.set(40, 10, 30);
    camera2.lookAt(0, 5, 0);

    const controls2 = new OrbitControls(camera2, view2Elem);
    controls2.target.set(0, 0, 0);
    controls2.update();


    // scisor magic function
    function setScissorForElement(elem) {
        const canvasRect = canvas.getBoundingClientRect();
        const elemRect = elem.getBoundingClientRect();

        // compute a canvas relative rectangle
        const right = Math.min(elemRect.right, canvasRect.right) - canvasRect.left;
        const left = Math.max(0, elemRect.left - canvasRect.left);
        const bottom = Math.min(elemRect.bottom, canvasRect.bottom) - canvasRect.top;
        const top = Math.max(0, elemRect.top - canvasRect.top);

        const width = Math.min(canvasRect.width, right - left);
        const height = Math.min(canvasRect.height, bottom - top);

        // setup the scissor to only render to that part of the canvas
        const positiveYUpBottom = canvasRect.height - bottom;
        renderer.setScissor(left, positiveYUpBottom, width, height);
        renderer.setViewport(left, positiveYUpBottom, width, height);

        // return the aspect
        return width / height;
    }








    // --- create objects in scene ---

    // load windmill
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();
    let mill;
    mtlLoader.load('resources/models/Windmill/PUSHILIN_windmill.mtl', (mtl) => {
        mtl.preload();
        objLoader.setMaterials(mtl);
        objLoader.load('resources/models/Windmill/PUSHILIN_windmill.obj', (root) => {
            scene.add(root);
            mill = root;
        });
    });


    // --- floor ---
    const floorSize = 15

    // floor texture
    const loader = new THREE.TextureLoader();
    const floorTex = loader.load('resources/images/checker.png');
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.magFilter = THREE.NearestFilter;
    floorTex.colorSpace = THREE.SRGBColorSpace;
    const repeats = floorSize / 2;
    floorTex.repeat.set(repeats, repeats);

    // create floor
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMat = new THREE.MeshPhongMaterial({
        map: floorTex,
        side: THREE.DoubleSide,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = Math.PI * -.5;
    floorMesh.position.y -= 1.05
    scene.add(floorMesh);



    // --- other objects ---
    {
        const cubeSize = 1;
        const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const cubeMat = new THREE.MeshPhongMaterial({ color: '#8AC' });
        const mesh = new THREE.Mesh(cubeGeo, cubeMat);
        mesh.position.set(4, 0, 0);
        scene.add(mesh);
    }
    {
        const sphereRadius = 1;
        const sphereWidthDivisions = 32;
        const sphereHeightDivisions = 16;
        const sphereGeo = new THREE.SphereGeometry(sphereRadius, sphereWidthDivisions, sphereHeightDivisions);
        const sphereMat = new THREE.MeshPhongMaterial({ color: '#CA8' });
        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        mesh.position.set(-4, 0, 0);
        scene.add(mesh);
    }


    // generate a bunch of cones
    const coneGeo = new THREE.ConeGeometry(0.25, 0.5, 16);
    const numCones = 20
    let rainbowColor = new THREE.Color();
    for (let i = 0; i < numCones; i += 1) {
        let hue = (i / numCones) * 0.85;
        rainbowColor.setHSL(hue, 1.0, 0.5);
        const coneMat = new THREE.MeshPhongMaterial({ color: rainbowColor });
        const mesh = new THREE.Mesh(coneGeo, coneMat);
        mesh.position.set(-5 + 10 * (i / numCones), -0.75, -5);
        scene.add(mesh);
    }






    // --- skybox ---

    const skyBoxTex = loader.load(
        'resources/images/tears_of_steel_bridge_2k.jpg',
        () => {
            skyBoxTex.mapping = THREE.EquirectangularReflectionMapping;
            skyBoxTex.colorSpace = THREE.SRGBColorSpace;
            scene.background = skyBoxTex;
        });








    // --- light ---

    // ambient
    const ambGui = gui.addFolder('ambient light');
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    // ambient controlls
    ambGui.addColor(new ColorGUIHelper(ambientLight, 'color'), 'value').name('color');
    ambGui.add(ambientLight, 'intensity', 0, 5, 0.01).name('intensity');
    ambGui.close()

    // hemisphereLight
    const skyColor = 0xB1E1FF;  // light blue
    const groundColor = 0xB97A20;  // brownish orange
    const hemLight = new THREE.HemisphereLight(skyColor, groundColor, 1);
    scene.add(hemLight)
    // hem controlls
    const hemGui = gui.addFolder('hemisphere light');
    hemGui.addColor(new ColorGUIHelper(hemLight, 'color'), 'value').name('skyColor');
    hemGui.addColor(new ColorGUIHelper(hemLight, 'groundColor'), 'value').name('groundColor');
    hemGui.add(hemLight, 'intensity', 0, 5, 0.01).name('intensity');
    hemGui.close()


    // directional light
    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    dirLight.position.set(0, 10, 0);
    dirLight.target.position.set(-5, 0, 0);
    scene.add(dirLight);
    scene.add(dirLight.target);
    // dir light helper
    const dirHelper = new THREE.DirectionalLightHelper(dirLight);
    scene.add(dirHelper);
    function updateDirLight() {
        dirLight.target.updateMatrixWorld();
        dirHelper.update();
    }
    // dir controlls
    const dirGui = gui.addFolder('directional light');
    dirGui.addColor(new ColorGUIHelper(dirLight, 'color'), 'value').name('color');
    dirGui.add(dirLight, 'intensity', 0, 5, 0.01);
    makeXYZGUI(dirGui, dirLight.position, 'position', updateDirLight);
    makeXYZGUI(dirGui, dirLight.target.position, 'target', updateDirLight);
    dirGui.close()


    // point light
    const pointLight = new THREE.PointLight(0xFFFFFF, 150);
    pointLight.position.set(5, 0, 0);
    scene.add(pointLight)
    const pointGui = gui.addFolder('point light');
    const pointHelper = new THREE.PointLightHelper(pointLight);
    scene.add(pointHelper);
    function updatePointLight() {
        pointHelper.update();
    }
    pointGui.addColor(new ColorGUIHelper(pointLight, 'color'), 'value').name('color');
    pointGui.add(pointLight, 'intensity', 0, 250, 1);
    pointGui.add(pointLight, 'distance', 0, 40).onChange(updatePointLight);
    makeXYZGUI(pointGui, pointLight.position, 'position', updatePointLight);
    pointGui.close()


    // --- rendering the stuff ---
    // render the scene
    renderer.render(scene, camera);

    // funciton that is caleld when the scene is renderd every frame
    function render(time) {
        time *= 0.001;  // convert time to seconds

        resizeRendererToDisplaySize(renderer);

        // turn on the scissor
        renderer.setScissorTest(true);

        // render the left view
        {
            const aspect = setScissorForElement(view1Elem);

            // adjust the camera for this aspect
            camera.left = -aspect;
            camera.right = aspect;
            camera.updateProjectionMatrix();
            cameraHelper.update();

            // don't draw the camera helper in the original view
            cameraHelper.visible = false;
            dirHelper.visible = false; // light helper
            pointHelper.visible = false; // light helper

            //scene.background.set(0x12a19c);

            // render
            renderer.render(scene, camera);
        }

        // render from the 2nd camera
        {
            const aspect = setScissorForElement(view2Elem);

            // adjust the camera for this aspect
            camera2.aspect = aspect;
            camera2.updateProjectionMatrix();

            // draw the camera helper in the 2nd view
            cameraHelper.visible = true;
            dirHelper.visible = true; // light helper
            pointHelper.visible = true; // light helper

            //scene.background.set(0x217591);

            renderer.render(scene, camera2);
        }

        requestAnimationFrame(render);
    }


    // makes the render fucntion get called every freame
    requestAnimationFrame(render);
}

class ColorGUIHelper {
    constructor(object, prop) {
        this.object = object;
        this.prop = prop;
    }
    get value() {
        return '#' + this.object[this.prop].getHexString();
    }
    set value(hexString) {
        this.object[this.prop].set(hexString);
    }
}

function makeXYZGUI(gui, vector3, name, onChangeFn) {
    const folder = gui.addFolder(name);
    folder.add(vector3, 'x', -10, 10).onChange(onChangeFn);
    folder.add(vector3, 'y', 0, 10).onChange(onChangeFn);
    folder.add(vector3, 'z', -10, 10).onChange(onChangeFn);
    folder.open();
}

function resizeRendererToDisplaySize(renderer) {

    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {

        renderer.setSize(width, height, false);

    }

    return needResize;

}

// run code
main();