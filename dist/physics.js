// Circular collision beads with implicit elastic skin, area pressure and support joints.
export class EventBus {
  constructor(){this.listeners=new Map()}
  on(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn)}
  emit(type,data){for(const fn of this.listeners.get(type)||[])fn(data)}
}
export const LEVELS=[
 {name:'Cream Puff',asset:'silver',r:27,color:'#c6b9a3'},
 {name:'Ginger Biscuit',asset:'orange',r:35,color:'#e8a455'},
 {name:'Sesame Ball',asset:'black',r:44,color:'#58534f'},
 {name:'Calico Roll',asset:'calico',r:55,color:'#b88f63'},
 {name:'Tuxedo Bun',asset:'tuxedo',r:68,color:'#88857c'},
 {name:'Siamese Mochi',asset:'siamese',r:83,color:'#a58a6a'},
 {name:'Mega Pancake',asset:'flat',r:101,color:'#716054'},
 {name:'Cloud Bun',asset:'friend-cloud',r:110,color:'#e2dfd8'},
 {name:'Golden Pancake',asset:'friend-roll',r:119,color:'#c5a477'},
 {name:'Silver Dream',asset:'sleep',r:128,color:'#96928e'}
];
export const NODE_COUNT=32;
const TAU=Math.PI*2;
export function center(b){let x=0,y=0;for(const p of b.p){x+=p.x;y+=p.y}return {x:x/b.p.length,y:y/b.p.length}}
export function area(b){let a=0;for(let i=0;i<b.p.length;i++){const p=b.p[i],q=b.p[(i+1)%b.p.length];a+=p.x*q.y-q.x*p.y}return a/2}
function bounds(b){let x=Infinity,y=Infinity,X=-Infinity,Y=-Infinity;for(const p of b.p){x=Math.min(x,p.x-p.radius);y=Math.min(y,p.y-p.radius);X=Math.max(X,p.x+p.radius);Y=Math.max(Y,p.y+p.radius)}return {x,y,X,Y}}
function closestOnEdge(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1))),x=a.x+t*dx,y=a.y+t*dy;return {t,x,y,d2:(p.x-x)**2+(p.y-y)**2}}
export function pointInsideBody(p,body){let inside=false;for(let i=0,j=body.p.length-1;i<body.p.length;j=i++){const a=body.p[i],b=body.p[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside}
export function bodiesOverlap(a,b){
 const x=bounds(a),y=bounds(b);if(x.X<y.x||y.X<x.x||x.Y<y.y||y.Y<x.y)return false;
 if(a.p.some(p=>pointInsideBody(p,b))||b.p.some(p=>pointInsideBody(p,a)))return true;
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 for(let i=0;i<a.p.length;i++)for(let j=0;j<b.p.length;j++){const p=a.p[i],q=a.p[(i+1)%a.p.length],r=b.p[j],t=b.p[(j+1)%b.p.length];if(cross(p,q,r)*cross(p,q,t)<-1e-8&&cross(r,t,p)*cross(r,t,q)<-1e-8)return true}return false;
}
export class SoftWorld {
 constructor(bus=new EventBus()){this.bus=bus;this.bodies=[];this.nextId=1;this.time=0;this._hardness=1;this.sleeping=false;this.restTime=0;this.restContacts=[];this.pressureEnabled=true;this.width=440;this.left=12;this.right=428;this.floor=640;this.contacts=new Map();this.stepId=0;this.shapes=new Map()}
 get hardness(){return this._hardness}
 set hardness(value){const next=Math.max(0,Math.min(1,Number(value)));if(!Number.isFinite(next))return;if(next!==this._hardness){this._hardness=next;this.wake()}}
 wake(){this.sleeping=false;this.restTime=0;this.restContacts=[]}
 setBounds({left,right,floor}){if(![left,right,floor].every(Number.isFinite)||left<0||right>this.width||right-left<220||floor<350||floor>660)throw Error('Invalid scene bounds');if(left!==this.left||right!==this.right||floor!==this.floor)this.wake();this.left=left;this.right=right;this.floor=floor}
 setShape(level,rest,beadRadius=null){if(rest.length!==NODE_COUNT||rest.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('Invalid cat bead ring');this.shapes.set(level,{rest:rest.map(p=>({...p})),beadRadius})}
 spawn(level,x,y,vx=0,vy=0){this.wake();const r=LEVELS[level].r,shape=this.shapes.get(level),b={id:this.nextId++,level,r,born:this.time,p:[],rest:[],mass:r*r};
  const radius=r*(shape?.beadRadius??Math.sin(Math.PI/NODE_COUNT)*1.06);
  for(let i=0;i<NODE_COUNT;i++){const t=i/NODE_COUNT*TAU,q=shape?.rest[i],rx=(q?q.x:Math.cos(t))*r,ry=(q?q.y:Math.sin(t))*r;b.rest.push({x:rx,y:ry});b.p.push({x:x+rx,y:y+ry,vx,vy,radius,mass:b.mass/NODE_COUNT})}
  b.braces=[];for(const gap of [4,8,16])for(let i=0;i<NODE_COUNT;i++){const j=(i+gap)%NODE_COUNT;if(gap===16&&i>j)continue;b.braces.push({i,j,length:Math.hypot(b.rest[j].x-b.rest[i].x,b.rest[j].y-b.rest[i].y),lambda:0})}
  b.edgeLengths=b.p.map((p,i)=>Math.hypot(b.p[(i+1)%NODE_COUNT].x-p.x,b.p[(i+1)%NODE_COUNT].y-p.y));b.edgeLambda=Array(NODE_COUNT).fill(0);b.areaLambda=0;b.targetArea=area(b);this.bodies.push(b);this.bus.emit('CatSpawned',{catId:b.id,level,time:this.time});return b}
 remove(ids){this.wake();const set=new Set(ids);this.bodies=this.bodies.filter(b=>!set.has(b.id))}
 forces(b,h){for(const p of b.p){p.vx*=Math.exp(-.6*h);p.vy=(p.vy+500*h)*Math.exp(-.6*h);p.x+=p.vx*h;p.y+=p.vy*h}}
 skin(b,h){const hard=Math.max(0,Math.min(1,this.hardness)),alpha=1/(24000+6000*hard)/(h*h),n=b.p.length;
  for(let i=0;i<n;i++){const p=b.p[i],q=b.p[(i+1)%n],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1,dl=(-(d-b.edgeLengths[i])-alpha*b.edgeLambda[i])/(2+alpha),cx=dx/d*dl,cy=dy/d*dl;b.edgeLambda[i]+=dl;p.x-=cx;p.y-=cy;q.x+=cx;q.y+=cy}
  if(!this.pressureEnabled){b.pressure=0;return}const gradient=[];let sum=0;for(let i=0;i<n;i++){const prev=b.p[(i+n-1)%n],next=b.p[(i+1)%n],x=(next.y-prev.y)*.5,y=(prev.x-next.x)*.5;gradient.push({x,y});sum+=x*x+y*y}
  const compliance=b.targetArea/(6500+2500*hard),aa=compliance/(h*h),dl=(-(area(b)-b.targetArea)-aa*b.areaLambda)/(sum+aa);b.areaLambda+=dl;b.pressure=b.areaLambda/(h*h);
  for(let i=0;i<n;i++){b.p[i].x+=gradient[i].x*dl;b.p[i].y+=gradient[i].y*dl}
 }
 // Compliant internal distance joints brace the bead chain without a hidden collider.
 // XPBD multipliers reset every substep. The new hard endpoint exactly matches the former soft endpoint.
 brace(b,h){const hard=Math.max(0,Math.min(1,this.hardness)),alpha=(.003*Math.pow(.5,hard))/(h*h);
  for(const joint of b.braces){const p=b.p[joint.i],q=b.p[joint.j],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1,dl=(-(d-joint.length)-alpha*joint.lambda)/(2+alpha),cx=dx/d*dl,cy=dy/d*dl;joint.lambda+=dl;p.x-=cx;p.y-=cy;q.x+=cx;q.y+=cy;}
 }
 beadContact(p,q,velocity=true){const dx=q.x-p.x,dy=q.y-p.y,min=p.radius+q.radius,d2=dx*dx+dy*dy;if(d2>=(min+.08)**2)return null;
  const d=Math.sqrt(d2),nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,ip=1/p.mass,iq=1/q.mass,total=ip+iq,depth=Math.max(0,min-d);
  p.x-=nx*depth*ip/total;p.y-=ny*depth*ip/total;q.x+=nx*depth*iq/total;q.y+=ny*depth*iq/total;
  const speed=(q.vx-p.vx)*nx+(q.vy-p.vy)*ny;
  if(velocity&&speed<0){const impulse=-speed*(speed< -50?1.02:1)/total;p.vx-=nx*impulse*ip;p.vy-=ny*impulse*ip;q.vx+=nx*impulse*iq;q.vy+=ny*impulse*iq;
   const tx=-ny,ty=nx,vt=(q.vx-p.vx)*tx+(q.vy-p.vy)*ty,friction=Math.max(-impulse*.12,Math.min(impulse*.12,-vt/total));p.vx-=tx*friction*ip;p.vy-=ty*friction*ip;q.vx+=tx*friction*iq;q.vy+=ty*friction*iq;
  }
  return Math.max(0,-speed);
 }
 // Solid, continuous skin: each bead contacts the segment between its neighbors.
 edgeContact(p,body,velocity=false){let nearestD2=Infinity,nearestT=0,nearestX=0,nearestY=0,index=0,inside=false;for(let i=0;i<body.p.length;i++){const a=body.p[i],b=body.p[(i+1)%body.p.length];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
   // Scalar nearest-edge search avoids allocating one object per bead/edge/iteration.
   const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1))),x=a.x+t*dx,y=a.y+t*dy,d2=(p.x-x)**2+(p.y-y)**2;
   if(d2<nearestD2){nearestD2=d2;nearestT=t;nearestX=x;nearestY=y;index=i}}
  if(inside)return -2;const a=body.p[index],b=body.p[(index+1)%body.p.length],u=1-nearestT,v=nearestT,radius=p.radius+u*a.radius+v*b.radius;if(nearestD2>(radius+.08)**2)return null;
  const d=Math.sqrt(nearestD2),nx=d>1e-8?(p.x-nearestX)/d:(b.y-a.y)/(Math.hypot(b.x-a.x,b.y-a.y)||1),ny=d>1e-8?(p.y-nearestY)/d:-(b.x-a.x)/(Math.hypot(b.x-a.x,b.y-a.y)||1),ip=1/p.mass,ia=1/a.mass,ib=1/b.mass,total=ip+u*u*ia+v*v*ib,depth=Math.max(0,radius-d),correction=depth/total;
  p.x+=nx*correction*ip;p.y+=ny*correction*ip;a.x-=nx*correction*u*ia;a.y-=ny*correction*u*ia;b.x-=nx*correction*v*ib;b.y-=ny*correction*v*ib;
  const speed=(p.vx-u*a.vx-v*b.vx)*nx+(p.vy-u*a.vy-v*b.vy)*ny;
  if(velocity&&speed<0){const impulse=-speed*(speed< -50?1.02:1)/total;p.vx+=nx*impulse*ip;p.vy+=ny*impulse*ip;a.vx-=nx*impulse*u*ia;a.vy-=ny*impulse*u*ia;b.vx-=nx*impulse*v*ib;b.vy-=ny*impulse*v*ib;
   const tx=-ny,ty=nx,tangent=(p.vx-u*a.vx-v*b.vx)*tx+(p.vy-u*a.vy-v*b.vy)*ty,friction=Math.max(-impulse*.12,Math.min(impulse*.12,-tangent/total));p.vx+=tx*friction*ip;p.vy+=ty*friction*ip;a.vx-=tx*friction*u*ia;a.vy-=ty*friction*u*ia;b.vx-=tx*friction*v*ib;b.vy-=ty*friction*v*ib;
  }return Math.max(0,-speed);
 }
 // Recover already intersecting/contained rings using their actual bead projections.
 // This is a topology repair, not a replacement circle collider or shape constraint.
 repairOverlap(a,b,known=false){if(!known&&!bodiesOverlap(a,b))return false;let best=null;
  for(const body of [a,b])for(let i=0;i<body.p.length;i++){const p=body.p[i],q=body.p[(i+1)%body.p.length],len=Math.hypot(q.x-p.x,q.y-p.y);if(len<1e-8)continue;let nx=(q.y-p.y)/len,ny=-(q.x-p.x)/len,amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
   for(const v of a.p){const d=v.x*nx+v.y*ny;amin=Math.min(amin,d-v.radius);amax=Math.max(amax,d+v.radius)}for(const v of b.p){const d=v.x*nx+v.y*ny;bmin=Math.min(bmin,d-v.radius);bmax=Math.max(bmax,d+v.radius)}
   const forward=amax-bmin,backward=bmax-amin;if(forward<=0||backward<=0)return false;const depth=Math.min(forward,backward);if(backward<forward){nx=-nx;ny=-ny}if(!best||depth<best.depth)best={nx,ny,depth};
  }if(!best)return false;const ia=1/a.mass,ib=1/b.mass,total=ia+ib,depth=best.depth+.02;
  for(const [body,weight]of [[a,-ia/total],[b,ib/total]])for(const p of body.p){const dx=best.nx*depth*weight,dy=best.ny*depth*weight;p.x+=dx;p.y+=dy;if(Number.isFinite(p.ox)){p.ox+=dx;p.oy+=dy}}
  return true;
 }
 pairContact(a,b,velocity=false){let strongest=-1,inside=false;for(let direction=0;direction<2;direction++){const body=direction?b:a,other=direction?a:b;for(const p of body.p){const speed=this.edgeContact(p,other,velocity);if(speed===-2){inside=true;strongest=Math.max(strongest,0)}else if(speed!==null)strongest=Math.max(strongest,speed)}}if(inside&&!velocity)this.repairOverlap(a,b,true);return strongest}
 canSpawn(level,x,y){const r=LEVELS[level].r,shape=this.shapes.get(level),radius=r*(shape?.beadRadius??Math.sin(Math.PI/NODE_COUNT)*1.06),candidate={p:Array.from({length:NODE_COUNT},(_,i)=>{const t=i/NODE_COUNT*TAU,q=shape?.rest[i];return {x:x+(q?q.x:Math.cos(t))*r,y:y+(q?q.y:Math.sin(t))*r,radius}})},box=bounds(candidate);
  for(const b of this.bodies){const q=bounds(b);if(box.X<q.x||q.X<box.x||box.Y<q.y||q.Y<box.y)continue;if(bodiesOverlap(candidate,b))return false;
   for(const [a,other]of [[candidate,b],[b,candidate]])for(const p of a.p)for(let i=0;i<other.p.length;i++){const u=other.p[i],v=other.p[(i+1)%other.p.length],near=closestOnEdge(p,u,v),min=p.radius+(1-near.t)*u.radius+near.t*v.radius;if(near.d2<min*min)return false}
  }return true;
 }
 step(dt=1/60){dt=Math.max(0,Math.min(dt,1/30));if(!dt)return [];this.time+=dt;this.stepId++;if(this.sleeping)return this.restContacts;for(const b of this.bodies)for(const p of b.p){p.frameX=p.x;p.frameY=p.y}const substeps=Math.ceil(dt*240),h=dt/substeps,pairs=new Map(),hits=new Map();
  for(let sub=0;sub<substeps;sub++){
   for(const b of this.bodies){for(const p of b.p){p.ox=p.x;p.oy=p.y}for(const joint of b.braces)joint.lambda=0;b.edgeLambda.fill(0);b.areaLambda=0;this.forces(b,h)}
   for(let iter=0;iter<4;iter++){
    for(const b of this.bodies){this.skin(b,h);this.brace(b,h)}
    const boxes=this.bodies.map(bounds);
    for(let i=0;i<this.bodies.length;i++){const a=this.bodies[i];
     for(let u=0;u<a.p.length;u++)for(let v=u+3;v<a.p.length;v++){if(a.p.length-(v-u)<=2)continue;const p=a.p[u],q=a.p[v],reach=p.radius+q.radius+.08;if(Math.abs(p.x-q.x)>reach||Math.abs(p.y-q.y)>reach)continue;this.beadContact(p,q,false)}
     for(let j=i+1;j<this.bodies.length;j++){const x=boxes[i],y=boxes[j];if(x.X+.1<y.x||y.X+.1<x.x||x.Y+.1<y.y||y.Y+.1<x.y)continue;const b=this.bodies[j];const strong=this.pairContact(a,b);
      if(strong>=0){const key=a.id+':'+b.id;pairs.set(key,{a,b,intensity:Math.max(strong,pairs.get(key)?.intensity||0)})}
     }
    }
    for(const b of this.bodies)for(const p of b.p){if(p.y>this.floor-p.radius){hits.set(b.id,Math.max(hits.get(b.id)||0,p.vy));p.y=this.floor-p.radius;}
     if(p.x<this.left+p.radius){p.x=this.left+p.radius;}if(p.x>this.right-p.radius){p.x=this.right-p.radius;}
    }
   }
   for(const b of this.bodies)for(const p of b.p){p.vx=Math.max(-650,Math.min(650,(p.x-p.ox)/h));p.vy=Math.max(-750,Math.min(750,(p.y-p.oy)/h))}
   for(const {a,b}of pairs.values())this.pairContact(a,b,true);
   for(const b of this.bodies)for(const p of b.p){
    // Velocity contact also projects positions; keep that last projection inside the scene.
    p.x=Math.max(this.left+p.radius,Math.min(this.right-p.radius,p.x));p.y=Math.min(this.floor-p.radius,p.y);
    if(p.y>=this.floor-p.radius-.05&&p.vy>0){p.vy=0;p.vx*=.98}if(p.x<=this.left+p.radius+.05&&p.vx<0)p.vx=0;if(p.x>=this.right-p.radius-.05&&p.vx>0)p.vx=0}

  }
  for(const [id,intensity]of hits)if(intensity>65){const key=id+':floor';if(this.time-(this.contacts.get(key)??-10)>.25)this.bus.emit('CatCollision',{catA:id,catB:null,intensity,mass:this.bodies.find(b=>b.id===id)?.mass,time:this.time,stepId:this.stepId});this.contacts.set(key,this.time)}
  for(const [key,c]of pairs){const previous=this.contacts.get(key),mass=(c.a.mass+c.b.mass)/2;if(previous===undefined||this.time-previous>.16)this.bus.emit('CatCollision',{catA:c.a.id,catB:c.b.id,intensity:c.intensity,mass,time:this.time,stepId:this.stepId});
   // Sustained tangential motion only; resting bead jitter is below this threshold.
   if(previous!==undefined&&this.time-previous<.1){const a=center(c.a),b=center(c.b),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,velocity=body=>body.p.reduce((v,p)=>({x:v.x+p.vx/body.p.length,y:v.y+p.vy/body.p.length}),{x:0,y:0}),va=velocity(c.a),vb=velocity(c.b),vx=vb.x-va.x,vy=vb.y-va.y,tangent=Math.abs((-dy*vx+dx*vy)/d),normal=Math.abs((dx*vx+dy*vy)/d),slideKey='slide:'+key;
    if(tangent>40&&normal<80&&this.time-(this.contacts.get(slideKey)??-10)>.7){this.bus.emit('CatSlide',{catA:c.a.id,catB:c.b.id,intensity:tangent,mass,time:this.time,stepId:this.stepId});this.contacts.set(slideKey,this.time)}
   }this.contacts.set(key,this.time)}
  for(const [key,t]of this.contacts)if(this.time-t>1)this.contacts.delete(key);this.restContacts=[...pairs.values()];let maxMotion=0,maxSpeed=0,supported=false;
  for(const b of this.bodies)for(const p of b.p){maxMotion=Math.max(maxMotion,Math.hypot(p.x-p.frameX,p.y-p.frameY));maxSpeed=Math.max(maxSpeed,Math.hypot(p.vx,p.vy));if(p.y+p.radius>=this.floor-.1)supported=true}
  this.restTime=supported&&maxMotion<.06&&maxSpeed<4?this.restTime+dt:0;
  if(this.bodies.length&&this.restTime>.65){if(this.restContacts.some(({a,b})=>bodiesOverlap(a,b))){this.restTime=0;return this.restContacts}this.sleeping=true;for(const b of this.bodies)for(const p of b.p){p.vx=0;p.vy=0}}
  return this.restContacts;
 }
}
