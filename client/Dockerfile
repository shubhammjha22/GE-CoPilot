FROM node:20.11.0-alpine
RUN mkdir -p /client
WORKDIR /client

COPY package.json .
COPY package-lock.json .

RUN npm install
RUN npm rebuild bcrypt

COPY . .

EXPOSE 80

CMD npm run dev