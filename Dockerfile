FROM node:20-alpine

WORKDIR /app

# Copy only dependency files first → great caching
COPY package*.json ./

# Install dependencies (use npm ci for production reproducibility)
RUN npm ci --only=production

# Copy the rest of your application code
COPY . .

# Expose port (optional but good practice)
EXPOSE 3000

# Start the app (better than "npm start" in many cases)
CMD ["node", "dist/src/index.js"]
# or: CMD ["npm", "start"] if you prefer