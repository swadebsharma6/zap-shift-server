const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("zap-shift server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fvmax46.mongodb.net/?appName=Cluster0`;
const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
    await client.connect();

    const parcelCollection = client.db("zap-shift-DB").collection("parcels");
    const paymentsCollection = client.db("zap-shift-DB").collection("payments");
    const trackingCollection = client.db("zap-shift-DB").collection("trackings");

    app.get("/parcels", async (req, res) => {
      const result = await parcelCollection.find().toArray();
      res.send(result);
    });

    app.get("/parcels", async (req, res) => {
      const email = req.query.email;

      const query = email ? { created_by: email } : {};
      const options = {
        sort: { createdAt: -1 },
      };
      const result = await parcelCollection.find(query, options).toArray();
      res.status(201).send(result);
    });

    // POST: post a parcels api
    app.post("/parcels", async (req, res) => {
      const parcel = req.body;
      const result = await parcelCollection.insertOne(parcel);
      res.status(201).send(result);
    });

    // Delete: a Parcel
    app.delete("/parcels/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await parcelCollection.deleteOne(query);
      res.send(result);
    });

    // tracking Related Api

  app.post("/tracking", async (req, res) => {
  const {tracking_id, parcel_id, status, message, updated_by=''} = req.body;

  const log ={
    tracking_id,
    parcel_id: parcel_id ? new ObjectId(parcel_id) : undefined,
    status,
    message,
    time: new Date(),
    updated_by
  }

  // save parcel
  const result = await trackingCollection.insertOne(log);

  res.send(result);
});




// GET: payments
app.get('/payments', async(req, res)=>{
  try{
    const userEmail = req.query.email;
  const query = {email: userEmail};
  const options ={ sort: {paid_at: -1}};

  const payments = await paymentsCollection.find(query, options).toArray();
  res.send(payments)
  }catch(error){
    console.error('Error fetching payment history:', error);
    res.status(500).send({message: 'failed to get payments'})
  }
})


// POST: Record payment and update parcel status
app.post('/payments', async(req, res)=>{
  try{
    const {parcelId, email, amount, paymentMethod, transactionId} = req.body;

    const updateResult = await parcelCollection.updateOne(
      {_id: new ObjectId(parcelId)},
      {
        $set:{
          payment_status: 'paid'
        }
      }
    );

    if(updateResult.modifiedCount === 0){
      return res.status(400).send({message: 'Parcel not found or already paid'});
    }

    const paymentDoc ={
      parcelId,
      email,
      amount,
      paymentMethod,
      transactionId,
      paid_at_string: new Date().toISOString(),
      paid_at: new Date()
    };


    const paymentResult = await paymentsCollection.insertOne(paymentDoc);
    res.status(201).send({
      message:'Payment recorded and parcel marked as paid',
      insertedId: paymentResult.insertedId
    });


    
  }catch(error){
    console.log('Error payment result', error)
  }
})



   // Create a Payment Intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const amountInCents = req.body.amountInCense;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents ,// Convert to cents
      currency:'usd' ,
      payment_method_types: ['card'],
    });
    

    // Send the client secret to the client
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //     await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`zap-shift server is running on port ${port}`);
});
