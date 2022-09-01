import express from "express"
import cors from "cors"
import dayjs from "dayjs"
import joi from "joi"
import {MongoClient} from "mongodb"
import dotenv from "dotenv"
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

function filterMessages(type, from, to, user, value) {
    if(type !== "private_message" || (from === user || to === user)) {
        return value
    }
    console.log(type, from, to, user, value)
}

server.post("/participants", async (req, res) => {

    const {name} = req.body
    const schema = joi.object({
        name: joi.string().required()
    })
    const {value, error} = schema.validate({name})
    
    if (error) {
        res.sendStatus(422)
        return 
    }

    try {
        const participants = await db.collection("participants").find().toArray()
        const searchParticipant = participants.find(value => value.name === name)

        if (searchParticipant) {
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

    db.collection("participants").insertOne(participant)
    db.collection("messages").insertOne(welcomeMessage)
    res.sendStatus(201)
})

server.get("/participants", async (req, res) => {
    
    try {
        const participants = await db.collection("participants").find().toArray()
        participants.forEach(value => value._id = undefined)
        res.send(participants)

    } catch (error) {
        res.status(400).send(error)
    }
})

server.post("/messages", async (req, res) => {

    const {to, text, type} = req.body
    const {user} = req.headers
    const schema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required().valid("message", "private_message")
    })

    const {value, error} = schema.validate({to, text, type})

    if(error) {
        res.sendStatus(422)
        return
    }

    try {
        const participants = await db.collection("participants").find().toArray()
        const searchParticipant = participants.find(value => value.name === user)

        if(!searchParticipant) {
            res.sendStatus(422)
            return
        }

    } catch (error) {
        res.sendStatus(400)
    }

    const message = {from: user, to, text, type, time: dayjs().format("HH:mm:ss")}
    db.collection("messages").insertOne(message)
    res.status(201).send(message)
})

server.get("/messages", async (req, res) => {

    const {user} = req.headers
    const {limit} = req.query

    try {
        const messages = await db.collection("messages").find().toArray()
        const filteredMessages = messages.filter(value => {
            if(value.type !== "private_message" || (value.from === user || value.to === user)) {
                return value
            }
            //console.log(value)
            //filterMessages(value.type, value.from, value.to, user, value)
        })
        if (limit) {
            res.status(200).send(filteredMessages.slice(-limit))
            return
        }
        res.status(200).send(filteredMessages)
    } catch (error) {
        res.sendStatus(400)
    }
})

server.post("/status", async (req, res) => {

    const {user} = req.headers

    try {
        const participants = await db.collection("participants").find().toArray()
        const searchParticipant = participants.find(value => value.name === user)
        const participant = {name: user, lastStatus: Date.now()}

        if (!searchParticipant) {
            res.sendStatus(404)
            return
        }

        db.collection("participants").deleteOne({name: user})
        db.collection("participants").insertOne(participant)
        res.sendStatus(200)

    } catch (error) {
        res.sendStatus(400)
    }
})

server.listen(5000, () => console.log("Listening on port 5000"))