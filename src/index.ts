import 'dotenv/config';
import app from './server';
import https from 'https';
import fs from 'fs';
import path from 'path';

// Start the server
const port = 5002;
const httpsPort = 5003;

// Try to load SSL certificates
let httpsOptions;
try {
    const keyPath = path.join(__dirname, '../certificates/server.key');
    const certPath = path.join(__dirname, '../certificates/server.crt');
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
    }
} catch (error) {
    console.log('SSL certificates not found, HTTPS will not be available');
}

// Start HTTP server
app.listen(port, () => {
    console.log('HTTP server started on port: ' + port);
});

// Start HTTPS server if certificates are available
if (httpsOptions) {
    https.createServer(httpsOptions, app).listen(httpsPort, () => {
        console.log('HTTPS server started on port: ' + httpsPort);
    });
} else {
    console.log('To enable HTTPS, place server.key and server.crt in the certificates/ directory');
}
