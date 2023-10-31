"use strict";

var gl;
var vertices;
var colors;
var u_ColorLoc;
var u_ScaleLoc;
var u_OffsetXLoc;
var u_OffsetYLoc;

// The onload event occurs when all the script files are read;
// it causes init() function to be executed
window.onload = function init()
{
    // create WebGL context which is a JavaScript object that contains all the WebGL
    // functions and parameters
    // "gl-canvas" is the id of the canvas specified in the HTML file
    var canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Three vertices

    vertices = [
        vec2( -0.75, 0.15 ), // triangle 1
        vec2( -0.25, 0.65 ),
        vec2(  0.25, 0.15 ),
        vec2( -0.75, 0.15 ), // triangle 2
        vec2( -0.25, -0.4 ),
        vec2( -0.25, 0.15 ),
        vec2( -0.25, 0.15 ), // triangle 3
        vec2(  0.0, -0.125 ),
        vec2( -0.25, -0.4 ),
        vec2(  0.0, -0.125 ), // triangle 4
        vec2(  0.25, -0.4 ),
        vec2( -0.25, -0.4 ),
        vec2( -0.25, -0.4 ), // triangle 5
        vec2(  0.0, -0.65 ),
        vec2(  0.25, -0.4 ),
        vec2(  0.25, -0.4 ), // triangle 6
        vec2(  0.75, 0.15 ),
        vec2( -0.25, 0.15 ),
        vec2(  0.25, 0.15 ), // triangle 7
        vec2(  0.5, 0.4 ),
        vec2(  0.0, 0.4 ),
        vec2(  0.0, 0.4 ),   // triangle 8
        vec2(  0.25, 0.65 ),
        vec2(  0.5, 0.4 ),
        vec2(  0.5, 0.4 ),  // triangle 9
        vec2(  0.75, 0.15 ),
        vec2(  0.25, 0.15 ),
    ];

    colors = [
      vec3(0.125, 0.596, 0.886), // respectively ordered
      vec3(0.988, 0.635, 0.745),
      vec3(0.882, 0.145, 0.118),
      vec3(0.020, 0.961, 0.286),
      vec3(0.631, 0.329, 0.114),
      vec3(0.937, 0.612, 0.203),
      vec3(0.980, 0.898, 0.176),
      vec3(0.624, 0.161, 0.843),
      vec3(0.020, 0.961, 0.945),
    ];


//  Configuring WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );

    //  Loading shaders and initializing attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Loading the triangle and vertex data into the GPU

    // create a vertex buffer object (VBO) in the GPU and later place our data in that object
    var vBuffer = gl.createBuffer();
    // gl.ARRAY_BUFFER: vertex attribute data rather than indices to data
    // the binding operation makes this buffer the current buffer until a differ buffer is binded
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );

    // gl.bufferData accepts only arrays of native data type values and not JavaScript objects;
    // function flatten (defined in MV.js) converts JavaScript objects into the data format
    // accepted by gl.bufferData
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer

    // gl.getAttribLocation returns the index of an attribute variable in the vertex shader
    var a_vPositionLoc = gl.getAttribLocation( program, "a_vPosition" );
    // describe the form of the data in the vertex array
    // 4th parameter false: no data normalization;
    // 5th parameter 0: values are contiguous;
    // 6th parameter 0: address in the buffer where the data begin
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0 );
    // enable the vertex attributes that are in the shader
    gl.enableVertexAttribArray( a_vPositionLoc );
    u_ScaleLoc = gl.getUniformLocation(program, "u_Scale");
    u_OffsetXLoc = gl.getUniformLocation(program, "u_OffsetX");
    u_OffsetYLoc = gl.getUniformLocation(program, "u_OffsetY");

    u_ColorLoc = gl.getUniformLocation(program, "u_Color");
    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    var offsetx, offsety, scale;
    scale = 0.25; // for a non-overlapping size of triangles
    gl.uniform1f(u_ScaleLoc, scale);

    /* allows for moving of colors from front to back to iterate through
    using splice as a simple prototype function, did not want to use linked
    lists
    */
    Array.prototype.newColor = function (from, to){
      this.splice(to,0, this.splice(from, 1)[0]);
    };

    // draw the data as an array of points
    for (offsetx = -0.5; offsetx<1.0; offsetx+=0.5) {
      gl.uniform1f(u_OffsetXLoc, offsetx);
      for (offsety = -0.5; offsety< 1.0; offsety+=0.5) {
        for (var i=0; i < vertices.length / 3; i++) {
          gl.uniform1f(u_OffsetYLoc, offsety);
          gl.uniform3fv(u_ColorLoc, colors[i]);
          gl.drawArrays( gl.TRIANGLES, i*3, 3);
          gl.uniform3fv(u_ColorLoc, vec3(0, 0, 0));
          gl.drawArrays( gl.LINE_LOOP, 0, 27 );
        }
        colors.newColor(0, 9);
      }
    }

}
