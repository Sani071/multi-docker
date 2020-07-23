const keys = require('./keys'); // Import ENVIRONMENT KEYS TO CONNECT TO REDIS CLIENT
const redis = require('redis'); // Import Redis API to connect to the redis server

const redisClient = redis.createClient({
    host: keys.redisHost, // The redis cient host
    port: keys.redisPort, // The port

    retry_strategy: () => 1000 // Restart the server every 1 second if it drops
});

const sub = redisClient.duplicate();

function fib(index) {
    
    if(index < 2) {
        return 1;
    }

    else {
        return fib(index-1) + fib(index-2);
    }
}

sub.on('message', (channel, message) => {
    redisClient.hset('values', message, fib(parseInt(message)));
});

sub.subscribe('insert'); // Subscribe to an INSERT event