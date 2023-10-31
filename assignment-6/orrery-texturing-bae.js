"use strict";
var gl;
var canvas;
var printDay;
var mvMatrix;

// non-common modelview matrix
var nonCommonMVMatrix;
// common modelview matrix
var commonMVMatrix;
//modelView
var modelViewMatrix, u_modelViewMatrixLoc;
// Normal matrix
var nMatrix, u_nMatrixLoc;

var a_vPositionLoc;
var u_colorLoc;
var u_mvMatrixLoc;
var u_ambientProductLoc;
var u_diffuseProductLoc;
var u_specularProductLoc;
var u_lightPositionLoc;
var u_shininessLoc;
var a_vTexCoordLoc;
var u_texSamplerLoc;

// Last time that this function was called
var g_last = Date.now();
var elapsed = 0;
var msf = 1000/30.0;  // ms per frame

// scale factors
var rSunMult = 45;      // keeping sun's size manageable
var rPlanetMult = 2000;  // scaling planet sizes to be more visible

// surface radii (km)
var rSun = 696000;
var rMercury = 2440;
var rVenus = 6052;
var rEarth = 6371;
var rMoon = 1737;

// orbital radii (km)
var obtMercury = 57909050;
var obtVenus = 108208000;
var obtEarth = 149598261;
var obtMoon = 384399;

// orbital periods (Earth days)
var pMercury = 88;
var pVenus = 225;
var pEarth = 365;
var pMoon = 27;

// time
var currentDay;
var daysPerFrame;

var globalScale;
var earthRef;

// vertices
var circleVertexPositionData = []; // for orbit
var sphereVertexPositionData = []; // for planet
var sphereVertexIndexData = []; // for planet

// Sphere Vertex Normal vars
var sphereVertexNormals = [];
var sphereVertexNormalBuffer;

//Sphere texture vars
var sphereTexCoords = []
var circleVertexPositionBuffer;
var sphereVertexPositionBuffer;
var sphereVertexIndexBuffer;
var sphereTexCoordBuffer;

var trackballMove = false;
var m_curquat;
var m_inc;
var m_mousex = 1;
var m_mousey = 1;

//point light (assume in object space)
var lightPosition = vec4(2.0, 2.0, 2.0, 1.0 );
var lightAmbient = vec4(0.45, 0.45, 0.45,  1.0 );
var lightDiffuse = vec4( 0.5, 0.5, 0.5, 1.0 );
var lightSpecular = vec4( 0.8, 0.8, 0.8, 1.0 );
var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 0.0 );
var materialShininess = 20.0;
var ambientProduct, diffuseProduct, specularProduct;

