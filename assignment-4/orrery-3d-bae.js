"use strict";

var gl;
var canvas;

var printDay;
var mvMatrix;
// non-common modelview matrix
var nonCommonMVMatrix;
// common modelview matrix
var commonMVMatrix;
var a_positionLoc;
var u_colorLoc;
var u_mvMatrixLoc;

// Last time that this function was called
var g_last = Date.now();
var elapsed = 0;
var mspf = 1000/30.0;  // ms per frame

// scale factors
var rSunMult = 45;      // keep sun's size manageable
var rPlanetMult = 2000;  // scale planet sizes to be more visible

// surface radii (km)
var rSun = 696000;
var rMercury = 2440;
var rVenus = 6052;
var rEarth = 6371;
var rMoon = 1737;

// orbital radii (km)
var orMercury = 57909050;
var orVenus = 108208000;
var orEarth = 149598261;
var orMoon = 384399;

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

var circleVertexPositionBuffer;
var sphereVertexPositionBuffer;
var sphereVertexIndexBuffer;

var trackballMotion = false;
var m_currquat;
var m_inc;
var m_mousex = 1;
var m_mousey = 1;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    printDay = document.getElementById("printDay");

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.85, 0.85, 0.85, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    currentDay = 0;
    daysPerFrame = 1.0;

    // global scaling for the entire orrery
    globalScale = 50.0 / ( orEarth + orMoon + ( rEarth + 2 * rMoon ) * rPlanetMult );

    setupCircle();

    setupSphere();

    m_currquat = trackball(0, 0, 0, 0);
    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    circleVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, circleVertexPositionBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(circleVertexPositionData), gl.STATIC_DRAW );

    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertexPositionData), gl.STATIC_DRAW);

    sphereVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereVertexIndexData), gl.STATIC_DRAW);

    // Associate out shader variables with our data buffer

    a_positionLoc = gl.getAttribLocation( program, "a_position" );

    u_colorLoc = gl.getUniformLocation( program, "u_color" );

    u_mvMatrixLoc = gl.getUniformLocation( program, "u_mvMatrix" );

    // projection matrix
    var u_projMatrixLoc = gl.getUniformLocation( program, "u_projMatrix" );
    var projMatrix = perspective(30, 2.0, 0.1, 1000.0); // task 9
    gl.uniformMatrix4fv(u_projMatrixLoc, false, flatten(projMatrix) );

    m_currquat = trackball(0, 0, 0, 0);

    canvas.addEventListener("mousedown", function(event){
        m_mousex = event.clientX - event.target.getBoundingClientRect().left;
        m_mousey = event.clientY - event.target.getBoundingClientRect().top;
        trackballMotion = true;
    });

    // for trackball
    canvas.addEventListener("mouseup", function(event){
        trackballMotion = false;
    });

    // for trackball
    canvas.addEventListener("mousemove", function(event){
      if (trackballMotion) {
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

    render();

};

function setupCircle() {
    var increment = 0.1;
    for (var theta=0.0; theta < Math.PI*2; theta+=increment) {
        circleVertexPositionData.push(vec3(Math.cos(theta+increment), 0.0, Math.sin(theta+increment)));
    }
}

function setupSphere() {
    var latitudeBands = 50;
    var longitudeBands = 50;
    var radius = 1.0;

    // compute sampled vertex positions
    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;

            sphereVertexPositionData.push(radius * x);
            sphereVertexPositionData.push(radius * y);
            sphereVertexPositionData.push(radius * z);
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

    gl.enableVertexAttribArray( a_positionLoc );
    gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexPositionBuffer);
    gl.vertexAttribPointer( a_positionLoc, 3, gl.FLOAT, false, 0, 0 );
    gl.drawArrays( gl.LINE_LOOP, 0, circleVertexPositionData.length );
}

function drawSphere(color) {
    // set uniforms
    gl.uniform3fv( u_colorLoc, color );
    mvMatrix = mult(commonMVMatrix, nonCommonMVMatrix);
    gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix) );

    gl.enableVertexAttribArray( a_positionLoc );
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(a_positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.drawElements(gl.TRIANGLES, sphereVertexIndexData.length, gl.UNSIGNED_SHORT, 0);
    console.log(sphereVertexIndexData)
}

