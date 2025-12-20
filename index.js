const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRATE);

const app = express();
app.use(cors());
app.use(express.json());
const admin = require("firebase-admin");
require("dotenv").config()


const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);
const uri =
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@niloy007.efzjtnv.mongodb.net/?appName=niloy007`;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFbToken = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).send({ message: "unauthorize" });
  }

  try {
    const idToken = token.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("decoded info", decoded);
    req.decoded_email = decoded.email;
    next();
  } catch (error) {
    return req.status(401).send({ message: "unauthorize" });
  }
};


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const db = client.db("pawmart");
    const usersCollection = db.collection("user");
    const requestCollection = db.collection("request");

    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      userInfo.createAt = new Date();
      userInfo.role = "donor";
      userInfo.status = "active";
      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
    });

    app.get("/users", verifyFbToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.status(200).send(result);
    });

    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.get("/users/role/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // status update api 
    app.patch("/update/user/status", verifyFbToken, async (req, res) => {
      const { email, status } = req.query;
      const query = { email: email };
      const updateStatus = {
        $set: {
          status: status,
        },
      };
      const result = await usersCollection.updateOne(query, updateStatus);
      res.send(result);
    });

    // role update api 
    app.patch("/update/user/role", verifyFbToken, async (req, res) => {
      const { email, role } = req.query;
      const query = { email: email };
      const updateStatus = {
        $set: {
          role: role,
        },
      };
      const result = await usersCollection.updateOne(query, updateStatus);
      res.send(result);
    });

    // request api
    app.post("/request", verifyFbToken, async (req, res) => {
      const data = req.body;

      const result = await requestCollection.insertOne(data);
      res.send(result);
    });

    
    // delete api

    app.delete("/Delete-request",  async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.deleteOne(query);
      res.send(result);
    });


    // cencel  api 
    app.patch("/cancel-request", async(req,res)=>{
      const {id,status}=req.query;
        console.log(id, status);
      const query ={_id :new ObjectId(id)}
    
      const update ={
        $set :{
          donation_status :status
        }
      }
      const result =await requestCollection.updateOne(query,update)
      res.send(result)
    })


    // done api
    app.patch("/done-request", async(req, res)=> {
      const {id, status}= req.query
      const query = {_id: new ObjectId(id)}
      const update ={
        $set :{
          donation_status :status
        }
      }
      const result = await requestCollection.updateOne(query, update)
    })


    app.get('/allRequest', async(req, res)=> {
      const status=req.query.status;
      console.log(status);
            let query = {}
      if(status){
        query.donation_status = status
      }
      console.log(query);
      const result = await requestCollection.find(query).toArray()
      res.send(result)
    })

    // view request 
    app.get("/Dashboard/view-request/:id",async(req,res)=>{
      const {id} = req.params;
      const query ={_id : new ObjectId(id)}
      const result = await requestCollection.findOne(query)
      res.send(result)
    })


    // Request edit
    app.put("/Dashboard/update-request/:id",async(req,res)=>{
      const {id}=req.params;
      const formData=req.body;
      const query ={_id : new ObjectId(id)}
      const update ={
        $set: formData  
      }
      const result =await requestCollection.updateOne(query,update);
      res.send(result)
    })


    app.get('/myRequests', async(req, res)=> {
      const result = await requestCollection.find().limit(3).toArray()
      res.send(result)
    })



    // donate
    app.patch("/donate", async(req,res)=>{
      const {status,id} =req.query;
      const query ={_id :new ObjectId(id)}
      const update={
        $set :{
          donation_status:status
        }
      }
      const result = await requestCollection.updateOne(query,update)
      res.send(result)
    })



    app.get("/donation-page",async(req,res)=>{
      const query ={donation_status :"pending"}
      const result =await requestCollection.find(query).toArray()
      res.send(result)
    })



    app.get("/request/:email", async (req, res) => {
      const email = req.params.email;
      const query = { requester_email: email };
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/search-requests", async (req, res) => {
      const { bloodGroup, district, upazila } = req.query;
      const query = {};

      if (!query) {
        return;
      }
      if (bloodGroup) {
        const fixed = bloodGroup.replace(/ /g, "+").trim();
        query.blood_group = fixed;
      }
      if (district) {
        query.district_name = district;
      }
      if (upazila) {
        query.upazila_name = upazila;
      }
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });

    // profile api
    app.get("/user-profile", verifyFbToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // profile update api
    app.patch("/update-profile", verifyFbToken, async (req, res) => {
      const { name, image, upazila, district, blood } = req.body;
      const email = req.decoded_email;
      const query = { email: email };
      const update = {
        $set: {
          name: name,
          imageLink: image,
          upazila: upazila,
          district: district,
          blood: blood,
        },
      };
      const result = await usersCollection.updateOne(query, update);
      res.send(result);
    });

    

    app.get('/donation-details/:id', async(req, res)=> {
      const id = req.params
      const query = {_id: new ObjectId(id)}
      const result = await requestCollection.findOne(query);
      res.send(result)
   
    })


  




    app.post("/create-payment-cheekout", async (req, res) => {
      const information = req.body;
      const amount = parseInt(information.donateAmount) * 100;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              procuct_data: {
                name: "please donate",
              },
            },

            quantity: 1,
          },
        ],
        mode: "payment",
        metadata: {
          donorName: information?.donorName,
        },
        customer_email: information?.donorEmail,
        success_url: `${process.env.SITE_DOMAIN}/payment-success?session-id={CHEKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-cancelled`,
      });

      res.send({ url: session.url });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("powmart server is runnig");
});

app.listen(port, () => {
  console.log(`powmart server running on port ${port}`);
});
