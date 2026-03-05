import crypto from "crypto"

const a = process.env.api_secret

const b = process.env.webhook_exec
const c = process.env.webhook_abuse
const d = process.env.webhook_invalid
const e = process.env.webhook_error

const f = new Map()
const g = new Map()
const h = new Map()
const i = new Map()
const j = new Map()

function k(l){
    return crypto.createHash("sha256").update(l).digest("hex")
}

function m(){
    return new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})
}

async function n(o,p){
    await fetch(o,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify(p)
    })
}

export default async function handler(q,r){

    const s = q.headers["x-forwarded-for"] || q.socket.remoteAddress
    const t = Date.now()

    const u = q.headers["user-agent"] || "desconhecido"

    const v = q.method

    const w = u.toLowerCase().includes("mozilla") ? "navegador" : "executor"

    if(j.has(s)){

        const aa = j.get(s)

        if(t < aa){
            return r.status(403).end()
        }

        j.delete(s)
    }

    const {
        username:x,
        userId:y,
        experience:z,
        timestamp:aa,
        nonce:ab,
        signature:ac
    } = q.body || {}

    if(!x || !y || !z || !aa || !ab || !ac){

        await n(d,{
            embeds:[{
                title:"request invalido",
                fields:[
                    {name:"ip",value:String(s)},
                    {name:"user agent",value:String(u)},
                    {name:"tipo request",value:v},
                    {name:"origem",value:w},
                    {name:"horario",value:m()}
                ]
            }]
        })

        return r.status(400).end()
    }

    if(Math.abs(t - aa) > 10000){

        await n(d,{
            embeds:[{
                title:"request expirado",
                fields:[
                    {name:"ip",value:String(s)},
                    {name:"user agent",value:String(u)},
                    {name:"tipo request",value:v},
                    {name:"horario",value:m()}
                ]
            }]
        })

        return r.status(403).end()
    }

    if(f.has(ab)){

        await n(c,{
            embeds:[{
                title:"replay detectado",
                fields:[
                    {name:"nonce",value:String(ab)},
                    {name:"ip",value:String(s)},
                    {name:"horario",value:m()}
                ]
            }]
        })

        return r.status(403).end()
    }

    f.set(ab,true)

    const ad = k(`${x}:${y}:${z}:${aa}:${ab}:${a}`)

    if(ad !== ac){

        await n(d,{
            embeds:[{
                title:"assinatura invalida",
                fields:[
                    {name:"ip",value:String(s)},
                    {name:"user agent",value:String(u)},
                    {name:"tipo request",value:v},
                    {name:"horario",value:m()}
                ]
            }]
        })

        return r.status(403).end()
    }

    const ae = g.get(s)

    if(ae && t - ae < 3000){

        let af = i.get(s) || 0
        af++

        i.set(s,af)

        if(af % 10 === 0){

            await n(c,{
                embeds:[{
                    title:"abuse detectado",
                    fields:[
                        {name:"ip",value:String(s)},
                        {name:"tentativas",value:`x${af}`},
                        {name:"user agent",value:String(u)},
                        {name:"horario",value:m()}
                    ]
                }]
            })
        }

        if(af >= 30){

            j.set(s, t + 900000)

            await n(c,{
                embeds:[{
                    title:"ip banido",
                    fields:[
                        {name:"ip",value:String(s)},
                        {name:"tentativas",value:`x${af}`},
                        {name:"duracao",value:"15 minutos"},
                        {name:"user agent",value:String(u)},
                        {name:"horario",value:m()}
                    ]
                }]
            })
        }

        return r.status(429).end()
    }

    g.set(s,t)

    const ag = h.get(y)

    if(ag && t - ag < 15000){
        return r.status(429).end()
    }

    h.set(y,t)

    try{

        const ah = await fetch(`https://users.roblox.com/v1/users/${y}`)
        const ai = await ah.json()

        if(!ai.name || ai.name.toLowerCase() !== x.toLowerCase()){

            await n(d,{
                embeds:[{
                    title:"username mismatch",
                    fields:[
                        {name:"username enviado",value:String(x)},
                        {name:"username real",value:String(ai.name || "desconhecido")},
                        {name:"ip",value:String(s)},
                        {name:"horario",value:m()}
                    ]
                }]
            })

            return r.status(403).end()
        }

        await n(b,{
            embeds:[{
                title:"execucao",
                fields:[
                    {name:"username",value:String(ai.name),inline:true},
                    {name:"displayName",value:String(ai.displayName),inline:true},
                    {name:"userId",value:String(y),inline:true},
                    {name:"experiencia",value:String(z)},
                    {name:"executor",value:w},
                    {name:"user agent",value:String(u)},
                    {name:"ip",value:String(s)},
                    {name:"tipo request",value:v},
                    {name:"horario",value:m()}
                ]
            }]
        })

        r.status(200).json({success:true})

    }catch{

        await n(e,{
            embeds:[{
                title:"erro interno",
                fields:[
                    {name:"ip",value:String(s)},
                    {name:"user agent",value:String(u)},
                    {name:"horario",value:m()}
                ]
            }]
        })

        r.status(500).end()
    }
}
