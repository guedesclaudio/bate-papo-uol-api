import express from "express"
import cors from "cors"
import dayjs from "dayjs"
import joi from "joi"
import {MongoClient} from "mongodb"
import dotenv from "dotenv"

const mongoClient = new MongoClient("mongodb://localhost:27017")
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

function checkPartipants() {

    const farewellMessage = {
        from: "",
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss")
    }
}

//setInterval(checkPartipants, 15000)

server.post("/participants", (req, res) => {

    const {name} = req.body
    const schema = joi.object({
        name: joi.string().required()
    })
    const {value, error} = schema.validate({name})
    
    if (error) {
        res.sendStatus(422)
        return 
    }

    const partipant = {name, lastStatus: Date.now()}

    const welcomeMessage = {
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss")
    }

    db.collection("participants").insertOne(partipant)
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
        console.log(messages)
        const filteredMessages = messages.filter(value => {
            if(value.type === "message" || (value.from === user || value.to === user)) {
                return value
            }
        })
        if (limit) {
            res.status(200).send(filteredMessages.slice(-limit))
            console.log(limit)
            return
        }
        res.status(200).send(filteredMessages)
    } catch (error) {
        res.sendStatus(400)
    }
})

server.post("/status", (req, res) => {

    const {User} = req.headers
})

server.listen(5000, () => console.log("Listening on port 5000"))