import express from "express"
import cors from "cors"
import dayjs from "dayjs"
import joi from "joi"

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

    res.sendStatus(201)
})

server.get("/participants", (req, res) => {

})

server.post("/messages", (req, res) => {

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

    const message = {from: user, to, text, type, time: dayjs().format("HH:mm:ss")}
    res.status(201).send(message)
})

server.get("/messages", (req, res) => {

    const {User} = req.headers
    const {limit} = req.query
})

server.post("/status", (req, res) => {

    const {User} = req.headers
})

server.listen(5000, () => console.log("Listening on port 5000"))