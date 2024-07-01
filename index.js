const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s2dzxgz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();


    const foodsCollection = client.db("muktiHallDB").collection("foods");
    const premiumMealsCollection = client.db("muktiHallDB").collection("premium");
    const requestedCollection = client.db("muktiHallDB").collection("requested");
    const usersCollection = client.db("muktiHallDB").collection("users");
    const paymentCollection = client.db("muktiHallDB").collection("payments");


    // jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log(req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      });
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // users
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })


    // foods
    app.get('/meals', async (req, res) => {
      const result = await foodsCollection.find().toArray();
      res.send(result);
    })

    app.post('/meals', async (req, res) => {
      const meal = req.body;
      const email = req.query.email;
      meal.email = email || 'walid@khalid23.com';
      const result = await foodsCollection.insertOne(meal);
      res.send(result);
    });

    app.get('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodsCollection.findOne(query);
      res.send(result);
    })

    app.put('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedMeal = req.body;
      const meal = {
        $set: {
          title: updatedMeal.title,
          category: updatedMeal.category,
          image: updatedMeal.image,
          ingredients: updatedMeal.ingredients,
          description: updatedMeal.description,
          price: updatedMeal.price,
          rating: updatedMeal.rating,
          postTime: updatedMeal.postTime,
          likes: updatedMeal.likes,
          reviews: updatedMeal.reviews
        }
      };

      try {
        const result = await foodsCollection.updateOne(filter, meal, options);
        res.send(result);
      } catch (error) {
        console.error('Error updating meal:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.delete('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodsCollection.deleteOne(query);
      res.send(result);
    })

    app.put('/meals/:mealId/likes', async (req, res) => {
      const { mealId } = req.params;
      const { likes } = req.body;

      try {
        const filter = { _id: new ObjectId(mealId) };
        const updateDoc = { $set: { likes: likes } };

        const result = await foodsCollection.updateOne(filter, updateDoc);
        res.send({ acknowledged: result.acknowledged });
      } catch (error) {
        console.error('Error updating likes:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });

    app.post('/premium', async (req, res) => {
      const { mealId } = req.body;

      try {
        const meal = await foodsCollection.findOne({ _id: new ObjectId(mealId) });

        if (!meal) {
          return res.status(404).send({ message: 'Meal not found' });
        }

        const result = await premiumMealsCollection.insertOne(meal);

        if (result.insertedId) {
          await foodsCollection.deleteOne({ _id: new ObjectId(mealId) });
          res.send({ message: 'Meal moved to upcoming meals' });
        } else {
          res.status(500).send({ message: 'Failed to move meal' });
        }
      } catch (error) {
        console.error('Error moving meal to upcoming meals:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });

    app.get('/meals/:id/reviews', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      try {
        const meal = await foodsCollection.findOne(query, { projection: { reviews: 1 } });
        if (meal) {
          res.send(meal.reviews);
        } else {
          res.status(404).send({ message: 'Meal not found' });
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.post('/meals/:mealId/reviews', async (req, res) => {
      const { mealId } = req.params;
      const newReview = {
        _id: new ObjectId(),
        user: req.body.user,
        comment: req.body.comment,
        rating: req.body.rating
      };

      try {
        const result = await foodsCollection.updateOne(
          { _id: new ObjectId(mealId) },
          { $push: { reviews: newReview } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'Meal not found' });
        }

        res.send(newReview);
      } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.delete('/meals/:mealId/reviews/:reviewId', async (req, res) => {
      const { mealId, reviewId } = req.params;

      try {
        const result = await foodsCollection.updateOne(
          { _id: new ObjectId(mealId) },
          { $pull: { reviews: { _id: new ObjectId(reviewId) } } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'Review not found' });
        }

        res.send({ message: 'Review deleted successfully' });
      } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.get('/meals/:mealId/reviews', async (req, res) => {
      const mealId = req.params.mealId;

      try {
        const meal = await foodsCollection.findOne({ _id: new ObjectId(mealId) }, { projection: { reviews: 1 } });
        if (meal) {
          res.send(meal.reviews);
        } else {
          res.status(404).send({ message: 'Meal not found' });
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.delete('/meals/:mealId/reviews', async (req, res) => {
      const mealId = req.params.mealId;
      const { user, comment, rating } = req.body;

      try {
        const result = await foodsCollection.updateOne(
          { _id: new ObjectId(mealId) },
          { $pull: { reviews: { user, comment, rating } } }
        );

        if (result.modifiedCount > 0) {
          res.send({ success: true, message: 'Review deleted successfully' });
        } else {
          res.status(404).send({ success: false, message: 'Review not found' });
        }
      } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).send('Internal Server Error');
      }
    });


    app.get('/reviews/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      try {
        const meals = await foodsCollection.find({ 'reviews.user': email }).toArray();
        const userReviews = meals.flatMap(meal =>
          meal.reviews
            .filter(review => review.user === email)
            .map(review => ({
              ...review,
              mealTitle: meal.title,
              mealId: meal._id,
            }))
        );

        res.send(userReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).send('Internal Server Error');
      }
    });


    // Edit a review
    app.put('/reviews/:mealId/:reviewId', verifyToken, async (req, res) => {
      const { mealId, reviewId } = req.params;
      const { comment, rating } = req.body;

      try {
        const result = await foodsCollection.updateOne(
          { _id: new ObjectId(mealId), "reviews._id": new ObjectId(reviewId) },
          { $set: { "reviews.$.comment": comment, "reviews.$.rating": rating } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'Review not found' });
        }

        res.send({ message: 'Review updated successfully' });
      } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).send('Internal Server Error');
      }
    });


    // Delete a review
    app.delete('/reviews/:mealId/:reviewId', verifyToken, async (req, res) => {
      const { mealId, reviewId } = req.params;

      try {
        const result = await foodsCollection.updateOne(
          { _id: new ObjectId(mealId) },
          { $pull: { reviews: { _id: new ObjectId(reviewId) } } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'Review not found' });
        }

        res.send({ message: 'Review deleted successfully' });
      } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).send('Internal Server Error');
      }
    });


    // Premium foods
    app.get('/premium', async (req, res) => {
      const result = await premiumMealsCollection.find().toArray();
      res.send(result);
    })

    app.post('/premium', async (req, res) => {
      const { mealId } = req.body;

      try {
        const meal = await foodsCollection.findOne({ _id: new ObjectId(mealId) });

        if (!meal) {
          return res.status(404).send({ message: 'Meal not found' });
        }

        const result = await premiumMealsCollection.insertOne(meal);

        if (result.insertedId) {
          await foodsCollection.deleteOne({ _id: new ObjectId(mealId) });
          res.send({ message: 'Meal moved to upcoming meals' });
        } else {
          res.status(500).send({ message: 'Failed to move meal' });
        }
      } catch (error) {
        console.error('Error moving meal to upcoming meals:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });

    app.post('/create-payment-intents', async (req, res) => {
      const { price } = req.body;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: price * 100, // Stripe expects amount in cents
          currency: 'usd',
        });

        res.status(200).json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        console.error('Error creating PaymentIntent:', error.message);
        res.status(500).json({ error: 'Failed to create PaymentIntent' });
      }
    });

    // requested meals
    app.get('/requested', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await requestedCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/requested', async (req, res) => {
      const cartItem = req.body;
      const result = await requestedCollection.insertOne(cartItem);
      res.send(result);
    })

    app.post('/requestedMeal', async (req, res) => {
      try {
        const email = req.body.email;
        const query = email ? { email } : {};
        const requestedMeals = await requestedCollection.find(query).toArray();
        res.send(requestedMeals);
      } catch (error) {
        console.error('Error fetching requested meals:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.delete('/requested/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await requestedCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/requested/serve/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: 'delivered' } };

      try {
        const result = await requestedCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error('Error serving meal:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // Payment
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.mealId.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await requestedCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    });



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hall server is running')
})

app.listen(port, () => {
  console.log(`Hall server is running on port ${port}`);
})