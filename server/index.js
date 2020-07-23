const keys = require('./keys');
const express = require('express');

const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const port = 5000;
const localhost = '127.0.0.1';

const okCode = 200;
const notFoundCode = 404;

app.use(cors());
app.use(bodyParser.json()); // Middleware that parses incoming requests

// POSTGRES Client Setup

const { Pool } = require('pg');

const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

pgClient.on('error', () => {
    console.log('Lost the connection to the PG Server');
});

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
.catch((error) => {
    console.log(error);
}); // If there is an error when creating the table then log the error

// REDIS CLIENT SETUP

const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000 // Restart the server every 1 second if the connection is lost
});

const redisPublisher = redisClient.duplicate();

// Express Route Handlers

app.get('/', (request, response) => { // Handle a GET request on the root route
    const requestMethod = request.method;
    const url = request.url;

    if(requestMethod === 'GET' && url.startsWith('/')) {
        return response.status(okCode).send('Hi');
    }
});

app.get('/values/all', async (request, response) => {
    const requestMethod = request.method; // The request method
    const url = request.url;

    const values = await pgClient.query('SELECT * FROM values'); // Selects all the values from the table

    if(requestMethod === 'GET' && url.startsWith('/')) {
        return response.status(okCode).send(values.rows); // Send back the values from the rows
    }
});

app.get('/values/current', async (request, response) => {
    const requestMethod = request.method;
    const url = request.url;

    if(requestMethod === 'GET' && url.startsWith('/')) {

        redisClient.hgetall('values', (error, values) => {

            if(!error) {
                return response.send(values);
            }
        });
    }
});

app.post('/values', async (request, response) => {
    const index = request.body.index; // Retrieve the index
  
        if(parseInt(index) > 40) {
            return response.status(422).send('Index is too high');
    } 

    redisClient.hset('values', index, 'Nothing yet');
    redisPublisher.publish('insert', index); // Insert the index into the DB
    pgClient.query('INSERT INTO values (number) VALUES ($1)', [index]);

    return response.send({working: true});

});

app.use((request, response) => {

});

app.listen(port, localhost, (error) => {
    if(!error) {
        return console.log('Listening for requests on port', port);
    }

    else {
        return console.log('Could not listen for requests');
    }
});