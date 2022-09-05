import express from "express"
import cors from "cors"
import dayjs from "dayjs"
import joi from "joi"
import dotenv from "dotenv"
import {MongoClient, ObjectId} from "mongodb"
import { strict as assert } from "assert"
import { stripHtml } from "string-strip-html"
dotenv.config()

const mongoClient = new MongoClient(process.env.MONGO_URI)
let db

mongoClient
    .connect()
    .then(() => {
    db = mongoClient.db("test")
})

const server = express()

server
    .use(cors())
    .use(express.json())

const schemaMessage = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid("message", "private_message")
})

async function checkParticipants() {

    try {
        const participants = await db.collection("participants").find().toArray()
        const filteredInactiveParticipants = participants.filter(value => {
            if ((Date.now() - Number(value.lastStatus)) / 1000 >= 10) {
                return value
            }
        })

        if (filteredInactiveParticipants) {
            filteredInactiveParticipants.forEach(value => {
                const farewellMessage = {
                    from: value.name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format("HH:mm:ss")
                }
                
                db.collection("participants").deleteOne({name: value.name})
                db.collection("messages").insertOne(farewellMessage)
            })
        }
    } catch (error) {
        console.log(error)
    }
}
setInterval(checkParticipants, 15000)

function filterMessages(type, from, to, user) {
    if(type !== "private_message" || (from === user || to === user)) {
        return true
    }
}

server.post("/participants", async (req, res) => {

    const name = req.body.name.trim()

    const schemaName = joi.object({
        name: joi.string().required()
    })
    const {value, error} = schemaName.validate({name})
    
    if (error) {
        res.sendStatus(422)
        return 
    }

    try {
        const checkParticipant = await db.collection("participants").findOne({name: name})

        if (checkParticipant) {
            res.sendStatus(409)
            return 
        }

    } catch (error) {
        res.sendStatus(400)
        return
    }

    const participant = {name, lastStatus: Date.now()}

    const welcomeMessage = {
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss")
    }

    try {
        await db.collection("participants").insertOne(participant)
        await db.collection("messages").insertOne(welcomeMessage)
        res.sendStatus(201)
    } catch (error) {
        res.sendStatus(500)
    }
})

server.get("/participants", async (req, res) => {
    
    try {
        const participants = await db.collection("participants").find().toArray()
        res.send(participants)

    } catch (error) {
        res.sendStatus(500)
    }
})

server.post("/messages", async (req, res) => {

    const {to, text, type} = req.body
    const {user} = req.headers
    let message = {}
    const {value, error} = schemaMessage.validate({to, text, type})
    
    if(error) {
        res.sendStatus(422)
        return
    }

    try {
        const participant = await db.collection("participants").findOne({name: user})
        
        if(!participant) {
            res.sendStatus(422)
            return
        }

        message = {from: user, to, text, type, time: dayjs().format("HH:mm:ss")}
        await db.collection("messages").insertOne(message)
        res.sendStatus(201)

    } catch (error) {
        res.sendStatus(500)
    }

})

server.get("/messages", async (req, res) => {

    const {user} = req.headers
    const {limit} = req.query

    try {
        const messages = await db.collection("messages").find().toArray()
        const filteredMessages = messages.filter(value => {
            const {type, from, to} = value
            return filterMessages(type, from, to, user)
        })
        if (limit) {
            res.status(200).send(filteredMessages.slice(-limit))
            return
        }
        res.status(200).send(filteredMessages)
    } catch (error) {
        res.sendStatus(500)
    }
})

server.post("/status", async (req, res) => {

    const {user} = req.headers

    try {
        const checkParticipant = await db.collection("participants").findOne({name: user})

        if (!checkParticipant) {
            res.sendStatus(404)
            return
        }

        const participant = {name: user, lastStatus: Date.now()}
        await db.collection("participants").deleteOne({name: user})
        await db.collection("participants").insertOne(participant)
        res.sendStatus(200)

    } catch (error) {
        res.sendStatus(400)
    }
})

server.delete("/messages/:id", async (req, res) => {
    const {user} = req.headers
    const {id} = req.params

    try {
        const message = await db.collection("messages").findOne({_id: new ObjectId(id)})
        
        if (!message) {
            res.sendStatus(404)
            return
        }
        if (message.from !== user) {
            res.sendStatus(401)
            return
        }

        await db.collection("messages").deleteOne({_id: new ObjectId(id)})
        res.sendStatus(200)

    } catch (error) {
        res.sendStatus(500)
    }
})

server.put("/messages/:id", async (req, res) => {
    const {user} = req.headers
    const {id} = req.params
    const {to, text, type} = req.body
    const {value, error} = schemaMessage.validate({to, text, type})
    
    if(error) {
        res.sendStatus(422)
        return
    }

    try {
        const participant = await db.collection("participants").findOne({name: user})
        const message = await db.collection("messages").findOne({_id: new ObjectId(id)})

        if(!participant) {
            res.sendStatus(422)
            return
        }
        if(!message) {
            res.sendStatus(404)
        }
        if (message.from !== user) {
            res.sendStatus(401)
        }

        await db.collection("messages").updateOne({_id: new ObjectId(id)}, {$set: req.body})
        res.sendStatus(200)

    } catch (error) {
        res.sendStatus(500)
    }
})

server.listen(5000, () => console.log("Listening on port 5000"))