function drawOrbits() {
    var gray = vec3( 0.2, 0.2, 0.2 );
    var angleOffset = currentDay * 360.0;  // days * degrees

    nonCommonMVMatrix = scalem(orVenus, orVenus, orVenus);
    drawCircle( gray );    // Venus
    nonCommonMVMatrix = scalem(orMercury, orMercury, orMercury)
    drawCircle(gray);       // Mercury
    nonCommonMVMatrix = scalem(orEarth, orEarth, orEarth);
    drawCircle(gray);       // Earth
    earthRef = mult(rotateY(angleOffset/pEarth), mult(translate(orEarth, 0.0, 0.0), rotateZ(23.5)));
    var size = rEarth * rPlanetMult + 12 * orMoon;
    nonCommonMVMatrix = mult(earthRef, scalem(size, size, size));
    drawCircle(gray);       // Moon
}

function drawBodies() {
    var size;
    var angleOffset = currentDay * 360.0;  // days * degrees

    // Sun
    size = rSun * rSunMult;
    nonCommonMVMatrix = scalem(size, size, size);
    drawSphere( vec3( 1.0, 1.0, 0.0 ) );

    // Venus
    size = rVenus * rPlanetMult;
    nonCommonMVMatrix = mult(rotateY(angleOffset/pVenus),
                              mult(translate(orVenus, 0.0, 0.0), scalem(size, size, size)));
    drawSphere( vec3( 0.5, 1.0, 0.5 ) );
    // Mercury
    size = rMercury * rPlanetMult;
    nonCommonMVMatrix = mult(rotateY(angleOffset/pMercury),
                            mult(translate(orMercury, 0.0, 0.0), scalem(size, size, size)));
    drawSphere( vec3( 1.0, 0.5, 0.5));

    // Earth
    size = rEarth * rPlanetMult;
    nonCommonMVMatrix = mult(rotateY(angleOffset/pEarth),
                            mult(translate(orEarth, 0.0, 0.0), mult(rotateZ(23.5), scalem(size, size, size))));
    drawSphere(vec3(0.5, 0.5, 1.0))

    //Moon
    size = rMoon * rPlanetMult;
    earthRef = mult(rotateY(angleOffset/pEarth), mult(translate(orEarth, 0.0, 0.0), rotateZ(23.5)));
    nonCommonMVMatrix = mult(rotateY(angleOffset/pMoon),
                            mult(translate(rEarth * rPlanetMult + 12 * orMoon, 0.0, 0.0), scalem(size, size, size)));
    nonCommonMVMatrix = mult(earthRef, nonCommonMVMatrix);
    drawSphere(vec3(1.0, 1.0, 1.0));
}

function drawDay() {
    var string = 'Day ' + currentDay.toString();
    printDay.innerHTML = string;
}

function drawAll()
{
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

    // We need to parition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices

    //vertex color assigned by the index of the vertex

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
        if (m_mousex != x || m_mousey != y)
        {
            lastquat = trackball(
                  (2.0*m_mousex - canvas.width) / canvas.width,
                  (canvas.height - 2.0*m_mousey) / canvas.height,
                  (2.0*x - canvas.width) / canvas.width,
                  (canvas.height - 2.0*y) / canvas.height);
            m_currquat = add_quats(lastquat, m_currquat);
            m_mousex = x;
            m_mousey = y;
        }
}

var render = function() {
    var animOn = document.getElementById("animOn").checked;
    if(animOn) {
        // Calculate the elapsed time
        var now = Date.now(); // time in ms
        elapsed += now - g_last;
        g_last = now;
        if (elapsed >= mspf) {
            currentDay += daysPerFrame;
            elapsed = 0;
        }
    }
        m_inc = build_rotmatrix(m_currquat);

        requestAnimFrame(render);
        drawAll();
};
