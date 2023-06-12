const express = require('express')
const app = express()
require('dotenv').config()
var jwt = require('jsonwebtoken');
const cors = require('cors')
const port = process.env.PORT || 5000;

// midiwire
app.use(cors());
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7ct1cb2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    console.log(authorization)
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ASSES_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}




async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const instructors = client.db("summerSchool").collection("instructors");
        const classes = client.db("summerSchool").collection("classes");
        const allclasses = client.db("summerSchool").collection("allclasses");
        const selectedclasses = client.db("summerSchool").collection("selected");
        const usersclasses = client.db("summerSchool").collection("users");



        // verifyadmin 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersclasses.findOne(query);
            if (user?.role !== 'admin') {
              return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
          }


        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ASSES_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        // users classes apis
        app.get('/users', verifyJwt,verifyAdmin, async (req, res) => {
            const result = await usersclasses.find().toArray()
            res.send(result)
        })


        app.post('/users', async (req, res) => {
            const pro = req.body;
            const query = { email: pro.email }
            const exsitingUser = await usersclasses.findOne(query)
            if (exsitingUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await usersclasses.insertOne(pro);
            res.send(result)
        })

        app.get('/instructoris' , async(req,res)=>{
            const query = { role: 'insructor'};
            const result = await usersclasses.find(query).toArray()
            res.send(result)
        })

        app.get('/users/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            console.log(email)
      
            if (req.decoded.email !== email) {
              return res.send({ admin: false })
            }
      
            const query = { email: email }
            const user = await usersclasses.findOne(query);
            const result = { admin: user?.role === 'admin' }
            console.log('admin result',result)
            res.send(result);
          })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersclasses.updateOne(filter, updateDoc)
            res.send(result)
        })

        // instructor related work
        // instructor related api
        app.get('/users/insructor/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            console.log(email)
      
            if (req.decoded.email !== email) {
              return res.send({ admin: false })
            }
      
            const query = { email: email }
            const user = await usersclasses.findOne(query);
            const result = { insructor: user?.role === 'insructor' }
            console.log('insructor result',result)
            res.send(result);
          })



        app.patch('/users/insructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'insructor'
                },
            };
            const result = await usersclasses.updateOne(filter, updateDoc)
            res.send(result)
        })

        // users related api for users
        // app.get('/users/:email', verifyJwt, async (req, res) => {
        //     const email = req.params.email;
        //     console.log(email)
      
        //     if (req.decoded.email !== email) {
        //       return res.send({ admin: false })
        //     }
      
        //     const query = { email: email }
        //     const user = await usersclasses.findOne(query);
        //     const result = { users: user?.role === 'users' }
        //     console.log('insructor result',result)
        //     res.send(result);
        //   })

        // app.patch('/users:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) };
        //     const updateDoc = {
        //         $set: {
        //             role: 'users'
        //         },
        //     };
        //     const result = await usersclasses.updateOne(filter, updateDoc)
        //     res.send(result)
        // })



        // app.get('/instructors', async (req, res) => {
        //     const result = await instructors.find().toArray()
        //     res.send(result)
        // })

        // classess related work
        app.get('/classes', async (req, res) => {
            const result = await classes.find().toArray()
            res.send(result)
        })

        // allclasses apis

        app.get('/allclasses', async (req, res) => {
            const result = await allclasses.find().toArray()
            res.send(result)
        })

        // selected classes apis 
        app.post('/selected', async (req, res) => {
            const pro = req.body;
            console.log(pro)
            const result = await selectedclasses.insertOne(pro)
            res.send(result)
        })

        app.get('/selected',verifyJwt, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }
            const decodedEmail = req.decoded.email;
            if(email !== decodedEmail){
                return res.status(403).send({ error: true, message: 'forviden access' })
            }
            const query = { email: email };
            const result = await selectedclasses.find(query).toArray()
            res.send(result)
        })

        app.delete('/selected/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectedclasses.deleteOne(query)
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



app.get('/', (req, res) => {
    res.send('summer school running!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})