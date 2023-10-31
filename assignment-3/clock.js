"use strict";

var canvas;
var gl;

var theta = 0.0;
var u_ColorLoc;
var u_ScaleLoc;
var tri_colors;
var u_ctMatrixLoc;

var vertices = [];
var tri_vertices;

var num_triangles;
var heart_size;
var border_size;
var border_end;

var outerMat;
var innerMat;
var centerMat;
var heartMat;
var hourMarkerMats = [];
var minuteMarkerMats = [];

window.onload = function init(){
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if( !gl ){
      alert("WebGL isn't available");
    }

    tri_vertices = [
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

    tri_colors = [
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

    setup();

    // Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.9, 0.9, 0.9, 1.0);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram( program );

    console.log(outerMat);
    console.log(vertices);
    console.log('circle size: ', num_triangles + 2);
    console.log('border_size: ', border_size);

    // Load data into GPU
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate out shader varibales with data buffer
    var a_vPositionLoc = gl.getAttribLocation( program, "a_vPosition");
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( a_vPositionLoc );

    u_ScaleLoc = gl.getUniformLocation( program, "u_Scale");
    u_ColorLoc = gl.getUniformLocation( program, "u_Color" );

    // current transformation u_ctMatrix
    u_ctMatrixLoc = gl.getUniformLocation( program, "u_ctMatrix");

    render();
};

// Converting degrees to radians
function to_radians(angle){
  return angle * (Math.PI / 180);
  // simple formula using pi from math library
}

function setup(){
  var origin = vec2(0.0, 0.0);
  var angle = 0;
  num_triangles = 72;
  var offset = 360 / num_triangles;
  vertices = [origin];
  var x = (1 * Math.cos(to_radians(angle)));
  var y = (1  * Math.sin(to_radians(angle)));
  vertices.push(vec2(x, y));

  // addition of points through iteration
  for (let i = 0; i < num_triangles; i++){
    angle += offset;
    x = (1 * Math.cos(to_radians(angle)));
    y = (1  * Math.sin(to_radians(angle)));
    vertices.push(vec2(x, y))
  }

  // Translation and rotation matrix for all static elements
  var staticTrans = translate(0.0, 0.0, 0.0);
  var staticRotate = rotateZ(0.0);

  // Scaling proportion for the object elements
  var outerScale = 0.8;
  var innerScale = 0.75;
  var centerScale = 0.03;
  var heartScale = 0.7;

  outerMat = mult(staticTrans, mult(staticRotate, scalem(outerScale, outerScale, 1.0)));
  innerMat = mult(staticTrans, mult(staticRotate, scalem(innerScale, innerScale, 1.0)));
  centerMat = mult(staticTrans, mult(staticRotate, scalem(centerScale, centerScale, 1.0)));


  vertices.push(vec2(tri_vertices[0][0], tri_vertices[0][1]));
  vertices.push(vec2(tri_vertices[1][0], tri_vertices[1][1]));
  vertices.push(vec2(tri_vertices[2][0], tri_vertices[2][1]));

  vertices.push(vec2(tri_vertices[3][0], tri_vertices[3][1]));
  vertices.push(vec2(tri_vertices[4][0], tri_vertices[4][1]));
  vertices.push(vec2(tri_vertices[5][0], tri_vertices[5][1]));

  vertices.push(vec2(tri_vertices[6][0], tri_vertices[6][1]));
  vertices.push(vec2(tri_vertices[7][0], tri_vertices[7][1]));
  vertices.push(vec2(tri_vertices[8][0], tri_vertices[8][1]));

  vertices.push(vec2(tri_vertices[9][0], tri_vertices[9][1]));
  vertices.push(vec2(tri_vertices[10][0], tri_vertices[10][1]));
  vertices.push(vec2(tri_vertices[11][0], tri_vertices[11][1]));

  vertices.push(vec2(tri_vertices[12][0], tri_vertices[12][1]));
  vertices.push(vec2(tri_vertices[13][0], tri_vertices[13][1]));
  vertices.push(vec2(tri_vertices[14][0], tri_vertices[14][1]));

  vertices.push(vec2(tri_vertices[15][0], tri_vertices[15][1]));
  vertices.push(vec2(tri_vertices[16][0], tri_vertices[16][1]));
  vertices.push(vec2(tri_vertices[17][0], tri_vertices[17][1]));

  vertices.push(vec2(tri_vertices[18][0], tri_vertices[18][1]));
  vertices.push(vec2(tri_vertices[19][0], tri_vertices[19][1]));
  vertices.push(vec2(tri_vertices[20][0], tri_vertices[20][1]));

  vertices.push(vec2(tri_vertices[21][0], tri_vertices[21][1]));
  vertices.push(vec2(tri_vertices[22][0], tri_vertices[22][1]));
  vertices.push(vec2(tri_vertices[23][0], tri_vertices[23][1]));

  vertices.push(vec2(tri_vertices[24][0], tri_vertices[24][1]));
  vertices.push(vec2(tri_vertices[25][0], tri_vertices[25][1]));
  vertices.push(vec2(tri_vertices[26][0], tri_vertices[26][1]));

  heart_size = vertices.length - (num_triangles + 2);
  border_size = vertices.length - heart_size - (num_triangles + 2);
  border_end = num_triangles + 2 + heart_size;

  heartMat = mult(staticTrans, mult(staticRotate, scalem(heartScale, heartScale, 1.0)));

  // clock hands and tick marks on clock
  vertices.push(vec2( -0.5, -0.5 ));
  vertices.push(vec2( -0.5, 0.5 ));
  vertices.push(vec2( 0.5, 0.5 ));
  vertices.push(vec2( 0.5, -0.5 ));

  // tick marks Scaling
  var hourMarkerScaleX = 0.10;
  var hourMarkerScaleY = 0.02;
  sm = scalem(hourMarkerScaleX, hourMarkerScaleY, 1.0);

  angle = 0;
  var num_markers = 12;
  offset = 360 / num_markers;
  var tm, sm, rm, x, y;
  for(var i = 0; i < num_markers; i++){
    x = ((innerScale - 0.5 * hourMarkerScaleX) * Math.cos(to_radians(angle)));
    y = ((innerScale - 0.5 * hourMarkerScaleX) * Math.sin(to_radians(angle)));
    tm = translate(x, y, 0.0);
    rm = rotateZ(angle);
    hourMarkerMats[i] = mult(tm, mult(rm, sm));
    angle += offset;
  }

  // hour tick mark scaling
  var minuteMarkerScaleX = 0.04;
  var minuteMarkerScaleY = 0.0125;
  sm = scalem(minuteMarkerScaleX, minuteMarkerScaleY, 1.0);

  angle = 0;
  num_markers = 60;
  offset = 360 / num_markers;
  for(var i = 0; i < num_markers; i++){
    x = ((innerScale - 0.5 * minuteMarkerScaleX) * Math.cos(to_radians(angle)));
    y = ((innerScale - 0.5 * minuteMarkerScaleX) * Math.sin(to_radians(angle)));
    tm = translate(x, y, 0.0);
    rm = rotateZ(angle);
    minuteMarkerMats[i] = mult(tm, mult(rm, sm));
    angle += offset;
  }
}

function render(){
  gl.clear( gl.COLOR_BUFFER_BIT);

  // time animation data
  var d = new Date();

  var hours = d.getHours();
  if(hours > 12){
    hours = hours - 12;
  }

  var mins = d.getMinutes();
  var minRatio = (mins * 6) / 360;

  var sec = d.getSeconds();
  var secRatio = (sec * 6) / 360;

  // translation, scaling and rotation data for hour hand
  var hourTheta = 90 - ((30 * hours) + minRatio * 30);
  var hourScaleX = 0.35;
  var hourScaleY = 0.0225;
  var hScale = scalem(hourScaleX, hourScaleY, 1.0);
  var x = (0.5 * hourScaleX) * Math.cos(to_radians(hourTheta));
  var y = (0.5 * hourScaleX) * Math.sin(to_radians(hourTheta));
  var hTrans = translate(x, y, 1.0);

  // translation, scaling, rotation data for minute hand
  var minuteTheta = 90 - ((mins * 6) + secRatio * 6);
  var minuteScaleX = 0.45;
  var minuteScaleY = 0.015;
  var x = (0.5 * minuteScaleX) * Math.cos(to_radians(minuteTheta));
  var y = (0.5 * minuteScaleX) * Math.sin(to_radians(minuteTheta));
  var mScale = scalem(minuteScaleX, minuteScaleY, 1.0);
  var mTrans = translate(x, y, 0.0);

  // same for second hand
  var secondTheta = 90 - (sec * 6);
  var secondScaleX = 0.55;
  var secondScaleY = 0.005;
  var x = (0.5 * secondScaleX) * Math.cos(to_radians(secondTheta));
  var y = (0.5 * secondScaleX) * Math.sin(to_radians(secondTheta));
  var secScale = scalem(secondScaleX, secondScaleY, 1.0);
  var sTrans = translate(x, y, 0.0);

  // hour min and sec matrices
  var hourMat = mult(hTrans, mult(rotateZ(hourTheta), hScale));
  var minuteMat = mult(mTrans, mult(rotateZ(minuteTheta), mScale));
  var secondMat = mult(sTrans, mult(rotateZ(secondTheta), secScale));

  // orth projection on matrices
  var pm = ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0);
  outerMat = mult(pm, outerMat);
  innerMat = mult(pm, innerMat);
  innerMat = mult(pm, innerMat);
  heartMat = mult(pm, heartMat);
  hourMat = mult(pm, hourMat);
  minuteMat = mult(pm, minuteMat);
  secondMat = mult(pm, secondMat);

  // outer red circle
  gl.uniform3fv( u_ColorLoc, vec3(1.0, 0.0, 0.0));
  gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(outerMat));
  gl.drawArrays( gl.TRIANGLE_FAN, 0, num_triangles + 2);

  // inner white circle
  gl.uniform3fv( u_ColorLoc, vec3(1.0, 1.0, 1.0));
  gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(innerMat));
  gl.drawArrays( gl.TRIANGLE_FAN, 0, num_triangles + 2);

  // heart
  gl.uniform3fv( u_ColorLoc, vec3(1.0, 0.0, 1.0));
  gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(heartMat));
  gl.drawArrays( gl.TRIANGLE_FAN, num_triangles + 2, heart_size);


  // center circle
  gl.uniform3fv(u_ColorLoc, vec3(0.0, 0.0, 0.0));
  gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(centerMat));
  gl.drawArrays(gl.TRIANGLE_FAN, 0, num_triangles + 2);

  // Hour Markers
  var tempMat;
  gl.uniform3fv(u_ColorLoc, vec3(0.0, 0.0, 1.0));
  for(var i = 0; i < hourMarkerMats.length; i++){
     tempMat = mult(pm, hourMarkerMats[i]);
     gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(tempMat));
     gl.drawArrays(gl.TRIANGLE_FAN, border_end, 4);
  }

  // Minute Markers
  for(var i = 0; i < minuteMarkerMats.length; i++){
     tempMat = mult(pm, minuteMarkerMats[i]);
     gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(tempMat));
     gl.drawArrays(gl.TRIANGLE_FAN, border_end, 4);
  }

  // hand color of black
  gl.uniform3fv(u_ColorLoc, vec3(0.0, 0.0, 0.0));
  // hour hand
  gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(hourMat));
  gl.drawArrays(gl.TRIANGLE_FAN, border_end, 4);

  // minute hand
  gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(minuteMat));
  gl.drawArrays(gl.TRIANGLE_FAN, border_end, 4);

  // second hand
  gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(secondMat));
  gl.drawArrays(gl.TRIANGLE_FAN, border_end, 4);

  window.requestAnimFrame( render );

}
