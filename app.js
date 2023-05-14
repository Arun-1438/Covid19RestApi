const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const jwt = require('jsonwebtoken')


const app = express()

app.use(express.json())

const dbPath = path.join(__dirname,"covid19IndiaPortal.db")

let db = null;

const initializedb = async () => {
    try{
        db = await open({
            filename : dbPath,
            driver : sqlite3.Database
        })
        app.listen(3004,() => console.log("Server is running at http://localhost:3004"))
    } 
    catch (error){
        process.exit(1);
        console.log(error.message)
    }
}

initializedb();

// MiddleWare Function

const Authentication = (request,response,next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"]
    if(authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1]
    }
    if(jwtToken === undefined){
        response.status(401)
        response.send("Invalid JWT Token")
    }
    else{
        jwt.verify(jwtToken, "MY_SECRET_TOKEN", async(error,payload) => {
            if(error){
                response.status(401)
                response.send("Invalid JWT Token")
            }
            else{
                next()
            }
        })
    }

}

// API 1
app.post("/login/" , (request,response) => {
    const {username,password}= request.body
    if(username === "christopher_phillips"){
        if(password === "christy@123"){
            const payLoad ={
                username : username,
            }
            const jwtToken = jwt.sign(payLoad, "MY_SECRET_TOKEN")

            response.send({"jwtToken" : jwtToken})
        }
        else{
            response.status(400)
            response.send("Invalid password")
        }
    }
    else{
        response.status(400)
        response.send("Invalid user")
    }
})

// API 2
app.get("/states/",Authentication,async (request,response) => {
    const getStatesQuery = `SELECT * FROM state`
    const states = await db.all(getStatesQuery);
    const formatedStates = states.map(eachState => ({
        stateId : eachState.state_id,
        stateName : eachState.state_name,
        population : eachState.population
    }))

    response.send(formatedStates)
})

// API 3

app.get("/states/:stateId/", Authentication,async (request,response) => {
    const {stateId} = request.params
    const getState = `SELECT * FROM state WHERE state_id = ${stateId}`
    const state = await db.get(getState)
    const formatedState = {
        stateId : state.state_id,
        stateName : state.state_name,
        population : state.population
    }
    response.send(formatedState)
})

// API 4

app.post("/districts/", Authentication, async (request,response) => {
        const {districtName, stateId, cases, cured, active, deaths} = request.body
        const addQuery = `INSERT INTO district (district_name, state_id, cases, cured, active, deaths) VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths})`
        await db.run(addQuery)
        response.send("District Successfully Added")
})


// API 5

app.get("/districts/:districtId/", Authentication, async (request,response) => {
    const {districtId} = request.params
    const getDistrict = `SELECT * FROM district WHERE district_id = ${districtId}`
    const district = await db.get(getDistrict)
    const formatedDistrict = {
        districtId : district.district_id,
        districtName : district.district_name,
        stateId : district.state_id,
        cases : district.cases,
        cured : district.cured,
        active : district.active,
        deaths : district.deaths
    }
    response.send(formatedDistrict)
})

// API 6
app.delete("/districts/:districtId/", Authentication,async (request,response) => {
    const {districtId} = request.params
    const deleteDistrict = `DELETE FROM district WHERE district_id = ${districtId}`
    await db.run(deleteDistrict)
    response.send("District Removed")
})


// API 7

app.put("/districts/:districtId/", Authentication, async (request,response) => {
    const {districtId} = request.params
    const districtDetails = request.body
    const {districtName, stateId, cases, cured, active, deaths} = districtDetails
    const updateDistrict = `UPDATE district SET district_name = '${districtName}', state_id = ${stateId}, cases = ${cases}, 
    cured = ${cured}, active = ${active}, deaths= ${deaths} WHERE district_id = ${districtId}`

    await db.run(updateDistrict)
    response.send("District Details Updated")
})

// API 8
app.get("/states/:stateId/stats/", Authentication,async (request,response) => {
    const {stateId} = request.params
    const getStateStats = `SELECT SUM(cases) AS totalCases,SUM(cured) AS totalCured,SUM(active) AS totalActive,SUM(deaths) AS totalDeaths FROM district WHERE state_id = ${stateId}`
    const data = await db.get(getStateStats)
    response.send(data)
})

module.exports = app;