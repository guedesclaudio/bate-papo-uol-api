import express from "express"
import cors from "cors"
import dayjs from "dayjs"

const server = express()
server
    .use(cors())
    .use(express.json())

server.post("/participants", (req, res) => {
    const {name} = req.body
    const partipant = {name, lastStatus: Date.now()}
    res.status(201).send(partipant)
})

server.get("/participants", (req, res) => {

})

server.post("/messages", (req, res) => {
    const {to, text, type} = req.body
    const {user} = req.headers
    const message = {to, text, type, time: dayjs().format("HH:mm:ss")}
    res.status(201).send(message)
})

server.get("/messages", (req, res) => {

})

server.post("/status", (req, res) => {

})

server.listen(5000, () => console.log("Listening on port 5000"))