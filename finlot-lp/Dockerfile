FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=https://strapi.netfinbank.ru/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package.json package-lock.json ./
COPY finlot-lp/package.json finlot-lp/package.json
RUN npm ci --workspace finlot-lp --include-workspace-root=false

COPY finlot-lp ./finlot-lp
WORKDIR /app/finlot-lp
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app/finlot-lp

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/finlot-lp/public ./public
COPY --from=builder /app/finlot-lp/.next ./.next
COPY --from=builder /app/finlot-lp/package.json ./package.json

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/robots.txt || exit 1

EXPOSE 3000
RUN chown -R node:node /app
USER node
CMD ["npm", "start"]