//planet texture variables
var image
var moonSkin;
var moonImg
var earthSkin;
var earthImg;
//earthImage.crossOrigin = "anonymous";
var mercurySkin;
var mercuryImg;
var venusSkin
var venusImg;
var sunSkin;
var sunImg;

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    printDay = document.getElementById("printDay");

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 0.75 );
    gl.enable(gl.DEPTH_TEST);

    currentDay = 0;
    daysPerFrame = 0.0625;

    // global scaling for the entire orrery
    globalScale = 50.0 / ( obtEarth + obtMoon + ( rEarth + 2 * rMoon ) * rPlanetMult );

    setupCircle();
    setupSphere();

    m_curquat = trackball(0, 0, 0, 0);
    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );


    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    moonImg = document.getElementById("moonImg");
    moonSkin = configureTexture(moonImg);
    earthImg = document.getElementById("earthImg");
    earthSkin = configureTexture(earthImg);
    sunImg = document.getElementById("sunImg");
    sunSkin = configureTexture(sunImg);
    venusImg = document.getElementById("venusImg");
    venusSkin = configureTexture(venusImg);
    mercuryImg = document.getElementById("mercuryImg");
    mercurySkin = configureTexture(mercuryImg);

    circleVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, circleVertexPositionBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(circleVertexPositionData), gl.STATIC_DRAW );

    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertexPositionData), gl.STATIC_DRAW);

    //Sphere Texture coordinates
    sphereTexCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereTexCoords), gl.STATIC_DRAW);

    sphereVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereVertexIndexData), gl.STATIC_DRAW);

    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertexNormals), gl.STATIC_DRAW);

    // Associate out shader variables with our data buffer

    a_vPositionLoc = gl.getAttribLocation( program, "a_vPosition" );
    gl.vertexAttribPointer(a_vPositionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_vPositionLoc);

    u_colorLoc = gl.getUniformLocation( program, "u_color" );

    u_mvMatrixLoc = gl.getUniformLocation( program, "u_mvMatrix" );

    u_nMatrixLoc = gl.getUniformLocation(program, "u_nMatrix");

    // send texture coordinates data down to GPU
    a_vTexCoordLoc = gl.getAttribLocation(program, "a_vTexCoord");
    gl.vertexAttribPointer(a_vTexCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_vTexCoordLoc);

    u_texSamplerLoc = gl.getUniformLocation(program, "u_texSampler");

    var a_vNormalLoc = gl.getAttribLocation( program, "a_vNormal" );
    gl.vertexAttribPointer( a_vNormalLoc, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray(a_vNormalLoc);

    // projection matrix
    var u_projMatrixLoc = gl.getUniformLocation( program, "u_projMatrix" );
    var projMatrix = perspective(30, 2.0, 0.1, 1000.0);
    gl.uniformMatrix4fv(u_projMatrixLoc, false, flatten(projMatrix) );

    m_curquat = trackball(0, 0, 0, 0);

    canvas.addEventListener("mousedown", function(event){
        m_mousex = event.clientX - event.target.getBoundingClientRect().left;
        m_mousey = event.clientY - event.target.getBoundingClientRect().top;
        trackballMove = true;
    });

    // for trackball
    canvas.addEventListener("mouseup", function(event){
        trackballMove = false;
    });

    // for trackball
    canvas.addEventListener("mousemove", function(event){
      if (trackballMove) {
        var x = event.clientX - event.target.getBoundingClientRect().left;
        var y = event.clientY - event.target.getBoundingClientRect().top;
        mouseMotion(x, y);
      }
    } );

    document.getElementById("incDPF").addEventListener("click", function(event) {
        daysPerFrame = daysPerFrame * 2;
    });

    document.getElementById("decDPF").addEventListener("click", function(event) {
        daysPerFrame = daysPerFrame / 2;
    });

    /* TODO: GIVE THE UNIFORM LOCATIONS VARS SO WE CAN USE THEM IN RENDER */
    u_ambientProductLoc = gl.getUniformLocation(program, "u_ambientProduct");
    u_diffuseProductLoc = gl.getUniformLocation(program, "u_diffuseProduct");
    u_specularProductLoc = gl.getUniformLocation(program, "u_specularProduct");
    u_lightPositionLoc = gl.getUniformLocation(program, "u_lightPosition");
    u_shininessLoc = gl.getUniformLocation(program, "u_shininess");

    gl.uniform4fv(u_ambientProductLoc, flatten(ambientProduct));
    gl.uniform4fv(u_diffuseProductLoc, flatten(diffuseProduct));
    gl.uniform4fv(u_specularProductLoc, flatten(specularProduct));
    gl.uniform4fv(u_lightPositionLoc, flatten(lightPosition));
    gl.uniform1f(u_shininessLoc, materialShininess);

    render();
};

function setupCircle() {
    var increment = 0.1;
    for (var theta = 0.0; theta < Math.PI*2; theta += increment) {
        circleVertexPositionData.push(vec3(Math.cos(theta + increment), 0.0, Math.sin(theta+increment)));
    }
}

