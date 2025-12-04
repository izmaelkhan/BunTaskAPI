# Use official Bun image
FROM oven/bun:latest

# Create app directory
WORKDIR /app

# Copy package & lock
COPY package.json ./
# Install deps via bun
RUN bun install

# Copy source
COPY . .

# Create data dir
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000

CMD ["bun", "run", "src/server.ts"]
