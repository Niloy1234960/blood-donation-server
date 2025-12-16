const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

require("dotenv").config()
const port = process.env.PORT || 3000

const app =express();
app.use(cors())
app.use(express.json())


const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);
const uri = "mongodb+srv://assignment-11:OnlBeGmiTaRL8i5u@niloy007.efzjtnv.mongodb.net/?appName=niloy007";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const verifyFbToken = async(req, res, next) => {
  const token = req.headers.authorization

  if(!token){
    return res.status(401).send({message: 'unauthorize'})
  }

  try{
    const idToken = token.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    console.log("decoded info", decoded)
    req.decoded_email = decoded.email
    next()
  }
  catch(error){
    return req.status(401).send({message: 'unauthorize'})
  }
}


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db=client.db("pawmart")
    const usersCollection =db.collection("user")
    const requestCollection =db.collection("request")


    app.post("/users",async(req,res)=>{
        const userInfo =req.body
        userInfo.createAt = new Date()
        userInfo.role = 'donor'
        userInfo.status = 'active'
        const result = await usersCollection.insertOne(userInfo)
        res.send(result)
    })

    app.get('/users', verifyFbToken, async(req, res)=> {
        const result = await usersCollection.find().toArray()
        res.status(200).send(result)
    })


    app.get("/users",async(req,res)=>{
        const email =req.query.email
        const query ={email:email}
        const result = await usersCollection.findOne(query)
        res.send(result)

    })

    app.get("/users/role/:email", async(req,res)=>{
        const {email} =req.params
        const query ={email:email}
        const result = await usersCollection.findOne(query)
        res.send(result)
    })

    app.patch('/update/user/status', verifyFbToken, async(req, res)=>{
        const {email, status} = req.query
        const query = {email:email}
        const updateStatus = {
          $set: {
            status:status
          }
        }
        const result = await usersCollection.updateOne(query, updateStatus)
        res.send(result)
    })

  

    // request api 
    app.post("/request", verifyFbToken, async(req,res)=>{
      const data =req.body;
   
      const result =await requestCollection.insertOne(data);
      res.send(result)
    })

    app.get('/request/:email', async(req,res)=>{
      const email = req.params.email
      const query = {requester_email:email}
      const result = await requestCollection.find(query).toArray()
      res.send(result)
    })

  
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get("/",(req,res)=>{
    res.send("powmart server is runnig")
})

app.listen(port,()=>{
    console.log(`powmart server running on port ${port}`)
})