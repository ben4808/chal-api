import  { Pool } from 'pg';
import { PostgresParameter } from './PostgresParameter';

// Try to use DATABASE_URL if available, otherwise fall back to individual env vars
let pool: Pool;
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
    console.log('Using DATABASE_URL:', databaseUrl);
    pool = new Pool({
        connectionString: databaseUrl,
    });
} else {
    console.log('Using individual env vars:', process.env.DB_USER, process.env.DB_HOST, process.env.DB_NAME, process.env.DB_PASSWORD, process.env.DB_PORT);
    pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'cruzi',
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    });
}

export async function sqlQuery(isFunction: boolean, queryOrFunctionName: string, parameters?: PostgresParameter[]): Promise<any[]> {
    try {
        // Prepare the query text and parameter values
        let queryText: string;
        const paramValues: (string | Date | number | boolean | any[] | null)[] = 
            parameters ? parameters.map(param => {
                // If the parameter value is an array, stringify it for jsonb
                if (Array.isArray(param.value)) {
                    return JSON.stringify(param.value);
                }
                return param.value;
            }) : [];

        if (isFunction) {
            // For function calls, format as SELECT * FROM function_name($1, $2, ...)
            const placeholders = parameters ? parameters.map((_, index) => `$${index + 1}`).join(', ') : '';
            queryText = `SELECT * FROM ${queryOrFunctionName}(${placeholders})`;
        } else {
            // For regular queries, use the provided query text
            queryText = queryOrFunctionName;
        }

        // Execute the query with parameters
        const result = await pool.query(queryText, paramValues);

        // Return the rows as an array
        return result.rows;
    } catch (err) {
        console.error('SQL query error:', err);
        throw err; // Re-throw to allow the caller to handle the error
    }
}
