FROM oven/bun:alpine

WORKDIR /usr/src/app

COPY package.json bun.lockb ./

RUN bun install --frozen-lockfile --production

COPY . .

ENV NODE_ENV=production

CMD ["bun", "run", "src/index.ts"]
