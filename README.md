# Mukti Hall Backend

This project is a backend server for the Mukti Hall application, a food service platform that manages meal listings, user accounts, and payment processing. The server is built using Node.js and Express, and it connects to a MongoDB database to store and retrieve data. The backend also includes JWT-based authentication and integrates Stripe for payment processing.

## Features

- **User Management:** Sign up, manage roles (admin/user), and authenticate users with JWT.
- **Meal Management:** CRUD operations for meals, including adding, updating, deleting, and fetching meal data.
- **Premium Meals:** Handle premium meal listings, including moving meals from the general list to the premium list.
- **Review System:** Users can add, update, and delete reviews for meals.
- **Payment Processing:** Stripe integration for handling payments.

## Technologies Used

- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web framework for Node.js.
- **MongoDB**: NoSQL database.
- **JWT**: JSON Web Token for authentication.
- **Stripe**: Payment processing.
- **dotenv**: For environment variable management.
- **CORS**: Middleware to handle Cross-Origin Resource Sharing.

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/mukti-hall-backend.git
   cd mukti-hall-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file in the root directory and add the following environment variables:**
   ```env
   PORT=5000
   DB_USER=yourMongoDBUsername
   DB_PASS=yourMongoDBPassword
   ACCESS_TOKEN_SECRET=yourJWTSecret
   STRIPE_SECRET_KEY=yourStripeSecretKey
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Access the server:**
   The server will run on `http://localhost:5000`.

## API Endpoints

- **Authentication:**
  - `POST /jwt`: Generate JWT for user authentication.

- **Users:**
  - `GET /users`: Get all users (admin only).
  - `POST /users`: Add a new user.
  - `PATCH /users/admin/:id`: Promote a user to admin.
  - `DELETE /users/:id`: Delete a user (admin only).

- **Meals:**
  - `GET /meals`: Get all meals.
  - `POST /meals`: Add a new meal.
  - `GET /meals/:id`: Get a specific meal by ID.
  - `PUT /meals/:id`: Update a meal by ID.
  - `DELETE /meals/:id`: Delete a meal by ID.

- **Reviews:**
  - `GET /meals/:mealId/reviews`: Get all reviews for a meal.
  - `POST /meals/:mealId/reviews`: Add a new review to a meal.
  - `PUT /reviews/:mealId/:reviewId`: Update a review.
  - `DELETE /reviews/:mealId/:reviewId`: Delete a review.

- **Payments:**
  - `POST /create-payment-intents`: Create a Stripe payment intent.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```
