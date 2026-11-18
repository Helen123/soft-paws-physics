import test from 'node:test';
import assert from 'node:assert/strict';
import {createImageMesh,deformImageMesh,cageWeights} from '../dist/warp.js';
const cage=Array.from({length:20},(_,i)=>({x:192+110*Math.cos(i*Math.PI/10),y:192+140*Math.sin(i*Math.PI/10)}));
test('entire source rectangle survives, including pixels beyond physical cage',()=>{
 const mesh=createImageMesh(384,384,cage),result=deformImageMesh(mesh,cage);
 assert.equal(mesh.triangles.length,512);
 mesh.vertices.forEach((v,i)=>{assert.ok(Math.hypot(v.source.x-result[i].x,v.source.y-result[i].y)<1e-6)});
 assert.deepEqual(mesh.vertices[0].source,{x:0,y:0});
 assert.deepEqual(mesh.vertices.at(-1).source,{x:384,y:384});
});
test('squash, shear, stretch and translation affect the whole image without clipping',()=>{
 const mesh=createImageMesh(384,384,cage),transform=p=>({x:1.4*p.x+.25*p.y+30,y:.55*p.y-.1*p.x+100}),warped=deformImageMesh(mesh,cage.map(transform));
 mesh.vertices.forEach((v,i)=>{const expected=transform(v.source);assert.ok(Math.hypot(expected.x-warped[i].x,expected.y-warped[i].y)<1e-6)});
});
test('local bead displacement produces non-affine deformation; exact bead weights remain stable',()=>{
 const mesh=createImageMesh(384,384,cage),moved=cage.map(p=>({...p}));moved[0].x-=35;
 const warped=deformImageMesh(mesh,moved);
 assert.ok(warped.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 assert.ok(warped.some((p,i)=>Math.abs(p.x-mesh.vertices[i].source.x)>5));
 assert.equal(cageWeights(cage[3],cage)[3],1);
});
