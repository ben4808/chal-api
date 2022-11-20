import app from './server';

// Start the server
const port = 5002;
app.listen(port, () => {
    console.log('Express server started on port: ' + port);
});
