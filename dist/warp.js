// Mean-value cage coordinates. The physical bead ring drives a separate mesh
// covering the ENTIRE image rectangle, including pixels outside the collider.
export function cageWeights(point, cage) {
 const n=cage.length, v=cage.map(p=>({x:p.x-point.x,y:p.y-point.y})),r=v.map(p=>Math.hypot(p.x,p.y));
 for(let i=0;i<n;i++)if(r[i]<1e-7){const w=Array(n).fill(0);w[i]=1;return w}
 const tan=[];
 for(let i=0;i<n;i++){
  const j=(i+1)%n,cross=v[i].x*v[j].y-v[i].y*v[j].x,dot=v[i].x*v[j].x+v[i].y*v[j].y;
  if(Math.abs(cross)<1e-8&&dot<0){const w=Array(n).fill(0);w[i]=r[j]/(r[i]+r[j]);w[j]=1-w[i];return w}
  tan.push(Math.tan(Math.atan2(cross,dot)/2));
 }
 const w=r.map((d,i)=>(tan[(i+n-1)%n]+tan[i])/d),sum=w.reduce((a,b)=>a+b,0);
 if(!Number.isFinite(sum)||Math.abs(sum)<1e-12)throw Error('Degenerate deformation cage');
 return w.map(x=>x/sum);
}
export function createImageMesh(width,height,cage,columns=16,rows=16){
 const vertices=[],triangles=[];
 for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
  const source={x:x*width/columns,y:y*height/rows};
  vertices.push({source,weights:cageWeights(source,cage)});
 }
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;
  triangles.push([a,b,d],[a,d,c]);
 }
 return {vertices,triangles};
}
export function deformImageMesh(mesh,cage){
 return mesh.vertices.map(({weights})=>{
  let x=0,y=0;for(let i=0;i<weights.length;i++){x+=weights[i]*cage[i].x;y+=weights[i]*cage[i].y}return {x,y};
 });
}

// Local signed-area constraints stop texture triangles turning inside out.
// All source vertices/triangles survive; this adjusts only folded screen-space regions.
export function stabilizeImageMesh(mesh,points){
 const minimum=.005;
 for(let pass=0;pass<24;pass++){
  let changed=false;
  for(const [i,j,k]of mesh.triangles){
   const a=points[i],b=points[j],c=points[k],signed=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
   if(signed>=minimum)continue;
   const ax=b.y-c.y,ay=c.x-b.x,bx=c.y-a.y,by=a.x-c.x,cx=a.y-b.y,cy=b.x-a.x,sum=ax*ax+ay*ay+bx*bx+by*by+cx*cx+cy*cy;
   if(sum<1e-12)continue;
   const correction=(minimum-signed)/sum;
   a.x+=ax*correction;a.y+=ay*correction;b.x+=bx*correction;b.y+=by*correction;c.x+=cx*correction;c.y+=cy*correction;changed=true;
  }
  if(!changed)break;
 }
 return points;
}

export function createFaceRig(source,point){const landmarks=[point,{x:point.x+18,y:point.y},{x:point.x,y:point.y+18},{x:point.x-18,y:point.y},{x:point.x,y:point.y-18}];return {point,landmarks,weights:landmarks.map(p=>cageWeights(p,source))}}
export function protectFace(mesh,deformed,cage,rig,naturalScale){
 const mapped=rig.weights.map(w=>{let x=0,y=0;for(let i=0;i<w.length;i++){x+=w[i]*cage[i].x;y+=w[i]*cage[i].y}return {x,y}}),center=mapped[0];let dot=0,cross=0,denom=0;
 for(let i=1;i<mapped.length;i++){const sx=rig.landmarks[i].x-rig.point.x,sy=rig.landmarks[i].y-rig.point.y,dx=mapped[i].x-center.x,dy=mapped[i].y-center.y;dot+=sx*dx+sy*dy;cross+=sx*dy-sy*dx;denom+=sx*sx+sy*sy}
 const angle=Math.atan2(cross,dot),scale=Math.max(naturalScale*.82,Math.min(naturalScale*1.12,Math.hypot(dot,cross)/denom)),co=Math.cos(angle),si=Math.sin(angle);
 return deformed.map((p,i)=>{const s=mesh.vertices[i].source,dx=s.x-rig.point.x,dy=s.y-rig.point.y,blend=.86*Math.exp(-(dx*dx+dy*dy)/(2*34*34));return {x:p.x+(center.x+(dx*co-dy*si)*scale-p.x)*blend,y:p.y+(center.y+(dx*si+dy*co)*scale-p.y)*blend}});
}
