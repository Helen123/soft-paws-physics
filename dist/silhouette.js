// Derive both collision geometry and texture coordinates from opaque cat pixels.
// Thin whiskers and nearly transparent generation fringes are not rigid surfaces.
export function extractSilhouette(imageData,count=32){
 const {width:w,height:h,data}=imageData;
 const opaque=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&data[(y*w+x)*4+3]>=96;
 let sx=0,sy=0,total=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(opaque(x,y)){sx+=x;sy+=y;total++}
 if(total<25)throw Error('Cat texture has no usable opaque body');
 const origin={x:sx/total,y:sy/total},dense=[],samples=count*8;
 const body=(x,y)=>{let hits=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(opaque(Math.round(x)+dx,Math.round(y)+dy))hits++;return hits>=5};
 for(let i=0;i<samples;i++){
  const a=i/samples*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a);let last=0;
  for(let t=0;t<Math.hypot(w,h);t+=.5){const x=origin.x+dx*t,y=origin.y+dy*t;if(x<0||y<0||x>=w||y>=h)break;if(body(x,y))last=t}
  if(last<2)throw Error('Cat silhouette is not star-shaped around its body');
  dense.push({x:origin.x+dx*last,y:origin.y+dy*last});
 }
 // Spend the fixed node budget at ears, shoulders and other contour turns.
 // Straight spans need fewer nodes; uniform angle samples leave gaps at concavities.
 const selected=[0,Math.floor(samples/4),Math.floor(samples/2),Math.floor(samples*3/4)];
 while(selected.length<count){
  selected.sort((a,b)=>a-b);let best=-1,index=-1;
  for(let k=0;k<selected.length;k++){
   const start=selected[k],end=k+1<selected.length?selected[k+1]:samples+selected[0],a=dense[start],b=dense[end%samples],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy||1;
   for(let j=start+1;j<end;j++){const p=dense[j%samples],t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)),error=(p.x-a.x-t*dx)**2+(p.y-a.y-t*dy)**2;if(error>best){best=error;index=j%samples}}
  }
  if(index<0)throw Error('Could not sample cat boundary');selected.push(index);
 }
 selected.sort((a,b)=>a-b);const points=selected.map(i=>dense[i]);
 const center={x:points.reduce((s,p)=>s+p.x,0)/count,y:points.reduce((s,p)=>s+p.y,0)/count};
 const radius=Math.max(...points.map(p=>Math.hypot(p.x-center.x,p.y-center.y)));
 return {center,points,radius,rest:points.map(p=>({x:(p.x-center.x)/radius,y:(p.y-center.y)/radius}))};
}

// Equal arc-length spacing makes neighboring physical bead disks meet reliably.
export function createBeadGeometry(imageData,count=32){
 const shape=extractSilhouette(imageData,count*2),points=shape.points,lengths=points.map((p,i)=>Math.hypot(p.x-points[(i+1)%points.length].x,p.y-points[(i+1)%points.length].y)),perimeter=lengths.reduce((a,b)=>a+b,0),beadRadius=perimeter/count*.52;
 let edge=0,walk=0;const source=[];
 for(let i=0;i<count;i++){const distance=i*perimeter/count;while(walk+lengths[edge]<distance){walk+=lengths[edge++]}const t=(distance-walk)/lengths[edge],a=points[edge],b=points[(edge+1)%points.length],x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,dx=x-shape.center.x,dy=y-shape.center.y,len=Math.hypot(dx,dy)||1;
  source.push({x:x-dx/len*beadRadius*.95,y:y-dy/len*beadRadius*.95});
 }
 return {...shape,points:source,beadRadius:beadRadius/shape.radius,rest:source.map(p=>({x:(p.x-shape.center.x)/shape.radius,y:(p.y-shape.center.y)/shape.radius}))};
}
