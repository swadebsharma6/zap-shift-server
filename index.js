const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json())


app.get('/', (req, res)=>{
      res.send('zap-shift server is running')
});



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fvmax46.mongodb.net/?appName=Cluster0`;

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

    const parcelCollection = client.db('zap-shift-DB').collection('parcels');

    app.get('/parcels', async(req, res)=>{
      const result = await parcelCollection.find().toArray();
      res.send(result)
    })

    app.get('/parcels', async(req, res)=>{
      const userEmail = req.query.email;
      
      const query = userEmail ? {created_by: userEmail}: {};
      const options ={
        sort:{ createdAt: -1}
      }
      const result = await parcelCollection.find(query, options).toArray();
      res.status(201).send(result)
    })


    // POST: post a parcels api
    app.post('/parcels', async(req, res)=>{
      const parcel = req.body;
      const result = await parcelCollection.insertOne(parcel);
      res.status(201).send(result)
    })

    // Delete: a Parcel
    app.delete('/parcels/:id', async(req, res)=>{
      const id = req.params.id;
      const query ={_id : new ObjectId(id)};
      const result = await parcelCollection.deleteOne(query);
      res.send(result)

    })

    


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
//     await client.close();
  }
}
run().catch(console.dir);


app.listen(port, ()=>{
      console.log(`zap-shift server is running on port ${port}`)
})