"use strict";

var gl;
var vertices = [];
var u_vCenterLoc;
var u_ColorLoc;
var xVelocity, yVelocity;
var xCenter, yCenter;
var extent = 0.05;
var xPaddle = 0;
var gameOver = false;
var hits = 0;


window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    setup();

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer

    var a_vPositionLoc = gl.getAttribLocation( program, "a_vPosition" );
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_vPositionLoc );

    u_vCenterLoc = gl.getUniformLocation (program, "u_vCenter");
    u_ColorLoc = gl.getUniformLocation(program, "u_Color");

    document.getElementById("inc_speed").onclick = function(){
        xVelocity = 1.5 * xVelocity;
        yVelocity = 1.5 * yVelocity;
    }

    document.getElementById("dec_speed").onclick = function(){
        xVelocity = 0.5 * xVelocity;
        yVelocity = 0.5 * yVelocity;
    }
    document.getElementById("R_move").onclick = function(){
        if(!gameOver){
            if(xPaddle >= 1){
                xPaddle = 1;
            }
            else{
                xPaddle += 0.1;
            }
        }
    }

    document.getElementById("L_move").onclick = function(){
        if(!gameOver){
            if(xPaddle <= -1){
                xPaddle = -1;
            }
            else{
                xPaddle -= 0.1;
            }
        }
    }



    render();
};

function setup() {
    xCenter = 0.0;
    yCenter = 0.0;
    var radius = 0.05;
    var increment = Math.PI/36;
    vertices.push(vec2(0.0,0.0))

    for (var theta=0.0; theta < Math.PI*2-increment; theta+=increment) {
        if(theta == 0.0){
          vertices.push(vec2(Math.cos(theta)*radius, Math.sin(theta)*radius));
        }
        vertices.push(vec2(Math.cos(theta+increment)*radius, Math.sin(theta+increment)*radius));
    }
    yCenter = 1;
    xVelocity = 0.005;
    yVelocity = 0.005;

    vertices.push(vec2(-0.25, -1));
    vertices.push(vec2(-0.25, -0.95));
    vertices.push(vec2(0.25, -0.95));
    vertices.push(vec2(0.25, -1));


}

function animate () {
    xCenter += xVelocity;
    yCenter += yVelocity;

    // right boundary check
    if (xCenter+extent >= 1.0) {
      xCenter = 1.0-extent;
      xVelocity = -xVelocity;
    }
    // left boundary check
    if (xCenter-extent <= -1.0) {
      xCenter = -1.0+extent;
      xVelocity = -xVelocity;
    }
    // top boundary check
    if (yCenter+extent >= 1.0) {
      yCenter = 1.0-extent;
      yVelocity = -yVelocity;
    }
    // bottom boundary check

    // paddle hit check
    if (yCenter-extent <= -0.95 ){
        if( xCenter < xPaddle + 0.25){
            if(xCenter > xPaddle - 0.25) {
        yCenter = -0.95 + extent;
        yVelocity = -yVelocity;
        hits += 1;
        document.getElementById("hits").innerHTML = hits
    }}}
    if(yCenter - extent <= -1.0){
      gameOver = true;
      alert("Game Over.");
    }

}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    if(gameOver == false){
        animate();
    }
    console.log(vertices.length)
    gl.uniform4fv( u_ColorLoc, vec4(0.4, 0.4, 1.0, 1.0));
    gl.uniform2fv( u_vCenterLoc, vec2(xCenter, yCenter) );
    gl.drawArrays( gl.TRIANGLE_FAN, 0, 74 );

    gl.uniform4fv( u_ColorLoc, vec4(1.0, 0.4, 0.4, 1.0));
    gl.uniform2fv( u_vCenterLoc, vec2(xPaddle, 0.0) );
    gl.drawArrays( gl.TRIANGLE_FAN, 74, 4 );

    requestAnimFrame(render);
    //gl.drawArrays( gl.TRIANGLES, 0, vertices.length );

    }



    //gl.uniform2fv( u_vCenterLoc, vec2(xCenter, yCenter));
    //gl.drawArrays( gl.TRIANGLE_FAN, 0, vertices.length );
