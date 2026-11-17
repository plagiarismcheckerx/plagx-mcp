FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY bin ./bin
COPY src ./src
USER node
# stdio by default; run with "--http" (and -p 3000:3000, HOST=0.0.0.0) for Streamable HTTP.
ENV HOST=0.0.0.0
ENTRYPOINT ["node", "bin/plagx-mcp.js"]
