FROM node:20-slim

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source
COPY . .

# HF Spaces requires the app to listen on port 7860
ENV PORT=7860
EXPOSE 7860

# Use non-root user for security (HF Spaces requirement)
RUN chown -R 1000:1000 /app
USER 1000

CMD ["node", "src/server.js"]