function setupSphere() {
    var latitudeBands = 50;
    var longitudeBands = 50;
    var radius = 1.0;
    var u, v;

    // compute sampled vertex positions
    // compute sphere normals here
    for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;

            sphereVertexPositionData.push(radius * x);
            sphereVertexPositionData.push(radius * y);
            sphereVertexPositionData.push(radius * z);

            sphereVertexNormals.push(radius * x)
            sphereVertexNormals.push(radius * y)
            sphereVertexNormals.push(radius * z)

            u = 1 - (longNumber / longitudeBands);
            v = 1 - (latNumber / latitudeBands);

            // sphereTexCoords.push(vec2(u, v));
            sphereTexCoords.push(u);
            sphereTexCoords.push(v);
        }
    }

    // create the actual mesh, each quad is represented by two triangles
    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            // the three vertices of the 1st triangle
            sphereVertexIndexData.push(first);
            sphereVertexIndexData.push(second);
            sphereVertexIndexData.push(first + 1);
            // the three vertices of the 2nd triangle
            sphereVertexIndexData.push(second);
            sphereVertexIndexData.push(second + 1);
            sphereVertexIndexData.push(first + 1);
        }
    }
}

function drawCircle(color) {
    // set uniforms
    gl.uniform3fv( u_colorLoc, color );
    mvMatrix = mult(commonMVMatrix, nonCommonMVMatrix);
    gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix) );

    gl.enableVertexAttribArray( a_vPositionLoc );
    gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexPositionBuffer);
    gl.vertexAttribPointer( a_vPositionLoc, 3, gl.FLOAT, false, 0, 0 );
    gl.drawArrays( gl.LINE_LOOP, 0, circleVertexPositionData.length );
}

function drawSphere(color, texture) {
    // set uniforms
    gl.uniform3fv( u_colorLoc, color );
    mvMatrix = mult(commonMVMatrix, nonCommonMVMatrix);
    gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix) );
    // calculate normalMatrix
    nMatrix = normalMatrix(mvMatrix, true);
    gl.uniformMatrix3fv(u_nMatrixLoc, false, flatten(nMatrix));

    //texture binding
    gl.enableVertexAttribArray(a_vTexCoordLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereTexCoordBuffer);
    gl.vertexAttribPointer(a_vTexCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.uniform1i(u_texSamplerLoc, 0);

    gl.enableVertexAttribArray( a_vPositionLoc );
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(a_vPositionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.drawElements(gl.TRIANGLES, sphereVertexIndexData.length, gl.UNSIGNED_SHORT, 0);
}

function drawOrbits() {
    var orbitShade = vec3( 0.8, 0.8, 0.8 );
    var angleOffset = currentDay * 360.0;  // days * degrees

    nonCommonMVMatrix = scalem(obtVenus, obtVenus, obtVenus);
    drawCircle( orbitShade );    // Venus
    nonCommonMVMatrix = scalem(obtMercury, obtMercury, obtMercury)
    drawCircle(orbitShade);       // Mercury
    nonCommonMVMatrix = scalem(obtEarth, obtEarth, obtEarth);
    drawCircle(orbitShade);       // Earth
    earthRef = mult(rotateY(angleOffset/pEarth), mult(translate(obtEarth, 0.0, 0.0), rotateZ(23.5)));
    var size = rEarth * rPlanetMult + 12 * obtMoon;
    nonCommonMVMatrix = mult(earthRef, scalem(size, size, size));
    drawCircle(orbitShade);       // Moon
}

function drawBodies() {
    var size;
    var angleOffset = currentDay * 360.0;  // days * degrees
    var earthday = (currentDay - Math.floor(currentDay)) * 360;

    // Sun
    size = rSun * rSunMult;
    nonCommonMVMatrix = scalem(size, size, size);
    drawSphere( vec3( 1.0, 1.0, 0.0 ), sunSkin );

    // Venus
    size = rVenus * rPlanetMult;
    nonCommonMVMatrix = mult(rotateY(angleOffset/pVenus),
                              mult(translate(obtVenus, 0.0, 0.0), scalem(size, size, size)));
    drawSphere( vec3( 0.5, 1.0, 0.5 ), venusSkin );

    // Mercury
    size = rMercury * rPlanetMult;
    nonCommonMVMatrix = mult(rotateY(angleOffset/pMercury),
                            mult(translate(obtMercury, 0.0, 0.0), scalem(size, size, size)));
    drawSphere( vec3( 1.0, 0.5, 0.5), mercurySkin);

    //Earth
    size = rEarth * rPlanetMult;
    nonCommonMVMatrix = mult(rotateY(angleOffset/pEarth),
                            mult(translate(obtEarth, 0.0, 0.0), mult(rotateY(earthday), mult(rotateZ(23.5), scalem(size, size, size)))));
    drawSphere(vec3(0.5, 0.5, 1.0), earthSkin);

    //Moon
    size = rMoon * rPlanetMult;
    earthRef = mult(rotateY(angleOffset/pEarth), mult(translate(obtEarth, 0.0, 0.0), rotateZ(23.5)));
    nonCommonMVMatrix = mult(rotateY(angleOffset/pMoon),
                            mult(translate(rEarth * rPlanetMult + 12 * obtMoon, 0.0, 0.0), scalem(size, size, size)));
    nonCommonMVMatrix = mult(earthRef, nonCommonMVMatrix);
    drawSphere(vec3(1.0, 1.0, 1.0), moonSkin);
}


function drawDay() {
    var string = 'Day ' + currentDay.toString();
    printDay.innerHTML = string;
}

function drawAll() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    // all planets and orbits will take the following transformation
    // global scaling
    commonMVMatrix = scalem(globalScale, globalScale, globalScale);
    // global-tilt-x
    commonMVMatrix = mult(rotateX(15), commonMVMatrix)
    //Trackball
    commonMVMatrix = mult(m_inc, commonMVMatrix);
    // viewing matrix
    commonMVMatrix = mult(lookAt(vec3(0.0, 0.0, 100.0),
                                  vec3(0.0, 0.0, 0.0),
                                  vec3(0.0, 1.0, 0.0)),
                           commonMVMatrix);

    if (document.getElementById("orbon").checked == true)
        drawOrbits();

    drawBodies();
    var dayOn = document.getElementById("dayOn").checked;
    if(dayOn) {
        drawDay();
    } else {
        printDay.innerHTML = "";
    }
}

