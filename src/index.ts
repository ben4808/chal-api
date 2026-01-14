import 'dotenv/config';
import app from './server';

// Start HTTP server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log('HTTP server started on port: ' + port);
});
