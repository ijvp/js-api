# Use the official Node.js image as the base image
FROM node

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Install pm2 globally
RUN npm install pm2 -g

# Copy the rest of the application code to the container
COPY . .

# Expose the port that the API will run on
EXPOSE 8080

# Start the Node.js application with pm2
CMD ["pm2", "start" "app.js"]