function quad(a, b, c, d)
{
    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );

        // for interpolated colors use
        colors.push( vertexColors[indices[i]] );

        // for solid colored faces use
        //colors.push(vertexColors[a]);
    }
}

// for trackball
function mouseMotion( x,  y)
{
        var lastquat;
        if (m_mousex != x || m_mousey != y) {
            lastquat = trackball(
                  (2.0*m_mousex - canvas.width) / canvas.width,
                  (canvas.height - 2.0*m_mousey) / canvas.height,
                  (2.0*x - canvas.width) / canvas.width,
                  (canvas.height - 2.0*y) / canvas.height);
            m_curquat = add_quats(lastquat, m_curquat);
            m_mousex = x;
            m_mousey = y;
        }
}

function configureTexture( image ) {
    var texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );

    //Flips the source data along its vertical axis when texImage2D or texSubImage2D
    //are called when param is true. The initial value for param is false.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

    return texture;
}


var render = function() {
    var animOn = document.getElementById("animOn").checked;
    if(animOn) {
        // Calculate the elapsed time
        var now = Date.now(); // time in ms
        elapsed += now - g_last;
        g_last = now;
        if (elapsed >= msf) {
            currentDay += daysPerFrame;
            elapsed = 0;
        }
    }
    m_inc = build_rotmatrix(m_curquat);

    lightAmbient[0] = document.getElementById("redSlider").value / 100;
    lightAmbient[1] = document.getElementById("greenSlider").value / 100;
    lightAmbient[2] = document.getElementById("blueSlider").value / 100;

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(u_ambientProductLoc, flatten(ambientProduct));
    gl.uniform4fv(u_diffuseProductLoc, flatten(diffuseProduct));
    gl.uniform4fv(u_specularProductLoc, flatten(specularProduct));
    gl.uniform4fv(u_lightPositionLoc, flatten(lightPosition));
    gl.uniform1f(u_shininessLoc, materialShininess);

    requestAnimFrame(render);
    drawAll();
};
