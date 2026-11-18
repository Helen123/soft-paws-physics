import test from 'node:test';
import assert from 'node:assert/strict';
import {SoftWorld,area} from '../dist/physics.js';
import {createImageMesh,stabilizeImageMesh} from '../dist/warp.js';

test('texture fold stabilization keeps the full image mesh, leaves healthy deformation unchanged and untangles a local fold',()=>{
 const cage=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}],mesh=createImageMesh(100,100,cage,4,4),healthy=mesh.vertices.map(v=>({x:v.source.x*.7+v.source.y*.1+40,y:v.source.y*.65+90})),before=structuredClone(healthy);
 assert.deepEqual(stabilizeImageMesh(mesh,healthy),before);
 const points=structuredClone(healthy),middle=2*5+2;points[middle].x+=24;
 const signed=([i,j,k])=>{const a=points[i],b=points[j],c=points[k];return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)};
 assert.ok(mesh.triangles.some(t=>signed(t)<0));const count=mesh.vertices.length,triangles=structuredClone(mesh.triangles);
 stabilizeImageMesh(mesh,points);assert.ok(mesh.triangles.every(t=>signed(t)>0));assert.equal(points.length,count);assert.deepEqual(mesh.triangles,triangles);assert.ok(points.every(p=>Number.isFinite(p.x+p.y)));
});

test('final contact projection cannot push beads back outside scene walls or floor',()=>{
 const w=new SoftWorld();w.spawn(0,100,600);w.spawn(0,130,600);
 const original=w.pairContact.bind(w);let injected=false;
 w.pairContact=(a,b,velocity)=>{const result=original(a,b,velocity);if(velocity){injected=true;a.p[0].x=w.left+a.p[0].radius-.01;b.p[0].y=w.floor-b.p[0].radius+.01}return result};
 w.step();assert.ok(injected);for(const b of w.bodies)for(const p of b.p){assert.ok(p.x-p.radius>=w.left-1e-9);assert.ok(p.x+p.radius<=w.right+1e-9);assert.ok(p.y+p.radius<=w.floor+1e-9)}
});

test('nearest-skin contact matches an independent edge projection oracle after allocation optimization',()=>{
 const w=new SoftWorld(),ring=w.spawn(3,220,350);let seed=3109;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 // Use an asymmetric contour so corners, edge interiors and changing closest edges are exercised.
 for(let i=0;i<ring.p.length;i++){ring.p[i].x+=Math.sin(i*.7)*7;ring.p[i].y+=Math.cos(i*.4)*5}
 for(let sample=0;sample<180;sample++){
  const body=structuredClone(ring),p={x:150+random()*140,y:280+random()*140,radius:2+random()*4,mass:3,vx:0,vy:0},before=structuredClone(p);
  let winding=0,nearest;
  for(let i=0;i<body.p.length;i++){
   const a=body.p[i],b=body.p[(i+1)%body.p.length],cross=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
   if(a.y<=p.y&&b.y>p.y&&cross>0)winding++;if(a.y>p.y&&b.y<=p.y&&cross<0)winding--;
   const length=(b.x-a.x)**2+(b.y-a.y)**2,t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/length)),x=a.x+t*(b.x-a.x),y=a.y+t*(b.y-a.y),d=Math.hypot(p.x-x,p.y-y);
   if(!nearest||d<nearest.d)nearest={a,b,t,x,y,d};
  }
  const actual=w.edgeContact(p,body);
  if(winding){assert.equal(actual,-2);assert.deepEqual(p,before);continue}
  const {a,b,t,x,y,d}=nearest,u=1-t,r=p.radius+u*a.radius+t*b.radius;
  if(d>r+.08){assert.equal(actual,null);assert.deepEqual(p,before);continue}
  assert.equal(actual,0);const correction=Math.max(0,r-d)/(1/p.mass+u*u/a.mass+t*t/b.mass),dx=(before.x-x)/d,dy=(before.y-y)/d;
  assert.ok(Math.abs(p.x-(before.x+dx*correction/p.mass))<1e-9);
  assert.ok(Math.abs(p.y-(before.y+dy*correction/p.mass))<1e-9);
 }
});

test('repeated reset, drop and merge cycles leave no old contacts or inactive bodies',async()=>{
 globalThis.localStorage={getItem:()=>null,setItem:()=>{}};const {Game}=await import('../dist/game.js'),g=new Game();
 for(let round=0;round<30;round++){
  g.reset();assert.equal(g.world.contacts.size,0);assert.equal(g.world.restContacts.length,0);assert.equal(g.world.sleeping,false);assert.equal(g.world.bodies.length,0);
  g.world.spawn(round%6,180,400).born=-1;g.world.spawn(round%6,240,400).born=-1;
  for(let frame=0;frame<90&&!g.merges;frame++)g.update(1/60);
  assert.equal(g.merges,1);assert.equal(g.world.bodies.length,1);assert.equal(g.world.bodies[0].level,round%6+1);
  assert.ok(area(g.world.bodies[0])>0);assert.ok(g.world.bodies[0].p.every(p=>Number.isFinite(p.x+p.y+p.vx+p.vy)));
 }
});
