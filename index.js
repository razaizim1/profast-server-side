const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jzh2fbg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        const db = client.db('profast_user');
        const parcels = db.collection('parcels');

        app.get('/parcels', async (req, res) => {
            const result = await parcels.find().toArray();
            res.json(result);
        });

        app.post('/parcels', async (req, res) => {
            const data = {
                ...req.body,
            };
            const result = await parcels.insertOne(data);
            res.status(201).json(result);
        });

        app.get('/parcels', async (req, res) => {
            try {
                const email = req.query.email;
                const query = email ? { created_by: email } : {};
                const result = await parcels
                    .find(query)
                    .sort({ createdAt: -1 }) // latest first
                    .toArray();
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch parcels' });
            }
        });



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});