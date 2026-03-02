export default async function handler(a,b){
if(!global.c)global.c={}
if(a.method==="POST"){
let d=""
for await(const e of a)d+=e
let f=JSON.parse(d)
if(f.t==="save")global.c[f.k]=f.v
if(f.t==="get")return b.status(200).json({v:global.c[f.k]||null})
return b.status(200).json({ok:true})
}
b.status(405).end()
}