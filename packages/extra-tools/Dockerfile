FROM oven/bun:1.2.1

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/extra-tools/package.json ./packages/extra-tools/

RUN bun install

COPY . .

WORKDIR /app/packages/extra-tools

EXPOSE 3001

CMD ["bun", "run", "dev"] 