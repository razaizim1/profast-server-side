const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const usersCollection = db.collection('users');
        const parcels = db.collection('parcels');
        const paymentsCollection = db.collection('payments');

        // routes/users.js or in your existing user controller
        app.post('/users', async (req, res) => {
            const user = req.body;

            const existingUser = await usersCollection.findOne({ email: user.email });

            if (existingUser) {
                return res.status(200).json({ message: 'User already exists', user: existingUser });
            }

            // Add default role and timestamp
            user.role = 'user';
            user.createdAt = new Date();
            user.lastLogin = new Date();

            const result = await usersCollection.insertOne(user);
            res.status(201).json({ message: 'User created', insertedId: result.insertedId });
        });

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

        app.delete('/parcels/:id', async (req, res) => {
            const id = req.params.id;
            try {
                const result = await parcels.deleteOne({ _id: new ObjectId(id) });
                res.json(result);
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Delete failed' });
            }
        });

        app.get('/parcels/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const parcel = await parcels.findOne({ _id: new ObjectId(id) });

                if (!parcel) {
                    return res.status(404).json({ error: 'Parcel not found' });
                }

                res.json(parcel);
            } catch (error) {
                console.error('Error fetching parcel:', error);
                res.status(500).json({ error: 'Server error' });
            }
        });

        app.post('/create-payment-intent', async (req, res) => {
            const amount = req.body.amount; //amount received from the client
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    automatic_payment_methods: { enabled: true },
                });

                res.json({ clientSecret: paymentIntent.client_secret });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body; // includes parcelId, user info, amount, timestamp, etc.

            try {
                const result = await paymentsCollection.insertOne({
                    ...payment,
                    paidAt: new Date(),
                });

                // Also update parcel status
                await parcels.updateOne(
                    { _id: new ObjectId(payment.parcelId) },
                    {
                        $set: {
                            payment_status: 'paid',
                            delivery_status: 'pending',
                            paidAt: new Date()
                        }
                    }
                );

                res.json({ success: true, paymentId: result.insertedId });
            } catch (error) {
                console.error('Payment logging failed:', error);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // GET /payments?email=user@example.com
        app.get('/payments', async (req, res) => {
            const email = req.query.email;

            const query = email ? { userEmail: email } : {};
            const payments = await paymentsCollection
                .find(query)
                .sort({ paidAt: -1 })
                .toArray();

            res.json(payments);
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